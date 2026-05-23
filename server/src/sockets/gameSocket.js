// TikiCasino - Game Socket Handler
import { prisma } from '../db/client.js';
import { emitBalanceUpdate, userSockets } from './index.js';
import { broadcastSystemMessage } from './chatSocket.js';
import { createShoe, blackjackHandValue, isBlackjack, isBust } from '../games/cards.js';
import { spinRoulette, processRouletteBets } from '../games/rouletteEngine.js';
import { processSlotsSpin } from '../games/slotsEngine.js';
import { playCoinflip } from '../games/coinflipEngine.js';
import { playDice } from '../games/diceEngine.js';

function broadcastTableState(io, code, round) {
  io.to(`room:${code}`).emit('blackjack:tableState', {
    phase: round.phase,
    dealerHand: round.phase === 'playing'
      ? [round.dealerHand[0], { rank: '?', suit: '?', id: 'hidden', hidden: true }]
      : round.dealerHand,
    dealerValue: round.phase !== 'playing' ? blackjackHandValue(round.dealerHand) : null,
    seats: Object.entries(round.players).map(([userId, p]) => ({
      userId,
      nickname: p.nickname,
      avatar: p.avatar,
      hand: p.hand,
      value: p.value,
      bet: p.bet,
      result: p.result,
      payout: p.payout,
      isTurn: round.phase === 'playing' && round.turnOrder[round.turnIndex] === userId,
    })),
    activeTurnUserId: round.phase === 'playing' ? round.turnOrder[round.turnIndex] : null,
    betTimer: round.countdown,
  });
}

function dealCardFromShoe(round) {
  if (round.shoePosition >= round.shoe.length - 10) {
    round.shoe = createShoe(6);
    round.shoePosition = 0;
  }
  return round.shoe[round.shoePosition++];
}

function startRoundDeal(io, code, round, roomId) {
  round.phase = 'playing';
  round.dealerHand = [dealCardFromShoe(round), dealCardFromShoe(round)];
  round.turnOrder = Object.keys(round.players);
  round.turnIndex = 0;

  round.turnOrder.forEach((uId) => {
    const p = round.players[uId];
    p.hand = [dealCardFromShoe(round), dealCardFromShoe(round)];
    p.value = blackjackHandValue(p.hand);

    if (isBlackjack(p.hand)) {
      if (isBlackjack(round.dealerHand)) {
        p.result = 'push';
        p.payout = p.bet;
      } else {
        p.result = 'blackjack';
        p.payout = Math.floor(p.bet * 2.5);
      }
    }
  });

  checkAndAdvanceTurn(io, code, round, roomId);
}

async function checkAndAdvanceTurn(io, code, round, roomId) {
  if (round.phase !== 'playing') return;

  while (round.turnIndex < round.turnOrder.length) {
    const activeUserId = round.turnOrder[round.turnIndex];
    const p = round.players[activeUserId];
    if (p.result === 'blackjack' || p.value >= 21) {
      round.turnIndex++;
    } else {
      break;
    }
  }

  if (round.turnIndex >= round.turnOrder.length) {
    round.phase = 'dealer';
    broadcastTableState(io, code, round);
    setTimeout(() => {
      resolveDealerPlay(io, code, round, roomId);
    }, 1200);
  } else {
    broadcastTableState(io, code, round);
  }
}

async function resolveDealerPlay(io, code, round, roomId) {
  while (blackjackHandValue(round.dealerHand) < 17) {
    round.dealerHand.push(dealCardFromShoe(round));
  }

  const dealerVal = blackjackHandValue(round.dealerHand);
  const dealerBusted = isBust(round.dealerHand);

  for (const [userId, p] of Object.entries(round.players)) {
    if (p.result === 'blackjack') {
      // already resolved
    } else if (p.value > 21) {
      p.result = 'bust';
      p.payout = 0;
    } else {
      if (dealerBusted) {
        p.result = 'win';
        p.payout = p.bet * 2;
      } else if (p.value > dealerVal) {
        p.result = 'win';
        p.payout = p.bet * 2;
      } else if (p.value === dealerVal) {
        p.result = 'push';
        p.payout = p.bet;
      } else {
        p.result = 'loss';
        p.payout = 0;
      }
    }

    try {
      if (p.payout > 0) {
        const txType = p.result === 'blackjack' ? 'blackjack_blackjack' : p.result === 'win' ? 'blackjack_win' : 'blackjack_push';
        await creditPayout(userId, p.payout, txType, 'blackjack', roomId);
        if (p.result === 'win' || p.result === 'blackjack') {
          await broadcastSystemMessage(io, code, roomId, `${p.nickname} ganó ${p.payout.toLocaleString()} C en Blackjack!`);
        }
      }
      await emitBalanceUpdate(io, userId);
    } catch (err) {
      console.error(`Error resolving payout for ${p.nickname}:`, err);
    }
  }

  round.phase = 'result';
  broadcastTableState(io, code, round);

  setTimeout(() => {
    round.phase = 'betting';
    round.players = {};
    round.dealerHand = [];
    round.dealerValue = 0;
    round.turnOrder = [];
    round.turnIndex = 0;
    round.countdown = 0;
    broadcastTableState(io, code, round);
  }, 8000);
}

