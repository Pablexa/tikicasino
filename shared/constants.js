// TikiCasino - Shared Constants
// IMPORTANT: FCOINS are fictional points with NO real-world value.

export const APP_NAME = 'TikiCasino';
export const APP_SLOGAN = 'Play fake. Win fake. Flex real.';
export const DISCLAIMER = 'This is a fake casino simulator. FCOINS have no real value. No real money, crypto, deposits or withdrawals are supported.';
export const FCOINS_DISCLAIMER = 'FCOINS are fictional points. They cannot be bought, sold, exchanged, deposited, withdrawn, or converted into money or crypto.';

// FCOINS
export const INITIAL_BONUS_AMOUNT = 10000;
export const EMERGENCY_REFILL_AMOUNT = 1000;
export const EMERGENCY_REFILL_THRESHOLD = 500;
export const EMERGENCY_REFILL_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes

export const DAILY_BONUS = {
  1: 2000,
  2: 2500,
  3: 3000,
  4: 4000,
  5: 5000,
  6: 7500,
  7: 10000,
};
export const DAILY_BONUS_DEFAULT = 2000;
export const DAILY_BONUS_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

// Friend vote refill
export const FRIEND_REFILL_AMOUNT = 3000;

// Room
export const ROOM_CODE_LENGTH = 6;
export const MAX_ROOM_MEMBERS = 16;
export const MIN_BET = 10;
export const MAX_BET = 50000;

// Rate limits
export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
export const MAX_REQUESTS_PER_WINDOW = 100;
export const MAX_LOGIN_ATTEMPTS = 5;
export const MAX_REGISTER_PER_IP_24H = 3;
export const MAX_REGISTER_PER_DEVICE_24H = 2;

// Chat
export const CHAT_MESSAGE_MAX_LENGTH = 300;
export const CHAT_COOLDOWN_MS = 1000; // 1 second between messages
export const CHAT_SPAM_THRESHOLD = 5; // messages in cooldown window

// Crash game
export const CRASH_ROUND_INTERVAL_MS = 15000; // 15 seconds between rounds
export const CRASH_BETTING_WINDOW_MS = 10000; // 10 seconds to place bets
export const CRASH_TICK_INTERVAL_MS = 100; // update every 100ms

// Tokens
export const JWT_EXPIRES_IN = '7d';
export const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Game types
export const GAME_TYPES = {
  BLACKJACK: 'blackjack',
  ROULETTE: 'roulette',
  SLOTS: 'slots',
  CRASH: 'crash',
  POKER: 'poker',
  COINFLIP: 'coinflip',
  DICE: 'dice',
};

// Transaction types
export const TX_TYPES = {
  INITIAL_BONUS: 'initial_bonus',
  DAILY_BONUS: 'daily_bonus',
  EMERGENCY_REFILL: 'emergency_refill',
  FRIEND_REFILL: 'friend_refill',
  BLACKJACK_WIN: 'blackjack_win',
  BLACKJACK_LOSS: 'blackjack_loss',
  BLACKJACK_PUSH: 'blackjack_push',
  BLACKJACK_BLACKJACK: 'blackjack_blackjack',
  ROULETTE_WIN: 'roulette_win',
  ROULETTE_LOSS: 'roulette_loss',
  SLOTS_WIN: 'slots_win',
  SLOTS_LOSS: 'slots_loss',
  CRASH_WIN: 'crash_win',
  CRASH_LOSS: 'crash_loss',
  POKER_WIN: 'poker_win',
  POKER_LOSS: 'poker_loss',
  COINFLIP_WIN: 'coinflip_win',
  COINFLIP_LOSS: 'coinflip_loss',
  DICE_WIN: 'dice_win',
  DICE_LOSS: 'dice_loss',
};

