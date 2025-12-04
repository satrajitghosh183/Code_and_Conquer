import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

// Import utilities and middleware
import logger from './utils/logger.js';
import validateEnvironment, { getConfig } from './utils/validateEnv.js';
import {
  helmetMiddleware,
  compressionMiddleware,
  createApiRateLimiter,
  createExecutionRateLimiter,
  sanitizeRequest,
  trustProxy
} from './middleware/security.js';

// Import routes
import problemRoutes from './routes/problemRoutes.js';
import submissionRoutes from './routes/submissionRoutes.js';
import userRoutes from './routes/userRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import matchRoutes from './routes/matchRoutes.js';
import authRoutes from './routes/authRoutes.js';
import leaderboardRoutes from './routes/leaderboardRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import authDatabaseRoutes from './routes/authDatabaseRoutes.js';
import storageRoutes from './routes/storageRoutes.js';
import realtimeRoutes from './routes/realtimeRoutes.js';
import publicDatabaseRoutes from './routes/publicDatabaseRoutes.js';
import progressionRoutes from './routes/progressionRoutes.js';
import singlePlayerRoutes from './routes/singlePlayerRoutes.js';

// Import services
import matchmakingService from './services/matchmakingService.js';
import gameService from './services/gameService.js';
import authDatabaseService from './services/authDatabaseService.js';
import storageService from './services/storageService.js';
import realtimeService from './services/realtimeService.js';
import publicDatabaseService from './services/publicDatabaseService.js';

// Validate environment
validateEnvironment();
const config = getConfig();

// Initialize Express app
const app = express();
const httpServer = createServer(app);

// Trust proxy for production deployments
trustProxy(app);

