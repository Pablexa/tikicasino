// TikiCasino - Roulette Game Engine
// European Roulette (0-36) - Simulation only, no real money
import { randomInt } from './random.js';
import { ROULETTE_COLORS, ROULETTE_COLUMNS } from '../../../shared/gameTypes.js';

/**
 * Spin the roulette wheel
 * Returns the winning number (0-36)
 */
export function spinRoulette() {
  return randomInt(0, 36);
}

/**
 * Evaluate a bet against the winning number
 * Returns { win: boolean, payout: number (multiplier) }
 */
export function evaluateRouletteBet(betType, betValue, winningNumber) {
  const color = ROULETTE_COLORS[winningNumber];
  const isZero = winningNumber === 0;

  switch (betType) {
    case 'straight':
      // Single number bet pays 35:1
      if (parseInt(betValue) === winningNumber) {
        return { win: true, payout: 36 }; // bet + 35x profit
      }
      return { win: false, payout: 0 };

    case 'red':
      if (!isZero && color === 'red') return { win: true, payout: 2 };
      return { win: false, payout: 0 };

    case 'black':
      if (!isZero && color === 'black') return { win: true, payout: 2 };
      return { win: false, payout: 0 };

    case 'even':
      if (!isZero && winningNumber % 2 === 0) return { win: true, payout: 2 };
      return { win: false, payout: 0 };

    case 'odd':
      if (!isZero && winningNumber % 2 !== 0) return { win: true, payout: 2 };
      return { win: false, payout: 0 };

    case 'low': // 1-18
      if (!isZero && winningNumber >= 1 && winningNumber <= 18) return { win: true, payout: 2 };
      return { win: false, payout: 0 };

    case 'high': // 19-36
      if (!isZero && winningNumber >= 19 && winningNumber <= 36) return { win: true, payout: 2 };
      return { win: false, payout: 0 };

    case 'dozen1': // 1-12
      if (!isZero && winningNumber >= 1 && winningNumber <= 12) return { win: true, payout: 3 };
      return { win: false, payout: 0 };

    case 'dozen2': // 13-24
      if (!isZero && winningNumber >= 13 && winningNumber <= 24) return { win: true, payout: 3 };
      return { win: false, payout: 0 };

    case 'dozen3': // 25-36
      if (!isZero && winningNumber >= 25 && winningNumber <= 36) return { win: true, payout: 3 };
      return { win: false, payout: 0 };

    case 'col1':
      if (!isZero && ROULETTE_COLUMNS.col1.includes(winningNumber)) return { win: true, payout: 3 };
      return { win: false, payout: 0 };

    case 'col2':
      if (!isZero && ROULETTE_COLUMNS.col2.includes(winningNumber)) return { win: true, payout: 3 };
      return { win: false, payout: 0 };

    case 'col3':
      if (!isZero && ROULETTE_COLUMNS.col3.includes(winningNumber)) return { win: true, payout: 3 };
      return { win: false, payout: 0 };

    default:
      return { win: false, payout: 0 };
  }
}

/**
 * Process all bets for a given spin result
 * bets: [{ type, value, amount, userId }]
 */
export function processRouletteBets(bets, winningNumber) {
  const results = [];
  
  for (const bet of bets) {
    const { win, payout } = evaluateRouletteBet(bet.type, bet.value, winningNumber);
    const payoutAmount = win ? bet.amount * payout : 0;
    
    results.push({
      userId: bet.userId,
      betType: bet.type,
      betValue: bet.value,
      betAmount: bet.amount,
      win,
      payout: payoutAmount,
      profit: win ? payoutAmount - bet.amount : -bet.amount,
    });
  }
  
  return results;
}

/**
 * Get number color
 */
export function getRouletteColor(num) {
  return ROULETTE_COLORS[num] || 'green';
}
