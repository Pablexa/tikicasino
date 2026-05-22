// TikiCasino - Texas Hold'em Engine
// Multiplayer poker: 2-8 players, full betting rounds

const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const SUITS = ['spades','hearts','diamonds','clubs'];
const RANK_VAL = Object.fromEntries(RANKS.map((r, i) => [r, i]));

// ── Deck ─────────────────────────────────────────────────────────────────────
function makeDeck() {
  const deck = [];
  for (const suit of SUITS) for (const rank of RANKS) deck.push({ rank, suit });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

// ── Hand Evaluation (best 5 of up to 7 cards) ────────────────────────────────
function combinations(arr, k) {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [first, ...rest] = arr;
  return [...combinations(rest, k - 1).map(c => [first, ...c]), ...combinations(rest, k)];
}

function scoreHand(cards) {
  const vals = cards.map(c => RANK_VAL[c.rank]).sort((a, b) => b - a);
  const suits = cards.map(c => c.suit);
  const counts = {};
  vals.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
  const groups = Object.values(counts).sort((a, b) => b - a);
  const isFlush = suits.every(s => s === suits[0]);
  const isStraight = vals[0] - vals[4] === 4 && new Set(vals).size === 5;
  const isAceLow = JSON.stringify([...vals].sort((a,b)=>b-a)) === JSON.stringify([12,3,2,1,0]);

  let rank;
  if (isFlush && (isStraight || isAceLow)) rank = vals[0] === 12 && isStraight ? 8 : 8; // SF
  if (isFlush && isStraight && vals[0] === RANK_VAL['A']) rank = 9; // RF
  else if (isFlush && (isStraight || isAceLow)) rank = 8;
  else if (groups[0] === 4) rank = 7;
  else if (groups[0] === 3 && groups[1] === 2) rank = 6;
  else if (isFlush) rank = 5;
  else if (isStraight || isAceLow) rank = 4;
  else if (groups[0] === 3) rank = 3;
  else if (groups[0] === 2 && groups[1] === 2) rank = 2;
  else if (groups[0] === 2) rank = 1;
  else rank = 0;

  return [rank, ...vals];
}

function bestHandOf(holeCards, community) {
  const all = [...holeCards, ...community];
  if (all.length < 5) return { score: [0], cards: all };
  const combos = combinations(all, 5);
  let best = null;
  for (const combo of combos) {
    const score = scoreHand(combo);
    if (!best || score.join('') > best.score.join('')) {
      best = { score, cards: combo };
    }
  }
  return best;
}

const HAND_NAMES = [
  'Carta Alta', 'Par', 'Doble Par', 'Trío', 'Escalera',
  'Color', 'Full House', 'Póker', 'Straight Flush', 'Royal Flush'
];

// ── Game State Machine ────────────────────────────────────────────────────────
const PHASES = ['waiting','preflop','flop','turn','river','showdown'];
const BLINDS = { small: 50, big: 100 };

const tables = new Map(); // roomCode -> TableState

export function getTable(roomCode) { return tables.get(roomCode) || null; }

export function joinTable(roomCode, userId, nickname, buyIn = 2000) {
  if (!tables.has(roomCode)) {
    tables.set(roomCode, {
      roomCode, phase: 'waiting',
      players: [], deck: [], community: [],
      pot: 0, sidePots: [], currentBet: 0,
      dealerIdx: 0, actionIdx: 0, round: 0,
      lastAction: null, winners: null,
    });
  }
  const table = tables.get(roomCode);
  if (table.players.find(p => p.id === userId)) return { success: true, table: publicTable(table, userId) };
  if (table.players.length >= 8) return { success: false, error: 'Mesa llena (máx. 8).' };
  if (table.phase !== 'waiting') return { success: false, error: 'Partida en curso. Esperá la próxima mano.' };

  table.players.push({
    id: userId, nickname, stack: buyIn,
    holeCards: [], bet: 0, totalBet: 0,
    folded: false, allin: false, acted: false,
  });
  return { success: true, table: publicTable(table, userId) };
}

export function leaveTable(roomCode, userId) {
  const table = tables.get(roomCode);
  if (!table) return;
  table.players = table.players.filter(p => p.id !== userId);
  if (table.players.length === 0) tables.delete(roomCode);
}

export function startGame(roomCode) {
  const table = tables.get(roomCode);
  if (!table) return { success: false, error: 'Mesa no encontrada.' };
  if (table.phase !== 'waiting') return { success: false, error: 'Partida ya en curso.' };
  if (table.players.length < 2) return { success: false, error: 'Se necesitan al menos 2 jugadores.' };

  dealNewHand(table);
  return { success: true, table };
}

function dealNewHand(table) {
  table.deck = makeDeck();
  table.community = [];
  table.pot = 0;
  table.currentBet = BLINDS.big;
  table.round++;
  table.winners = null;
  table.lastAction = null;

  // Reset players
  table.players.forEach(p => {
    p.holeCards = [table.deck.pop(), table.deck.pop()];
    p.bet = 0; p.totalBet = 0;
    p.folded = false; p.allin = false; p.acted = false;
  });

  // Blinds
  const n = table.players.length;
  const sbIdx = (table.dealerIdx + 1) % n;
  const bbIdx = (table.dealerIdx + 2) % n;
  postBlind(table, sbIdx, BLINDS.small);
  postBlind(table, bbIdx, BLINDS.big);

  // Action starts left of BB
  table.actionIdx = (bbIdx + 1) % n;
  table.phase = 'preflop';
}

function postBlind(table, idx, amount) {
  const p = table.players[idx];
  const actual = Math.min(amount, p.stack);
  p.stack -= actual; p.bet = actual; p.totalBet = actual;
  table.pot += actual;
  if (p.stack === 0) p.allin = true;
}

export function playerAction(roomCode, userId, action, amount = 0) {
  const table = tables.get(roomCode);
  if (!table) return { success: false, error: 'Mesa no encontrada.' };
  if (!['preflop','flop','turn','river'].includes(table.phase)) {
    return { success: false, error: 'No es momento de apostar.' };
  }
  const p = table.players[table.actionIdx];
  if (!p || p.id !== userId) return { success: false, error: 'No es tu turno.' };
  if (p.folded || p.allin) return { success: false, error: 'No podés actuar.' };

  switch (action) {
    case 'fold':
      p.folded = true;
      p.acted = true;
      table.lastAction = { userId, action: 'fold', nickname: p.nickname };
      break;

    case 'check':
      if (p.bet < table.currentBet) return { success: false, error: 'Debés igualar o subir.' };
      p.acted = true;
      table.lastAction = { userId, action: 'check', nickname: p.nickname };
      break;

    case 'call': {
      const toCall = Math.min(table.currentBet - p.bet, p.stack);
      p.stack -= toCall; p.bet += toCall; p.totalBet += toCall;
      table.pot += toCall;
      if (p.stack === 0) p.allin = true;
      p.acted = true;
      table.lastAction = { userId, action: 'call', amount: toCall, nickname: p.nickname };
      break;
    }

    case 'raise': {
      const minRaise = table.currentBet * 2;
      const raiseTo = Math.max(minRaise, amount);
      const toAdd = Math.min(raiseTo - p.bet, p.stack);
      p.stack -= toAdd; p.bet += toAdd; p.totalBet += toAdd;
      table.pot += toAdd;
      table.currentBet = p.bet;
      if (p.stack === 0) p.allin = true;
      p.acted = true;
      // Others need to act again
      table.players.forEach((op, i) => {
        if (i !== table.actionIdx && !op.folded && !op.allin) op.acted = false;
      });
      table.lastAction = { userId, action: 'raise', amount: p.bet, nickname: p.nickname };
      break;
    }

    case 'allin': {
      const toAdd = p.stack;
      p.stack = 0; p.bet += toAdd; p.totalBet += toAdd;
      table.pot += toAdd;
      if (p.bet > table.currentBet) table.currentBet = p.bet;
      p.allin = true; p.acted = true;
      table.lastAction = { userId, action: 'allin', amount: p.bet, nickname: p.nickname };
      break;
    }

    default:
      return { success: false, error: 'Acción inválida.' };
  }

  advanceAction(table);
  return { success: true, table };
}

function advanceAction(table) {
  const active = table.players.filter(p => !p.folded && !p.allin);
  const remaining = table.players.filter(p => !p.folded);

  // Check if only 1 player left
  if (remaining.length <= 1) { return endHand(table); }

  // Check if betting round is complete
  const bettingDone = active.every(p => p.acted && p.bet >= table.currentBet) || active.length === 0;

  if (bettingDone) {
    nextPhase(table);
  } else {
    // Find next active player
    const n = table.players.length;
    let next = (table.actionIdx + 1) % n;
    let tries = 0;
    while ((table.players[next].folded || table.players[next].allin || table.players[next].acted && table.players[next].bet >= table.currentBet) && tries < n) {
      next = (next + 1) % n;
      tries++;
    }
    table.actionIdx = next;
  }
}

function nextPhase(table) {
  // Reset bets for new street
  table.players.forEach(p => { p.bet = 0; p.acted = false; });
  table.currentBet = 0;

  // Find first active player left of dealer
  const n = table.players.length;
  let startIdx = (table.dealerIdx + 1) % n;
  while (table.players[startIdx].folded || table.players[startIdx].allin) {
    startIdx = (startIdx + 1) % n;
  }
  table.actionIdx = startIdx;

  switch (table.phase) {
    case 'preflop':
      table.community.push(table.deck.pop(), table.deck.pop(), table.deck.pop());
      table.phase = 'flop';
      break;
    case 'flop':
      table.community.push(table.deck.pop());
      table.phase = 'turn';
      break;
    case 'turn':
      table.community.push(table.deck.pop());
      table.phase = 'river';
      break;
    case 'river':
      endHand(table);
      break;
  }
}

function endHand(table) {
  table.phase = 'showdown';
  const remaining = table.players.filter(p => !p.folded);

  if (remaining.length === 1) {
    // Only one player left — wins the pot
    remaining[0].stack += table.pot;
    table.winners = [{ player: remaining[0], amount: table.pot, handName: 'Sin mostrar' }];
  } else {
    // Evaluate all remaining hands
    const evaluated = remaining.map(p => ({
      player: p,
      best: bestHandOf(p.holeCards, table.community),
    }));

    // Find winner(s)
    evaluated.sort((a, b) => {
      const sa = a.best.score.join('').padStart(20, '0');
      const sb = b.best.score.join('').padStart(20, '0');
      return sb.localeCompare(sa);
    });

    const topScore = evaluated[0].best.score.join('');
    const winners = evaluated.filter(e => e.best.score.join('') === topScore);
    const share = Math.floor(table.pot / winners.length);

    table.winners = winners.map(w => {
      w.player.stack += share;
      return {
        player: w.player,
        amount: share,
        handName: HAND_NAMES[w.best.score[0]] || 'Carta Alta',
        bestCards: w.best.cards,
      };
    });
  }

  table.pot = 0;
  table.dealerIdx = (table.dealerIdx + 1) % table.players.length;

  // Remove broke players
  table.players = table.players.filter(p => p.stack > 0);

  // Schedule next hand in 5 seconds if 2+ players remain
  if (table.players.length >= 2) {
    setTimeout(() => {
      if (tables.has(table.roomCode) && table.players.length >= 2) {
        dealNewHand(table);
        table._pendingDeal = true;
      }
    }, 6000);
  } else {
    table.phase = 'waiting';
  }
}

// Public view — hide other players' hole cards
export function publicTable(table, requestingUserId = null) {
  const isShowdown = table.phase === 'showdown';
  return {
    roomCode: table.roomCode,
    phase: table.phase,
    community: table.community,
    pot: table.pot,
    currentBet: table.currentBet,
    round: table.round,
    dealerIdx: table.dealerIdx,
    actionIdx: table.actionIdx,
    currentPlayerId: table.players[table.actionIdx]?.id,
    lastAction: table.lastAction,
    winners: table.winners?.map(w => ({
      playerId: w.player.id,
      nickname: w.player.nickname,
      amount: w.amount,
      handName: w.handName,
      bestCards: w.bestCards,
    })),
    players: table.players.map((p, i) => ({
      id: p.id,
      nickname: p.nickname,
      stack: p.stack,
      bet: p.bet,
      folded: p.folded,
      allin: p.allin,
      isDealer: i === table.dealerIdx,
      isAction: i === table.actionIdx,
      cardCount: p.holeCards.length,
      // Show own cards always; show others' on showdown
      holeCards: (p.id === requestingUserId || isShowdown) && !p.folded ? p.holeCards : null,
    })),
  };
}

export function cleanupTable(roomCode) { tables.delete(roomCode); }
