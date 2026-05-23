// TikiCasino - Multiplayer Trivia (Preguntados) Socket Handler
import { prisma } from '../db/client.js';
import { emitBalanceUpdate } from './index.js';
import { broadcastSystemMessage } from './chatSocket.js';

// Map of roomCode -> Trivia game instance
const triviaGames = new Map();

const TRIVIA_BET = 1000;
const ROUND_SECONDS = 15;

function generateProceduralQuestions(count = 5) {
  const categories = [
    // 1. Math equations
    () => {
      const num1 = Math.floor(Math.random() * 20) + 5;
      const num2 = Math.floor(Math.random() * 15) + 3;
      const operation = Math.random() > 0.5 ? '+' : '-';
      const ans = operation === '+' ? num1 + num2 : num1 - num2;
      const text = `¿Cuál es el resultado de la siguiente operación matemática?: ${num1} ${operation} ${num2}`;
      
      const wrong = new Set();
      while (wrong.size < 3) {
        const offset = Math.floor(Math.random() * 10) - 5;
        const wVal = ans + offset;
        if (wVal !== ans && wVal >= 0) wrong.add(wVal);
      }
      const choices = [ans, ...wrong].sort(() => 0.5 - Math.random());
      return {
        text,
        choices: choices.map(String),
        correct: choices.indexOf(ans)
      };
    },
    // 2. Linear sequences
    () => {
      const start = Math.floor(Math.random() * 10) + 1;
      const step = Math.floor(Math.random() * 8) + 2;
      const seq = [start, start + step, start + step * 2, start + step * 3];
      const ans = start + step * 4;
      const text = `¿Qué número sigue en la secuencia lógica?: ${seq.join(', ')}, ...`;
      
      const wrong = new Set();
      while (wrong.size < 3) {
        const offset = Math.floor(Math.random() * 20) - 10;
        const wVal = ans + offset;
        if (wVal !== ans && wVal >= 0) wrong.add(wVal);
      }
      const choices = [ans, ...wrong].sort(() => 0.5 - Math.random());
      return {
        text,
        choices: choices.map(String),
        correct: choices.indexOf(ans)
      };
    },
    // 3. Word letters count
    () => {
      const words = [
        { word: 'TikiCasino', length: 10 },
        { word: 'Caldicoins', length: 10 },
        { word: 'Ajedrez', length: 7 },
        { word: 'Revólver', length: 8 },
        { word: 'Dados', length: 5 },
        { word: 'Crupier', length: 7 },
        { word: 'Fichas', length: 6 },
        { word: 'Cartas', length: 6 },
        { word: 'Apuesta', length: 7 },
        { word: 'Ruleta', length: 6 }
      ];
      const selected = words[Math.floor(Math.random() * words.length)];
      const text = `¿Cuántas letras tiene exactamente la palabra "${selected.word}"?`;
      const ans = selected.length;
      
      const wrong = new Set();
      while (wrong.size < 3) {
        const wVal = ans + Math.floor(Math.random() * 6) - 3;
        if (wVal !== ans && wVal > 0) wrong.add(wVal);
      }
      const choices = [ans, ...wrong].sort(() => 0.5 - Math.random());
      return {
        text,
        choices: choices.map(String),
        correct: choices.indexOf(ans)
      };
    },
    // 4. Roman numeral conversions
    () => {
      const romans = [
        { val: 4, label: 'IV' },
        { val: 9, label: 'IX' },
        { val: 14, label: 'XIV' },
        { val: 19, label: 'XIX' },
        { val: 24, label: 'XXIV' },
        { val: 29, label: 'XXIX' },
        { val: 34, label: 'XXXIV' },
        { val: 39, label: 'XXXIX' },
        { val: 44, label: 'XLIV' },
        { val: 49, label: 'XLIX' },
        { val: 54, label: 'LIV' },
        { val: 59, label: 'LIX' }
      ];
      const selected = romans[Math.floor(Math.random() * romans.length)];
      const text = `¿Cuál es el número romano correspondiente al número entero ${selected.val}?`;
      const ans = selected.label;
      
      const wrong = new Set();
      while (wrong.size < 3) {
        const another = romans[Math.floor(Math.random() * romans.length)].label;
        if (another !== ans) wrong.add(another);
      }
      const choices = [ans, ...wrong].sort(() => 0.5 - Math.random());
      return {
        text,
        choices: choices.map(String),
        correct: choices.indexOf(ans)
      };
    },
    // 5. Day offset logic
    () => {
      const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
      const todayIdx = Math.floor(Math.random() * 7);
      const today = days[todayIdx];
      const offset = Math.floor(Math.random() * 5) + 2;
      const targetIdx = (todayIdx + offset) % 7;
      const ans = days[targetIdx];
      const text = `Si hoy fuera día ${today}, ¿qué día de la semana sería dentro de exactamente ${offset} días?`;
      
      const wrong = new Set();
      while (wrong.size < 3) {
        const another = days[Math.floor(Math.random() * 7)];
        if (another !== ans) wrong.add(another);
      }
      const choices = [ans, ...wrong].sort(() => 0.5 - Math.random());
      return {
        text,
        choices: choices.map(String),
        correct: choices.indexOf(ans)
      };
    }
  ];

  const questions = [];
  for (let i = 0; i < count; i++) {
    // Pick a random category generator
    const generator = categories[Math.floor(Math.random() * categories.length)];
    questions.push(generator());
  }
  return questions;
}

