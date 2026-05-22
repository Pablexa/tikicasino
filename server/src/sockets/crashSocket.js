// TikiCasino - Crash Game Socket Handler
import { prisma } from '../db/client.js';
import { CrashEngine } from '../games/crashEngine.js';
import { crashEngines, emitBalanceUpdate } from './index.js';
import { broadcastSystemMessage } from './chatSocket.js';

/**
 * Get or create a crash engine for a room
 */
function getOrCreateCrashEngine(io, roomCode, roomId) {
  if (crashEngines.has(roomCode)) {
    return crashEngines.get(roomCode);
  }

  const engine = new CrashEngine(
    roomCode,
    // onTick
    (data) => {
      io.to(`room:${roomCode}`).emit('crash:tick', data);
    },
    // onCrash
    async (data) => {
      io.to(`room:${roomCode}`).emit('crash:roundCrash', {
        roundId: data.roundId,
        crashPoint: data.crashPoint,
        history: data.history,
      });

      // Process payouts for those who didn't cash out
      for (const result of data.results) {
        if (!result.cashedOut && result.amount > 0) {
          // Already deducted, no payout needed
          await emitBalanceUpdate(io, result.userId);
        }
      }

      await broadcastSystemMessage(io, roomCode, roomId,
        `¡Crash! El cohete explotó en ${data.crashPoint.toFixed(2)}x`).catch(() => {});
    },
    // onRoundStart
    (data) => {
      io.to(`room:${roomCode}`).emit('crash:roundStart', data);
    }
  );

  engine.start();
  crashEngines.set(roomCode, engine);
  return engine;
}

export function setupCrashSocket(io, socket) {
  const user = socket.user;

  socket.on('crash:join', async ({ roomCode }) => {
    try {
      if (!roomCode) return;
      const room = await prisma.room.findUnique({ where: { code: roomCode.toUpperCase() } });
      if (!room) return;

      socket.join(`room:${roomCode}`); // JOIN room channel to receive live ticks!
      const engine = getOrCreateCrashEngine(io, roomCode, room.id);
      socket.emit('crash:state', engine.getState());
    } catch (err) {
      console.error('crash:join error:', err);
    }
  });

  socket.on('crash:bet', async ({ roomCode, amount }) => {
    try {
      const bet = parseInt(amount);
      if (!roomCode || !bet || bet <= 0) {
        socket.emit('crash:error', { message: 'Apuesta inválida.' }); return;
      }
      const room = await prisma.room.findUnique({ where: { code: roomCode.toUpperCase() } });
      if (!room) return;
      const freshUser = await prisma.user.findUnique({ where: { id: user.id }, select: { balance: true } });
      if (freshUser.balance < bet) {
        socket.emit('crash:error', { message: 'CALDICOINS insuficientes.' }); return;
      }

      const engine = getOrCreateCrashEngine(io, roomCode, room.id);
      const result = engine.placeBet(user.id, bet, freshUser.balance);

      if (!result.success) {
        socket.emit('crash:error', { message: result.error });
        return;
      }

      // Deduct bet immediately
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { balance: { decrement: bet } },
        select: { balance: true },
      });
      await prisma.balanceTransaction.create({
        data: {
          userId: user.id,
          roomId: room.id,
          gameType: 'crash',
          type: 'crash_bet',
          amount: -bet,
          balanceBefore: freshUser.balance,
          balanceAfter: updatedUser.balance,
        },
      });

      socket.emit('crash:betPlaced', { amount: bet, balance: updatedUser.balance });
    } catch (err) {
      console.error('crash:bet error:', err);
      socket.emit('crash:error', { message: 'Error del servidor.' });
    }
  });

  socket.on('crash:cashout', async ({ roomCode }) => {
    try {
      const room = await prisma.room.findUnique({ where: { code: roomCode?.toUpperCase() } });
      if (!room) return;

      const engine = crashEngines.get(roomCode);
      if (!engine) return;

      const result = engine.cashout(user.id);
      if (!result.success) {
        socket.emit('crash:error', { message: result.error });
        return;
      }

      // Credit payout
      const freshUser = await prisma.user.findUnique({
        where: { id: user.id }, select: { balance: true },
      });
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { balance: { increment: result.payout } },
        select: { balance: true },
      });
      await prisma.balanceTransaction.create({
        data: {
          userId: user.id,
          roomId: room.id,
          gameType: 'crash',
          type: 'crash_win',
          amount: result.payout,
          balanceBefore: freshUser.balance,
          balanceAfter: updatedUser.balance,
          metadata: JSON.stringify({ multiplier: result.cashoutMultiplier }),
        },
      });

      socket.emit('crash:cashedOut', {
        cashoutMultiplier: result.cashoutMultiplier,
        payout: result.payout,
        balance: updatedUser.balance,
      });

      io.to(`room:${roomCode}`).emit('crash:playerCashedOut', {
        userId: user.id,
        nickname: user.nickname,
        cashoutMultiplier: result.cashoutMultiplier,
        payout: result.payout,
      });
    } catch (err) {
      console.error('crash:cashout error:', err);
    }
  });
}