const roomGameStates = new Map();
const rouletteBets = new Map();

function getOrCreateRoomState(roomCode) {
  if (!roomGameStates.has(roomCode)) roomGameStates.set(roomCode, {});
  return roomGameStates.get(roomCode);
}

async function deductBet(userId, amount, gameType, roomId) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { balance: true } });
  if (!user || user.balance < amount) return null;
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { balance: { decrement: amount } },
    select: { balance: true },
  });
  await prisma.balanceTransaction.create({
    data: { userId, roomId, gameType, type: `${gameType}_bet`, amount: -amount, balanceBefore: user.balance, balanceAfter: updatedUser.balance },
  });
  return updatedUser.balance;
}

async function creditPayout(userId, amount, type, gameType, roomId) {
  if (amount <= 0) return;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { balance: true } });
  if (!user) return;
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { balance: { increment: amount } },
    select: { balance: true },
  });
  await prisma.balanceTransaction.create({
    data: { userId, roomId, gameType, type, amount, balanceBefore: user.balance, balanceAfter: updatedUser.balance },
  });
}

export function setupGameSocket(io, socket) {
  const user = socket.user;

  // ── BLACKJACK (SYNCHRONIZED ROOM-WIDE MULTIPLAYER) ──────────
  socket.on('blackjack:join', ({ roomCode }) => {
    if (!roomCode) return;
    const code = roomCode.toUpperCase();
    socket.join(`room:${code}`);
    
    const roomState = getOrCreateRoomState(code);
    if (!roomState.blackjackRound) {
      roomState.blackjackRound = {
        phase: 'betting',
        shoe: createShoe(6),
        shoePosition: 0,
        players: {},
        dealerHand: [],
        dealerValue: 0,
        turnOrder: [],
        turnIndex: 0,
        countdown: 0,
        timerId: null
      };
    }
    
    broadcastTableState(io, code, roomState.blackjackRound);
  });

  socket.on('blackjack:bet', async ({ roomCode, amount }) => {
    try {
      const betAmount = parseInt(amount);
      if (!roomCode || !betAmount || betAmount <= 0) {
        socket.emit('blackjack:error', { message: 'Apuesta inválida.' }); return;
      }
      const code = roomCode.toUpperCase();
      const room = await prisma.room.findUnique({ where: { code } });
      if (!room) { socket.emit('blackjack:error', { message: 'Sala no encontrada.' }); return; }

      const freshUser = await prisma.user.findUnique({ where: { id: user.id }, select: { balance: true } });
      if (freshUser.balance < betAmount) { socket.emit('blackjack:error', { message: 'CALDICOINS insuficientes.' }); return; }

      const roomState = getOrCreateRoomState(code);
      if (!roomState.blackjackRound) {
        roomState.blackjackRound = {
          phase: 'betting',
          shoe: createShoe(6),
          shoePosition: 0,
          players: {},
          dealerHand: [],
          dealerValue: 0,
          turnOrder: [],
          turnIndex: 0,
          countdown: 0,
          timerId: null
        };
      }

      const round = roomState.blackjackRound;
      if (round.phase !== 'betting') {
        socket.emit('blackjack:error', { message: 'La ronda ya ha comenzado.' }); return;
      }

      if (round.players[user.id]) {
        socket.emit('blackjack:error', { message: 'Ya has apostado en esta ronda.' }); return;
      }

      const newBalance = await deductBet(user.id, betAmount, 'blackjack', room.id);
      if (newBalance === null) { socket.emit('blackjack:error', { message: 'Error al descontar apuesta.' }); return; }

      round.players[user.id] = {
        userId: user.id,
        nickname: user.nickname,
        avatar: user.avatar,
        bet: betAmount,
        hand: [],
        value: 0,
        result: null,
        payout: 0,
      };

      socket.emit('blackjack:state', {
        state: {
          phase: 'betting',
          playerHand: [],
          playerValue: 0,
          dealerHand: [],
          dealerValue: null,
          bet: betAmount,
          result: null,
          payout: 0,
          canDouble: false
        },
        balance: newBalance
      });

      broadcastTableState(io, code, round);

      if (Object.keys(round.players).length === 1 && !round.timerId) {
        round.countdown = 15;
        round.timerId = setInterval(() => {
          round.countdown--;
          if (round.countdown <= 0) {
            clearInterval(round.timerId);
            round.timerId = null;
            startRoundDeal(io, code, round, room.id);
          } else {
            broadcastTableState(io, code, round);
          }
        }, 1000);
      }
    } catch (err) {
      console.error('blackjack:bet error:', err);
      socket.emit('blackjack:error', { message: 'Error del servidor.' });
    }
  });

  socket.on('blackjack:hit', async ({ roomCode }) => {
    try {
      if (!roomCode) return;
      const code = roomCode.toUpperCase();
      const room = await prisma.room.findUnique({ where: { code } });
      if (!room) return;
      
      const roomState = getOrCreateRoomState(code);
      const round = roomState.blackjackRound;
      if (!round || round.phase !== 'playing') return;

      const activeUserId = round.turnOrder[round.turnIndex];
      if (user.id !== activeUserId) {
        socket.emit('blackjack:error', { message: 'No es tu turno.' }); return;
      }

      const p = round.players[user.id];
      p.hand.push(dealCardFromShoe(round));
      p.value = blackjackHandValue(p.hand);

      if (p.value > 21) {
        p.result = 'bust';
        p.payout = 0;
        await broadcastSystemMessage(io, code, room.id, `${p.nickname} se pasó en Blackjack!`);
        round.turnIndex++;
        checkAndAdvanceTurn(io, code, round, room.id);
      } else {
        broadcastTableState(io, code, round);
      }
    } catch (err) { console.error('blackjack:hit error:', err); }
  });

  socket.on('blackjack:stand', async ({ roomCode }) => {
    try {
      if (!roomCode) return;
      const code = roomCode.toUpperCase();
      const room = await prisma.room.findUnique({ where: { code } });
      if (!room) return;
      
      const roomState = getOrCreateRoomState(code);
      const round = roomState.blackjackRound;
      if (!round || round.phase !== 'playing') return;

      const activeUserId = round.turnOrder[round.turnIndex];
      if (user.id !== activeUserId) {
        socket.emit('blackjack:error', { message: 'No es tu turno.' }); return;
      }

      round.turnIndex++;
      checkAndAdvanceTurn(io, code, round, room.id);
    } catch (err) { console.error('blackjack:stand error:', err); }
  });

  socket.on('blackjack:double', async ({ roomCode }) => {
    try {
      if (!roomCode) return;
      const code = roomCode.toUpperCase();
      const room = await prisma.room.findUnique({ where: { code } });
      if (!room) return;
      
      const freshUser = await prisma.user.findUnique({ where: { id: user.id }, select: { balance: true } });
      const roomState = getOrCreateRoomState(code);
      const round = roomState.blackjackRound;
      if (!round || round.phase !== 'playing') return;

      const activeUserId = round.turnOrder[round.turnIndex];
      if (user.id !== activeUserId) {
        socket.emit('blackjack:error', { message: 'No es tu turno.' }); return;
      }

      const p = round.players[user.id];
      if (freshUser.balance < p.bet) {
        socket.emit('blackjack:error', { message: 'CALDICOINS insuficientes para doblar.' }); return;
      }

      await deductBet(user.id, p.bet, 'blackjack', room.id);
      
      p.bet *= 2;
      p.hand.push(dealCardFromShoe(round));
      p.value = blackjackHandValue(p.hand);

      if (p.value > 21) {
        p.result = 'bust';
        p.payout = 0;
        await broadcastSystemMessage(io, code, room.id, `${p.nickname} se pasó en Blackjack!`);
      }

      round.turnIndex++;
      checkAndAdvanceTurn(io, code, round, room.id);
    } catch (err) { console.error('blackjack:double error:', err); }
  });

  // ── ROULETTE (SYNCHRONIZED ROOM-WIDE MULTIPLAYER) ──────────
  const startRouletteLoop = (roomCode, roomId) => {
    const code = roomCode.toUpperCase();
    if (roomGameStates.has(`roulette:${code}`)) return;

    const rouletteState = {
      timer: 20, // 20s betting phase
      status: 'betting', // 'betting' or 'spinning'
      bets: new Map(), // userId -> bets array
      history: []
    };

    roomGameStates.set(`roulette:${code}`, rouletteState);

    const intervalId = setInterval(async () => {
      const state = roomGameStates.get(`roulette:${code}`);
      if (!state) { clearInterval(intervalId); return; }

      state.timer--;

      // Broadcast timer tick
      io.to(`roulette:${code}`).emit('roulette:tick', {
        timer: state.timer,
        status: state.status
      });

      if (state.timer <= 0) {
        if (state.status === 'betting') {
          // Switch to spinning!
          state.status = 'spinning';
          state.timer = 6; // 6s spin animation + result view

          const winningNumber = spinRoulette();

          // Process all active room bets
          for (const [userId, userBets] of state.bets.entries()) {
            try {
              const totalBet = userBets.reduce((sum, b) => sum + b.amount, 0);
              const freshUser = await prisma.user.findUnique({ where: { id: userId }, select: { balance: true } });
              
              if (!freshUser || freshUser.balance < totalBet) continue; // Not enough balance, skip

              await deductBet(userId, totalBet, 'roulette', roomId);
              const results = processRouletteBets(userBets, winningNumber);
              const totalPayout = results.reduce((sum, r) => sum + r.payout, 0);

              if (totalPayout > 0) {
                await creditPayout(userId, totalPayout, 'roulette_win', 'roulette', roomId);
              }

              await emitBalanceUpdate(io, userId);

              const netProfit = totalPayout - totalBet;

              // Send private detailed results to user's socket
              const socketId = userSockets.get(userId);
              if (socketId) {
                io.to(socketId).emit('roulette:result', {
                  winningNumber,
                  results,
                  totalBet,
                  totalPayout,
                  netProfit
                });
              }

              if (netProfit > 1000) {
                const bettorName = userBets[0]?.nickname || 'Un jugador';
                await broadcastSystemMessage(io, code, roomId,
                  `${bettorName} ganó ${netProfit.toLocaleString()} CALDICOINS en Ruleta! (${winningNumber})`);
              }
            } catch (err) {
              console.error('Error processing multi-user roulette bet:', err);
            }
          }

          // Clear bets for this round
          state.bets.clear();
          state.history.unshift(winningNumber);
          if (state.history.length > 15) state.history.pop();

          // Broadcast spin result to everyone in the room
          io.to(`roulette:${code}`).emit('roulette:spinResult', {
            winningNumber,
            history: state.history
          });

        } else {
          // Back to betting!
          state.status = 'betting';
          state.timer = 20;
          io.to(`roulette:${code}`).emit('roulette:roundStart', {
            timer: state.timer,
            status: state.status
          });
        }
      }
    }, 1000);

    rouletteState.intervalId = intervalId;
  };

  socket.on('roulette:join', async ({ roomCode }) => {
    try {
      if (!roomCode) return;
      const code = roomCode.toUpperCase();
      const room = await prisma.room.findUnique({ where: { code } });
      if (!room) return;

      // Leave other roulette rooms to avoid crosstalk
      for (const r of socket.rooms) {
        if (r.startsWith('roulette:') && r !== `roulette:${code}`) {
          socket.leave(r);
        }
      }

      socket.join(`roulette:${code}`);
      startRouletteLoop(code, room.id);

      const state = roomGameStates.get(`roulette:${code}`);
      socket.emit('roulette:state', {
        timer: state.timer,
        status: state.status,
        history: state.history
      });
    } catch (err) {
      console.error('roulette:join error:', err);
    }
  });

  socket.on('roulette:bet', async ({ roomCode, bets }) => {
    try {
      if (!roomCode || !Array.isArray(bets) || bets.length === 0) return;
      const code = roomCode.toUpperCase();
      const state = roomGameStates.get(`roulette:${code}`);
      if (!state) { socket.emit('roulette:error', { message: 'Mesa de ruleta no activa.' }); return; }
      if (state.status !== 'betting') { socket.emit('roulette:error', { message: 'La ruleta ya está girando. Esperá a la próxima ronda.' }); return; }

      const freshUser = await prisma.user.findUnique({ where: { id: user.id }, select: { balance: true } });
      const totalBet = bets.reduce((sum, b) => sum + (parseInt(b.amount) || 0), 0);
      
      if (totalBet <= 0 || totalBet > freshUser.balance) {
        socket.emit('roulette:error', { message: 'Apuesta inválida.' }); return;
      }

      state.bets.set(user.id, bets.map(b => ({
        ...b,
        amount: parseInt(b.amount),
        userId: user.id,
        nickname: user.nickname
      })));

      socket.emit('roulette:betsPlaced', { totalBet });
      io.to(`roulette:${code}`).emit('roulette:playerBet', { nickname: user.nickname, amount: totalBet });
    } catch (err) {
      console.error('roulette:bet error:', err);
    }
  });

  // ── SLOTS ──────────────────────────────────────────────────
  socket.on('slots:spin', async ({ roomCode, betAmount }) => {
    try {
      const bet = parseInt(betAmount);
      if (!roomCode || !bet || bet <= 0) { socket.emit('slots:error', { message: 'Apuesta inválida.' }); return; }
      const code = roomCode.toUpperCase();
      const room = await prisma.room.findUnique({ where: { code } });
      if (!room) { socket.emit('slots:error', { message: 'Sala no encontrada.' }); return; }
      const freshUser = await prisma.user.findUnique({ where: { id: user.id }, select: { balance: true } });
      if (freshUser.balance < bet) { socket.emit('slots:error', { message: 'CALDICOINS insuficientes.' }); return; }
      await deductBet(user.id, bet, 'slots', room.id);
      const result = processSlotsSpin(bet);
      if (result.payout > 0) await creditPayout(user.id, result.payout, 'slots_win', 'slots', room.id);
      await emitBalanceUpdate(io, user.id);
      socket.emit('slots:result', result);
      if (result.isJackpot) {
        io.to(`room:${code}`).emit('slots:jackpot', { userId: user.id, nickname: user.nickname, payout: result.payout });
        await broadcastSystemMessage(io, code, room.id,
          `¡JACKPOT! ${user.nickname} ganó ${result.payout.toLocaleString()} CALDICOINS en Slots!`);
      }
    } catch (err) {
      console.error('slots:spin error:', err);
      socket.emit('slots:error', { message: 'Error del servidor al girar Slots.' });
    }
  });

  // ── COINFLIP ───────────────────────────────────────────────
  socket.on('coinflip:play', async ({ roomCode, choice, betAmount }) => {
    try {
      const bet = parseInt(betAmount);
      if (!roomCode || !choice || !bet) { socket.emit('coinflip:error', { message: 'Datos inválidos.' }); return; }
      const code = roomCode.toUpperCase();
      const room = await prisma.room.findUnique({ where: { code } });
      if (!room) { socket.emit('coinflip:error', { message: 'Sala no encontrada.' }); return; }
      const freshUser = await prisma.user.findUnique({ where: { id: user.id }, select: { balance: true } });
      const gameResult = playCoinflip(choice, bet, freshUser.balance);
      if (!gameResult.success) { socket.emit('coinflip:error', { message: gameResult.error }); return; }
      await deductBet(user.id, bet, 'coinflip', room.id);
      if (gameResult.payout > 0) await creditPayout(user.id, gameResult.payout, 'coinflip_win', 'coinflip', room.id);
      await emitBalanceUpdate(io, user.id);
      socket.emit('coinflip:result', gameResult);
      if (gameResult.win) {
        await broadcastSystemMessage(io, code, room.id,
          `${user.nickname} ganó ${gameResult.payout.toLocaleString()} CALDICOINS en Moneda! (${gameResult.result})`);
      }
    } catch (err) {
      console.error('coinflip:play error:', err);
      socket.emit('coinflip:error', { message: 'Error del servidor en Coinflip.' });
    }
  });

  // ── DICE ───────────────────────────────────────────────────
  socket.on('dice:play', async ({ roomCode, target, direction, betAmount }) => {
    try {
      const bet = parseInt(betAmount);
      if (!roomCode || !target || !direction || !bet) { socket.emit('dice:error', { message: 'Datos inválidos.' }); return; }
      const code = roomCode.toUpperCase();
      const room = await prisma.room.findUnique({ where: { code } });
      if (!room) { socket.emit('dice:error', { message: 'Sala no encontrada.' }); return; }
      const freshUser = await prisma.user.findUnique({ where: { id: user.id }, select: { balance: true } });
      const gameResult = playDice(target, direction, bet, freshUser.balance);
      if (!gameResult.success) { socket.emit('dice:error', { message: gameResult.error }); return; }
      await deductBet(user.id, bet, 'dice', room.id);
      if (gameResult.payout > 0) await creditPayout(user.id, gameResult.payout, 'dice_win', 'dice', room.id);
      await emitBalanceUpdate(io, user.id);
      socket.emit('dice:result', gameResult);
    } catch (err) {
      console.error('dice:play error:', err);
      socket.emit('dice:error', { message: 'Error del servidor en Dados.' });
    }
  });
}