function getOrCreateTriviaGame(roomCode) {
  const code = roomCode.toUpperCase();
  if (!triviaGames.has(code)) {
    // Generate fresh dynamic questions on the fly!
    const dynamicQuestions = generateProceduralQuestions(5);
    triviaGames.set(code, {
      players: new Map(),  // userId -> { socketId, nickname, avatar, score, isEliminated, currentAnswer, answerTime }
      status: 'waiting',  // 'waiting', 'playing', 'reveal', 'finished'
      questions: dynamicQuestions,
      currentRound: 0,
      timer: ROUND_SECONDS,
      pool: 0,
      intervalId: null
    });
  }
  return triviaGames.get(code);
}

function broadcastTriviaState(io, roomCode, game) {
  const playersArr = [...game.players.values()].map(p => ({
    userId: p.userId,
    nickname: p.nickname,
    avatar: p.avatar,
    score: p.score,
    isEliminated: p.isEliminated,
    answered: p.currentAnswer !== null
  }));

  io.to(`trivia:${roomCode.toUpperCase()}`).emit('trivia:state', {
    status: game.status,
    currentRound: game.currentRound,
    totalRounds: game.questions.length,
    timer: game.timer,
    pool: game.pool,
    players: playersArr,
    question: game.status === 'playing' ? {
      text: game.questions[game.currentRound].text,
      choices: game.questions[game.currentRound].choices
    } : null,
    reveal: game.status === 'reveal' ? {
      text: game.questions[game.currentRound].text,
      choices: game.questions[game.currentRound].choices,
      correct: game.questions[game.currentRound].correct,
      answers: [...game.players.values()].map(p => ({
        nickname: p.nickname,
        answer: p.currentAnswer,
        isCorrect: p.currentAnswer === game.questions[game.currentRound].correct,
        isEliminated: p.isEliminated
      }))
    } : null
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
    data: { userId, roomId, gameType: 'trivia', type: 'trivia_bet', amount: -amount, balanceBefore: user.balance, balanceAfter: updatedUser.balance }
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
    data: { userId, roomId, gameType: 'trivia', type, amount, balanceBefore: user.balance, balanceAfter: updatedUser.balance }
  });
}

