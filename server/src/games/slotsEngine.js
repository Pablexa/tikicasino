// TikiCasino - Slots Game Engine
// 5-reel, 3-row slot machine - Simulation only, no real money
import { weightedRandom } from './random.js';

const SYMBOLS = ['cherry', 'lemon', 'bell', 'star', 'diamond', 'seven', 'joker'];
const WEIGHTS = [30, 25, 20, 15, 5, 3, 2]; // Higher weight = more common

// Payout table: symbol + count -> multiplier (applied to bet)
const PAYTABLE = {
  joker_5: 1000,
  seven_5: 500,
  diamond_5: 200,
  joker_4: 100,
  star_5: 100,
  seven_4: 75,
  diamond_4: 50,
  bell_5: 50,
  star_4: 25,
  joker_3: 20,
  seven_3: 15,
  diamond_3: 10,
  bell_4: 10,
  star_3: 5,
  bell_3: 3,
  lemon_5: 3,
  cherry_5: 3,
  lemon_4: 2,
  cherry_4: 2,
  lemon_3: 1,
  cherry_3: 1,
};

const SYMBOL_ITEMS = SYMBOLS.map((value, i) => ({ value, weight: WEIGHTS[i] }));

/**
 * Spin all reels and return the grid (5 reels x 3 rows)
 */
export function spinSlots() {
  const grid = [];
  for (let reel = 0; reel < 5; reel++) {
    const reelSymbols = [];
    for (let row = 0; row < 3; row++) {
      reelSymbols.push(weightedRandom(SYMBOL_ITEMS));
    }
    grid.push(reelSymbols);
  }
  return grid;
}

/**
 * Get all paylines (simplified: just middle row + 4 patterns)
 * Returns array of { line, symbols }
 */
function getPaylines(grid) {
  return [
    // Middle row (main payline)
    { lineId: 0, symbols: [grid[0][1], grid[1][1], grid[2][1], grid[3][1], grid[4][1]] },
    // Top row
    { lineId: 1, symbols: [grid[0][0], grid[1][0], grid[2][0], grid[3][0], grid[4][0]] },
    // Bottom row
    { lineId: 2, symbols: [grid[0][2], grid[1][2], grid[2][2], grid[3][2], grid[4][2]] },
    // Diagonal top-left to bottom-right
    { lineId: 3, symbols: [grid[0][0], grid[1][1], grid[2][2], grid[3][1], grid[4][0]] },
    // Diagonal bottom-left to top-right
    { lineId: 4, symbols: [grid[0][2], grid[1][1], grid[2][0], grid[3][1], grid[4][2]] },
  ];
}

/**
 * Evaluate a payline for wins
 */
function evaluatePayline(symbols) {
  // Count consecutive matching symbols from left
  const firstSymbol = symbols[0];
  let count = 1;
  
  for (let i = 1; i < symbols.length; i++) {
    if (symbols[i] === firstSymbol || symbols[i] === 'joker' || firstSymbol === 'joker') {
      count++;
    } else {
      break;
    }
  }

  if (count < 3) return null;

  // Get the actual symbol (not joker if possible)
  const symbol = firstSymbol === 'joker' 
    ? (symbols.find(s => s !== 'joker') || 'joker')
    : firstSymbol;

  const key = `${symbol}_${count}`;
  const multiplier = PAYTABLE[key];

  if (!multiplier) return null;

  return { symbol, count, multiplier };
}

/**
 * Process a slots spin and calculate total payout
 */
export function processSlotsSpin(betAmount) {
  const grid = spinSlots();
  const paylines = getPaylines(grid);
  const wins = [];
  let totalMultiplier = 0;
  let isJackpot = false;

  for (const { lineId, symbols } of paylines) {
    const result = evaluatePayline(symbols);
    if (result) {
      wins.push({ lineId, ...result });
      totalMultiplier += result.multiplier;
      if (result.symbol === 'joker' && result.count === 5) {
        isJackpot = true;
      }
    }
  }

  const payout = Math.floor(betAmount * totalMultiplier);
  const profit = payout - betAmount;

  return {
    grid,
    wins,
    totalMultiplier,
    payout,
    profit,
    isJackpot,
    isWin: payout > 0,
  };
}

/**
 * Get paytable for display
 */
export function getPaytable() {
  return Object.entries(PAYTABLE).map(([key, multiplier]) => {
    const [symbol, count] = key.split('_');
    return { symbol, count: parseInt(count), multiplier };
  }).sort((a, b) => b.multiplier - a.multiplier);
}
