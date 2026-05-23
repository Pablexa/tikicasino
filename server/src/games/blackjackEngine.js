// TikiCasino - Blackjack Game Engine
// Simulation only. FCOINS are fictional points with no real value.
import { createShoe, blackjackHandValue, isBlackjack, isBust } from './cards.js';

/**
 * Create a new blackjack game state
 */
export function createBlackjackState() {
  return {
    shoe: createShoe(6),
    shoePosition: 0,
    phase: 'betting', // betting | playing | dealer | result
    playerHand: [],
    dealerHand: [],
    bet: 0,
    result: null, // 'win' | 'loss' | 'push' | 'blackjack'
    payout: 0,
    canDouble: false,
  };
}

/**
 * Deal a card from the shoe
 */
function dealCard(state) {
  if (state.shoePosition >= state.shoe.length - 10) {
    // Reshuffle shoe when running low
    state.shoe = createShoe(6);
    state.shoePosition = 0;
  }
  return state.shoe[state.shoePosition++];
}

/**
 * Place bet and start a round
 */
export function blackjackBet(state, betAmount, userBalance) {
  if (state.phase !== 'betting') {
    return { success: false, error: 'Not in betting phase.' };
  }
  if (betAmount <= 0) {
    return { success: false, error: 'Bet must be greater than 0.' };
  }
  if (betAmount > userBalance) {
    return { success: false, error: 'CALDICOINS insuficientes.' };
  }

  // Deal initial cards
  state.bet = betAmount;
  state.playerHand = [dealCard(state), dealCard(state)];
  state.dealerHand = [dealCard(state), dealCard(state)];
  state.result = null;
  state.payout = 0;
  state.canDouble = userBalance >= betAmount * 2;

  const playerValue = blackjackHandValue(state.playerHand);

  // Check for natural blackjack
  if (isBlackjack(state.playerHand)) {
    const dealerBJ = isBlackjack(state.dealerHand);
    if (dealerBJ) {
      // Push
      state.result = 'push';
      state.payout = betAmount;
      state.phase = 'result';
    } else {
      // Player blackjack pays 3:2
      state.result = 'blackjack';
      state.payout = Math.floor(betAmount * 2.5);
      state.phase = 'result';
    }
    return { success: true, state: sanitizeState(state) };
  }

  state.phase = 'playing';
  return { success: true, state: sanitizeState(state) };
}

/**
 * Player hits (takes another card)
 */
export function blackjackHit(state) {
  if (state.phase !== 'playing') {
    return { success: false, error: 'Not in playing phase.' };
  }

  state.playerHand.push(dealCard(state));
  state.canDouble = false;

  if (isBust(state.playerHand)) {
    state.result = 'bust';
    state.payout = 0;
    state.phase = 'result';
  }

  return { success: true, state: sanitizeState(state) };
}

/**
 * Player stands - dealer plays
 */
export function blackjackStand(state) {
  if (state.phase !== 'playing') {
    return { success: false, error: 'Not in playing phase.' };
  }

  state.phase = 'dealer';
  return dealerPlay(state);
}

/**
 * Player doubles down
 */
export function blackjackDouble(state, userBalance) {
  if (state.phase !== 'playing') {
    return { success: false, error: 'Not in playing phase.' };
  }
  if (!state.canDouble) {
    return { success: false, error: 'Cannot double down.' };
  }
  if (userBalance < state.bet * 2) {
    return { success: false, error: 'CALDICOINS insuficientes para doblar.' };
  }

  state.bet *= 2;
  state.playerHand.push(dealCard(state));
  state.canDouble = false;

  if (isBust(state.playerHand)) {
    state.result = 'bust';
    state.payout = 0;
    state.phase = 'result';
    return { success: true, state: sanitizeState(state), extraBet: state.bet / 2 };
  }

  state.phase = 'dealer';
  const result = dealerPlay(state);
  return { ...result, extraBet: state.bet / 2 };
}

/**
 * Dealer plays (hits until >= 17)
 */
function dealerPlay(state) {
  while (blackjackHandValue(state.dealerHand) < 17) {
    state.dealerHand.push(dealCard(state));
  }

  const playerValue = blackjackHandValue(state.playerHand);
  const dealerValue = blackjackHandValue(state.dealerHand);

  if (isBust(state.dealerHand)) {
    state.result = 'win';
    state.payout = state.bet * 2;
  } else if (playerValue > dealerValue) {
    state.result = 'win';
    state.payout = state.bet * 2;
  } else if (playerValue === dealerValue) {
    state.result = 'push';
    state.payout = state.bet;
  } else {
    state.result = 'loss';
    state.payout = 0;
  }

  state.phase = 'result';
  return { success: true, state: sanitizeState(state) };
}

/**
 * Reset for new round
 */
export function blackjackNewRound(state) {
  state.phase = 'betting';
  state.playerHand = [];
  state.dealerHand = [];
  state.bet = 0;
  state.result = null;
  state.payout = 0;
  state.canDouble = false;
  return { success: true, state: sanitizeState(state) };
}

/**
 * Return state with dealer hole card hidden when in playing phase
 */
function sanitizeState(state) {
  const dealerHand = state.phase === 'playing'
    ? [state.dealerHand[0], { rank: '?', suit: '?', id: 'hidden', hidden: true }]
    : state.dealerHand;

  return {
    phase: state.phase,
    playerHand: state.playerHand,
    dealerHand,
    playerValue: blackjackHandValue(state.playerHand),
    dealerValue: state.phase !== 'playing' ? blackjackHandValue(state.dealerHand) : null,
    bet: state.bet,
    result: state.result,
    payout: state.payout,
    canDouble: state.canDouble,
  };
}

export { sanitizeState as getBlackjackState };
