import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '../db/models/index.js';
import { authLimiter, registerLimiter } from '../middleware/rateLimit.js';
import { requireAuth } from '../middleware/auth.js';
import { sendVerificationEmail } from '../utils/email.js';
import { hashString } from '../utils/security.js';

const router = express.Router();

// Register
router.post('/register', registerLimiter, async (req, res) => {
  try {
    const { email, nickname, password, deviceId, userAgent } = req.body;

    // Validation
    if (!email || !nickname || !password) {
      return res.status(400).json({ error: 'Email, nickname, and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    if (!/^[a-zA-Z0-9_]+$/.test(nickname)) {
      return res.status(400).json({ error: 'Nickname can only contain letters, numbers, and underscores' });
    }

    // Check if email or nickname already exists
    const existingUser = await User.findOne({
      where: {
        [sequelize.Op.or]: [{ email }, { nickname }]
      }
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({ error: 'Email already registered' });
      }
      if (existingUser.nickname === nickname) {
        return res.status(400).json({ error: 'Nickname already taken' });
      }
    }

    // Get IP from request
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const hashedIp = hashString(ip);
    const hashedDeviceId = deviceId ? hashString(deviceId) : null;
    const hashedUserAgent = userAgent ? hashString(userAgent) : null;

    // Check account creation limits
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    if (hashedDeviceId) {
      const deviceAccountCount = await User.count({
        where: {
          deviceId: hashedDeviceId,
          createdAt: { [sequelize.Op.gte]: last24Hours }
        }
      });
      
      if (deviceAccountCount >= 2) {
        return res.status(429).json({ 
          error: 'Account creation limit reached for this device. Please try again later.' 
        });
      }
    }

    const ipAccountCount = await User.count({
      where: {
        hashedIp,
        createdAt: { [sequelize.Op.gte]: last24Hours }
      }
    });

    if (ipAccountCount >= 3) {
      return res.status(429).json({ 
        error: 'Account creation limit reached for this network. Please try again later.' 
      });
    }

    // Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');

    // Create user
    const user = await User.create({
      email,
      nickname,
      passwordHash: password, // Will be hashed by the model hook
      emailVerificationToken,
      hashedIp,
      deviceId: hashedDeviceId,
      userAgentHash: hashedUserAgent
    });

    // Send verification email (don't wait for it)
    sendVerificationEmail(email, nickname, emailVerificationToken).catch(err => {
      console.error('Failed to send verification email:', err);
    });

    res.status(201).json({
      message: 'Account created successfully. Please check your email to verify your account.',
      userId: user.id,
      nickname: user.nickname
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// Login
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password, deviceId, userAgent } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ where: { email } });

    if (!user || !(await user.validatePassword(password))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.isBanned) {
      return res.status(403).json({ 
        error: 'Account banned',
        reason: user.banReason 
      });
    }

    // Update tracking info
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    user.hashedIp = hashString(ip);
    if (deviceId) user.deviceId = hashString(deviceId);
    if (userAgent) user.userAgentHash = hashString(userAgent);
    user.lastLoginAt = new Date();
    await user.save();

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: 'lax'
    });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        avatar: user.avatar,
        balance: user.balance,
        emailVerified: user.emailVerified,
        stats: user.stats
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Verify email
router.get('/verify-email/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({ 
      where: { emailVerificationToken: token } 
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    if (user.emailVerified) {
      return res.json({ message: 'Email already verified' });
    }

    // Verify email and give initial bonus
    user.emailVerified = true;
    user.emailVerificationToken = null;
    
    if (!user.initialBonusClaimed) {
      user.balance = 10000; // Initial bonus
      user.initialBonusClaimed = true;
    }

    await user.save();

    res.json({ 
      message: 'Email verified successfully! You received 10,000 FCOINS to start playing.',
      balance: user.balance
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Resend verification email
router.post('/resend-verification', requireAuth, async (req, res) => {
  try {
    if (req.user.emailVerified) {
      return res.status(400).json({ error: 'Email already verified' });
    }

    const newToken = crypto.randomBytes(32).toString('hex');
    req.user.emailVerificationToken = newToken;
    await req.user.save();

    await sendVerificationEmail(req.user.email, req.user.nickname, newToken);

    res.json({ message: 'Verification email sent' });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Failed to resend verification email' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

// Get current user
router.get('/me', requireAuth, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      nickname: req.user.nickname,
      avatar: req.user.avatar,
      balance: req.user.balance,
      emailVerified: req.user.emailVerified,
      reputationLevel: req.user.reputationLevel,
      stats: req.user.stats,
      createdAt: req.user.createdAt
    }
  });
});

export default router;
