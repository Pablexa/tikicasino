// TikiCasino - Game Socket Handler
import { prisma } from '../db/client.js';
import { emitBalanceUpdate } from './index.js';
import { broadcastSystemMessage } from './chatSocket.js';
import {
  createBlackjackState, blackjackBet, blackjackHit,
  blackjackStand, blackjackDouble, blackjackNewRound,
} from '../games/blackjackEngine.js';
import { spinRoulette, processRouletteBets } from '../games/rouletteEngine.js';
import { processSlotsSpin } from '../games/slotsEngine.js';
import { playCoinflip } from '../games/coinflipEngine.js';
import { playDice } from '../games/diceEngine.js';

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

  // ── BLACKJACK ──────────────────────────────────────────────
  const broadcastBlackjackHand = (roomCode, state) => {
    io.to(`room:${roomCode}`).emit('room:blackjack:hand', {
      userId: user.id,
      nickname: user.nickname,
      avatar: user.avatar,
      state
    });
  };

  socket.on('blackjack:join', ({ roomCode }) => {
    if (!roomCode) return;
    const roomState = getOrCreateRoomState(roomCode);
    if (!roomState.blackjack) roomState.blackjack = {};
    
    const activeHands = {};
    Object.entries(roomState.blackjack).forEach(([uId, s]) => {
      if (s && s.phase && s.phase !== 'betting') {
        activeHands[uId] = {
          nickname: s.nickname || 'Jugador',
          avatar: s.avatar || 'tiki1',
          state: s
        };
      }
    });
    socket.emit('blackjack:roomHands', activeHands);
  });

  socket.on('blackjack:bet', async ({ roomCode, amount }) => {
    try {
      const betAmount = parseInt(amount);
      if (!roomCode || !betAmount || betAmount <= 0) {
        socket.emit('blackjack:error', { message: 'Apuesta inválida.' }); return;
      }
      const room = await prisma.room.findUnique({ where: { code: roomCode.toUpperCase() } });
      if (!room) { socket.emit('blackjack:error', { message: 'Sala no encontrada.' }); return; }

      const freshUser = await prisma.user.findUnique({ where: { id: user.id }, select: { balance: true } });
      if (freshUser.balance < betAmount) { socket.emit('blackjack:error', { message: 'CALDICOINS insuficientes.' }); return; }

      const roomState = getOrCreateRoomState(roomCode);
      if (!roomState.blackjack) roomState.blackjack = {};
      if (!roomState.blackjack[user.id]) roomState.blackjack[user.id] = createBlackjackState();

      const playerState = roomState.blackjack[user.id];
      const result = blackjackBet(playerState, betAmount, freshUser.balance);
      if (!result.success) { socket.emit('blackjack:error', { message: result.error }); return; }

      playerState.nickname = user.nickname;
      playerState.avatar = user.avatar;

      const newBalance = await deductBet(user.id, betAmount, 'blackjack', room.id);
      if (newBalance === null) { socket.emit('blackjack:error', { message: 'Error al descontar apuesta.' }); return; }

      socket.emit('blackjack:state', { state: result.state, balance: newBalance });
      broadcastBlackjackHand(roomCode, result.state);

      if (result.state.result) {
        if (result.state.payout > 0) {
          await creditPayout(user.id, result.state.payout,
            result.state.result === 'blackjack' ? 'blackjack_blackjack' : 'blackjack_push', 'blackjack', room.id);
        }
        await emitBalanceUpdate(io, user.id);
      }
    } catch (err) {
      console.error('blackjack:bet error:', err);
      socket.emit('blackjack:error', { message: 'Error del servidor.' });
    }
  });

  socket.on('blackjack:hit', async ({ roomCode }) => {
    try {
      const room = await prisma.room.findUnique({ where: { code: roomCode?.toUpperCase() } });
      if (!room) return;
      const roomState = getOrCreateRoomState(roomCode);
      const playerState = roomState.blackjack?.[user.id];
      if (!playerState) { socket.emit('blackjack:error', { message: 'No hay partida activa.' }); return; }
      const result = blackjackHit(playerState);
      if (!result.success) { socket.emit('blackjack:error', { message: result.error }); return; }
      socket.emit('blackjack:state', { state: result.state });
      broadcastBlackjackHand(roomCode, result.state);
      if (result.state.result === 'bust') {
        await emitBalanceUpdate(io, user.id);
        await broadcastSystemMessage(io, roomCode, room.id, `${user.nickname} se pasó en Blackjack!`);
      }
    } catch (err) { console.error('blackjack:hit error:', err); }
  });

  socket.on('blackjack:stand', async ({ roomCode }) => {
    try {
      const room = await prisma.room.findUnique({ where: { code: roomCode?.toUpperCase() } });
      if (!room) return;
      const roomState = getOrCreateRoomState(roomCode);
      const playerState = roomState.blackjack?.[user.id];
      if (!playerState) return;
      const result = blackjackStand(playerState);
      if (!result.success) { socket.emit('blackjack:error', { message: result.error }); return; }
      socket.emit('blackjack:state', { state: result.state });
      broadcastBlackjackHand(roomCode, result.state);
      if (result.state.payout > 0) {
        const txType = result.state.result === 'win' ? 'blackjack_win' : 'blackjack_push';
        await creditPayout(user.id, result.state.payout, txType, 'blackjack', room.id);
      }
      await emitBalanceUpdate(io, user.id);
      if (result.state.result === 'win') {
        await broadcastSystemMessage(io, roomCode, room.id,
          `${user.nickname} ganó ${result.state.payout.toLocaleString()} CALDICOINS en Blackjack!`);
      }
    } catch (err) { console.error('blackjack:stand error:', err); }
  });

  socket.on('blackjack:double', async ({ roomCode }) => {
    try {
      const room = await prisma.room.findUnique({ where: { code: roomCode?.toUpperCase() } });
      if (!room) return;
      const freshUser = await prisma.user.findUnique({ where: { id: user.id }, select: { balance: true } });
      const roomState = getOrCreateRoomState(roomCode);
      const playerState = roomState.blackjack?.[user.id];
      if (!playerState) return;
      const result = blackjackDouble(playerState, freshUser.balance);
      if (!result.success) { socket.emit('blackjack:error', { message: result.error }); return; }
      if (result.extraBet) await deductBet(user.id, result.extraBet, 'blackjack', room.id);
      socket.emit('blackjack:state', { state: result.state });
      broadcastBlackjackHand(roomCode, result.state);
      if (result.state.payout > 0) {
        await creditPayout(user.id, result.state.payout,
          result.state.result === 'win' ? 'blackjack_win' : 'blackjack_push', 'blackjack', room.id);
      }
      await emitBalanceUpdate(io, user.id);
    } catch (err) { console.error('blackjack:double error:', err); }
  });

  socket.on('blackjack:newRound', ({ roomCode }) => {
    const roomState = getOrCreateRoomState(roomCode);
    const playerState = roomState.blackjack?.[user.id];
    if (!playerState) return;
    const result = blackjackNewRound(playerState);
    socket.emit('blackjack:state', { state: result.state });
    broadcastBlackjackHand(roomCode, result.state);
  });

  // ── ROULETTE (SYNCHRONIZED ROOM-WIDE MULTIPLAYER) ──────────
  const startRouletteLoop = (roomCode, roomId) => {
    if (roomGameStates.has(`roulette:${roomCode}`)) return;

    const rouletteState = {
      timer: 20, // 20s betting phase
      status: 'betting', // 'betting' or 'spinning'
      bets: new Map(), // userId -> bets array
      history: []
    };

    roomGameStates.set(`roulette:${roomCode}`, rouletteState);

    const intervalId = setInterval(async () => {
      const state = roomGameStates.get(`roulette:${roomCode}`);
      if (!state) { clearInterval(intervalId); return; }

      state.timer--;

      // Broadcast timer tick
      io.to(`roulette:${roomCode}`).emit('roulette:tick', {
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
                await broadcastSystemMessage(io, roomCode, roomId,
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
          io.to(`roulette:${roomCode}`).emit('roulette:spinResult', {
            winningNumber,
            history: state.history
          });

        } else {
          // Back to betting!
          state.status = 'betting';
          state.timer = 20;
          io.to(`roulette:${roomCode}`).emit('roulette:roundStart', {
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
      const room = await prisma.room.findUnique({ where: { code: roomCode.toUpperCase() } });
      if (!room) return;

      socket.join(`roulette:${roomCode}`);
      startRouletteLoop(roomCode, room.id);

      const state = roomGameStates.get(`roulette:${roomCode}`);
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
      const state = roomGameStates.get(`roulette:${roomCode}`);
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
      io.to(`roulette:${roomCode}`).emit('roulette:playerBet', { nickname: user.nickname, amount: totalBet });
    } catch (err) {
      console.error('roulette:bet error:', err);
    }
  });

  // ── SLOTS ──────────────────────────────────────────────────
  socket.on('slots:spin', async ({ roomCode, betAmount }) => {
    try {
      const bet = parseInt(betAmount);
      if (!roomCode || !bet || bet <= 0) { socket.emit('slots:error', { message: 'Apuesta inválida.' }); return; }
      const room = await prisma.room.findUnique({ where: { code: roomCode.toUpperCase() } });
      if (!room) { socket.emit('slots:error', { message: 'Sala no encontrada.' }); return; }
      const freshUser = await prisma.user.findUnique({ where: { id: user.id }, select: { balance: true } });
      if (freshUser.balance < bet) { socket.emit('slots:error', { message: 'CALDICOINS insuficientes.' }); return; }
      await deductBet(user.id, bet, 'slots', room.id);
      const result = processSlotsSpin(bet);
      if (result.payout > 0) await creditPayout(user.id, result.payout, 'slots_win', 'slots', room.id);
      await emitBalanceUpdate(io, user.id);
      socket.emit('slots:result', result);
      if (result.isJackpot) {
        io.to(`room:${roomCode}`).emit('slots:jackpot', { userId: user.id, nickname: user.nickname, payout: result.payout });
        await broadcastSystemMessage(io, roomCode, room.id,
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
      const room = await prisma.room.findUnique({ where: { code: roomCode.toUpperCase() } });
      if (!room) { socket.emit('coinflip:error', { message: 'Sala no encontrada.' }); return; }
      const freshUser = await prisma.user.findUnique({ where: { id: user.id }, select: { balance: true } });
      const gameResult = playCoinflip(choice, bet, freshUser.balance);
      if (!gameResult.success) { socket.emit('coinflip:error', { message: gameResult.error }); return; }
      await deductBet(user.id, bet, 'coinflip', room.id);
      if (gameResult.payout > 0) await creditPayout(user.id, gameResult.payout, 'coinflip_win', 'coinflip', room.id);
      await emitBalanceUpdate(io, user.id);
      socket.emit('coinflip:result', gameResult);
      if (gameResult.win) {
        await broadcastSystemMessage(io, roomCode, room.id,
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
      const room = await prisma.room.findUnique({ where: { code: roomCode.toUpperCase() } });
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
