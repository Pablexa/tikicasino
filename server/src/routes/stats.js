// TikiCasino - Stats Routes
import { Router } from 'express';
import { prisma } from '../db/client.js';
import { requireAuth } from '../middleware/auth.js';

export const statsRouter = Router();

// GET /api/stats/me
statsRouter.get('/me', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const transactions = await prisma.balanceTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const wins = transactions.filter(t => t.type.endsWith('_win')).length;
    const losses = transactions.filter(t => t.type.endsWith('_loss')).length;
    const totalWon = transactions
      .filter(t => t.type.endsWith('_win') || t.type.endsWith('_blackjack'))
      .reduce((sum, t) => sum + t.amount, 0);
    const totalLost = transactions
      .filter(t => t.type.endsWith('_loss'))
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const achievements = await prisma.achievement.findMany({
      where: { userId },
    });

    res.json({
      stats: {
        wins,
        losses,
        totalWon,
        totalLost,
        netProfit: totalWon - totalLost,
        recentTransactions: transactions.slice(0, 20),
        achievements: achievements.map(a => a.type),
      },
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Failed to load stats.' });
  }
});

// GET /api/stats/room/:roomCode
statsRouter.get('/room/:roomCode', requireAuth, async (req, res) => {
  try {
    const room = await prisma.room.findUnique({
      where: { code: req.params.roomCode.toUpperCase() },
    });

    if (!room) return res.status(404).json({ error: 'Room not found.' });

    const gameRounds = await prisma.gameRound.count({
      where: { roomId: room.id },
    });

    res.json({
      stats: {
        totalRounds: gameRounds,
        roomId: room.id,
        roomCode: room.code,
      },
    });
  } catch (err) {
    console.error('Room stats error:', err);
    res.status(500).json({ error: 'Failed to load room stats.' });
  }
});
