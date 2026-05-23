// TikiCasino - Liar's Bar Socket Handler
import {
  createLiarsBarGame, getLiarsBarGame, makeBid, callLiar,
  publicState, endLiarsBarGame, getLiarsBarDice
} from '../games/liarsBarEngine.js';

// roomCode -> Set of socket ids waiting to start
const waitingPlayers = new Map(); // roomCode -> Map(userId -> socket)

export function setupLiarsBarSocket(io, socket) {
  const user = socket.user;

  // Player joins the Liar's Bar lobby for a room
  socket.on('liarsbar:join', ({ roomCode }) => {
    if (!roomCode) return;

    if (!waitingPlayers.has(roomCode)) waitingPlayers.set(roomCode, new Map());
    const waiting = waitingPlayers.get(roomCode);
    waiting.set(user.id, socket.id);

    socket.join(`liarsbar:${roomCode}`);

    io.to(`liarsbar:${roomCode}`).emit('liarsbar:lobby', {
      players: [...waiting.entries()].map(([id, sid]) => ({ id, socketId: sid })),
      count: waiting.size,
    });
  });

  // Start a game (any player can start with 2+ in lobby)
  socket.on('liarsbar:start', ({ roomCode }) => {
    const waiting = waitingPlayers.get(roomCode);
    if (!waiting || waiting.size < 2) {
      return socket.emit('liarsbar:error', { message: 'Se necesitan al menos 2 jugadores para empezar.' });
    }
    if (waiting.size > 15) {
      return socket.emit('liarsbar:error', { message: 'Máximo 15 jugadores por partida.' });
    }

    const playerIds = [...waiting.keys()];
    const gameState = createLiarsBarGame(roomCode, playerIds);

    // Send each player their own dice privately
    for (const [playerId, socketId] of waiting.entries()) {
      const myDice = getLiarsBarDice(roomCode, playerId);
      io.to(socketId).emit('liarsbar:myDice', { dice: myDice });
    }

    io.to(`liarsbar:${roomCode}`).emit('liarsbar:state', gameState);
  });

  // Place a bid (play cards)
  socket.on('liarsbar:bid', ({ roomCode, cardIndices }) => {
    const result = makeBid(roomCode, user.id, cardIndices);
    if (!result.success) {
      return socket.emit('liarsbar:error', { message: result.error });
    }
    io.to(`liarsbar:${roomCode}`).emit('liarsbar:state', result.state);
  });

  // Call liar (Mentira!)
  socket.on('liarsbar:callLiar', ({ roomCode }) => {
    const result = callLiar(roomCode, user.id);
    if (!result.success) {
      return socket.emit('liarsbar:error', { message: result.error });
    }

    // Broadcast the reveal to all
    io.to(`liarsbar:${roomCode}`).emit('liarsbar:reveal', {
      allDice: result.allDice,
      bid: result.bid,
      actual: result.actual,
      loserIdx: result.loserIdx,
      loserLives: result.loserLives,
      callerWon: result.callerWon,
      winner: result.winner,
    });

    // Short delay then send next round state
    setTimeout(() => {
      io.to(`liarsbar:${roomCode}`).emit('liarsbar:state', result.state);

      if (!result.winner) {
        // Send new dice to each player privately
        const waiting = waitingPlayers.get(roomCode);
        if (waiting) {
          for (const [playerId, socketId] of waiting.entries()) {
            const myDice = getLiarsBarDice(roomCode, playerId);
            if (myDice) io.to(socketId).emit('liarsbar:myDice', { dice: myDice });
          }
        }
      } else {
        // Clean up finished game
        endLiarsBarGame(roomCode);
        waitingPlayers.delete(roomCode);
      }
    }, 3000);
  });

  // Leave lobby/game
  socket.on('liarsbar:leave', ({ roomCode }) => {
    socket.leave(`liarsbar:${roomCode}`);
    const waiting = waitingPlayers.get(roomCode);
    if (waiting) {
      waiting.delete(user.id);
      if (waiting.size === 0) {
        waitingPlayers.delete(roomCode);
        endLiarsBarGame(roomCode);
      } else {
        io.to(`liarsbar:${roomCode}`).emit('liarsbar:lobby', {
          players: [...waiting.entries()].map(([id]) => ({ id })),
          count: waiting.size,
        });
      }
    }
  });

  socket.on('disconnect', () => {
    for (const [roomCode, waiting] of waitingPlayers.entries()) {
      if (waiting.has(user.id)) {
        waiting.delete(user.id);
        io.to(`liarsbar:${roomCode}`).emit('liarsbar:lobby', {
          players: [...waiting.entries()].map(([id]) => ({ id })),
          count: waiting.size,
        });
      }
    }
  });
}