// Socket events
export const SOCKET_EVENTS = {
  // General
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  ERROR: 'error',
  
  // Room
  ROOM_CREATE: 'room:create',
  ROOM_JOIN: 'room:join',
  ROOM_LEAVE: 'room:leave',
  ROOM_KICK: 'room:kick',
  ROOM_UPDATE_SETTINGS: 'room:updateSettings',
  ROOM_STATE: 'room:state',
  ROOM_MEMBER_JOINED: 'room:memberJoined',
  ROOM_MEMBER_LEFT: 'room:memberLeft',
  
  // Chat
  CHAT_MESSAGE: 'chat:message',
  CHAT_SEND: 'chat:send',
  CHAT_HISTORY: 'chat:history',
  
  // User
  USER_UPDATE: 'user:update',
  BALANCE_UPDATE: 'balance:update',
  LEADERBOARD_UPDATE: 'leaderboard:update',
  
  // Blackjack
  BLACKJACK_BET: 'blackjack:bet',
  BLACKJACK_START: 'blackjack:start',
  BLACKJACK_HIT: 'blackjack:hit',
  BLACKJACK_STAND: 'blackjack:stand',
  BLACKJACK_DOUBLE: 'blackjack:double',
  BLACKJACK_NEW_ROUND: 'blackjack:newRound',
  BLACKJACK_STATE: 'blackjack:state',
  
  // Roulette
  ROULETTE_BET: 'roulette:bet',
  ROULETTE_SPIN: 'roulette:spin',
  ROULETTE_RESULT: 'roulette:result',
  ROULETTE_STATE: 'roulette:state',
  
  // Slots
  SLOTS_SPIN: 'slots:spin',
  SLOTS_RESULT: 'slots:result',
  
  // Crash
  CRASH_BET: 'crash:bet',
  CRASH_CASHOUT: 'crash:cashout',
  CRASH_ROUND_START: 'crash:roundStart',
  CRASH_TICK: 'crash:tick',
  CRASH_ROUND_CRASH: 'crash:roundCrash',
  CRASH_HISTORY: 'crash:history',
  CRASH_STATE: 'crash:state',
  
  // Poker
  POKER_JOIN_TABLE: 'poker:joinTable',
  POKER_LEAVE_TABLE: 'poker:leaveTable',
  POKER_START: 'poker:start',
  POKER_ACTION: 'poker:action',
  POKER_STATE: 'poker:state',
  
  // Coinflip
  COINFLIP_PLAY: 'coinflip:play',
  COINFLIP_RESULT: 'coinflip:result',
  
  // Dice
  DICE_PLAY: 'dice:play',
  DICE_RESULT: 'dice:result',
  
  // Friend vote refill
  VOTE_REFILL_REQUEST: 'vote:refillRequest',
  VOTE_REFILL_VOTE: 'vote:refillVote',
  VOTE_REFILL_RESULT: 'vote:refillResult',
};

// Achievements
export const ACHIEVEMENTS = {
  FIRST_WIN: { id: 'first_win', name: 'First Win', description: 'Win your first game' },
  BLACKJACK_MASTER: { id: 'blackjack_master', name: 'Blackjack Master', description: 'Win 10 blackjack hands' },
  CRASH_SURVIVOR: { id: 'crash_survivor', name: 'Crash Survivor', description: 'Cash out at 5x or higher' },
  ROULETTE_LUCKY_SHOT: { id: 'roulette_lucky_shot', name: 'Lucky Shot', description: 'Hit a straight number in roulette' },
  SLOT_JACKPOT: { id: 'slot_jackpot', name: 'Slot Jackpot', description: 'Hit the jackpot in slots' },
  BROKE_BUT_BACK: { id: 'broke_but_back', name: 'Broke But Back', description: 'Claim emergency refill' },
  DAILY_GRINDER: { id: 'daily_grinder', name: 'Daily Grinder', description: 'Claim daily bonus 7 days in a row' },
  ROOM_OWNER: { id: 'room_owner', name: 'Room Owner', description: 'Create your first room' },
};
