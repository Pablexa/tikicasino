import express from 'express';
import { User, Transaction } from '../db/models/index.js';
import { requireAuth, requireVerifiedEmail, requireNotBanned } from '../middleware/auth.js';
import { bonusLimiter } from '../middleware/rateLimit.js';

const router = express.Router();

// Get user profile
router.get('/:userId', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByPk(userId, {
      attributes: ['id', 'nickname', 'avatar', 'balance', 'stats', 'createdAt', 'reputationLevel']
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: 'Failed to get user profile' });
  }
});

// Update profile
router.patch('/profile', requireAuth, async (req, res) => {
  try {
    const { avatar } = req.body;

    if (avatar) {
      req.user.avatar = avatar;
      await req.user.save();
    }

    res.json({ 
      message: 'Profile updated',
      user: {
        id: req.user.id,
        nickname: req.user.nickname,
        avatar: req.user.avatar
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Claim daily bonus
router.post('/claim-daily-bonus', requireAuth, requireVerifiedEmail, requireNotBanned, bonusLimiter, async (req, res) => {
  try {
    if (!req.user.canClaimDailyBonus()) {
      return res.status(400).json({ 
        error: 'Daily bonus already claimed',
        nextClaimAt: new Date(req.user.dailyBonusLastClaimedAt.getTime() + 24 * 60 * 60 * 1000)
      });
    }

    const bonusAmount = 2000;
    const balanceBefore = req.user.balance;

    req.user.balance += bonusAmount;
    req.user.dailyBonusLastClaimedAt = new Date();
    await req.user.save();

    await Transaction.create({
      userId: req.user.id,
      type: 'daily_bonus',
      amount: bonusAmount,
      balanceBefore,
      balanceAfter: req.user.balance
    });

    res.json({
      message: 'Daily bonus claimed!',
      amount: bonusAmount,
      newBalance: req.user.balance
    });
  } catch (error) {
    console.error('Claim daily bonus error:', error);
    res.status(500).json({ error: 'Failed to claim daily bonus' });
  }
});

// Claim emergency refill
router.post('/claim-emergency-refill', requireAuth, requireVerifiedEmail, requireNotBanned, bonusLimiter, async (req, res) => {
  try {
    if (!req.user.canClaimEmergencyRefill()) {
      if (req.user.balance >= 500) {
        return res.status(400).json({ error: 'You have enough balance. Emergency refill is only available when balance is below 500 FCOINS' });
      }
      
      return res.status(400).json({ 
        error: 'Emergency refill on cooldown',
        nextClaimAt: new Date(req.user.emergencyRefillLastClaimedAt.getTime() + 30 * 60 * 1000)
      });
    }

    const refillAmount = 1000;
    const balanceBefore = req.user.balance;

    req.user.balance += refillAmount;
    req.user.emergencyRefillLastClaimedAt = new Date();
    await req.user.save();

    await Transaction.create({
      userId: req.user.id,
      type: 'emergency_refill',
      amount: refillAmount,
      balanceBefore,
      balanceAfter: req.user.balance
    });

    res.json({
      message: 'Emergency refill claimed!',
      amount: refillAmount,
      newBalance: req.user.balance
    });
  } catch (error) {
    console.error('Claim emergency refill error:', error);
    res.status(500).json({ error: 'Failed to claim emergency refill' });
  }
});

// Get transaction history
router.get('/:userId/transactions', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    // Users can only view their own transaction history
    if (userId !== req.user.id) {
      return res.status(403).json({ error: 'Cannot view other users\' transaction history' });
    }

    const transactions = await Transaction.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit
    });

    res.json({ transactions });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Failed to get transactions' });
  }
});

export default router;
