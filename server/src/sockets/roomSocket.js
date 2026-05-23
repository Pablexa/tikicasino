// TikiCasino - Room Socket Handler
import { prisma } from '../db/client.js';
import { roomUsers, deleteRoom } from './index.js';

export function setupRoomSocket(io, socket) {
  const user = socket.user;

  // Join a room
  socket.on('room:join', async ({ roomCode }) => {
    try {
      if (!roomCode) return;
      const code = roomCode.toUpperCase();

      const room = await prisma.room.findUnique({
        where: { code },
        include: {
          members: {
            where: { isKicked: false },
            include: {
              user: { select: { id: true, nickname: true, avatar: true, balance: true } },
            },
          },
          owner: { select: { id: true, nickname: true, avatar: true } },
        },
      });

      if (!room || !room.isActive) {
        socket.emit('error', { message: 'Room not found or closed.' });
        return;
      }

      // Check if kicked
      let membership = room.members.find(m => m.userId === user.id);
      if (membership?.isKicked) {
        socket.emit('error', { message: 'You have been removed from this room.' });
        return;
      }

      // If user joined by invitation link directly, register them automatically
      if (!membership) {
        await prisma.roomMember.create({
          data: { roomId: room.id, userId: user.id, role: 'member' }
        });
        const latestUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { id: true, nickname: true, avatar: true, balance: true }
        });
        membership = { userId: user.id, role: 'member', user: latestUser };
        room.members.push(membership);
      }

      // Leave all other rooms of the room:*, liarsbar:*, roulette:* pattern to prevent interconnection
      for (const r of socket.rooms) {
        if (r !== `room:${code}` && (r.startsWith('room:') || r.startsWith('liarsbar:') || r.startsWith('roulette:'))) {
          socket.leave(r);
        }
      }

      // Join socket room
      socket.join(`room:${code}`);

      // Track in-memory
      if (!roomUsers.has(code)) {
        roomUsers.set(code, new Set());
      }
      roomUsers.get(code).add(user.id);
      socket.currentRoom = code;

      // Get chat history
      const chatHistory = await prisma.chatMessage.findMany({
        where: { roomId: room.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          user: { select: { id: true, nickname: true, avatar: true } },
        },
      });

      // Notify room that user joined (with their real balance!)
      socket.to(`room:${code}`).emit('room:memberJoined', {
        userId: user.id,
        nickname: user.nickname,
        avatar: user.avatar,
        balance: membership.user?.balance ?? user.balance,
      });

      // Send room state to the joining user
      socket.emit('room:state', {
        room: {
          id: room.id,
          code: room.code,
          name: room.name,
          ownerId: room.ownerId,
          owner: room.owner,
          settings: typeof room.settings === 'string' ? JSON.parse(room.settings) : room.settings,
          members: room.members.map(m => ({
            userId: m.userId,
            role: m.role,
            user: m.user,
          })),
        },
        chatHistory: chatHistory.reverse().map(msg => ({
          id: msg.id,
          userId: msg.userId,
          nickname: msg.user.nickname,
          avatar: msg.user.avatar,
          message: msg.message,
          type: msg.type,
          createdAt: msg.createdAt,
        })),
        onlineUsers: [...(roomUsers.get(code) || [])],
      });
    } catch (err) {
      console.error('room:join error:', err);
      socket.emit('error', { message: 'Failed to join room.' });
    }
  });

  // Leave a room
  socket.on('room:leave', async ({ roomCode }) => {
    if (!roomCode) return;
    const code = roomCode.toUpperCase();
    socket.leave(`room:${code}`);
    const users = roomUsers.get(code);
    if (users) {
      users.delete(user.id);
    }
    io.to(`room:${code}`).emit('room:memberLeft', {
      userId: user.id,
      nickname: user.nickname,
    });
    socket.currentRoom = null;

    try {
      const room = await prisma.room.findUnique({
        where: { code },
        select: { id: true, ownerId: true }
      });
      if (room) {
        // Simply update room timestamp to reset empty timer on owner leaving
        await prisma.room.update({
          where: { id: room.id },
          data: { updatedAt: new Date() }
        });
      }
    } catch (err) {
      console.error('Error updating room timestamp on leave:', err);
    }
  });

  // Kick a user (owner only)
  socket.on('room:kick', async ({ roomCode, targetUserId }) => {
    try {
      if (!roomCode) return;
      const code = roomCode.toUpperCase();
      const room = await prisma.room.findUnique({
        where: { code },
      });

      if (!room || room.ownerId !== user.id) {
        socket.emit('error', { message: 'Permission denied.' });
        return;
      }

      await prisma.roomMember.updateMany({
        where: { roomId: room.id, userId: targetUserId },
        data: { isKicked: true },
      });

      // Force-disconnect the kicked user from the room
      io.to(`room:${code}`).emit('room:kicked', { userId: targetUserId });
    } catch (err) {
      console.error('room:kick error:', err);
    }
  });
}
