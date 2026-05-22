import express from 'express';
import { User, GameHistory, Room } from '../db/models/index.js';
import { requireAuth } from '../middleware/auth.js';
import { Op } from 'sequelize';

const router = express.Router();

// Global leaderboard
router.get('/global', async (req, res) => {
  try {
    const type = req.query.type || 'balance';
    const limit = parseInt(req.query.limit) || 10;

    let orderBy;
    switch (type) {
      case 'wins':
        orderBy = [['stats.gamesWon', 'DESC']];
        break;
      case 'wagered':
        orderBy = [['stats.totalWagered', 'DESC']];
        break;
      case 'profit':
        orderBy = [['stats.totalWon', 'DESC']];
        break;
      case 'balance':
      default:
        orderBy = [['balance', 'DESC']];
    }

    const users = await User.findAll({
      attributes: ['id', 'nickname', 'avatar', 'balance', 'stats', 'createdAt'],
      where: { emailVerified: true, isBanned: false },
      order: orderBy,
      limit
    });

    res.json({ leaderboard: users });
  } catch (error) {
    console.error('Get global leaderboard error:', error);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

// Room leaderboard
router.get('/room/:roomCode', requireAuth, async (req, res) => {
  try {
    const { roomCode } = req.params;

    const room = await Room.findOne({ where: { roomCode: roomCode.toUpperCase() } });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Sort players by balance
    const sortedPlayers = [...room.players].sort((a, b) => b.balance - a.balance);

    res.json({ leaderboard: sortedPlayers });
  } catch (error) {
    console.error('Get room leaderboard error:', error);
    res.status(500).json({ error: 'Failed to get room leaderboard' });
  }
});

export default router;
