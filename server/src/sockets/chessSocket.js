// TikiCasino - Chess Socket Handler
import { Chess } from 'chess.js';
import { prisma } from '../db/client.js';
import { emitBalanceUpdate } from './index.js';
import { broadcastSystemMessage } from './chatSocket.js';

// Map of roomCode -> Chess game round state
const chessGames = new Map();

function getBoardFromChess(chess) {
  const board = [];
  const internalBoard = chess.board();
  for (let r = 0; r < 8; r++) {
    const row = [];
    for (let c = 0; c < 8; c++) {
      const piece = internalBoard[r][c];
      if (!piece) {
        row.push(null);
      } else {
        // Uppercase for white, lowercase for black
        const char = piece.type.toUpperCase();
        row.push(piece.color === 'w' ? char : char.toLowerCase());
      }
    }
    board.push(row);
  }
  return board;
}

function coordsToSquare(row, col) {
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
  return files[col] + ranks[row];
}

function getOrCreateChessGame(roomCode) {
  const code = roomCode.toUpperCase();
  if (!chessGames.has(code)) {
    const chessInstance = new Chess();
    chessGames.set(code, {
      white: null,        // { userId, nickname, avatar }
      black: null,        // { userId, nickname, avatar }
      betAmount: 0,       // Required bet to join
      activeBetPool: 0,   // Total bet pool
      status: 'waiting',  // 'waiting', 'playing', 'finished'
      winner: null,       // userId of the winner
      turn: 'white',      // 'white' or 'black'
      chess: chessInstance,
      board: getBoardFromChess(chessInstance),
      fen: chessInstance.fen(),
      movesHistory: [],
      timers: { white: 600, black: 600 }, // 10 minutes each
      timerIntervalId: null,
      drawOfferedBy: null // userId
    });
  }
  return chessGames.get(code);
}

function broadcastChessState(io, roomCode, game) {
  io.to(`chess:${roomCode.toUpperCase()}`).emit('chess:state', {
    white: game.white,
    black: game.black,
    betAmount: game.betAmount,
    activeBetPool: game.activeBetPool,
    status: game.status,
    winner: game.winner,
    turn: game.turn,
    board: game.board,
    fen: game.fen,
    movesHistory: game.movesHistory,
    timers: game.timers,
    drawOfferedBy: game.drawOfferedBy
  });
}

async function deductUserBet(userId, amount, roomId) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { balance: true } });
  if (!user || user.balance < amount) return null;
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { balance: { decrement: amount } },
    select: { balance: true }
  });
  await prisma.balanceTransaction.create({
    data: { userId, roomId, gameType: 'chess', type: 'chess_bet', amount: -amount, balanceBefore: user.balance, balanceAfter: updatedUser.balance }
  });
  return updatedUser.balance;
}

async function creditUserPayout(userId, amount, type, roomId) {
  if (amount <= 0) return;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { balance: true } });
  if (!user) return;
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { balance: { increment: amount } },
    select: { balance: true }
  });
  await prisma.balanceTransaction.create({
    data: { userId, roomId, gameType: 'chess', type, amount, balanceBefore: user.balance, balanceAfter: updatedUser.balance }
  });
}

