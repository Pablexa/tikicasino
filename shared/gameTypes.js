// TikiCasino - Shared Game Types
// These define game configurations and payout structures for simulation only.
// No real money is involved. FCOINS are fictional points.

export const GAME_CONFIGS = {
  blackjack: {
    name: 'Blackjack',
    minBet: 10,
    maxBet: 10000,
    naturalPayout: 1.5, // Blackjack pays 3:2
    winPayout: 1,       // Regular win pays 1:1
    description: 'Beat the dealer without going over 21',
  },
  roulette: {
    name: 'European Roulette',
    minBet: 10,
    maxBet: 5000,
    description: 'Place bets on numbers or colors',
    betTypes: {
      straight: { payout: 35, description: 'Single number' },
      red: { payout: 1, description: 'Red numbers' },
      black: { payout: 1, description: 'Black numbers' },
      even: { payout: 1, description: 'Even numbers' },
      odd: { payout: 1, description: 'Odd numbers' },
      low: { payout: 1, description: '1-18' },
      high: { payout: 1, description: '19-36' },
      dozen1: { payout: 2, description: '1st dozen (1-12)' },
      dozen2: { payout: 2, description: '2nd dozen (13-24)' },
      dozen3: { payout: 2, description: '3rd dozen (25-36)' },
      col1: { payout: 2, description: 'Column 1' },
      col2: { payout: 2, description: 'Column 2' },
      col3: { payout: 2, description: 'Column 3' },
    },
  },
  slots: {
    name: 'Slots',
    minBet: 10,
    maxBet: 1000,
    reels: 5,
    rows: 3,
    symbols: ['cherry', 'lemon', 'bell', 'star', 'diamond', 'seven', 'joker'],
    symbolWeights: [30, 25, 20, 15, 5, 3, 2],
    payouts: {
      joker5: 1000,  // 5 jokers
      seven5: 500,   // 5 sevens
      diamond5: 200,
      joker4: 100,
      star5: 100,
      seven4: 75,
      diamond4: 50,
      bell5: 50,
      star4: 25,
      joker3: 20,
      seven3: 15,
      diamond3: 10,
      bell4: 10,
      star3: 5,
      bell3: 3,
      lemon5: 3,
      cherry5: 3,
      lemon4: 2,
      cherry4: 2,
      lemon3: 1,
      cherry3: 1,
    },
    description: '5-reel, 3-row slot machine',
  },
  crash: {
    name: 'Crash',
    minBet: 10,
    maxBet: 5000,
    tickInterval: 100, // ms
    roundInterval: 15000, // ms
    bettingWindow: 10000, // ms before round starts
    description: 'Cash out before the rocket crashes',
  },
  poker: {
    name: 'Texas Hold\'em',
    minBet: 10,
    maxBet: 50000,
    maxPlayers: 8,
    minPlayers: 2,
    smallBlind: 25,
    bigBlind: 50,
    description: 'Classic Texas Hold\'em poker',
  },
  coinflip: {
    name: 'Coin Flip',
    minBet: 10,
    maxBet: 10000,
    payout: 2,
    sides: ['heads', 'tails'],
    description: 'Heads or tails, double or nothing',
  },
  dice: {
    name: 'Dice',
    minBet: 10,
    maxBet: 10000,
    description: 'Roll the dice, predict higher or lower',
  },
};

// Roulette number colors (European roulette)
export const ROULETTE_COLORS = {
  0: 'green',
  1: 'red', 2: 'black', 3: 'red', 4: 'black', 5: 'red', 6: 'black',
  7: 'red', 8: 'black', 9: 'red', 10: 'black', 11: 'black', 12: 'red',
  13: 'black', 14: 'red', 15: 'black', 16: 'red', 17: 'black', 18: 'red',
  19: 'red', 20: 'black', 21: 'red', 22: 'black', 23: 'red', 24: 'black',
  25: 'red', 26: 'black', 27: 'red', 28: 'black', 29: 'black', 30: 'red',
  31: 'black', 32: 'red', 33: 'black', 34: 'red', 35: 'black', 36: 'red',
};

// Roulette column assignments (3 columns of 12 numbers each)
export const ROULETTE_COLUMNS = {
  col1: [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
  col2: [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
  col3: [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
};

// Card values for poker/blackjack
export const CARD_VALUES = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
  '9': 9, '10': 10, 'J': 10, 'Q': 10, 'K': 10, 'A': 11,
};

export const CARD_RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
export const CARD_SUITS = ['spades', 'hearts', 'diamonds', 'clubs'];

// Poker hand rankings
export const POKER_HANDS = {
  ROYAL_FLUSH: { rank: 10, name: 'Royal Flush' },
  STRAIGHT_FLUSH: { rank: 9, name: 'Straight Flush' },
  FOUR_OF_A_KIND: { rank: 8, name: 'Four of a Kind' },
  FULL_HOUSE: { rank: 7, name: 'Full House' },
  FLUSH: { rank: 6, name: 'Flush' },
  STRAIGHT: { rank: 5, name: 'Straight' },
  THREE_OF_A_KIND: { rank: 4, name: 'Three of a Kind' },
  TWO_PAIR: { rank: 3, name: 'Two Pair' },
  PAIR: { rank: 2, name: 'Pair' },
  HIGH_CARD: { rank: 1, name: 'High Card' },
};
