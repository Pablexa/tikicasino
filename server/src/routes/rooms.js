// TikiCasino - Rooms Routes
import { Router } from 'express';
import crypto from 'crypto';
import { prisma } from '../db/client.js';
import { requireAuth } from '../middleware/auth.js';
import { z } from 'zod';
import { deleteRoom } from '../sockets/index.js';

export const roomsRouter = Router();

const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_PLAYERS = 15;

function generateRoomCode() {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
  }
  return code;
}

roomsRouter.get('/active', requireAuth, async (req, res) => {
  try {
    const rooms = await prisma.room.findMany({
      where: { isActive: true },
      include: {
        owner: { select: { id: true, nickname: true, avatar: true } },
        members: {
          where: { isKicked: false },
          include: {
            user: { select: { id: true, nickname: true, avatar: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ rooms: rooms.map(formatRoom) });
  } catch (err) {
    console.error('Get active rooms error:', err);
    res.status(500).json({ error: 'Error al obtener salas activas.' });
  }
});

roomsRouter.post('/create', requireAuth, async (req, res) => {
  try {
    const { name, settings, customCode } = req.body;

    const io = req.app.get('io');
    try {
      const ownedRooms = await prisma.room.findMany({
        where: { ownerId: req.user.id },
        select: { id: true, code: true }
      });
      for (const r of ownedRooms) {
        // Simply update room timestamp to reset empty timer on owner creating new room, keep old rooms alive!
        await prisma.room.update({
          where: { id: r.id },
          data: { updatedAt: new Date() }
        });
      }
    } catch (err) {
      console.error('Error updating old owned rooms on creation:', err);
    }

    if (!name || name.trim().length < 3 || name.trim().length > 30) {
      return res.status(400).json({ error: 'El nombre debe tener entre 3 y 30 caracteres.' });
    }

    let code;
    if (customCode && customCode.trim()) {
      const codeStr = customCode.trim().toUpperCase();
      if (!/^[A-Z0-9]{3,6}$/.test(codeStr)) {
        return res.status(400).json({ error: 'El código debe tener de 3 a 6 caracteres alfanuméricos.' });
      }
      const existing = await prisma.room.findUnique({ where: { code: codeStr } });
      if (existing) {
        return res.status(400).json({ error: 'El código personalizado ya está ocupado.' });
      }
      code = codeStr;
    } else {
      let attempts = 0;
      do {
        code = generateRoomCode();
        const existing = await prisma.room.findUnique({ where: { code } });
        if (!existing) break;
        attempts++;
      } while (attempts < 10);
    }

    const defaultSettings = {
      minBet: 10,
      maxBet: 50000,
      maxPlayers: MAX_PLAYERS,
      enabledGames: ['blackjack', 'roulette', 'slots', 'crash', 'coinflip', 'dice', 'poker', 'liarsbar'],
      locked: false,
    };

    const roomSettings = { ...defaultSettings, ...(settings || {}) };

    const room = await prisma.room.create({
      data: {
        code,
        name: name.trim(),
        ownerId: req.user.id,
        settings: JSON.stringify(roomSettings),
        members: {
          create: { userId: req.user.id, role: 'owner' },
        },
      },
      include: {
        owner: { select: { id: true, nickname: true, avatar: true } },
        members: {
          include: {
            user: { select: { id: true, nickname: true, avatar: true, balance: true } },
          },
        },
      },
    });

    res.status(201).json({ room: formatRoom(room) });
  } catch (err) {
    console.error('Create room error:', err);
    res.status(500).json({ error: 'Error al crear la sala.' });
  }
});

// POST /api/rooms/join
roomsRouter.post('/join', requireAuth, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Código de sala requerido.' });

    const room = await prisma.room.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        members: { where: { isKicked: false } },
        owner: { select: { id: true, nickname: true } },
      },
    });

    if (!room) return res.status(404).json({ error: 'Sala no encontrada.' });
    if (!room.isActive) return res.status(400).json({ error: 'Esta sala está cerrada.' });

    const settings = JSON.parse(room.settings || '{}');
    if (settings.locked) {
      return res.status(403).json({ error: 'La sala está bloqueada. Pedile al dueño que la abra.' });
    }

    const currentMax = settings.maxPlayers || MAX_PLAYERS;
    if (room.members.length >= currentMax) {
      return res.status(400).json({ error: `La sala está llena (máx. ${currentMax} jugadores).` });
    }

    const existingMember = await prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId: room.id, userId: req.user.id } },
    });

    if (existingMember?.isKicked) {
      return res.status(403).json({ error: 'Fuiste removido de esta sala.' });
    }

    if (!existingMember) {
      await prisma.roomMember.create({
        data: { roomId: room.id, userId: req.user.id, role: 'member' },
      });
    }

    const updatedRoom = await prisma.room.findUnique({
      where: { id: room.id },
      include: {
        owner: { select: { id: true, nickname: true, avatar: true } },
        members: {
          where: { isKicked: false },
          include: {
            user: { select: { id: true, nickname: true, avatar: true, balance: true } },
          },
        },
      },
    });

    res.json({ room: formatRoom(updatedRoom) });
  } catch (err) {
    console.error('Join room error:', err);
    res.status(500).json({ error: 'Error al unirse a la sala.' });
  }
});