export function setupChessSocket(io, socket) {
  const user = socket.user;

  socket.on('chess:join', ({ roomCode }) => {
    if (!roomCode) return;
    const code = roomCode.toUpperCase();
    
    // Clear any old rooms to prevent crosstalk
    for (const r of socket.rooms) {
      if (r.startsWith('chess:') && r !== `chess:${code}`) {
        socket.leave(r);
      }
    }
    
    socket.join(`chess:${code}`);
    
    const game = getOrCreateChessGame(code);
    broadcastChessState(io, code, game);
  });

  socket.on('chess:sit', async ({ roomCode, color, bet }) => {
    try {
      if (!roomCode || (color !== 'white' && color !== 'black')) return;
      const code = roomCode.toUpperCase();
      const game = getOrCreateChessGame(code);
      const betVal = Math.max(0, parseInt(bet) || 0);

      const room = await prisma.room.findUnique({ where: { code } });
      if (!room) return;

      if (game.status === 'playing') {
        socket.emit('chess:error', { message: 'La partida ya está en curso.' });
        return;
      }

      // Check if user is already sitting on the other side
      if (color === 'white' && game.black?.userId === user.id) {
        socket.emit('chess:error', { message: 'Ya estás sentado en las piezas negras.' });
        return;
      }
      if (color === 'black' && game.white?.userId === user.id) {
        socket.emit('chess:error', { message: 'Ya estás sentado en las piezas blancas.' });
        return;
      }

      // If sitting, deduct bet
      if (betVal > 0) {
        const freshUser = await prisma.user.findUnique({ where: { id: user.id }, select: { balance: true } });
        if (freshUser.balance < betVal) {
          socket.emit('chess:error', { message: 'CALDICOINS insuficientes.' });
          return;
        }

        // If the other player is already seated with a bet, we must match it!
        if (color === 'white' && game.black && game.betAmount > 0 && betVal !== game.betAmount) {
          socket.emit('chess:error', { message: `Debes igualar la apuesta de ${game.betAmount} CALDICOINS del rival.` });
          return;
        }
        if (color === 'black' && game.white && game.betAmount > 0 && betVal !== game.betAmount) {
          socket.emit('chess:error', { message: `Debes igualar la apuesta de ${game.betAmount} CALDICOINS del rival.` });
          return;
        }
      }

      // Sit the player
      if (color === 'white') {
        if (game.white) {
          socket.emit('chess:error', { message: 'El asiento blanco ya está ocupado.' });
          return;
        }
        game.white = { userId: user.id, nickname: user.nickname, avatar: user.avatar };
      } else {
        if (game.black) {
          socket.emit('chess:error', { message: 'El asiento negro ya está ocupado.' });
          return;
        }
        game.black = { userId: user.id, nickname: user.nickname, avatar: user.avatar };
      }

      // Deduct bet if applicable
      if (betVal > 0) {
        const newBalance = await deductUserBet(user.id, betVal, room.id);
        if (newBalance !== null) {
          game.betAmount = betVal;
          game.activeBetPool += betVal;
          await emitBalanceUpdate(io, user.id);
        }
      }

      // Start the game if both are sat
      if (game.white && game.black) {
        // Reset chess.js instance for clean start
        game.chess = new Chess();
        game.board = getBoardFromChess(game.chess);
        game.fen = game.chess.fen();
        game.movesHistory = [];
        game.status = 'playing';
        game.turn = 'white';
        game.timers = { white: 600, black: 600 };
        game.drawOfferedBy = null;

        // Clear existing interval
        if (game.timerIntervalId) clearInterval(game.timerIntervalId);

        // Timers loop
        game.timerIntervalId = setInterval(async () => {
          if (game.status !== 'playing') {
            clearInterval(game.timerIntervalId);
            return;
          }

          game.timers[game.turn]--;

          if (game.timers[game.turn] <= 0) {
            // Time out win!
            clearInterval(game.timerIntervalId);
            game.status = 'finished';
            const winnerColor = game.turn === 'white' ? 'black' : 'white';
            const winnerPlayer = game[winnerColor];
            const loserPlayer = game[game.turn];
            game.winner = winnerPlayer.userId;

            if (game.activeBetPool > 0) {
              await creditUserPayout(winnerPlayer.userId, game.activeBetPool, 'chess_win', room.id);
              await emitBalanceUpdate(io, winnerPlayer.userId);
            }

            await broadcastSystemMessage(io, code, room.id, 
              `⏱️ ¡Ajedrez: ${winnerPlayer.nickname} ganó por tiempo contra ${loserPlayer.nickname}!`);
          }

          broadcastChessState(io, code, game);
        }, 1000);

        await broadcastSystemMessage(io, code, room.id, 
          `⚔️ ¡Comenzó el duelo de Ajedrez entre ${game.white.nickname} y ${game.black.nickname}! Bolsa de Apuestas: ${game.activeBetPool.toLocaleString()} C.`);
      }

      broadcastChessState(io, code, game);
    } catch (err) {
      console.error('chess:sit error:', err);
    }
  });

  socket.on('chess:move', async ({ roomCode, fromRow, fromCol, toRow, toCol }) => {
    try {
      if (!roomCode) return;
      const code = roomCode.toUpperCase();
      const game = chessGames.get(code);
      if (!game || game.status !== 'playing') return;

      const room = await prisma.room.findUnique({ where: { code } });
      if (!room) return;

      // Validate turn
      const myColor = game.white?.userId === user.id ? 'white' : game.black?.userId === user.id ? 'black' : null;
      if (!myColor || game.turn !== myColor) {
        socket.emit('chess:error', { message: 'No es tu turno de mover.' });
        return;
      }

      // Convert grid coordinates to chess squares
      const fromSquare = coordsToSquare(fromRow, fromCol);
      const toSquare = coordsToSquare(toRow, toCol);

      // Check if it's a pawn promotion
      const piece = game.chess.get(fromSquare);
      let promotion = undefined;
      if (piece && piece.type === 'p') {
        const targetRank = toSquare[1];
        if (targetRank === '8' || targetRank === '1') {
          promotion = 'q'; // Auto-promote to Queen for fluid social gaming
        }
      }

      // Try making the move
      let moveResult = null;
      try {
        moveResult = game.chess.move({
          from: fromSquare,
          to: toSquare,
          promotion: promotion
        });
      } catch (err) {
        socket.emit('chess:error', { message: 'Movimiento no permitido por las reglas del ajedrez.' });
        return;
      }

      if (!moveResult) {
        socket.emit('chess:error', { message: 'Movimiento no permitido.' });
        return;
      }

      // Sync internal board representation and FEN
      game.board = getBoardFromChess(game.chess);
      game.fen = game.chess.fen();
      game.drawOfferedBy = null;
      game.movesHistory.push(moveResult.san);

      // Validate game state
      if (game.chess.isGameOver()) {
        game.status = 'finished';
        if (game.timerIntervalId) clearInterval(game.timerIntervalId);

        let systemMessage = '';
        if (game.chess.isCheckmate()) {
          const winningColor = game.chess.turn() === 'w' ? 'black' : 'white';
          const winnerPlayer = game[winningColor];
          const loserPlayer = game[game.chess.turn() === 'w' ? 'white' : 'black'];
          game.winner = winnerPlayer.userId;

          if (game.activeBetPool > 0) {
            await creditUserPayout(winnerPlayer.userId, game.activeBetPool, 'chess_win', room.id);
            await emitBalanceUpdate(io, winnerPlayer.userId);
          }

          systemMessage = `👑 ¡Jaque Mate! ${winnerPlayer.nickname} derrotó a ${loserPlayer.nickname} y ganó el pozo de ${game.activeBetPool.toLocaleString()} C!`;
        } else if (game.chess.isDraw()) {
          game.winner = 'draw';
          if (game.activeBetPool > 0) {
            const splitAmount = Math.floor(game.activeBetPool / 2);
            if (game.white) {
              await creditUserPayout(game.white.userId, splitAmount, 'chess_refund', room.id);
              await emitBalanceUpdate(io, game.white.userId);
            }
            if (game.black) {
              await creditUserPayout(game.black.userId, splitAmount, 'chess_refund', room.id);
              await emitBalanceUpdate(io, game.black.userId);
            }
          }

          let drawReason = 'Tablas';
          if (game.chess.isStalemate()) drawReason = 'Tablas por Ahogado 🤝';
          else if (game.chess.isThreefoldRepetition()) drawReason = 'Tablas por Triple Repetición 🔄';
          else if (game.chess.isInsufficientMaterial()) drawReason = 'Tablas por Insuficiencia de Material 🪵';

          systemMessage = `🤝 ¡Duelo de Ajedrez finalizado en ${drawReason}! El pozo de apuestas se dividió en partes iguales.`;
        }

        await broadcastSystemMessage(io, code, room.id, systemMessage);
      } else {
        // Toggle turn
        game.turn = game.chess.turn() === 'w' ? 'white' : 'black';
      }

      broadcastChessState(io, code, game);
    } catch (err) {
      console.error('chess:move error:', err);
    }
  });

  socket.on('chess:resign', async ({ roomCode }) => {
    try {
      if (!roomCode) return;
      const code = roomCode.toUpperCase();
      const game = chessGames.get(code);
      if (!game || game.status !== 'playing') return;

      const room = await prisma.room.findUnique({ where: { code } });
      if (!room) return;

      const myColor = game.white?.userId === user.id ? 'white' : game.black?.userId === user.id ? 'black' : null;
      if (!myColor) return;

      if (game.timerIntervalId) clearInterval(game.timerIntervalId);

      game.status = 'finished';
      const winnerColor = myColor === 'white' ? 'black' : 'white';
      const winnerPlayer = game[winnerColor];
      game.winner = winnerPlayer.userId;

      if (game.activeBetPool > 0) {
        await creditUserPayout(winnerPlayer.userId, game.activeBetPool, 'chess_win', room.id);
        await emitBalanceUpdate(io, winnerPlayer.userId);
      }

      await broadcastSystemMessage(io, code, room.id, 
        `🏳️ ¡Ajedrez: ${user.nickname} se retiró de la partida! Victoria para ${winnerPlayer.nickname}.`);

      broadcastChessState(io, code, game);
    } catch (err) {
      console.error('chess:resign error:', err);
    }
  });

  socket.on('chess:draw_offer', ({ roomCode }) => {
    try {
      if (!roomCode) return;
      const code = roomCode.toUpperCase();
      const game = chessGames.get(code);
      if (!game || game.status !== 'playing') return;

      const myColor = game.white?.userId === user.id ? 'white' : game.black?.userId === user.id ? 'black' : null;
      if (!myColor) return;

      game.drawOfferedBy = user.id;
      broadcastChessState(io, code, game);
    } catch (err) {
      console.error('chess:draw_offer error:', err);
    }
  });

  socket.on('chess:draw_accept', async ({ roomCode }) => {
    try {
      if (!roomCode) return;
      const code = roomCode.toUpperCase();
      const game = chessGames.get(code);
      if (!game || game.status !== 'playing') return;
      if (!game.drawOfferedBy || game.drawOfferedBy === user.id) return;

      const room = await prisma.room.findUnique({ where: { code } });
      if (!room) return;

      if (game.timerIntervalId) clearInterval(game.timerIntervalId);

      game.status = 'finished';
      game.winner = 'draw';

      // Split the active bet pool back in half
      if (game.activeBetPool > 0) {
        const splitAmount = Math.floor(game.activeBetPool / 2);
        if (game.white) {
          await creditUserPayout(game.white.userId, splitAmount, 'chess_refund', room.id);
          await emitBalanceUpdate(io, game.white.userId);
        }
        if (game.black) {
          await creditUserPayout(game.black.userId, splitAmount, 'chess_refund', room.id);
          await emitBalanceUpdate(io, game.black.userId);
        }
      }

      await broadcastSystemMessage(io, code, room.id, 
        `🤝 ¡Ajedrez: La partida finalizó en Tablas acordadas por ambos rivales!`);

      broadcastChessState(io, code, game);
    } catch (err) {
      console.error('chess:draw_accept error:', err);
    }
  });

  socket.on('chess:leave', ({ roomCode }) => {
    if (!roomCode) return;
    const code = roomCode.toUpperCase();
    const game = chessGames.get(code);
    if (!game) return;

    // Reset game state if it hasn't started and player leaves their seat
    if (game.status === 'waiting') {
      if (game.white?.userId === user.id) {
        game.white = null;
        game.activeBetPool = Math.max(0, game.activeBetPool - game.betAmount);
      } else if (game.black?.userId === user.id) {
        game.black = null;
        game.activeBetPool = Math.max(0, game.activeBetPool - game.betAmount);
      }
      if (!game.white && !game.black) {
        game.betAmount = 0;
        game.activeBetPool = 0;
      }
      broadcastChessState(io, code, game);
    }
  });
}
