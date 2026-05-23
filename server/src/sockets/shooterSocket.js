// TikiCasino - Multiplayer 2D Shooter Socket Handler with State Machine
import { prisma } from '../db/client.js';
import { emitBalanceUpdate } from './index.js';
import { broadcastSystemMessage } from './chatSocket.js';

// Map of roomCode -> Shooter game state
const shooterGames = new Map();

const SHOOTER_BET = 500;
const MAP_WIDTH = 800;
const MAP_HEIGHT = 600;
const PLAYER_SPEED = 5;
const BULLET_SPEED = 12;
const PLAYER_RADIUS = 16;
const BULLET_RADIUS = 5;
const COOLDOWN_MS = 350;

function getOrCreateShooterGame(io, roomCode, roomId) {
  const code = roomCode.toUpperCase();
  if (!shooterGames.has(code)) {
    const game = {
      roomCode: code,
      roomId: roomId,
      status: 'intermission', // 'intermission' or 'playing'
      timer: 15,              // Countdown timer in seconds
      players: new Map(),     // userId -> { userId, nickname, avatar, x, y, angle, hp, color, lastShot, keys: {}, kills: 0, isDead: true, hasBet: false }
      bullets: [],
      bulletIdCounter: 0,
      intervalId: null,
      timerIntervalId: null
    };

    // 1. Physics update tick loop at 30Hz (~33ms)
    game.intervalId = setInterval(() => {
      updateShooterPhysics(io, game);
    }, 1000 / 30);

    // 2. State Machine Game Loop at 1Hz (1 second)
    game.timerIntervalId = setInterval(async () => {
      game.timer--;
      if (game.timer <= 0) {
        if (game.status === 'intermission') {
          // Transition to playing
          const activePlayers = [...game.players.values()].filter(p => p.hasBet);
          if (activePlayers.length < 1) {
            // Keep in intermission if no players joined/bet
            game.timer = 15;
            await broadcastSystemMessage(io, game.roomCode, game.roomId, '⏳ No hay suficientes jugadores inscritos. Intervención extendida por 15 segundos.');
            return;
          }

          game.status = 'playing';
          game.timer = 60;
          game.bullets = [];

          // Spawn all registered players!
          for (const p of game.players.values()) {
            if (p.hasBet) {
              p.x = Math.floor(Math.random() * (MAP_WIDTH - 100)) + 50;
              p.y = Math.floor(Math.random() * (MAP_HEIGHT - 100)) + 50;
              p.hp = 100;
              p.isDead = false;
              p.kills = 0;
            } else {
              p.isDead = true;
              p.hp = 0;
            }
          }

          await broadcastSystemMessage(io, game.roomCode, game.roomId, '⚔️ ¡Comenzó la batalla campal! Tenés 60 segundos para cazar.');
        } else {
          // Transition to intermission
          game.status = 'intermission';
          game.timer = 15;
          game.bullets = [];

          // Compute winner (player with highest kills)
          let winner = null;
          let maxKills = 0;
          for (const p of game.players.values()) {
            if (p.hasBet && p.kills > maxKills) {
              maxKills = p.kills;
              winner = p;
            }
            // Clear stats for next round
            p.hasBet = false;
            p.isDead = true;
            p.hp = 0;
          }

          if (winner) {
            await broadcastSystemMessage(io, game.roomCode, game.roomId, `🏆 ¡Partida finalizada! El ganador de la ronda es ${winner.nickname} con ${maxKills} bajas.`);
          } else {
            await broadcastSystemMessage(io, game.roomCode, game.roomId, '🏁 ¡Partida finalizada! No hubo bajas en este asalto.');
          }

          await broadcastSystemMessage(io, game.roomCode, game.roomId, '⏳ Intervención: 15 segundos para apostar 500 C y anotarse en la próxima partida.');
        }
      }
    }, 1000);

    shooterGames.set(code, game);
  }
  return shooterGames.get(code);
}

