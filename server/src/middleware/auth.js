// TikiCasino - Authentication Middleware
import jwt from 'jsonwebtoken';
import { prisma } from '../db/client.js';

const JWT_SECRET = process.env.JWT_SECRET || 'tikicasino-dev-secret';

/**
 * Require authenticated user (valid JWT cookie)
 */
export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.tikicasino_token;
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        emailVerified: true,
        nickname: true,
        avatar: true,
        balance: true,
        isBanned: true,
        reputationLevel: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found.' });
    }

    if (user.isBanned) {
      return res.status(403).json({ error: 'Your account has been banned.' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

// All users are auto-verified on registration — this is a no-op passthrough
export function requireVerifiedEmail(req, res, next) {
  next();
}

/**
 * Require user is not banned
 */
export function requireNotBanned(req, res, next) {
  if (req.user?.isBanned) {
    return res.status(403).json({ error: 'Your account has been suspended.' });
  }
  next();
}

/**
 * Generate JWT token for a user
 */
export function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: '90d',
  });
}

/**
 * Set auth cookie on response
 */
export function setAuthCookie(res, token) {
  res.cookie('tikicasino_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 90 * 24 * 60 * 60 * 1000, // 90 days
    path: '/',
  });
}
