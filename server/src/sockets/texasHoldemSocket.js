// TikiCasino - Texas Hold'em Socket Handler
import { prisma } from '../db/client.js';
import {
  joinTable, leaveTable, startGame, playerAction,
  publicTable, getTable, cleanupTable
} from '../games/texasHoldemEngine.js';

const BUY_IN = 2000; // CALDICOINS per session

// Global map to hold disconnect timeouts (userId -> timeoutId)
const pokerDisconnectTimeouts = new Map();

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
      if (!roomCode) return;
      const code = roomCode.toUpperCase();

      // Clear disconnect timeout if player is returning within grace period
      if (pokerDisconnectTimeouts.has(user.id)) {
        clearTimeout(pokerDisconnectTimeouts.get(user.id));
        pokerDisconnectTimeouts.delete(user.id);
      }

      // Deduct buy-in from balance
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id }, select: { balance: true }
      });
      if (!dbUser) return socket.emit('poker:error', { message: 'Usuario no encontrado.' });

      // Check if already at table
      const existing = getTable(code);
      if (existing?.players.find(p => p.id === user.id)) {
        // Rejoin - just subscribe to room and give current view
        socket.join(`poker:${code}:${user.id}`);
        socket.leave(`poker:${code}:spectator`);
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

      const result = joinTable(code, user.id, user.nickname, BUY_IN);
      if (!result.success) {
        // Refund
        await prisma.user.update({ where: { id: user.id }, data: { balance: { increment: BUY_IN } } });
        return socket.emit('poker:error', { message: result.error });
      }

      socket.join(`poker:${code}:${user.id}`);
      socket.leave(`poker:${code}:spectator`);

      const table = getTable(code);
      broadcast(io, code, table);
      io.to(`poker:${code}:spectator`).emit('poker:playerJoined', {
        nickname: user.nickname, count: table.players.length
      });
    } catch (err) {
      console.error('poker:join error:', err);
      socket.emit('poker:error', { message: 'Error al unirse a la mesa.' });
    }
  });

  socket.on('poker:start', ({ roomCode }) => {
    if (!roomCode) return;
    const code = roomCode.toUpperCase();
    const result = startGame(code);
    if (!result.success) return socket.emit('poker:error', { message: result.error });
    broadcast(io, code, result.table);
  });

  socket.on('poker:action', async ({ roomCode, action, amount }) => {
    if (!roomCode) return;
    const code = roomCode.toUpperCase();
    const result = playerAction(code, user.id, action, parseInt(amount) || 0);
    if (!result.success) return socket.emit('poker:error', { message: result.error });

    broadcast(io, code, result.table);

    // If showdown, schedule the next hand broadcast
    if (result.table.phase === 'showdown' && result.table.winners) {
      setTimeout(() => {
        const table = getTable(code);
        if (table) broadcast(io, code, table);
      }, 6500);
    }
  });

  socket.on('poker:leave', async ({ roomCode }) => {
    if (!roomCode) return;
    const code = roomCode.toUpperCase();
    const table = getTable(code);
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

    leaveTable(code, user.id);
    socket.leave(`poker:${code}:${user.id}`);
    socket.leave(`poker:${code}:spectator`);

    const updatedTable = getTable(code);
    if (updatedTable) broadcast(io, code, updatedTable);
    else io.to(`poker:${code}:spectator`).emit('poker:tableClosed');
  });

  socket.on('disconnect', async () => {
    // Grace period of 15 seconds: Wait before kicking user and refunding them
    const gracePeriodMs = 15000;

    const timeoutId = setTimeout(async () => {
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
          // Refund remaining stack
          await prisma.user.update({
            where: { id: user.id },
            data: { balance: { increment: player.stack } },
          });
        }
        
        leaveTable(roomCode, user.id);
        pokerDisconnectTimeouts.delete(user.id);

        const updatedTable = getTable(roomCode);
        if (updatedTable) broadcast(io, roomCode, updatedTable);
        else io.to(`poker:${roomCode}:spectator`).emit('poker:tableClosed');
      } catch (err) {
        console.error('Poker disconnect grace cleanup error:', err);
      }
    }, gracePeriodMs);

    pokerDisconnectTimeouts.set(user.id, timeoutId);
  });
}
