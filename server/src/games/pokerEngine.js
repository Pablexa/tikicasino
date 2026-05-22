// TikiCasino - Video Poker Engine (5-Card Draw, Jacks or Better)
import { createShoe } from './cards.js';

const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const rankVal = (r) => RANKS.indexOf(r);

function freshDeck() {
  const shoe = createShoe(1);
  for (let i = shoe.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shoe[i], shoe[j]] = [shoe[j], shoe[i]];
  }
  return shoe;
}

function evaluateHand(cards) {
  const vals = cards.map(c => rankVal(c.rank)).sort((a, b) => a - b);
  const suits = cards.map(c => c.suit);
  const counts = {};
  vals.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
  const groups = Object.values(counts).sort((a, b) => b - a);
  const isFlush = suits.every(s => s === suits[0]);
  const isStraight = vals[4] - vals[0] === 4 && new Set(vals).size === 5;
  // Ace-low straight (A-2-3-4-5)
  const isAceLowStraight = JSON.stringify(vals) === JSON.stringify([0,1,2,3,12]);

  if (isFlush && isStraight && vals[0] === rankVal('10')) return 'royal_flush';
  if (isFlush && (isStraight || isAceLowStraight)) return 'straight_flush';
  if (groups[0] === 4) return 'four_of_a_kind';
  if (groups[0] === 3 && groups[1] === 2) return 'full_house';
  if (isFlush) return 'flush';
  if (isStraight || isAceLowStraight) return 'straight';
  if (groups[0] === 3) return 'three_of_a_kind';
  if (groups[0] === 2 && groups[1] === 2) return 'two_pair';
  if (groups[0] === 2) {
    // Jacks or better
    const pairVal = Number(Object.keys(counts).find(k => counts[k] === 2));
    if (pairVal >= rankVal('J')) return 'pair';
  }
  return 'high_card';
}

export const POKER_PAYOUTS = {
  royal_flush: 800, straight_flush: 50, four_of_a_kind: 25,
  full_house: 9, flush: 6, straight: 4,
  three_of_a_kind: 3, two_pair: 2, pair: 1, high_card: 0,
};

export const HAND_DISPLAY = {
  royal_flush: 'Royal Flush', straight_flush: 'Straight Flush',
  four_of_a_kind: 'Póker (4 iguales)', full_house: 'Full House',
  flush: 'Color', straight: 'Escalera', three_of_a_kind: 'Trío',
  two_pair: 'Doble Par', pair: 'Par (J o mejor)', high_card: 'Carta Alta',
};

// Store hand + deck per session (in-memory per socket)
const sessions = new Map(); // socketId -> { deck, hand, bet }

export function pokerDeal(socketId, bet, userBalance) {
  if (bet <= 0) return { success: false, error: 'La apuesta debe ser mayor a 0.' };
  if (bet > userBalance) return { success: false, error: 'CALDICOINS insuficientes.' };

  const deck = freshDeck();
  const hand = deck.splice(0, 5);
  sessions.set(socketId, { deck, hand, bet });

  return { success: true, hand, phase: 'dealt' };
}

export function pokerDraw(socketId) {
  const session = sessions.get(socketId);
  if (!session) return { success: false, error: 'No hay sesión activa. Repartí primero.' };

  return { success: true, session };
}

export function pokerResolve(socketId, held) {
  const session = sessions.get(socketId);
  if (!session) return { success: false, error: 'Sesión no encontrada.' };

  const { deck, hand, bet } = session;

  // Replace non-held cards from the remaining deck
  let deckIdx = 0;
  const finalHand = hand.map((card, i) => {
    if (held[i]) return card;
    return deck[deckIdx++];
  });

  const handName = evaluateHand(finalHand);
  const multiplier = POKER_PAYOUTS[handName] || 0;
  const winAmount = multiplier * bet;

  sessions.delete(socketId);

  return {
    success: true,
    hand: finalHand,
    phase: 'result',
    result: { handName, multiplier, winAmount },
    balanceDelta: winAmount - bet, // negative if loss
  };
}

export function pokerCleanup(socketId) {
  sessions.delete(socketId);
}
