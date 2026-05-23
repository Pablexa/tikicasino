// TikiCasino - Main Server Entry Point
import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server as SocketIO } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';

import { prisma } from './db/client.js';
import { authRouter } from './routes/auth.js';
import { usersRouter } from './routes/users.js';
import { roomsRouter } from './routes/rooms.js';
import { bonusesRouter } from './routes/bonuses.js';
import { leaderboardRouter } from './routes/leaderboard.js';
import { statsRouter } from './routes/stats.js';
import { setupSocketHandlers } from './sockets/index.js';
import { rateLimitByIp } from './middleware/rateLimit.js';
import { errorHandler } from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? true // same-origin on Render (server serves client)
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Socket.IO
const io = new SocketIO(httpServer, {
  cors: corsOptions,
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for development
}));
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(process.env.COOKIE_SECRET || 'dev-cookie-secret'));

// Rate limiting
app.use('/api/', rateLimitByIp);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', app: 'TikiCasino', version: '1.0.0', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/rooms', roomsRouter);
app.use('/api/bonuses', bonusesRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/stats', statsRouter);

if (process.env.NODE_ENV === 'production') {
  // Serve client/dist directly — built before server starts
  // __dirname = server/src/, so ../../client/dist = project root client/dist
  const clientDistPath = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) return next();
    const indexPath = path.join(clientDistPath, 'index.html');
    res.sendFile(indexPath, (err) => {
      if (err) {
        res.status(200).json({ status: 'TikiCasino API running', docs: '/api' });
      }
    });
  });
}

// Error handler (must be last)
app.use(errorHandler);

// Setup Socket.IO handlers
app.set('io', io);
setupSocketHandlers(io);

// Start server
const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════╗
║          TikiCasino Server v1.0           ║
║     CALDICOINS -- Timba a mas no poder    ║
╚═══════════════════════════════════════════╝
Servidor corriendo en puerto ${PORT}
Entorno: ${process.env.NODE_ENV || 'development'}
  `);

  // Ensure database is connected
  try {
    await prisma.$connect();
    console.log('Database connected successfully');
  } catch (err) {
    console.error('Database connection failed:', err);
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});

export { io };