export function setupTriviaSocket(io, socket) {
  const user = socket.user;

  socket.on('trivia:join', async ({ roomCode }) => {
    if (!roomCode) return;
    const code = roomCode.toUpperCase();
    
    // Clean old trivia rooms to avoid crosstalk
    for (const r of socket.rooms) {
      if (r.startsWith('trivia:') && r !== `trivia:${code}`) {
        socket.leave(r);
      }
    }
    
    socket.join(`trivia:${code}`);

    const game = getOrCreateTriviaGame(code);

    // If game has already started and player isn't in it, they join as a spectator
    if (!game.players.has(user.id)) {
      if (game.status === 'waiting') {
        game.players.set(user.id, {
          userId: user.id,
          socketId: socket.id,
          nickname: user.nickname,
          avatar: user.avatar,
          score: 0,
          isEliminated: false,
          currentAnswer: null,
          answerTime: 0
        });
      }
    } else {
      // Update socket ID on reconnect
      game.players.get(user.id).socketId = socket.id;
    }

    broadcastTriviaState(io, code, game);
  });

  socket.on('trivia:bet', async ({ roomCode }) => {
    try {
      if (!roomCode) return;
      const code = roomCode.toUpperCase();
      const game = triviaGames.get(code);
      if (!game || game.status !== 'waiting') return;

      const player = game.players.get(user.id);
      if (!player) return;

      const room = await prisma.room.findUnique({ where: { code } });
      if (!room) return;

      // Deduct exactly 1000 Caldicoins
      const newBalance = await deductUserBet(user.id, TRIVIA_BET, room.id);
      if (newBalance === null) {
        socket.emit('trivia:error', { message: 'CALDICOINS insuficientes para la apuesta de 1000.' });
        return;
      }

      game.pool += TRIVIA_BET;
      await emitBalanceUpdate(io, user.id);

      await broadcastSystemMessage(io, code, room.id, 
        `🎟️ ¡${user.nickname} aportó 1,000 F al pozo de Trivia! Pozo acumulado: ${game.pool.toLocaleString()} C.`);

      // If everyone is ready/bet, host can start
      broadcastTriviaState(io, code, game);
    } catch (err) {
      console.error('trivia:bet error:', err);
    }
  });

  socket.on('trivia:start', async ({ roomCode }) => {
    try {
      if (!roomCode) return;
      const code = roomCode.toUpperCase();
      const game = triviaGames.get(code);
      if (!game || game.status !== 'waiting') return;

      const room = await prisma.room.findUnique({ where: { code } });
      if (!room) return;

      if (game.players.size < 2) {
        socket.emit('trivia:error', { message: 'Se necesitan al menos 2 jugadores para competir en Trivia.' });
        return;
      }

      // Check if players placed their bets
      const activeBettersCount = Math.floor(game.pool / TRIVIA_BET);
      if (activeBettersCount < game.players.size) {
        socket.emit('trivia:error', { message: 'Todos los jugadores deben realizar la apuesta de 1000 antes de comenzar.' });
        return;
      }

      game.status = 'playing';
      game.currentRound = 0;
      game.timer = ROUND_SECONDS;

      // Reset answers
      for (const p of game.players.values()) {
        p.currentAnswer = null;
        p.isEliminated = false;
        p.score = 0;
      }

      startTriviaTimer(io, code, room.id);
      broadcastTriviaState(io, code, game);
      
      await broadcastSystemMessage(io, code, room.id, `🧠 ¡Comenzó el show de Trivia! Respondan rápido para maximizar sus puntos.`);
    } catch (err) {
      console.error('trivia:start error:', err);
    }
  });

  socket.on('trivia:answer', ({ roomCode, choiceIndex }) => {
    try {
      if (!roomCode) return;
      const code = roomCode.toUpperCase();
      const game = triviaGames.get(code);
      if (!game || game.status !== 'playing') return;

      const player = game.players.get(user.id);
      if (!player || player.isEliminated || player.currentAnswer !== null) return;

      player.currentAnswer = parseInt(choiceIndex);
      player.answerTime = ROUND_SECONDS - game.timer; // Speed in seconds

      // Check if all non-eliminated players have answered
      const activePlayers = [...game.players.values()].filter(p => !p.isEliminated);
      const answeredPlayers = activePlayers.filter(p => p.currentAnswer !== null);

      if (answeredPlayers.length === activePlayers.length) {
        // All active players answered! Jump directly to reveal!
        if (game.intervalId) clearInterval(game.intervalId);
        revealRound(io, code, room.id);
      } else {
        broadcastTriviaState(io, code, game);
      }
    } catch (err) {
      console.error('trivia:answer error:', err);
    }
  });

  socket.on('trivia:leave', ({ roomCode }) => {
    if (!roomCode) return;
    const code = roomCode.toUpperCase();
    const game = triviaGames.get(code);
    if (!game) return;

    game.players.delete(user.id);
    if (game.players.size === 0) {
      if (game.intervalId) clearInterval(game.intervalId);
      triviaGames.delete(code);
    } else {
      broadcastTriviaState(io, code, game);
    }
  });
}

