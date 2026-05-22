// TikiCasino - Bonuses Routes
// FCOINS are fictional points. No real money involved.
import { Router } from 'express';
import { prisma } from '../db/client.js';
import { requireAuth, requireVerifiedEmail } from '../middleware/auth.js';

export const bonusesRouter = Router();

const EMERGENCY_REFILL_AMOUNT = 1000;
const EMERGENCY_REFILL_THRESHOLD = 500;
const EMERGENCY_REFILL_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes

const DAILY_BONUS_AMOUNTS = {
  1: 2000, 2: 2500, 3: 3000, 4: 4000, 5: 5000, 6: 7500, 7: 10000,
};
const DAILY_BONUS_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

// POST /api/bonuses/daily
bonusesRouter.post('/daily', requireAuth, requireVerifiedEmail, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    if (user.dailyBonusLastClaimedAt) {
      const timeSinceLast = Date.now() - new Date(user.dailyBonusLastClaimedAt).getTime();
      if (timeSinceLast < DAILY_BONUS_COOLDOWN_MS) {
        const nextClaimIn = DAILY_BONUS_COOLDOWN_MS - timeSinceLast;
        return res.status(429).json({
          error: 'Daily bonus already claimed.',
          nextClaimAt: new Date(Date.now() + nextClaimIn).toISOString(),
          nextClaimInMs: nextClaimIn,
        });
      }

      // Check if streak is maintained (claimed within last 48h)
      const streakExpired = timeSinceLast > 48 * 60 * 60 * 1000;
      if (streakExpired) {
        // Reset streak
        await prisma.user.update({
          where: { id: user.id },
          data: { dailyBonusStreak: 0 },
        });
        user.dailyBonusStreak = 0;
      }
    }

    const newStreak = Math.min((user.dailyBonusStreak || 0) + 1, 7);
    const bonusAmount = DAILY_BONUS_AMOUNTS[newStreak] || DAILY_BONUS_AMOUNTS[1];

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          balance: { increment: bonusAmount },
          dailyBonusLastClaimedAt: new Date(),
          dailyBonusStreak: newStreak,
        },
      }),
      prisma.balanceTransaction.create({
        data: {
          userId: user.id,
          type: 'daily_bonus',
          amount: bonusAmount,
          balanceBefore: user.balance,
          balanceAfter: user.balance + bonusAmount,
          metadata: JSON.stringify({ streak: newStreak }),
        },
      }),
    ]);

    res.json({
      message: `Daily bonus claimed! +${bonusAmount.toLocaleString()} FCOINS`,
      amount: bonusAmount,
      streak: newStreak,
      nextClaimAt: new Date(Date.now() + DAILY_BONUS_COOLDOWN_MS).toISOString(),
    });
  } catch (err) {
    console.error('Daily bonus error:', err);
    res.status(500).json({ error: 'Failed to claim daily bonus.' });
  }
});

// POST /api/bonuses/emergency-refill
bonusesRouter.post('/emergency-refill', requireAuth, requireVerifiedEmail, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    if (user.balance >= EMERGENCY_REFILL_THRESHOLD) {
      return res.status(400).json({
        error: `Emergency refill is only available when your balance is below ${EMERGENCY_REFILL_THRESHOLD} FCOINS.`,
        currentBalance: user.balance,
      });
    }

    if (user.emergencyRefillLastClaimedAt) {
      const timeSinceLast = Date.now() - new Date(user.emergencyRefillLastClaimedAt).getTime();
      if (timeSinceLast < EMERGENCY_REFILL_COOLDOWN_MS) {
        const nextClaimIn = EMERGENCY_REFILL_COOLDOWN_MS - timeSinceLast;
        return res.status(429).json({
          error: 'Emergency refill on cooldown.',
          nextClaimAt: new Date(Date.now() + nextClaimIn).toISOString(),
          nextClaimInMs: nextClaimIn,
        });
      }
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          balance: { increment: EMERGENCY_REFILL_AMOUNT },
          emergencyRefillLastClaimedAt: new Date(),
        },
      }),
      prisma.balanceTransaction.create({
        data: {
          userId: user.id,
          type: 'emergency_refill',
          amount: EMERGENCY_REFILL_AMOUNT,
          balanceBefore: user.balance,
          balanceAfter: user.balance + EMERGENCY_REFILL_AMOUNT,
          metadata: JSON.stringify({ reason: 'Emergency refill' }),
        },
      }),
    ]);

    res.json({
      message: `Emergency refill applied! +${EMERGENCY_REFILL_AMOUNT.toLocaleString()} FCOINS`,
      amount: EMERGENCY_REFILL_AMOUNT,
      nextClaimAt: new Date(Date.now() + EMERGENCY_REFILL_COOLDOWN_MS).toISOString(),
    });
  } catch (err) {
    console.error('Emergency refill error:', err);
    res.status(500).json({ error: 'Failed to claim emergency refill.' });
  }
});
