// TikiCasino - Dice Game Engine
import { randomInt } from './random.js';

/**
 * Play dice game
 * direction: 'higher' | 'lower'
 * target: 1-100 (the target number to roll higher or lower than)
 * betAmount: amount to bet
 */
export function playDice(target, direction, betAmount, userBalance) {
  target = parseInt(target);
  
  if (!['higher', 'lower'].includes(direction)) {
    return { success: false, error: 'Direction must be higher or lower.' };
  }
  if (isNaN(target) || target < 2 || target > 99) {
    return { success: false, error: 'Target must be between 2 and 99.' };
  }
  if (betAmount <= 0) {
    return { success: false, error: 'Bet must be greater than 0.' };
  }
  if (betAmount > userBalance) {
    return { success: false, error: 'Insufficient FCOINS.' };
  }

  const roll = randomInt(1, 100);
  
  let win;
  if (direction === 'higher') {
    win = roll > target;
  } else {
    win = roll < target;
  }

  // Calculate multiplier based on probability
  let winChance;
  if (direction === 'higher') {
    winChance = (100 - target) / 100;
  } else {
    winChance = (target - 1) / 100;
  }

  // House edge ~2%
  const multiplier = winChance > 0 ? Math.floor((0.98 / winChance) * 100) / 100 : 0;
  const payout = win ? Math.floor(betAmount * multiplier) : 0;

  return {
    success: true,
    roll,
    target,
    direction,
    win,
    multiplier,
    payout,
    profit: win ? payout - betAmount : -betAmount,
    winChance: Math.round(winChance * 100),
  };
}

/**
 * Calculate what multiplier you'd get for given target and direction
 */
export function getDiceMultiplier(target, direction) {
  const t = parseInt(target);
  if (isNaN(t) || t < 2 || t > 99) return null;

  let winChance;
  if (direction === 'higher') {
    winChance = (100 - t) / 100;
  } else {
    winChance = (t - 1) / 100;
  }

  if (winChance <= 0 || winChance >= 1) return null;
  const multiplier = Math.floor((0.98 / winChance) * 100) / 100;
  return { multiplier, winChance: Math.round(winChance * 100) };
}
