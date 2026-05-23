// TikiCasino - Socket.IO Main Handler
import jwt from 'jsonwebtoken';
import { prisma } from '../db/client.js';
import { setupRoomSocket } from './roomSocket.js';
import { setupGameSocket } from './gameSocket.js';
import { setupChatSocket } from './chatSocket.js';
import { setupCrashSocket } from './crashSocket.js';
import { setupTexasHoldemSocket } from './texasHoldemSocket.js';
import { setupLiarsBarSocket } from './liarsBarSocket.js';
import { setupChessSocket } from './chessSocket.js';
import { setupAdminSocket } from './adminSocket.js';
import { setupTriviaSocket } from './triviaSocket.js';
import { setupShooterSocket } from './shooterSocket.js';

const JWT_SECRET = process.env.JWT_SECRET || 'tikicasino-dev-secret';

// Map of userId -> socketId for presence tracking
export const userSockets = new Map();
// Map of roomCode -> Set of userIds
export const roomUsers = new Map();
// Map of roomCode -> CrashEngine instance
export const crashEngines = new Map();

/**
 * Authenticate socket connection via JWT cookie
 */
async function authenticateSocket(socket) {
  try {
    const cookieHeader = socket.handshake.headers.cookie || '';
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map(c => {
        const [key, ...vals] = c.trim().split('=');
        return [key, vals.join('=')];
      })
    );
    
    const token = cookies['tikicasino_token'];
    if (!token) return null;

    const decoded = jwt.verify(token, JWT_SECRET);
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        nickname: true,
        avatar: true,
        balance: true,
        emailVerified: true,
        isBanned: true,
      },
    });

    if (!user || user.isBanned) return null;
    return user;
  } catch (err) {
    return null;
  }
}

export function setupSocketHandlers(io) {
  // Socket authentication middleware
  io.use(async (socket, next) => {
    const user = await authenticateSocket(socket);
    if (!user) {
      return next(new Error('Authentication required.'));
    }
    socket.user = user;
    next();
  });

  io.on('connection', async (socket) => {
    const user = socket.user;
    console.log(`Socket connected: ${user.nickname} (${socket.id})`);

    // Track user socket
    userSockets.set(user.id, socket.id);
    socket.userId = user.id;

    // Emit auth confirmation
    socket.emit('auth:success', {
      user: {
        id: user.id,
        nickname: user.nickname,
        avatar: user.avatar,
        balance: user.balance,
      },
    });

    // Setup event handlers
    setupRoomSocket(io, socket);
    setupGameSocket(io, socket);
    setupChatSocket(io, socket);
    setupCrashSocket(io, socket);
    setupTexasHoldemSocket(io, socket);
    setupLiarsBarSocket(io, socket);
    setupChessSocket(io, socket);
    setupAdminSocket(io, socket);
    setupTriviaSocket(io, socket);
    setupShooterSocket(io, socket);

    // Disconnect handler
    socket.on('disconnect', async () => {
      console.log(`Socket disconnected: ${user.nickname}`);
      userSockets.delete(user.id);

      // Leave all rooms
      for (const [roomCode, users] of roomUsers.entries()) {
        if (users.has(user.id)) {
          users.delete(user.id);
          io.to(`room:${roomCode}`).emit('room:memberLeft', {
            userId: user.id,
            nickname: user.nickname,
          });
          if (users.size === 0) {
            roomUsers.delete(roomCode);
          }
        }
      }

      // Keep room hosted even if owner leaves/disconnects, letting background 10 min grace cleaner handle it
      try {
        const ownedRooms = await prisma.room.findMany({
          where: { ownerId: user.id },
          select: { id: true, code: true }
        });
        for (const r of ownedRooms) {
          // Simply update room timestamp to reset empty timer on disconnect
          await prisma.room.update({
            where: { id: r.id },
            data: { updatedAt: new Date() }
          });
        }
      } catch (err) {
        console.error('Error updating owned rooms on disconnect:', err);
      }
    });
  });

  // ── PERIODIC INACTIVE / EMPTY ROOM CLEANER ────────────────
  // Runs every 2 minutes to scan and auto-delete rooms empty for > 10 min or inactive for > 3 hours
  setInterval(async () => {
    try {
      const rooms = await prisma.room.findMany();
      const now = Date.now();
      const THREE_HOURS = 3 * 60 * 60 * 1000;
      const EMPTY_GRACE_PERIOD = 10 * 60 * 1000; // 10 minutes empty grace period

      for (const room of rooms) {
        const online = roomUsers.get(room.code);
        const isRoomEmpty = !online || online.size === 0;
        const timeSinceLastUpdate = now - new Date(room.updatedAt).getTime();

        // 1. If everyone disconnected for > 5 min, OR
        // 2. If the room has been completely inactive for > 3 hours
        if ((isRoomEmpty && timeSinceLastUpdate > EMPTY_GRACE_PERIOD) || timeSinceLastUpdate > THREE_HOURS) {
          await deleteRoom(io, room.id, room.code);
        }
      }
    } catch (err) {
      console.error('Error in periodic room cleanup interval:', err);
    }
  }, 120000);
}

export async function deleteRoom(io, roomId, roomCode) {
  try {
    console.log(`[Room-Cleanup] Deleting room: ${roomCode}`);
    
    // Notify any remaining sockets in the room that it is deleted
    io.to(`room:${roomCode}`).emit('room:deleted');

    // Transactional cleanup
    await prisma.$transaction([
      prisma.chatMessage.deleteMany({ where: { roomId } }),
      prisma.roomMember.deleteMany({ where: { roomId } }),
      prisma.invite.deleteMany({ where: { roomId } }),
      prisma.gameRoundPlayer.deleteMany({ where: { gameRound: { roomId } } }),
      prisma.gameRound.deleteMany({ where: { roomId } }),
      prisma.balanceTransaction.updateMany({ where: { roomId }, data: { roomId: null } }),
      prisma.room.delete({ where: { id: roomId } }),
    ]);

    roomUsers.delete(roomCode);
    crashEngines.delete(roomCode);
  } catch (err) {
    console.error(`Error deleting room ${roomCode}:`, err);
  }
}

export async function emitBalanceUpdate(io, userId) {
  const socketId = userSockets.get(userId);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { balance: true },
  });

  if (!user) return;

  if (socketId) {
    io.to(socketId).emit('balance:update', { balance: user.balance });
  }

  // Broadcast the balance update to all rooms this user is currently in
  for (const [roomCode, users] of roomUsers.entries()) {
    if (users.has(userId)) {
      io.to(`room:${roomCode}`).emit('room:balanceUpdate', {
        userId,
        balance: user.balance,
      });
    }
  }
}
