// TikiCasino - Socket.IO Main Handler
import jwt from 'jsonwebtoken';
import { prisma } from '../db/client.js';
import { setupRoomSocket } from './roomSocket.js';
import { setupGameSocket } from './gameSocket.js';
import { setupChatSocket } from './chatSocket.js';
import { setupCrashSocket } from './crashSocket.js';

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
    });
  });
}

/**
 * Emit balance update to a specific user
 */
export async function emitBalanceUpdate(io, userId) {
  const socketId = userSockets.get(userId);
  if (!socketId) return;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { balance: true },
  });

  if (user) {
    io.to(socketId).emit('balance:update', { balance: user.balance });
  }
}