function updateShooterPhysics(io, game) {
  const playersArr = [...game.players.values()];

  // Only run inputs & bullets physics if game is currently in playing status
  if (game.status === 'playing') {
    // 1. Update player positions
    for (const p of playersArr) {
      if (p.isDead || !p.hasBet) continue;

      let dx = 0;
      let dy = 0;
      if (p.keys?.w || p.keys?.arrowup) dy -= 1;
      if (p.keys?.s || p.keys?.arrowdown) dy += 1;
      if (p.keys?.a || p.keys?.arrowleft) dx -= 1;
      if (p.keys?.d || p.keys?.arrowright) dx += 1;

      if (dx !== 0 && dy !== 0) {
        dx *= 0.7071;
        dy *= 0.7071;
      }

      p.x += dx * PLAYER_SPEED;
      p.y += dy * PLAYER_SPEED;

      p.x = Math.max(PLAYER_RADIUS, Math.min(MAP_WIDTH - PLAYER_RADIUS, p.x));
      p.y = Math.max(PLAYER_RADIUS, Math.min(MAP_HEIGHT - PLAYER_RADIUS, p.y));
    }

    // 2. Update bullets and process collision detection
    const survivingBullets = [];
    for (const b of game.bullets) {
      b.x += b.vx;
      b.y += b.vy;

      if (b.x < 0 || b.x > MAP_WIDTH || b.y < 0 || b.y > MAP_HEIGHT) {
        continue;
      }

      let hitOccurred = false;
      for (const p of playersArr) {
        if (p.isDead || !p.hasBet || p.userId === b.ownerId) continue;

        const dist = Math.hypot(p.x - b.x, p.y - b.y);
        if (dist < PLAYER_RADIUS + BULLET_RADIUS) {
          hitOccurred = true;
          p.hp -= 25;
          
          if (p.hp <= 0) {
            p.hp = 0;
            p.isDead = true;
            // Reward killer directly
            handlePlayerKill(io, game, b.ownerId, p);
          }
          break;
        }
      }

      if (!hitOccurred) {
        survivingBullets.push(b);
      }
    }
    game.bullets = survivingBullets;
  }

  // 3. Broadcast clean arena state
  io.to(`shooter:${game.roomCode}`).emit('shooter:state', {
    status: game.status,
    timer: game.timer,
    players: playersArr.map(p => ({
      userId: p.userId,
      nickname: p.nickname,
      avatar: p.avatar,
      x: p.x,
      y: p.y,
      angle: p.angle,
      hp: p.hp,
      color: p.color,
      isDead: p.isDead,
      hasBet: p.hasBet,
      kills: p.kills
    })),
    bullets: game.bullets.map(b => ({
      x: b.x,
      y: b.y
    }))
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
    data: { userId, roomId, gameType: 'shooter', type: 'shooter_bet', amount: -amount, balanceBefore: user.balance, balanceAfter: updatedUser.balance }
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
    data: { userId, roomId, gameType: 'shooter', type, amount, balanceBefore: user.balance, balanceAfter: updatedUser.balance }
  });
}

async function handlePlayerKill(io, game, killerId, victim) {
  const killer = game.players.get(killerId);
  if (!killer) return;

  killer.kills++;

  try {
    await creditUserPayout(killerId, SHOOTER_BET, 'shooter_kill', game.roomId);
    await emitBalanceUpdate(io, killerId);

    await broadcastSystemMessage(io, game.roomCode, game.roomId, 
      `💥 ¡Arena: ${killer.nickname} eliminó a ${victim.nickname} y se llevó su recompensa de 500 Caldicoins!`);
  } catch (err) {
    console.error('handlePlayerKill error:', err);
  }
}

