// TikiCasino - Chat Socket Handler
import { prisma } from '../db/client.js';

const CHAT_COOLDOWN_MS = 1000;
const MAX_MESSAGE_LENGTH = 300;
const lastMessageTime = new Map(); // userId -> timestamp

const CHAT_COMMANDS = {
  '/balance': async (user) => `Tu saldo: ${user.balance.toLocaleString()} CALDICOINS`,
  '/help': () => 'Comandos: /balance /stats /leaderboard /help',
  '/stats': async (user) => `${user.nickname}: Saldo ${user.balance.toLocaleString()} CALDICOINS`,
};

export function setupChatSocket(io, socket) {
  const user = socket.user;

  socket.on('chat:send', async ({ roomCode, message }) => {
    try {
      if (!roomCode || !message) return;

      const msg = message.toString().trim();
      if (!msg || msg.length > MAX_MESSAGE_LENGTH) return;

      // Rate limiting
      const lastMsg = lastMessageTime.get(user.id);
      const now = Date.now();
      if (lastMsg && now - lastMsg < CHAT_COOLDOWN_MS) {
        socket.emit('chat:error', { message: 'Estás enviando mensajes muy rápido.' });
        return;
      }
      lastMessageTime.set(user.id, now);

      // Handle commands
      if (msg.startsWith('/')) {
        const cmd = msg.split(' ')[0].toLowerCase();
        const handler = CHAT_COMMANDS[cmd];
        if (handler) {
          const freshUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { balance: true, nickname: true },
          });
          const response = await handler({ ...freshUser });
          socket.emit('chat:message', {
            id: `cmd-${Date.now()}`,
            type: 'system',
            message: response,
            createdAt: new Date().toISOString(),
          });
          return;
        }
      }

      // Find room
      const room = await prisma.room.findUnique({
        where: { code: roomCode.toUpperCase() },
      });
      if (!room) return;

      // Check if user is muted
      const membership = await prisma.roomMember.findUnique({
        where: { roomId_userId: { roomId: room.id, userId: user.id } },
      });
      if (membership?.isMuted) {
        socket.emit('chat:error', { message: 'Estás silenciado en esta sala.' });
        return;
      }

      // Save and broadcast
      const chatMsg = await prisma.chatMessage.create({
        data: {
          roomId: room.id,
          userId: user.id,
          message: msg,
          type: 'user',
        },
      });

      io.to(`room:${roomCode}`).emit('chat:message', {
        id: chatMsg.id,
        userId: user.id,
        nickname: user.nickname,
        avatar: user.avatar,
        message: msg,
        type: 'user',
        createdAt: chatMsg.createdAt,
      });
    } catch (err) {
      console.error('chat:send error:', err);
    }
  });
}

/**
 * Broadcast a system event message to a room
 */
export async function broadcastSystemMessage(io, roomCode, roomId, message) {
  try {
    // Avoid saving transient system messages to the DB to prevent foreign key violations,
    // as "system" is not an actual user inside the users table.
    io.to(`room:${roomCode}`).emit('chat:message', {
      id: `sys-${Date.now()}`,
      userId: 'system',
      nickname: 'System',
      message,
      type: 'system',
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('broadcastSystemMessage error:', err);
  }
}