// Configure CORS
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  config.clientUrl
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin) || !config.isProduction) {
      callback(null, origin);
    } else {
      logger.warn(`CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset']
};

// Initialize Socket.IO with CORS
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Apply middleware (order matters!)
app.use(helmetMiddleware);
app.use(compressionMiddleware);
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(sanitizeRequest);

// Request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.logRequest(req, res.statusCode, duration);
  });
  
  next();
});

// Create rate limiters after environment is validated
const apiRateLimiter = createApiRateLimiter();
const executionRateLimiter = createExecutionRateLimiter();

// Apply rate limiting to API routes
app.use('/api/', apiRateLimiter);

// Apply stricter rate limiting to code execution
app.use('/api/submissions/submit', executionRateLimiter);
app.use('/api/submissions/run', executionRateLimiter);

// API Routes
app.use('/api/problems', problemRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/users', userRoutes);
app.use('/api', paymentRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/auth', authRoutes);
app.use('/api/auth-db', authDatabaseRoutes);
app.use('/api/storage', storageRoutes);
app.use('/api/realtime', realtimeRoutes);
app.use('/api/public-db', publicDatabaseRoutes);
app.use('/api/progression', progressionRoutes);
app.use('/api/singleplayer', singlePlayerRoutes);

// Enhanced health check endpoint
app.get('/api/health', (req, res) => {
  const healthStatus = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: config.nodeEnv,
    services: {
      authDatabase: authDatabaseService.isAvailable(),
      storage: storageService.isAvailable(),
      realtime: realtimeService.isAvailable(),
      publicDatabase: publicDatabaseService.isAvailable(),
      matchmaking: true,
      game: true
    },
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      unit: 'MB'
    }
  };
  
  // Check if any critical service is down
  const criticalServices = ['authDatabase', 'publicDatabase'];
  const allCriticalUp = criticalServices.every(s => healthStatus.services[s]);
  
  if (!allCriticalUp) {
    healthStatus.status = 'degraded';
    res.status(503);
  }
  
  res.json(healthStatus);
});

// Readiness probe for Kubernetes/container orchestration
app.get('/api/ready', async (req, res) => {
  try {
    // Check database connectivity
    const dbReady = publicDatabaseService.isAvailable();
    
    if (dbReady) {
      res.json({ ready: true });
    } else {
      res.status(503).json({ ready: false, reason: 'Database not available' });
    }
  } catch (error) {
    res.status(503).json({ ready: false, reason: error.message });
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  socket.on('join_queue', async (playerData) => {
    try {
      const playerId = playerData.id || playerData.userId || socket.id;
      const result = await matchmakingService.joinQueue(playerId, {
        ...playerData,
        id: playerId,
        socketId: socket.id
      });

      if (result.matched && result.match) {
        result.match.players.forEach(player => {
          io.to(player.socketId).emit('match_found', {
            matchId: result.match.id,
            opponent: result.match.players.find(p => p.id !== player.id),
            gameState: result.match.gameState
          });
        });
      } else {
        socket.emit('queue_update', { queueSize: matchmakingService.queue.length });
      }
    } catch (error) {
      logger.logError(error, { socketId: socket.id, event: 'join_queue' });
      socket.emit('queue_error', { error: error.message });
    }
  });

  socket.on('leave_queue', (playerData) => {
    const playerId = playerData?.id || playerData?.userId || socket.id;
    matchmakingService.leaveQueue(playerId);
  });

  socket.on('join_match', (matchId) => {
    socket.join(`match_${matchId}`);
    const match = matchmakingService.getMatch(matchId);
    if (match) {
      socket.emit('match_state', match);
    }
  });

  socket.on('start_match', async (matchId) => {
    const match = matchmakingService.getMatch(matchId);
    if (match) {
      match.state = 'briefing';
      await matchmakingService.updateMatch(matchId, { state: 'briefing' });
      io.to(`match_${matchId}`).emit('match_briefing', match);
      
      setTimeout(async () => {
        match.state = 'running';
        match.startTime = new Date().toISOString();
        await matchmakingService.updateMatch(matchId, { 
          state: 'running',
          startTime: match.startTime
        });
        io.to(`match_${matchId}`).emit('match_started', match);
      }, 30000);
    }
  });

  socket.on('submit_code', async (data) => {
    const { matchId, playerId, code, problemId, difficulty, language = 'javascript' } = data;
    
    try {
      const executorService = (await import('./services/executorService.js')).default;
      const database = (await import('./config/database.js')).default;
      
      const problem = await database.getProblemById(problemId);
      if (!problem) {
        socket.emit('coding_error', { error: 'Problem not found' });
        return;
      }

      const testCases = problem.testCases || [];
      const startTime = Date.now();
      
      const testResults = await executorService.runTestCases(code, language, testCases);
      const executionTimeMs = Date.now() - startTime;
      
      let status = 'FAIL';
      if (testResults.allPassed) {
        status = 'PASS';
      } else if (testResults.passedTests > 0) {
        status = 'PARTIAL';
      }

      const result = gameService.processCodingSubmission(matchId, playerId, {
        status,
        problemId,
        difficulty: difficulty || problem.difficulty,
        executionTimeMs,
        passedCount: testResults.passedTests,
        totalTests: testResults.totalTests
      });

      if (result) {
        io.to(`match_${matchId}`).emit('coding_result', {
          playerId,
          ...result,
          testResults: {
            passed: testResults.passedTests,
            total: testResults.totalTests
          }
        });
        
        const match = matchmakingService.getMatch(matchId);
        if (match) {
          io.to(`match_${matchId}`).emit('game_state_update', match.gameState);
        }
      }
    } catch (error) {
      logger.logError(error, { socketId: socket.id, event: 'submit_code' });
      socket.emit('coding_error', { error: error.message });
    }
  });

  socket.on('place_tower', (data) => {
    const { matchId, playerId, position, towerType } = data;
    const result = gameService.placeTower(matchId, playerId, position, towerType);
    
    if (result) {
      socket.emit('tower_placed', result);
      const match = matchmakingService.getMatch(matchId);
      if (match) {
        io.to(`match_${matchId}`).emit('game_state_update', match.gameState);
      }
    }
  });

  socket.on('spawn_wave', (data) => {
    const { matchId, waveNumber } = data;
    const result = gameService.spawnWave(matchId, waveNumber);
    
    if (result) {
      io.to(`match_${matchId}`).emit('wave_spawned', result);
    }
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
    matchmakingService.leaveQueue(socket.id);
  });
});

// Game loop - update all active matches
const GAME_TICK_RATE = 16; // ~60fps
let gameLoopInterval = setInterval(() => {
  matchmakingService.matches.forEach((match, matchId) => {
    if (match.state === 'running') {
      gameService.updateGameState(matchId, GAME_TICK_RATE / 1000);
      
      io.to(`match_${matchId}`).emit('game_state_update', match.gameState);
      
      if (match.state === 'finished') {
        io.to(`match_${matchId}`).emit('match_ended', {
          winner: match.winner,
          finalState: match.gameState
        });
      }
    }
  });
}, GAME_TICK_RATE);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    path: req.path
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.logError(err, req);
  
  // Handle CORS errors
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'CORS policy does not allow this request'
    });
  }
  
  // Handle validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: err.message,
      details: err.details
    });
  }
  
  // Handle rate limiting errors
  if (err.status === 429) {
    return res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please slow down.',
      retryAfter: err.retryAfter
    });
  }
  
  // Generic error response
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    error: statusCode >= 500 ? 'Internal Server Error' : 'Error',
    message: config.isDevelopment ? err.message : 'Something went wrong',
    ...(config.isDevelopment && { stack: err.stack })
  });
});

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);
  
  // Stop accepting new connections
  httpServer.close(() => {
    logger.info('HTTP server closed');
  });
  
  // Clear game loop
  if (gameLoopInterval) {
    clearInterval(gameLoopInterval);
    logger.info('Game loop stopped');
  }
  
  // Close all socket connections
  io.close(() => {
    logger.info('Socket.IO connections closed');
  });
  
  // Give existing requests time to complete
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  logger.info('Graceful shutdown complete');
  process.exit(0);
};

// Listen for termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', { error: error.message, stack: error.stack });
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', { reason, promise });
});

// Start server
httpServer.listen(config.port, config.host, () => {
  logger.info(`🚀 Code and Conquer Backend started`, {
    host: config.host,
    port: config.port,
    environment: config.nodeEnv,
    clientUrl: config.clientUrl
  });
  logger.info('📡 Socket.IO server ready');
  logger.info('🎮 Game loop running at 60fps');
});

export { app, httpServer, io };
