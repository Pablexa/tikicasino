// TikiCasino - Liar's Bar Engine (Multiplayer Dice Bluffing)
// Ruleset: Perudo/Dudo style — players make bids about total dice showing a face value
// Last player with lives wins

export const MAX_DICE = 5;
export const MAX_LIVES = 3;

// gameId -> game state
const games = new Map();

function rollDice(count) {
  return Array.from({ length: count }, () => Math.floor(Math.random() * 6) + 1);
}

export function createLiarsBarGame(roomCode, playerIds) {
  const players = playerIds.map(id => ({
    id,
    lives: MAX_LIVES,
    dice: rollDice(MAX_DICE),
    eliminated: false,
  }));

  const state = {
    roomCode,
    players,
    currentPlayerIdx: 0,
    currentBid: null, // { quantity, faceValue }
    phase: 'bidding', // bidding | reveal
    round: 1,
    lastAction: null,
    winner: null,
  };

  games.set(roomCode, state);
  return publicState(state);
}

export function getLiarsBarGame(roomCode) {
  return games.get(roomCode) || null;
}

export function makeBid(roomCode, playerId, quantity, faceValue) {
  const state = games.get(roomCode);
  if (!state) return { success: false, error: 'Partida no encontrada.' };
  if (state.phase !== 'bidding') return { success: false, error: 'No es momento de apostar.' };
  if (state.players[state.currentPlayerIdx].id !== playerId) {
    return { success: false, error: 'No es tu turno.' };
  }
  if (faceValue < 1 || faceValue > 6) return { success: false, error: 'Valor de dado inválido (1-6).' };
  if (quantity < 1) return { success: false, error: 'Cantidad mínima: 1.' };

  // Bid must be higher than current bid
  const cur = state.currentBid;
  if (cur) {
    const validRaise = quantity > cur.quantity || (quantity === cur.quantity && faceValue > cur.faceValue);
    if (!validRaise) {
      return { success: false, error: `Debés apostar más que ${cur.quantity}×${cur.faceValue}.` };
    }
  }

  state.currentBid = { quantity, faceValue };
  state.lastAction = { type: 'bid', playerId, quantity, faceValue };
  nextTurn(state);

  return { success: true, state: publicState(state) };
}

export function callLiar(roomCode, playerId) {
  const state = games.get(roomCode);
  if (!state) return { success: false, error: 'Partida no encontrada.' };
  if (state.phase !== 'bidding') return { success: false, error: 'No es momento de dudar.' };
  if (state.players[state.currentPlayerIdx].id !== playerId) {
    return { success: false, error: 'No es tu turno.' };
  }
  if (!state.currentBid) return { success: false, error: 'No hay apuesta para dudar.' };

  // Reveal all dice
  state.phase = 'reveal';

  const { quantity, faceValue } = state.currentBid;
  const allDice = state.players.filter(p => !p.eliminated).flatMap(p => p.dice);
  const actual = allDice.filter(d => d === faceValue).length;

  // Previous player made the bid
  const bidderIdx = prevActiveIdx(state);
  const bidderId = state.players[bidderIdx].id;
  const callerId = playerId;

  let loserIdx;
  if (actual >= quantity) {
    // Bid was correct — caller loses a life
    loserIdx = state.currentPlayerIdx;
  } else {
    // Bid was a lie — bidder loses a life
    loserIdx = bidderIdx;
  }

  state.players[loserIdx].lives--;
  const loser = state.players[loserIdx];
  if (loser.lives <= 0) {
    loser.eliminated = true;
    loser.dice = [];
  }

  const aliveCount = state.players.filter(p => !p.eliminated).length;
  if (aliveCount <= 1) {
    state.winner = state.players.find(p => !p.eliminated)?.id || null;
    state.phase = 'finished';
  }

  state.lastAction = {
    type: 'callLiar',
    callerId,
    bidderId,
    bid: state.currentBid,
    actual,
    loserIdx,
    callerWon: actual < quantity,
  };

  const result = {
    success: true,
    reveal: true,
    allDice: state.players.map(p => ({ id: p.id, dice: p.dice })),
    actual,
    bid: state.currentBid,
    loserIdx,
    loserLives: loser.lives,
    winner: state.winner,
    lastAction: state.lastAction,
  };

  if (state.phase !== 'finished') {
    // Start new round
    newRound(state, loserIdx);
  }

  return { success: true, state: publicState(state), ...result };
}

function newRound(state, startIdx) {
  state.round++;
  state.currentBid = null;
  state.phase = 'bidding';
  // Reroll dice (losers with lives get fewer dice based on... keep simple: all active get MAX_DICE)
  state.players.forEach(p => {
    if (!p.eliminated) {
      const diceCount = Math.max(1, MAX_DICE - (MAX_LIVES - p.lives));
      p.dice = rollDice(diceCount);
    }
  });
  // Start from the loser (if not eliminated), else next active
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

function prevActiveIdx(state) {
  let prev = (state.currentPlayerIdx - 1 + state.players.length) % state.players.length;
  while (state.players[prev].eliminated) {
    prev = (prev - 1 + state.players.length) % state.players.length;
  }
  return prev;
}

// Public state hides other players' dice
export function publicState(state, requestingPlayerId = null) {
  return {
    roomCode: state.roomCode,
    phase: state.phase,
    round: state.round,
    currentBid: state.currentBid,
    currentPlayerIdx: state.currentPlayerIdx,
    currentPlayerId: state.players[state.currentPlayerIdx]?.id,
    winner: state.winner,
    lastAction: state.lastAction,
    players: state.players.map(p => ({
      id: p.id,
      lives: p.lives,
      eliminated: p.eliminated,
      diceCount: p.dice.length,
      // Only reveal own dice (or all on reveal phase)
      dice: (state.phase === 'reveal' || state.phase === 'finished' || p.id === requestingPlayerId)
        ? p.dice : null,
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
  return player ? player.dice : null;
}
