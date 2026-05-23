// TikiCasino - Crash Game Engine
// Simulation only. FCOINS are fictional. No real money.
import { generateCrashPoint } from './random.js';

/**
 * Crash game room state manager
 * Manages round lifecycle: waiting -> betting -> flying -> crashed
 */
export class CrashEngine {
  constructor(roomId, onTick, onCrash, onRoundStart) {
    this.roomId = roomId;
    this.onTick = onTick;
    this.onCrash = onCrash;
    this.onRoundStart = onRoundStart;
    
    this.phase = 'waiting'; // waiting | betting | flying | crashed
    this.multiplier = 1.00;
    this.crashPoint = null;
    this.bets = new Map(); // userId -> { amount, cashedOut, cashoutMultiplier }
    this.history = [];
    this.roundId = 0;
    this.startTime = null;
    this.tickInterval = null;
    this.roundTimeout = null;
    
    this.BETTING_WINDOW_MS = 10000; // 10 seconds to bet
    this.TICK_INTERVAL_MS = 100;    // Update every 100ms
    this.BETWEEN_ROUNDS_MS = 5000; // 5 seconds between rounds
  }

  /**
   * Start the crash game loop
   */
  start() {
    this.scheduleNextRound();
  }

  /**
   * Stop all timers
   */
  stop() {
    if (this.tickInterval) clearInterval(this.tickInterval);
    if (this.roundTimeout) clearTimeout(this.roundTimeout);
  }

  scheduleNextRound() {
    this.phase = 'betting';
    this.multiplier = 1.00;
    this.crashPoint = generateCrashPoint();
    this.bets = new Map();
    this.startTime = null;
    this.roundId++;

    this.onRoundStart({
      roundId: this.roundId,
      phase: 'betting',
      bettingWindowMs: this.BETTING_WINDOW_MS,
    });

    // Start flying after betting window
    this.roundTimeout = setTimeout(() => {
      this.startFlying();
    }, this.BETTING_WINDOW_MS);
  }

  startFlying() {
    this.phase = 'flying';
    this.startTime = Date.now();
    this.multiplier = 1.00;

    this.tickInterval = setInterval(() => {
      const elapsed = Date.now() - this.startTime;
      
      // Multiplier growth formula: starts slow, accelerates
      this.multiplier = Math.pow(Math.E, elapsed * 0.00006);
      this.multiplier = Math.floor(this.multiplier * 100) / 100;

      this.onTick({ multiplier: this.multiplier, roundId: this.roundId });

      if (this.multiplier >= this.crashPoint) {
        this.crash();
      }
    }, this.TICK_INTERVAL_MS);
  }

  crash() {
    clearInterval(this.tickInterval);
    this.tickInterval = null;
    this.phase = 'crashed';

    // Process all bets that didn't cash out
    const results = [];
    for (const [userId, bet] of this.bets.entries()) {
      if (!bet.cashedOut) {
        results.push({
          userId,
          amount: bet.amount,
          cashedOut: false,
          cashoutMultiplier: null,
          payout: 0,
          profit: -bet.amount,
          nickname: bet.nickname,
          avatar: bet.avatar,
        });
      } else {
        results.push({
          userId,
          amount: bet.amount,
          cashedOut: true,
          cashoutMultiplier: bet.cashoutMultiplier,
          payout: bet.payout,
          profit: bet.payout - bet.amount,
          nickname: bet.nickname,
          avatar: bet.avatar,
        });
      }
    }

    // Add to history
    this.history.unshift({
      roundId: this.roundId,
      crashPoint: this.crashPoint,
      timestamp: new Date().toISOString(),
    });
    if (this.history.length > 20) this.history.pop();

    this.onCrash({
      roundId: this.roundId,
      crashPoint: this.crashPoint,
      results,
      history: this.history,
    });

    // Schedule next round
    this.roundTimeout = setTimeout(() => {
      this.scheduleNextRound();
    }, this.BETWEEN_ROUNDS_MS);
  }

  /**
   * Place a bet for a user
   */
  placeBet(userId, amount, userBalance, nickname = 'Jugador', avatar = 'tiki1') {
    if (this.phase !== 'betting') {
      return { success: false, error: 'Betting phase has ended.' };
    }
    if (amount <= 0) {
      return { success: false, error: 'Bet must be greater than 0.' };
    }
    if (amount > userBalance) {
      return { success: false, error: 'CALDICOINS insuficientes.' };
    }
    if (this.bets.has(userId)) {
      return { success: false, error: 'You already placed a bet this round.' };
    }

    this.bets.set(userId, {
      amount,
      cashedOut: false,
      cashoutMultiplier: null,
      payout: 0,
      nickname,
      avatar,
    });

    return { success: true, amount };
  }

  /**
   * Cash out for a user
   */
  cashout(userId) {
    if (this.phase !== 'flying') {
      return { success: false, error: 'Not in flying phase.' };
    }

    const bet = this.bets.get(userId);
    if (!bet) {
      return { success: false, error: 'No active bet.' };
    }
    if (bet.cashedOut) {
      return { success: false, error: 'Already cashed out.' };
    }

    const cashoutMultiplier = this.multiplier;
    const payout = Math.floor(bet.amount * cashoutMultiplier);

    bet.cashedOut = true;
    bet.cashoutMultiplier = cashoutMultiplier;
    bet.payout = payout;

    return {
      success: true,
      cashoutMultiplier,
      payout,
      profit: payout - bet.amount,
    };
  }

  getState() {
    return {
      phase: this.phase,
      multiplier: this.multiplier,
      roundId: this.roundId,
      history: this.history,
      bettingWindowMs: this.BETTING_WINDOW_MS,
    };
  }
}
