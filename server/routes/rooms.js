import express from 'express';
import { Room, User } from '../db/models/index.js';
import { requireAuth, requireVerifiedEmail, requireNotBanned } from '../middleware/auth.js';
import { Op } from 'sequelize';

const router = express.Router();

// Create room
router.post('/create', requireAuth, requireVerifiedEmail, requireNotBanned, async (req, res) => {
  try {
    const { name, isPrivate, maxPlayers, config } = req.body;

    if (!name || name.length < 3) {
      return res.status(400).json({ error: 'Room name must be at least 3 characters' });
    }

    const room = await Room.create({
      name,
      ownerId: req.user.id,
      isPrivate: isPrivate || false,
      maxPlayers: maxPlayers || 8,
      config: config || undefined,
      players: [{
        userId: req.user.id,
        nickname: req.user.nickname,
        avatar: req.user.avatar,
        balance: config?.initialBalance || 10000,
        joinedAt: new Date()
      }]
    });

    res.status(201).json({
      message: 'Room created successfully',
      room: {
        id: room.id,
        roomCode: room.roomCode,
        name: room.name,
        ownerId: room.ownerId,
        isPrivate: room.isPrivate,
        maxPlayers: room.maxPlayers,
        config: room.config,
        players: room.players
      }
    });
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// Join room by code
router.post('/join/:roomCode', requireAuth, requireVerifiedEmail, requireNotBanned, async (req, res) => {
  try {
    const { roomCode } = req.params;
    const { deviceId } = req.body;

    const room = await Room.findOne({ where: { roomCode: roomCode.toUpperCase() } });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (!room.isActive) {
      return res.status(400).json({ error: 'Room is no longer active' });
    }

    // Check if user is banned from room
    if (room.bannedUsers.includes(req.user.id)) {
      return res.status(403).json({ error: 'You are banned from this room' });
    }

    // Check if room is full
    if (room.players.length >= room.maxPlayers) {
      return res.status(400).json({ error: 'Room is full' });
    }

    // Check if user is already in room
    if (room.players.some(p => p.userId === req.user.id)) {
      return res.json({ message: 'Already in room', room });
    }

    // Check device/IP restrictions if enabled
    if (room.config.maxAccountsPerDevice && deviceId) {
      const deviceCount = room.players.filter(p => p.deviceId === deviceId).length;
      if (deviceCount >= room.config.maxAccountsPerDevice) {
        return res.status(403).json({ 
          error: 'Maximum accounts per device limit reached for this room' 
        });
      }
    }

    // Add player to room
    room.players.push({
      userId: req.user.id,
      nickname: req.user.nickname,
      avatar: req.user.avatar,
      balance: room.config.initialBalance || 10000,
      deviceId: deviceId || null,
      joinedAt: new Date()
    });

    await room.save();

    res.json({
      message: 'Joined room successfully',
      room: {
        id: room.id,
        roomCode: room.roomCode,
        name: room.name,
        ownerId: room.ownerId,
        config: room.config,
        players: room.players
      }
    });
  } catch (error) {
    console.error('Join room error:', error);
    res.status(500).json({ error: 'Failed to join room' });
  }
});

// Get room details
router.get('/:roomCode', requireAuth, async (req, res) => {
  try {
    const { roomCode } = req.params;

    const room = await Room.findOne({ where: { roomCode: roomCode.toUpperCase() } });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    res.json({
      room: {
        id: room.id,
        roomCode: room.roomCode,
        name: room.name,
        ownerId: room.ownerId,
        isPrivate: room.isPrivate,
        maxPlayers: room.maxPlayers,
        config: room.config,
        players: room.players,
        isActive: room.isActive
      }
    });
  } catch (error) {
    console.error('Get room error:', error);
    res.status(500).json({ error: 'Failed to get room details' });
  }
});

// Get user's rooms
router.get('/user/my-rooms', requireAuth, async (req, res) => {
  try {
    const rooms = await Room.findAll({
      where: {
        [Op.or]: [
          { ownerId: req.user.id },
          { players: { [Op.contains]: [{ userId: req.user.id }] } }
        ],
        isActive: true
      },
      order: [['updatedAt', 'DESC']],
      limit: 20
    });

    res.json({ rooms });
  } catch (error) {
    console.error('Get user rooms error:', error);
    res.status(500).json({ error: 'Failed to get rooms' });
  }
});

// Update room config (owner only)
router.patch('/:roomCode/config', requireAuth, requireVerifiedEmail, async (req, res) => {
  try {
    const { roomCode } = req.params;
    const { config } = req.body;

    const room = await Room.findOne({ where: { roomCode: roomCode.toUpperCase() } });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (room.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Only the room owner can update configuration' });
    }

    room.config = { ...room.config, ...config };
    await room.save();

    res.json({ message: 'Room configuration updated', config: room.config });
  } catch (error) {
    console.error('Update room config error:', error);
    res.status(500).json({ error: 'Failed to update room configuration' });
  }
});

// Close room (owner only)
router.delete('/:roomCode', requireAuth, async (req, res) => {
  try {
    const { roomCode } = req.params;

    const room = await Room.findOne({ where: { roomCode: roomCode.toUpperCase() } });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (room.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Only the room owner can close the room' });
    }

    room.isActive = false;
    await room.save();

    res.json({ message: 'Room closed successfully' });
  } catch (error) {
    console.error('Close room error:', error);
    res.status(500).json({ error: 'Failed to close room' });
  }
});

export default router;
