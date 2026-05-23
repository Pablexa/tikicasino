// TikiCasino - Admin Socket Handler
import { prisma } from '../db/client.js';
import { userSockets } from './index.js';

const ADMIN_PASSWORD = 'menescaldidador2467';

export function setupAdminSocket(io, socket) {
  // Authentication check middleware helper
  const verifyAdmin = (password) => {
    return password === ADMIN_PASSWORD;
  };

  socket.on('admin:auth', async ({ password }) => {
    if (!verifyAdmin(password)) {
      return socket.emit('admin:error', { message: 'Contraseña de administrador incorrecta.' });
    }

    try {
      // Fetch all registered users
      const allUsers = await prisma.user.findMany({
        select: { id: true, nickname: true, avatar: true, balance: true },
        orderBy: { nickname: 'asc' }
      });

      // Map online status
      const activeUserIds = new Set(userSockets.keys());
      const activeUsers = allUsers.map(u => ({
        ...u,
        isOnline: activeUserIds.has(u.id)
      }));

      // Fetch active rooms
      const activeRooms = await prisma.room.findMany({
        select: {
          id: true,
          code: true,
          name: true,
          ownerId: true,
          createdAt: true,
          members: {
            select: {
              user: {
                select: { id: true, nickname: true }
              }
            }
          }
        }
      });

      socket.emit('admin:auth:success', { activeUsers, activeRooms });
    } catch (err) {
      console.error('admin:auth error:', err);
      socket.emit('admin:error', { message: 'Error al recuperar estadísticas de administración.' });
    }
  });

  socket.on('admin:giveCoins', async ({ password, targetUserId, amount }) => {
    if (!verifyAdmin(password)) return socket.emit('admin:error', { message: 'No autorizado.' });
    const coins = parseInt(amount);
    if (!targetUserId || isNaN(coins) || coins <= 0) {
      return socket.emit('admin:error', { message: 'Datos de monedas inválidos.' });
    }

    try {
      const updated = await prisma.user.update({
        where: { id: targetUserId },
        data: { balance: { increment: coins } },
        select: { balance: true, nickname: true }
      });

      // Emit balance update to the user if online
      const userSocketId = userSockets.get(targetUserId);
      if (userSocketId) {
        io.to(userSocketId).emit('balance:update', { balance: updated.balance });
      }

      socket.emit('admin:action:success', { message: `Añadidas ${coins.toLocaleString()} monedas a ${updated.nickname}.` });
      
      // Refresh list
      socket.emit('admin:data:refresh');
    } catch (err) {
      socket.emit('admin:error', { message: 'Error al otorgar monedas.' });
    }
  });

  socket.on('admin:takeCoins', async ({ password, targetUserId, amount }) => {
    if (!verifyAdmin(password)) return socket.emit('admin:error', { message: 'No autorizado.' });
    const coins = parseInt(amount);
    if (!targetUserId || isNaN(coins) || coins <= 0) {
      return socket.emit('admin:error', { message: 'Datos de monedas inválidos.' });
    }

    try {
      const updated = await prisma.user.update({
        where: { id: targetUserId },
        data: { balance: { decrement: coins } },
        select: { balance: true, nickname: true }
      });

      // Emit balance update to the user if online
      const userSocketId = userSockets.get(targetUserId);
      if (userSocketId) {
        io.to(userSocketId).emit('balance:update', { balance: updated.balance });
      }

      socket.emit('admin:action:success', { message: `Retiradas ${coins.toLocaleString()} monedas a ${updated.nickname}.` });
      
      // Refresh list
      socket.emit('admin:data:refresh');
    } catch (err) {
      socket.emit('admin:error', { message: 'Error al retirar monedas.' });
    }
  });

  socket.on('admin:giveCoinsAll', async ({ password, amount }) => {
    if (!verifyAdmin(password)) return socket.emit('admin:error', { message: 'No autorizado.' });
    const coins = parseInt(amount);
    if (isNaN(coins) || coins <= 0) {
      return socket.emit('admin:error', { message: 'Monto de monedas inválido.' });
    }

    try {
      await prisma.user.updateMany({
        data: { balance: { increment: coins } }
      });

      // Emit balance updates to all online users
      for (const [userId, socketId] of userSockets.entries()) {
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { balance: true } });
        if (user) {
          io.to(socketId).emit('balance:update', { balance: user.balance });
        }
      }

      socket.emit('admin:action:success', { message: `Añadidas ${coins.toLocaleString()} monedas a TODOS los usuarios.` });
      socket.emit('admin:data:refresh');
    } catch (err) {
      socket.emit('admin:error', { message: 'Error al otorgar monedas a todos.' });
    }
  });

  socket.on('admin:closeRoom', async ({ password, roomCode }) => {
    if (!verifyAdmin(password)) return socket.emit('admin:error', { message: 'No autorizado.' });
    if (!roomCode) return socket.emit('admin:error', { message: 'Código de sala inválido.' });

    try {
      const code = roomCode.toUpperCase();
      io.to(`room:${code}`).emit('room:deleted');
      
      await prisma.room.delete({
        where: { code }
      });

      socket.emit('admin:action:success', { message: `Sala ${code} cerrada correctamente.` });
      socket.emit('admin:data:refresh');
    } catch (err) {
      socket.emit('admin:error', { message: 'Error al cerrar la sala.' });
    }
  });

  socket.on('admin:closeAllRooms', async ({ password }) => {
    if (!verifyAdmin(password)) return socket.emit('admin:error', { message: 'No autorizado.' });

    try {
      const rooms = await prisma.room.findMany({ select: { code: true } });
      for (const room of rooms) {
        io.to(`room:${room.code}`).emit('room:deleted');
      }

      await prisma.room.deleteMany({});

      socket.emit('admin:action:success', { message: 'Todas las salas activas han sido cerradas.' });
      socket.emit('admin:data:refresh');
    } catch (err) {
      socket.emit('admin:error', { message: 'Error al cerrar salas en masa.' });
    }
  });

  socket.on('admin:wipeAll', async ({ password }) => {
    if (!verifyAdmin(password)) return socket.emit('admin:error', { message: 'No autorizado.' });

    try {
      // Close all rooms first
      const rooms = await prisma.room.findMany({ select: { code: true } });
      for (const room of rooms) {
        io.to(`room:${room.code}`).emit('room:deleted');
      }
      await prisma.room.deleteMany({});

      // Reset all user balances to 1000 Caldicoins starter
      await prisma.user.updateMany({
        data: { balance: 1000 }
      });

      // Update balances for all connected
      for (const [userId, socketId] of userSockets.entries()) {
        io.to(socketId).emit('balance:update', { balance: 1000 });
      }

      socket.emit('admin:action:success', { message: 'Plataforma reseteada completamente (Saldos a 1,000 CALDICOINS).' });
      socket.emit('admin:data:refresh');
    } catch (err) {
      socket.emit('admin:error', { message: 'Error al realizar el wipe.' });
    }
  });

  socket.on('admin:broadcast', async ({ password, message }) => {
    if (!verifyAdmin(password)) return socket.emit('admin:error', { message: 'No autorizado.' });
    if (!message || !message.trim()) {
      return socket.emit('admin:error', { message: 'El anuncio no puede estar vacío.' });
    }

    try {
      io.emit('admin:announcement', { message: message.trim() });
      socket.emit('admin:action:success', { message: '¡Anuncio global transmitido con éxito!' });
    } catch (err) {
      socket.emit('admin:error', { message: 'Error al transmitir el anuncio.' });
    }
  });
}
