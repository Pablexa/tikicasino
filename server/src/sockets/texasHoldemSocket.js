// TikiCasino - Texas Hold'em Socket Handler
import { prisma } from '../db/client.js';
import {
  joinTable, leaveTable, startGame, playerAction,
  publicTable, getTable, cleanupTable
} from '../games/texasHoldemEngine.js';

const BUY_IN = 2000; // CALDICOINS per session

function broadcast(io, roomCode, table, exceptUserId = null) {
  const tableState = table;
  tableState.players.forEach(p => {
    const playerView = publicTable(tableState, p.id);
    // Find socket for this player
    io.to(`poker:${roomCode}:${p.id}`).emit('poker:state', playerView);
  });
  // Also send a spectator view (no hole cards)
  io.to(`poker:${roomCode}:spectator`).emit('poker:state', publicTable(tableState));
}

export function setupTexasHoldemSocket(io, socket) {
  const user = socket.user;

  socket.on('poker:join', async ({ roomCode }) => {
    try {
      // Deduct buy-in from balance
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id }, select: { balance: true }
      });
      if (!dbUser) return socket.emit('poker:error', { message: 'Usuario no encontrado.' });

      // Check if already at table
      const existing = getTable(roomCode);
      if (existing?.players.find(p => p.id === user.id)) {
        // Rejoin - just subscribe to room
        socket.join(`poker:${roomCode}:${user.id}`);
        socket.join(`poker:${roomCode}:spectator`);
        const view = publicTable(existing, user.id);
        socket.emit('poker:state', view);
        return;
      }

      if (dbUser.balance < BUY_IN) {
        return socket.emit('poker:error', { message: `Necesitás ${BUY_IN.toLocaleString()} CALDICOINS para entrar.` });
      }

      // Deduct buy-in
      await prisma.user.update({
        where: { id: user.id },
        data: { balance: { decrement: BUY_IN } }
      });
      socket.emit('balance:update', { balance: dbUser.balance - BUY_IN });

      const result = joinTable(roomCode, user.id, user.nickname, BUY_IN);
      if (!result.success) {
        // Refund
        await prisma.user.update({ where: { id: user.id }, data: { balance: { increment: BUY_IN } } });
        return socket.emit('poker:error', { message: result.error });
      }

      socket.join(`poker:${roomCode}:${user.id}`);
      socket.join(`poker:${roomCode}:spectator`);

      const table = getTable(roomCode);
      broadcast(io, roomCode, table);
      io.to(`poker:${roomCode}:spectator`).emit('poker:playerJoined', {
        nickname: user.nickname, count: table.players.length
      });
    } catch (err) {
      console.error('poker:join error:', err);
      socket.emit('poker:error', { message: 'Error al unirse a la mesa.' });
    }
  });

  socket.on('poker:start', ({ roomCode }) => {
    const result = startGame(roomCode);
    if (!result.success) return socket.emit('poker:error', { message: result.error });
    broadcast(io, roomCode, result.table);
  });

  socket.on('poker:action', async ({ roomCode, action, amount }) => {
    const result = playerAction(roomCode, user.id, action, parseInt(amount) || 0);
    if (!result.success) return socket.emit('poker:error', { message: result.error });

    broadcast(io, roomCode, result.table);

    // If showdown, just schedule the next hand broadcast
    if (result.table.phase === 'showdown' && result.table.winners) {
      setTimeout(() => {
        const table = getTable(roomCode);
        if (table) broadcast(io, roomCode, table);
      }, 6500);
    }
  });

  socket.on('poker:leave', async ({ roomCode }) => {
    const table = getTable(roomCode);
    if (!table) return;

    const player = table.players.find(p => p.id === user.id);
    if (player && player.stack > 0) {
      // Return remaining stack to balance
      try {
        const updated = await prisma.user.update({
          where: { id: user.id },
          data: { balance: { increment: player.stack } },
          select: { balance: true }
        });
        socket.emit('balance:update', { balance: updated.balance });
      } catch (e) { console.error('poker:leave balance error:', e); }
    }

    leaveTable(roomCode, user.id);
    socket.leave(`poker:${roomCode}:${user.id}`);
    socket.leave(`poker:${roomCode}:spectator`);

    const updatedTable = getTable(roomCode);
    if (updatedTable) broadcast(io, roomCode, updatedTable);
    else io.to(`poker:${roomCode}:spectator`).emit('poker:tableClosed');
  });

  socket.on('disconnect', async () => {
    // Auto-leave and refund stacks from all active tables on disconnect
    try {
      const room = await prisma.room.findFirst({
        where: { members: { some: { userId: user.id } } }
      });
      if (!room) return;
      const roomCode = room.code;
      const table = getTable(roomCode);
      if (!table) return;

      const player = table.players.find(p => p.id === user.id);
      if (player && player.stack > 0) {
        // Return remaining stack to database balance
        await prisma.user.update({
          where: { id: user.id },
          data: { balance: { increment: player.stack } },
        });
        // Emit balance update to player's active socket if still partially alive
        const updatedUser = await prisma.user.findUnique({ where: { id: user.id }, select: { balance: true } });
        socket.emit('balance:update', { balance: updatedUser.balance });
      }
      leaveTable(roomCode, user.id);
      socket.leave(`poker:${roomCode}:${user.id}`);
      socket.leave(`poker:${roomCode}:spectator`);

      const updatedTable = getTable(roomCode);
      if (updatedTable) broadcast(io, roomCode, updatedTable);
      else io.to(`poker:${roomCode}:spectator`).emit('poker:tableClosed');
    } catch (err) {
      console.error('Poker disconnect cleanup error:', err);
    }
  });
}
