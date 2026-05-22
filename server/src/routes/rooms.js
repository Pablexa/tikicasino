// TikiCasino - Rooms Routes
import { Router } from 'express';
import crypto from 'crypto';
import { prisma } from '../db/client.js';
import { requireAuth, requireVerifiedEmail } from '../middleware/auth.js';
import { z } from 'zod';

export const roomsRouter = Router();

const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateRoomCode() {
  let code = '';
  const arr = new Uint32Array(6);
  crypto.getRandomValues ? crypto.getRandomValues(arr) : null;
  for (let i = 0; i < 6; i++) {
    const rand = arr[i] ?? Math.floor(Math.random() * ROOM_CODE_CHARS.length);
    code += ROOM_CODE_CHARS[rand % ROOM_CODE_CHARS.length];
  }
  return code;
}

// POST /api/rooms/create
roomsRouter.post('/create', requireAuth, requireVerifiedEmail, async (req, res) => {
  try {
    const { name, settings } = req.body;

    if (!name || name.trim().length < 3 || name.trim().length > 30) {
      return res.status(400).json({ error: 'Room name must be between 3 and 30 characters.' });
    }

    // Generate unique code
    let code;
    let attempts = 0;
    do {
      code = generateRoomCode();
      const existing = await prisma.room.findUnique({ where: { code } });
      if (!existing) break;
      attempts++;
    } while (attempts < 10);

    const defaultSettings = {
      minBet: 10,
      maxBet: 50000,
      enabledGames: ['blackjack', 'roulette', 'slots', 'crash', 'coinflip', 'dice'],
      allowSameIp: false,
      requireAccountAge24h: false,
      whitelistOnly: false,
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
          create: {
            userId: req.user.id,
            role: 'owner',
          },
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
    res.status(500).json({ error: 'Failed to create room.' });
  }
});

// POST /api/rooms/join
roomsRouter.post('/join', requireAuth, requireVerifiedEmail, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Room code is required.' });

    const room = await prisma.room.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        members: { where: { isKicked: false } },
        owner: { select: { id: true, nickname: true } },
      },
    });

    if (!room) return res.status(404).json({ error: 'Room not found.' });
    if (!room.isActive) return res.status(400).json({ error: 'This room is closed.' });

    const settings = JSON.parse(room.settings || '{}');
    if (settings.locked) {
      return res.status(403).json({ error: 'This room is locked. Ask the owner to unlock it.' });
    }

    if (members.length >= 16) {
      return res.status(400).json({ error: 'This room is full (max 16 players).' });
    }

    // Check if already a member
    const existingMember = await prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId: room.id, userId: req.user.id } },
    });

    if (existingMember?.isKicked) {
      return res.status(403).json({ error: 'You have been removed from this room.' });
    }

    if (!existingMember) {
      await prisma.roomMember.create({
        data: {
          roomId: room.id,
          userId: req.user.id,
          role: 'member',
        },
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
    res.status(500).json({ error: 'Failed to join room.' });
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

    if (!room) return res.status(404).json({ error: 'Room not found.' });

    res.json({ room: formatRoom(room) });
  } catch (err) {
    console.error('Get room error:', err);
    res.status(500).json({ error: 'Failed to get room.' });
  }
});

// PATCH /api/rooms/:roomCode/settings
roomsRouter.patch('/:roomCode/settings', requireAuth, async (req, res) => {
  try {
    const room = await prisma.room.findUnique({
      where: { code: req.params.roomCode.toUpperCase() },
    });

    if (!room) return res.status(404).json({ error: 'Room not found.' });
    if (room.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Only the room owner can change settings.' });
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
    res.status(500).json({ error: 'Failed to update settings.' });
  }
});

// POST /api/rooms/:roomCode/kick
roomsRouter.post('/:roomCode/kick', requireAuth, async (req, res) => {
  try {
    const { userId } = req.body;
    const room = await prisma.room.findUnique({
      where: { code: req.params.roomCode.toUpperCase() },
    });

    if (!room) return res.status(404).json({ error: 'Room not found.' });
    if (room.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Only the room owner can kick members.' });
    }
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'You cannot kick yourself.' });
    }

    await prisma.roomMember.update({
      where: { roomId_userId: { roomId: room.id, userId } },
      data: { isKicked: true },
    });

    res.json({ message: 'Player has been removed from the room.' });
  } catch (err) {
    console.error('Kick error:', err);
    res.status(500).json({ error: 'Failed to kick player.' });
  }
});

// POST /api/rooms/:roomCode/invites
roomsRouter.post('/:roomCode/invites', requireAuth, requireVerifiedEmail, async (req, res) => {
  try {
    const room = await prisma.room.findUnique({
      where: { code: req.params.roomCode.toUpperCase() },
    });

    if (!room) return res.status(404).json({ error: 'Room not found.' });
    if (room.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Only the room owner can create invites.' });
    }

    // Generate unique invite code
    const inviteCode = `${req.user.nickname.slice(0, 5).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const invite = await prisma.invite.create({
      data: {
        roomId: room.id,
        code: inviteCode,
        createdById: req.user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    res.status(201).json({ invite });
  } catch (err) {
    console.error('Create invite error:', err);
    res.status(500).json({ error: 'Failed to create invite.' });
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
