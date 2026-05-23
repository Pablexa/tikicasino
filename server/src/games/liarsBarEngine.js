// TikiCasino - Liar's Bar Engine (Steam Edition)
// Cards: 'A' (Ace), 'K' (King), 'Q' (Queen), 'Joker' (Wildcard)
// Includes different tables, wild jokers, and realistic Russian Roulette trigger pulls!

const games = new Map();

function generateDeck() {
  const deck = [];
  // 6 of each face card
  for (let i = 0; i < 6; i++) {
    deck.push('A', 'K', 'Q');
  }
  // 2 jokers
  deck.push('Joker', 'Joker');
  return deck;
}

function shuffle(arr) {
  const newArr = [...arr];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

export function createLiarsBarGame(roomCode, playerIds) {
  let deck = shuffle(generateDeck());

  const players = playerIds.map(id => {
    const hand = [];
    for (let i = 0; i < 5; i++) {
      if (deck.length > 0) hand.push(deck.pop());
    }
    return {
      id,
      lives: 3,
      hand,
      triggerPulls: 0,
      bulletIndex: Math.floor(Math.random() * 6), // 0 to 5 chambers
      eliminated: false,
    };
  });

  // Random table card target ('A', 'K', or 'Q')
  const tableFaces = ['A', 'K', 'Q'];
  const tableCard = tableFaces[Math.floor(Math.random() * tableFaces.length)];

  const state = {
    roomCode,
    players,
    tableCard,
    currentPlayerIdx: 0,
    cardsOnTable: [], // all played cards face down
    lastPlay: null, // { playerId, cards: [], quantity: number }
    phase: 'bidding', // bidding | reveal | finished
    round: 1,
    lastAction: null,
    winner: null,
    deck,
  };

  games.set(roomCode, state);
  return publicState(state);
}

export function getLiarsBarGame(roomCode) {
  return games.get(roomCode) || null;
}

export function makeBid(roomCode, playerId, cardIndices) {
  const state = games.get(roomCode);
  if (!state) return { success: false, error: 'Partida no encontrada.' };
  if (state.phase !== 'bidding') return { success: false, error: 'No se pueden jugar cartas ahora.' };
  
  const currentPlayer = state.players[state.currentPlayerIdx];
  if (currentPlayer.id !== playerId) return { success: false, error: 'No es tu turno.' };
  if (!Array.isArray(cardIndices) || cardIndices.length < 1 || cardIndices.length > 3) {
    return { success: false, error: 'Debés jugar entre 1 y 3 cartas.' };
  }

  // Verify indices are valid
  const hand = currentPlayer.hand;
  for (const idx of cardIndices) {
    if (idx < 0 || idx >= hand.length) return { success: false, error: 'Índices de cartas inválidos.' };
  }

  // Extract played cards
  const playedCards = cardIndices.map(idx => hand[idx]);

  // Remove cards from player's hand (sort descending to not disrupt indexes while splicing)
  const sortedDesc = [...cardIndices].sort((a, b) => b - a);
  sortedDesc.forEach(idx => {
    hand.splice(idx, 1);
  });

  // Update game state
  state.cardsOnTable.push(...playedCards);
  state.lastPlay = {
    playerId,
    cards: playedCards,
    quantity: playedCards.length,
  };

  state.lastAction = {
    type: 'play',
    playerId,
    quantity: playedCards.length,
    claimedCard: state.tableCard,
  };

  nextTurn(state);
  return { success: true, state: publicState(state) };
}

export function callLiar(roomCode, playerId) {
  const state = games.get(roomCode);
  if (!state) return { success: false, error: 'Partida no encontrada.' };
  if (state.phase !== 'bidding') return { success: false, error: 'No se puede retar ahora.' };
  if (!state.lastPlay) return { success: false, error: 'No hay jugadas anteriores.' };
  
  const challenger = state.players[state.currentPlayerIdx];
  if (challenger.id !== playerId) return { success: false, error: 'No es tu turno.' };

  state.phase = 'reveal';

  const playedCards = state.lastPlay.cards;
  const targetCard = state.tableCard;
  
  // A card is a lie if it is not the target card and not a Joker
  const lies = playedCards.filter(card => card !== targetCard && card !== 'Joker');
  const isLiar = lies.length > 0;

  const bidderIdx = state.players.findIndex(p => p.id === state.lastPlay.playerId);
  const bidder = state.players[bidderIdx];

  let loserIdx;
  if (isLiar) {
    // Bidder lied! Bidder loses challenge
    loserIdx = bidderIdx;
  } else {
    // Bidder told the truth! Challenger loses challenge
    loserIdx = state.currentPlayerIdx;
  }

  const loser = state.players[loserIdx];
  
  // Russian Roulette Trigger Pull!
  loser.triggerPulls++;
  const gunFired = (loser.triggerPulls - 1) === loser.bulletIndex;

  if (gunFired) {
    loser.lives--;
    loser.triggerPulls = 0;
    loser.bulletIndex = Math.floor(Math.random() * 6); // re-chamber
    if (loser.lives <= 0) {
      loser.eliminated = true;
      loser.hand = [];
    }
  }

  const alivePlayers = state.players.filter(p => !p.eliminated);
  if (alivePlayers.length <= 1) {
    state.winner = alivePlayers[0]?.id || null;
    state.phase = 'finished';
  }

  state.lastAction = {
    type: 'reveal',
    callerId: playerId,
    bidderId: bidder.id,
    playedCards,
    isLiar,
    loserId: loser.id,
    gunFired,
    loserLives: loser.lives,
    triggerPulls: loser.triggerPulls,
  };

  const revealResult = {
    allDice: state.players.map(p => ({ id: p.id, dice: p.hand })), // keep name compatible
    actual: lies.length, // count of lies
    bid: { faceValue: targetCard, quantity: playedCards.length },
    loserIdx,
    loserLives: loser.lives,
    gunFired,
    winner: state.winner,
    lastAction: state.lastAction,
  };

  if (state.phase !== 'finished') {
    newRound(state, loserIdx);
  }

  return { success: true, state: publicState(state), ...revealResult };
}

function newRound(state, startIdx) {
  state.round++;
  state.cardsOnTable = [];
  state.lastPlay = null;
  state.phase = 'bidding';

  // Deal hands again up to 5 cards per active player
  let deck = shuffle(generateDeck());
  state.players.forEach(p => {
    if (!p.eliminated) {
      const hand = [];
      for (let i = 0; i < 5; i++) {
        if (deck.length > 0) hand.push(deck.pop());
      }
      p.hand = hand;
    }
  });
  state.deck = deck;

  // Next round table face target
  const tableFaces = ['A', 'K', 'Q'];
  state.tableCard = tableFaces[Math.floor(Math.random() * tableFaces.length)];

  // Start round with the loser of previous round (if alive), else next active
  state.currentPlayerIdx = startIdx;
  if (state.players[startIdx].eliminated) nextTurn(state);
}

function nextTurn(state) {
  let next = (state.currentPlayerIdx + 1) % state.players.length;
  while (state.players[next].eliminated && next !== state.currentPlayerIdx) {
    next = (next + 1) % state.players.length;
  }
  state.currentPlayerIdx = next;
}

export function publicState(state, requestingPlayerId = null) {
  return {
    roomCode: state.roomCode,
    phase: state.phase,
    round: state.round,
    tableCard: state.tableCard,
    currentPlayerIdx: state.currentPlayerIdx,
    currentPlayerId: state.players[state.currentPlayerIdx]?.id,
    winner: state.winner,
    lastAction: state.lastAction,
    cardsOnTableCount: state.cardsOnTable.length,
    players: state.players.map(p => ({
      id: p.id,
      lives: p.lives,
      eliminated: p.eliminated,
      diceCount: p.hand.length, // keep key 'diceCount' to avoid UI breaking
      handCount: p.hand.length,
      triggerPulls: p.triggerPulls,
      // Only show hands privately, or reveal everything on completed round
      dice: (state.phase === 'reveal' || state.phase === 'finished' || p.id === requestingPlayerId)
        ? p.hand : null, // keep key 'dice' for UI compatibility
    })),
  };
}

export function endLiarsBarGame(roomCode) {
  games.delete(roomCode);
}

export function getLiarsBarDice(roomCode, playerId) {
  const state = games.get(roomCode);
  if (!state) return null;
  const player = state.players.find(p => p.id === playerId);
  return player ? player.hand : null;
}
