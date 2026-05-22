// TikiCasino - Users Routes
import { Router } from 'express';
import { prisma } from '../db/client.js';
import { requireAuth } from '../middleware/auth.js';

export const usersRouter = Router();

// GET /api/users/me
usersRouter.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        nickname: true,
        avatar: true,
        balance: true,
        createdAt: true,
        lastLoginAt: true,
        dailyBonusLastClaimedAt: true,
        dailyBonusStreak: true,
        emergencyRefillLastClaimedAt: true,
        reputationLevel: true,
        _count: {
          select: {
            achievements: true,
          },
        },
      },
    });
    res.json({ user });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Failed to get user.' });
  }
});

// PATCH /api/users/me
usersRouter.patch('/me', requireAuth, async (req, res) => {
  try {
    const { avatar } = req.body;
    const VALID_AVATARS = ['tiki1', 'tiki2', 'tiki3', 'tiki4', 'tiki5', 'tiki6', 'tiki7', 'tiki8'];

    const updateData = {};
    if (avatar && VALID_AVATARS.includes(avatar)) {
      updateData.avatar = avatar;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update.' });
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: { id: true, nickname: true, avatar: true, balance: true },
    });

    res.json({ user });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Failed to update user.' });
  }
});

// GET /api/users/:id
usersRouter.get('/:id', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        nickname: true,
        avatar: true,
        createdAt: true,
        reputationLevel: true,
        _count: {
          select: { achievements: true },
        },
      },
    });

    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ user });
  } catch (err) {
    console.error('Get user by ID error:', err);
    res.status(500).json({ error: 'Failed to get user.' });
  }
});
