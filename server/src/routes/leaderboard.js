// TikiCasino - Leaderboard Routes
import { Router } from 'express';
import { prisma } from '../db/client.js';
import { requireAuth } from '../middleware/auth.js';

export const leaderboardRouter = Router();

// GET /api/leaderboard/global
leaderboardRouter.get('/global', requireAuth, async (req, res) => {
  try {
    const topByBalance = await prisma.user.findMany({
      where: { emailVerified: true, isBanned: false },
      orderBy: { balance: 'desc' },
      take: 50,
      select: {
        id: true,
        nickname: true,
        avatar: true,
        balance: true,
        reputationLevel: true,
      },
    });

    res.json({ leaderboard: topByBalance });
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Failed to load leaderboard.' });
  }
});

// GET /api/leaderboard/room/:roomCode
leaderboardRouter.get('/room/:roomCode', requireAuth, async (req, res) => {
  try {
    const room = await prisma.room.findUnique({
      where: { code: req.params.roomCode.toUpperCase() },
      include: {
        members: {
          where: { isKicked: false },
          include: {
            user: {
              select: {
                id: true,
                nickname: true,
                avatar: true,
                balance: true,
              },
            },
          },
          orderBy: { user: { balance: 'desc' } },
        },
      },
    });

    if (!room) return res.status(404).json({ error: 'Room not found.' });

    const leaderboard = room.members.map((m, index) => ({
      rank: index + 1,
      user: m.user,
      role: m.role,
    }));

    res.json({ leaderboard });
  } catch (err) {
    console.error('Room leaderboard error:', err);
    res.status(500).json({ error: 'Failed to load room leaderboard.' });
  }
});
