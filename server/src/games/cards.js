// TikiCasino - Card Utilities
import { shuffleArray } from './random.js';

const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

/**
 * Create a standard 52-card deck
 */
export function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit, id: `${rank}-${suit}` });
    }
  }
  return deck;
}

/**
 * Create and shuffle multiple decks (shoe)
 */
export function createShoe(numDecks = 6) {
  const cards = [];
  for (let i = 0; i < numDecks; i++) {
    cards.push(...createDeck());
  }
  return shuffleArray(cards);
}

/**
 * Get numeric value of a card for blackjack
 * Aces initially count as 11
 */
export function blackjackCardValue(card) {
  if (['J', 'Q', 'K'].includes(card.rank)) return 10;
  if (card.rank === 'A') return 11;
  return parseInt(card.rank);
}

/**
 * Calculate blackjack hand value (handles soft aces)
 */
export function blackjackHandValue(hand) {
  let total = 0;
  let aces = 0;

  for (const card of hand) {
    const val = blackjackCardValue(card);
    total += val;
    if (card.rank === 'A') aces++;
  }

  // Reduce aces from 11 to 1 while busting
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }

  return total;
}

/**
 * Check if hand is a natural blackjack (Ace + 10-value)
 */
export function isBlackjack(hand) {
  return hand.length === 2 && blackjackHandValue(hand) === 21;
}

/**
 * Check if hand is bust (> 21)
 */
export function isBust(hand) {
  return blackjackHandValue(hand) > 21;
}

/**
 * Get card rank index for poker comparisons
 */
export function rankIndex(rank) {
  return RANKS.indexOf(rank);
}

/**
 * Compare two cards by rank
 */
export function compareRank(a, b) {
  return rankIndex(a.rank) - rankIndex(b.rank);
}
