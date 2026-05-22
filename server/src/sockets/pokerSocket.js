// TikiCasino - Poker Socket Handler
import { prisma } from '../db/client.js';
import { pokerDeal, pokerResolve, pokerCleanup } from '../games/pokerEngine.js';

export function setupPokerSocket(io, socket) {
  const user = socket.user;

  socket.on('poker:deal', async ({ roomCode, amount }) => {
    try {
      const bet = parseInt(amount);
      if (!bet || bet < 10) {
        return socket.emit('poker:error', { message: 'Apuesta mínima: 10 CALDICOINS.' });
      }

      const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { balance: true } });
      if (!dbUser) return socket.emit('poker:error', { message: 'Usuario no encontrado.' });
      if (dbUser.balance < bet) return socket.emit('poker:error', { message: 'CALDICOINS insuficientes.' });

      // Deduct bet immediately
      await prisma.user.update({ where: { id: user.id }, data: { balance: { decrement: bet } } });

      const result = pokerDeal(socket.id, bet, dbUser.balance);
      if (!result.success) {
        // Refund
        await prisma.user.update({ where: { id: user.id }, data: { balance: { increment: bet } } });
        return socket.emit('poker:error', { message: result.error });
      }

      socket.emit('poker:state', { hand: result.hand, phase: 'dealt', balance: dbUser.balance - bet });
    } catch (err) {
      console.error('poker:deal error:', err);
      socket.emit('poker:error', { message: 'Error al repartir.' });
    }
  });

  socket.on('poker:draw', async ({ held }) => {
    try {
      const heldArr = Array.isArray(held) ? held.map(Boolean) : [false,false,false,false,false];
      const result = pokerResolve(socket.id, heldArr);
      if (!result.success) {
        return socket.emit('poker:error', { message: result.error });
      }

      const { balanceDelta, result: gameResult, hand } = result;

      // Apply balance change: winAmount goes in (bet was already taken out)
      const dbUser = await prisma.user.update({
        where: { id: user.id },
        data: { balance: { increment: gameResult.winAmount } },
        select: { balance: true },
      });

      // Log transaction
      await prisma.gameHistory.create({
        data: {
          userId: user.id,
          gameType: 'poker',
          betAmount: gameResult.winAmount - balanceDelta, // original bet
          outcome: gameResult.winAmount > 0 ? 'win' : 'loss',
          payout: gameResult.winAmount,
          metadata: JSON.stringify({ handName: gameResult.handName }),
        },
      }).catch(() => {});

      socket.emit('poker:state', {
        hand,
        phase: 'result',
        result: gameResult,
        balance: dbUser.balance,
      });
      socket.emit('balance:update', { balance: dbUser.balance });
    } catch (err) {
      console.error('poker:draw error:', err);
      socket.emit('poker:error', { message: 'Error al resolver la mano.' });
    }
  });

  socket.on('disconnect', () => {
    pokerCleanup(socket.id);
  });
}