// GET /api/rooms/:roomCode
roomsRouter.get('/:roomCode', requireAuth, async (req, res) => {
  try {
    const room = await prisma.room.findUnique({
      where: { code: req.params.roomCode.toUpperCase() },
      include: {
        owner: { select: { id: true, nickname: true, avatar: true } },
        members: {
          where: { isKicked: false },
          include: {
            user: { select: { id: true, nickname: true, avatar: true, balance: true } },
          },
        },
      },
    });

    if (!room) return res.status(404).json({ error: 'Sala no encontrada.' });
    res.json({ room: formatRoom(room) });
  } catch (err) {
    console.error('Get room error:', err);
    res.status(500).json({ error: 'Error al obtener la sala.' });
  }
});

// PATCH /api/rooms/:roomCode/settings
roomsRouter.patch('/:roomCode/settings', requireAuth, async (req, res) => {
  try {
    const room = await prisma.room.findUnique({
      where: { code: req.params.roomCode.toUpperCase() },
    });

    if (!room) return res.status(404).json({ error: 'Sala no encontrada.' });
    if (room.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Solo el dueño puede cambiar la configuración.' });
    }

    const currentSettings = JSON.parse(room.settings || '{}');
    const newSettings = { ...currentSettings, ...req.body.settings };

    const updated = await prisma.room.update({
      where: { id: room.id },
      data: {
        name: req.body.name || room.name,
        settings: JSON.stringify(newSettings),
      },
    });

    res.json({ settings: JSON.parse(updated.settings) });
  } catch (err) {
    console.error('Update room settings error:', err);
    res.status(500).json({ error: 'Error al actualizar la sala.' });
  }
});

// POST /api/rooms/:roomCode/kick
roomsRouter.post('/:roomCode/kick', requireAuth, async (req, res) => {
  try {
    const { userId } = req.body;
    const room = await prisma.room.findUnique({
      where: { code: req.params.roomCode.toUpperCase() },
    });

    if (!room) return res.status(404).json({ error: 'Sala no encontrada.' });
    if (room.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Solo el dueño puede expulsar miembros.' });
    }
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'No podés expulsarte a vos mismo.' });
    }

    await prisma.roomMember.update({
      where: { roomId_userId: { roomId: room.id, userId } },
      data: { isKicked: true },
    });

    res.json({ message: 'Jugador removido de la sala.' });
  } catch (err) {
    console.error('Kick error:', err);
    res.status(500).json({ error: 'Error al expulsar al jugador.' });
  }
});

function formatRoom(room) {
  return {
    id: room.id,
    code: room.code,
    name: room.name,
    ownerId: room.ownerId,
    owner: room.owner,
    isActive: room.isActive,
    settings: typeof room.settings === 'string' ? JSON.parse(room.settings) : room.settings,
    members: room.members?.map(m => ({
      id: m.id,
      userId: m.userId,
      role: m.role,
      isMuted: m.isMuted,
      joinedAt: m.joinedAt,
      user: m.user,
    })) || [],
    createdAt: room.createdAt,
  };
}