export function setupShooterSocket(io, socket) {
  const user = socket.user;

  socket.on('shooter:join', async ({ roomCode }) => {
    try {
      if (!roomCode) return;
      const code = roomCode.toUpperCase();
      
      for (const r of socket.rooms) {
        if (r.startsWith('shooter:') && r !== `shooter:${code}`) {
          socket.leave(r);
        }
      }

      const room = await prisma.room.findUnique({ where: { code } });
      if (!room) return;

      socket.join(`shooter:${code}`);

      const game = getOrCreateShooterGame(io, code, room.id);

      if (!game.players.has(user.id)) {
        game.players.set(user.id, {
          userId: user.id,
          nickname: user.nickname,
          avatar: user.avatar,
          x: Math.floor(Math.random() * (MAP_WIDTH - 100)) + 50,
          y: Math.floor(Math.random() * (MAP_HEIGHT - 100)) + 50,
          angle: 0,
          hp: 0,
          color: `hsl(${Math.floor(Math.random() * 360)}, 85%, 60%)`,
          isDead: true,
          hasBet: false,
          kills: 0,
          lastShot: 0,
          keys: {}
        });
      }

      game.players.get(user.id).socketId = socket.id;
    } catch (err) {
      console.error('shooter:join error:', err);
    }
  });

  socket.on('shooter:bet', async ({ roomCode }) => {
    try {
      if (!roomCode) return;
      const code = roomCode.toUpperCase();
      const game = shooterGames.get(code);
      if (!game) return;

      if (game.status !== 'intermission') {
        socket.emit('shooter:error', { message: 'Solo podés entrar o apostar durante la intervención de 15 segundos.' });
        return;
      }

      const player = game.players.get(user.id);
      if (!player) return;

      if (player.hasBet) {
        socket.emit('shooter:error', { message: 'Ya estás inscrito para la siguiente partida.' });
        return;
      }

      // Deduct bet
      const newBalance = await deductUserBet(user.id, SHOOTER_BET, game.roomId);
      if (newBalance === null) {
        socket.emit('shooter:error', { message: 'CALDICOINS insuficientes para entrar al combate (500).' });
        return;
      }

      await emitBalanceUpdate(io, user.id);

      player.hasBet = true;
      player.isDead = true; // Stay waiting/dead until game actually spawns them
      player.hp = 0;

      await broadcastSystemMessage(io, code, game.roomId, 
        `⚔️ ¡${user.nickname} pagó la entrada de 500 C y se alistó para la próxima partida!`);
    } catch (err) {
      console.error('shooter:bet error:', err);
    }
  });

  socket.on('shooter:input', ({ roomCode, keys, angle, shoot }) => {
    try {
      if (!roomCode) return;
      const code = roomCode.toUpperCase();
      const game = shooterGames.get(code);
      if (!game || game.status !== 'playing') return;

      const player = game.players.get(user.id);
      if (!player || player.isDead || !player.hasBet) return;

      player.keys = keys || {};
      player.angle = angle || 0;

      const now = Date.now();
      if (shoot && now - player.lastShot > COOLDOWN_MS) {
        player.lastShot = now;

        const vx = Math.cos(angle) * BULLET_SPEED;
        const vy = Math.sin(angle) * BULLET_SPEED;

        game.bullets.push({
          id: game.bulletIdCounter++,
          ownerId: user.id,
          x: player.x + Math.cos(angle) * PLAYER_RADIUS,
          y: player.y + Math.sin(angle) * PLAYER_RADIUS,
          vx,
          vy
        });
      }
    } catch (err) {
      console.error('shooter:input error:', err);
    }
  });

  socket.on('shooter:leave', ({ roomCode }) => {
    if (!roomCode) return;
    const code = roomCode.toUpperCase();
    const game = shooterGames.get(code);
    if (!game) return;

    game.players.delete(user.id);
    if (game.players.size === 0) {
      if (game.intervalId) clearInterval(game.intervalId);
      if (game.timerIntervalId) clearInterval(game.timerIntervalId);
      shooterGames.delete(code);
    }
  });
}