function startTriviaTimer(io, roomCode, roomId) {
  const game = triviaGames.get(roomCode);
  if (!game) return;

  if (game.intervalId) clearInterval(game.intervalId);

  game.intervalId = setInterval(() => {
    game.timer--;

    if (game.timer <= 0) {
      clearInterval(game.intervalId);
      revealRound(io, roomCode, roomId);
    } else {
      broadcastTriviaState(io, roomCode, game);
    }
  }, 1000);
}

async function revealRound(io, roomCode, roomId) {
  const game = triviaGames.get(roomCode);
  if (!game) return;

  game.status = 'reveal';
  const correctAnswer = game.questions[game.currentRound].correct;

  // Process answers
  for (const p of game.players.values()) {
    if (p.isEliminated) continue;

    if (p.currentAnswer === correctAnswer) {
      // Speed bonus: max speed = ROUND_SECONDS
      const elapsed = p.answerTime;
      const speedScore = Math.max(100, Math.floor(((ROUND_SECONDS - elapsed) / ROUND_SECONDS) * 1000));
      p.score += speedScore;
    } else {
      // INCORRECT OR TIMEOUT -> ELIMINATED!
      p.isEliminated = true;
    }
  }

  broadcastTriviaState(io, roomCode, game);

  // Wait 6 seconds for players to see the correct answer, then proceed
  setTimeout(async () => {
    const alivePlayers = [...game.players.values()].filter(p => !p.isEliminated);

    if (alivePlayers.length === 0) {
      // EVERYONE died in this round! Draw/Refund among those who reached this round
      game.status = 'finished';
      const roundContenders = [...game.players.values()];
      const splitPool = Math.floor(game.pool / roundContenders.length);

      for (const p of roundContenders) {
        await creditUserPayout(p.userId, splitPool, 'trivia_refund', roomId);
        await emitBalanceUpdate(io, p.userId);
      }

      await broadcastSystemMessage(io, roomCode, roomId, 
        `💀 ¡Todos los participantes fueron eliminados! El pozo de ${game.pool.toLocaleString()} C se dividió equitativamente.`);
    } else if (alivePlayers.length === 1 && [...game.players.values()].length > 1) {
      // Only 1 player survived! Instant victory!
      game.status = 'finished';
      const winner = alivePlayers[0];

      await creditUserPayout(winner.userId, game.pool, 'trivia_win', roomId);
      await emitBalanceUpdate(io, winner.userId);

      await broadcastSystemMessage(io, roomCode, roomId, 
        `👑 ¡Un único superviviente! ${winner.nickname} eliminó a la competencia y ganó la bolsa total de ${game.pool.toLocaleString()} CALDICOINS!`);
    } else {
      // Check if we finished all 5 rounds
      game.currentRound++;
      if (game.currentRound >= game.questions.length) {
        // Game finished! Surviving players split the pool based on score ranking!
        game.status = 'finished';
        
        // Split the jackpot pool equally among survivors
        const share = Math.floor(game.pool / alivePlayers.length);
        for (const winner of alivePlayers) {
          await creditUserPayout(winner.userId, share, 'trivia_win', roomId);
          await emitBalanceUpdate(io, winner.userId);
        }

        const winnerNames = alivePlayers.map(w => w.nickname).join(', ');
        await broadcastSystemMessage(io, roomCode, roomId, 
          `🎉 ¡Show de Trivia finalizado! Los supervivientes (${winnerNames}) superaron todas las preguntas y se repartieron el pozo de ${game.pool.toLocaleString()} C.`);
      } else {
        // Start next round!
        game.status = 'playing';
        game.timer = ROUND_SECONDS;
        for (const p of game.players.values()) {
          p.currentAnswer = null;
        }
        startTriviaTimer(io, roomCode, roomId);
      }
    }

    broadcastTriviaState(io, roomCode, game);
    if (game.status === 'finished') {
      // Clean up game instance
      triviaGames.delete(roomCode);
    }
  }, 6000);
}
