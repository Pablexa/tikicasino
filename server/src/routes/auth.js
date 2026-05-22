// TikiCasino - Auth Routes
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../db/client.js';
import { generateToken, setAuthCookie, requireAuth } from '../middleware/auth.js';
import { authRateLimit, registerRateLimit } from '../middleware/rateLimit.js';
import { z } from 'zod';

export const authRouter = Router();

const VALID_AVATARS = ['tiki1', 'tiki2', 'tiki3', 'tiki4', 'tiki5', 'tiki6', 'tiki7', 'tiki8'];
const INITIAL_BONUS = 10000;

// Helper: hash IP
const hashIp = (ip) => crypto.createHash('sha256').update(ip + 'tikisalt2025').digest('hex');

// Register schema — only nickname + password required
const registerSchema = z.object({
  nickname: z.string()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(20, 'El nombre debe tener como máximo 20 caracteres')
    .regex(/^[a-zA-Z0-9_]+$/, 'Solo letras, números y guiones bajos'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  avatar: z.string().optional().default('tiki1'),
});

// Login schema — nickname + password
const loginSchema = z.object({
  nickname: z.string().min(1, 'El nombre es requerido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

// POST /api/auth/register
authRouter.post('/register', registerRateLimit, authRateLimit, async (req, res) => {
  try {
    const data = registerSchema.parse(req.body);
    const avatar = VALID_AVATARS.includes(data.avatar) ? data.avatar : 'tiki1';

    // Get and hash IP (stored for analytics, no longer blocks registration)
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const ipHash = hashIp(ip);

    // Check nickname
    const existingNickname = await prisma.user.findUnique({
      where: { nickname: data.nickname },
    });
    if (existingNickname) {
      return res.status(409).json({ error: 'Ese nombre de usuario ya está en uso.' });
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    // Create user — auto-verified, balance set immediately
    const user = await prisma.user.create({
      data: {
        nickname: data.nickname,
        avatar,
        passwordHash,
        emailVerified: true,
        registrationIp: ipHash,
        hashedIp: ipHash,
        balance: INITIAL_BONUS,
        initialBonusClaimed: true,
      },
      select: {
        id: true, nickname: true, avatar: true, balance: true, emailVerified: true,
      },
    });

    // Log the bonus transaction
    await prisma.balanceTransaction.create({
      data: {
        userId: user.id,
        type: 'initial_bonus',
        amount: INITIAL_BONUS,
        balanceBefore: 0,
        balanceAfter: INITIAL_BONUS,
        metadata: JSON.stringify({ reason: 'Bonus de bienvenida en CALDICOINS' }),
      },
    });

    // Auto login
    const token = generateToken(user.id);
    setAuthCookie(res, token);

    res.status(201).json({
      message: `¡Cuenta creada! Recibiste ${INITIAL_BONUS.toLocaleString()} FCOINS de bienvenida.`,
      user,
    });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: err.errors[0]?.message || 'Datos inválidos' });
    }
    console.error('Register error:', err);
    res.status(500).json({ error: 'Error al crear la cuenta. Intentá de nuevo.' });
  }
});

// POST /api/auth/login
authRouter.post('/login', authRateLimit, async (req, res) => {
  try {
    const data = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { nickname: data.nickname },
    });

    if (!user) {
      await bcrypt.hash('dummy', 12); // timing-safe
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
    }

    if (user.isBanned) {
      return res.status(403).json({ error: 'Tu cuenta fue suspendida.' });
    }

    const passwordMatch = await bcrypt.compare(data.password, user.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = generateToken(user.id);
    setAuthCookie(res, token);

    res.json({
      message: 'Sesión iniciada.',
      user: {
        id: user.id,
        nickname: user.nickname,
        avatar: user.avatar,
        balance: user.balance,
        emailVerified: true,
      },
    });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: err.errors[0]?.message || 'Datos inválidos' });
    }
    console.error('Login error:', err);
    res.status(500).json({ error: 'Error al iniciar sesión.' });
  }
});

// POST /api/auth/logout
authRouter.post('/logout', (req, res) => {
  res.clearCookie('tikicasino_token', { path: '/' });
  res.json({ message: 'Sesión cerrada.' });
});

// GET /api/auth/me
authRouter.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      nickname: true,
      avatar: true,
      balance: true,
      emailVerified: true,
      createdAt: true,
      lastLoginAt: true,
      dailyBonusLastClaimedAt: true,
      dailyBonusStreak: true,
      emergencyRefillLastClaimedAt: true,
      initialBonusClaimed: true,
      reputationLevel: true,
    },
  });
  res.json({ user });
});
