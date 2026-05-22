// TikiCasino - Coinflip Game Engine
import { randomInt } from './random.js';

/**
 * Play a coinflip game
 * choice: 'heads' | 'tails'
 * Returns result
 */
export function playCoinflip(choice, betAmount, userBalance) {
  if (!['heads', 'tails'].includes(choice)) {
    return { success: false, error: 'Invalid choice. Choose heads or tails.' };
  }
  if (betAmount <= 0) {
    return { success: false, error: 'Bet must be greater than 0.' };
  }
  if (betAmount > userBalance) {
    return { success: false, error: 'Insufficient FCOINS.' };
  }

  const result = randomInt(0, 1) === 0 ? 'heads' : 'tails';
  const win = result === choice;
  const payout = win ? betAmount * 2 : 0;

  return {
    success: true,
    result,
    choice,
    win,
    payout,
    profit: win ? betAmount : -betAmount,
  };
}
