import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import routes
import authRoutes from './routes/auth.js';
import roomRoutes from './routes/rooms.js';
import userRoutes from './routes/users.js';
import leaderboardRoutes from './routes/leaderboard.js';

// Import socket handlers
import { initializeSocketHandlers } from './socket/index.js';

// Import database
import { sequelize, testConnection } from './db/database.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true
  }
});

const PORT = process.env.PORT || 3000;
const isDev = process.env.NODE_ENV !== 'production';

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for development
  crossOriginEmbedderPolicy: false
}));
app.use(compression());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/users', userRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

// Serve static files in production
if (!isDev) {
  const clientBuildPath = path.join(__dirname, '../client/dist');
  app.use(express.static(clientBuildPath));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(isDev && { stack: err.stack })
  });
});

// Initialize Socket.IO handlers
initializeSocketHandlers(io);

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await testConnection();
    
    // Sync database (in development only)
    if (isDev) {
      await sequelize.sync({ alter: false });
      console.log('✓ Database synced');
    }
    
    httpServer.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════╗
║                                       ║
║         🎰 TIKICASINO SERVER 🎰       ║
║                                       ║
║  This is a FAKE casino simulator.    ║
║  FCOINS have NO real value.          ║
║  No real money, crypto, deposits,    ║
║  or withdrawals are supported.       ║
║                                       ║
╚═══════════════════════════════════════╝

🚀 Server running on port ${PORT}
📦 Environment: ${process.env.NODE_ENV}
🌐 Client URL: ${process.env.CLIENT_URL || 'http://localhost:5173'}
⏰ Started at: ${new Date().toLocaleString()}
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  httpServer.close(async () => {
    await sequelize.close();
    console.log('HTTP server closed');
    process.exit(0);
  });
});
