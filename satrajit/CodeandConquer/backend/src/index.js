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
import learningModuleRoutes from './routes/learningModuleRoutes.js';
import adRoutes from './routes/adRoutes.js';
import progressionRoutes from './routes/progressionRoutes.js';
import singlePlayerRoutes from './routes/singlePlayerRoutes.js';
import jobRoutes from './routes/jobRoutes.js';

// Import services
import matchmakingService from './services/matchmakingService.js';
import gameService from './services/gameService.js';
import multiplayerService from './services/multiplayerService.js';
import authDatabaseService from './services/authDatabaseService.js';
import storageService from './services/storageService.js';
import realtimeService from './services/realtimeService.js';
import publicDatabaseService from './services/publicDatabaseService.js';
import learningModuleService from './services/learningModuleService.js';
import adService from './services/adService.js';
import jobRecommendationService from './services/jobRecommendationService.js';
import jobScraperService from './services/jobScraperService.js';

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
app.use('/api/learning-modules', learningModuleRoutes);
app.use('/api/ads', adRoutes);
app.use('/api/jobs', jobRoutes);

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
      learningModules: learningModuleService.isAvailable(),
      ads: adService.isAvailable(),
      jobRecommendations: jobRecommendationService.isAvailable(),
      jobScraper: jobScraperService.isAvailable(),
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

// Wave income bonus helper function
function getWaveIncomeBonus(waveType, quantity) {
  const bonusMap = {
    spider: 2,
    scout: 3,
    swarm: 1,
    brute: 8,
    armored: 10,
    healer: 7,
    boss: 40
  };
  return (bonusMap[waveType] || 2) * quantity;
}

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

  socket.on('join_match', async (matchId) => {
    socket.join(`match_${matchId}`);
    const match = matchmakingService.getMatch(matchId);
    if (match) {
      const playerId = socket.handshake.auth?.userId || socket.id;
      
      // Initialize match in multiplayer service if not already done
      if (match.state === 'waiting' && match.player1_id && match.player2_id) {
        try {
          await multiplayerService.initializeMatch(matchId, match.player1_id, match.player2_id);
        } catch (error) {
          logger.error(`Error initializing match in multiplayer service:`, error);
        }
      }
      
      // Handle player connection
      multiplayerService.handlePlayerConnect(playerId, socket.id);
      
      socket.emit('match_state', match);
    }
  });

  // Handle match state request (for recovery/timeout scenarios)
  socket.on('get_match_state', (matchId) => {
    const match = matchmakingService.getMatch(matchId);
    if (match) {
      // Ensure match has all required fields
      const matchData = {
        id: matchId,
        matchId: matchId,
        ...match,
        players: match.players || [],
        gameState: match.gameState || {},
        state: match.state || match.status || 'waiting'
      };
      
      socket.emit('match_state', matchData);
      logger.info(`Sent match state for ${matchId} to ${socket.id}`);
    } else {
      socket.emit('match_error', { error: 'Match not found', matchId });
      logger.warn(`Match ${matchId} not found for ${socket.id}`);
    }
  });

  socket.on('start_match', async (matchId) => {
    const match = matchmakingService.getMatch(matchId);
    if (match) {
      match.state = 'briefing';
      await matchmakingService.updateMatch(matchId, { state: 'briefing' });
      // Ensure match has all required data before emitting
      const matchData = {
        id: matchId,
        matchId: matchId,
        ...match,
        players: match.players || [],
        gameState: match.gameState || {}
      };

      io.to(`match_${matchId}`).emit('match_briefing', matchData);
      
      // 3 second countdown before match starts
      setTimeout(async () => {
        match.state = 'running';
        match.startTime = new Date().toISOString();
        await matchmakingService.updateMatch(matchId, { 
          state: 'running',
          startTime: match.startTime
        });
        
        // Get fresh match data and ensure all required fields are present
        const updatedMatch = matchmakingService.getMatch(matchId);
        
        // Ensure players array is properly structured with id fields
        let players = [];
        if (updatedMatch?.players && Array.isArray(updatedMatch.players) && updatedMatch.players.length > 0) {
          // Use updated match players if they exist and have id fields
          players = updatedMatch.players.map(p => ({
            id: p.id || p.userId || p.playerId,
            ...p
          }));
        } else if (match?.players && Array.isArray(match.players) && match.players.length > 0) {
          // Fallback to original match players
          players = match.players.map(p => ({
            id: p.id || p.userId || p.playerId,
            ...p
          }));
        } else {
          // Last resort: reconstruct from match data if available
          if (updatedMatch?.player1_id && updatedMatch?.player2_id) {
            players = [
              { id: updatedMatch.player1_id },
              { id: updatedMatch.player2_id }
            ];
          } else if (match?.player1_id && match?.player2_id) {
            players = [
              { id: match.player1_id },
              { id: match.player2_id }
            ];
          }
        }
        
        // Ensure gameState exists
        const gameState = updatedMatch?.gameState || match?.gameState || {};
        
        // Construct the match data with all required fields
        const startedMatchData = {
          id: matchId,
          matchId: matchId,
          ...updatedMatch,
          ...match, // Include original match data as fallback
          players: players, // Always use properly structured players array
          gameState: gameState,
          state: 'running',
          startTime: match.startTime
        };

        // Validate that required fields are present
        if (!startedMatchData.id || !startedMatchData.matchId) {
          logger.error(`Match ${matchId} missing id or matchId field`);
        }
        if (!startedMatchData.players || startedMatchData.players.length === 0) {
          logger.error(`Match ${matchId} missing players array`);
        }
        if (!startedMatchData.players || !startedMatchData.players.every(p => p.id)) {
          logger.error(`Match ${matchId} players missing id fields`);
        }

        io.to(`match_${matchId}`).emit('match_started', startedMatchData);
        logger.info(`Match ${matchId} started with ${startedMatchData.players.length} players`, {
          matchId: startedMatchData.id,
          playersCount: startedMatchData.players.length,
          playerIds: startedMatchData.players.map(p => p.id)
        });
      }, 3000);
    }
  });

  socket.on('task_completed', async (data) => {
    const { matchId, playerId, taskType } = data
    
    try {
      // If in match, process task completion
      if (matchId) {
        const match = matchmakingService.getMatch(matchId)
        if (match && match.gameState) {
          const playerIndex = match.players.findIndex(p => p.id === playerId)
          const playerState = match.gameState[`player${playerIndex + 1}`]
          
          if (playerState) {
            // Add energy reward
            const energyReward = taskType === 'weekly' ? 22 : 15
            playerState.energy = Math.min(playerState.maxEnergy, playerState.energy + energyReward)
            
            // Increase passive energy generation (NO gold - coins only from coding problems)
            playerState.tasksCompletedThisGame++
            const energyIncrease = taskType === 'weekly' ? 0.12 : 0.08
            
            playerState.energyPerSecond += energyIncrease
            
            // Add time bonus to next wave
            const timeBonus = 10
            if (match.gameState.nextWaveTime) {
              match.gameState.nextWaveTime += timeBonus * 1000
            }
            
            // Broadcast update
            io.to(`match_${matchId}`).emit('game_state_update', match.gameState)
            socket.emit('task_reward', {
              energyReward,
              timeBonus
            })
          }
        }
      }
    } catch (error) {
      logger.error(`Error processing task completion:`, error)
      socket.emit('task_error', { error: error.message })
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

  socket.on('place_tower', async (data) => {
    const { matchId, playerId, position, towerType } = data;
    
    try {
      // Use multiplayer service for action validation and processing
      const result = multiplayerService.processPlayerAction(matchId, playerId, {
        type: 'place_tower',
        data: { position, towerType }
      });
      
      if (result.success) {
        // Also update game service for compatibility
        const gameResult = gameService.placeTower(matchId, playerId, position, towerType);
        
        socket.emit('tower_placed', { ...gameResult, sequence: result.sequence });
        
        // Broadcast to opponent
        socket.to(`match_${matchId}`).emit('opponent_action', {
          type: 'tower_placed',
          data: { position, towerType, playerId }
        });
        
        // Broadcast state update
        const matchState = multiplayerService.getMatchState(matchId, playerId);
        if (matchState) {
          io.to(`match_${matchId}`).emit('game_state_update', matchState);
        }
      } else {
        socket.emit('action_error', { error: 'Invalid action' });
      }
    } catch (error) {
      logger.error(`Error placing tower:`, error);
      socket.emit('action_error', { error: error.message });
    }
  });

  // Send wave to attack opponent
  socket.on('send_wave', async (data) => {
    const { matchId, playerId, waveType, quantity, cost } = data;
    
    try {
      const match = matchmakingService.getMatch(matchId);
      if (!match || match.state !== 'running') {
        socket.emit('action_error', { error: 'Match not active' });
        return;
      }
      
      // Find player state
      const playerIndex = match.players.findIndex(p => p.id === playerId);
      if (playerIndex === -1) {
        socket.emit('action_error', { error: 'Player not in match' });
        return;
      }
      
      const playerState = match.gameState[`player${playerIndex + 1}`];
      if (!playerState) {
        socket.emit('action_error', { error: 'Player state not found' });
        return;
      }
      
      // Check if player can afford the wave
      if (playerState.gold < cost) {
        socket.emit('action_error', { error: 'Not enough gold' });
        return;
      }
      
      // Deduct gold
      playerState.gold -= cost;
      
      // Add income bonus based on wave type
      const incomeBonus = getWaveIncomeBonus(waveType, quantity);
      playerState.income = (playerState.income || 20) + incomeBonus;
      
      // Track waves sent
      playerState.wavesSent = (playerState.wavesSent || 0) + quantity;
      
      // Confirm wave sent to sender
      socket.emit('wave_sent', {
        waveType,
        quantity,
        cost,
        newGold: playerState.gold,
        newIncome: playerState.income
      });
      
      // Notify opponent about incoming wave
      socket.to(`match_${matchId}`).emit('opponent_action', {
        type: 'wave_sent',
        data: { waveType, quantity, senderId: playerId }
      });
      
      // Broadcast state update
      io.to(`match_${matchId}`).emit('game_state_update', match.gameState);
      
      logger.info(`Wave sent: ${quantity}x ${waveType} from player ${playerId} in match ${matchId}`);
    } catch (error) {
      logger.error(`Error sending wave:`, error);
      socket.emit('action_error', { error: error.message });
    }
  });
  
  // Player action handler (unified) - relays all player actions to opponent
  socket.on('player_action', async (data) => {
    const { matchId, playerId, type, data: actionData } = data;
    
    try {
      // Relay action to opponent
      socket.to(`match_${matchId}`).emit('opponent_action', {
        type,
        data: { ...actionData, playerId }
      });
      
      // Process action if needed
      const result = multiplayerService.processPlayerAction(matchId, playerId, { type, data: actionData });
      
      if (result && result.success) {
        socket.emit('action_confirmed', { sequence: result.sequence });
        
        // Broadcast state update to all players in match
        const matchState = multiplayerService.getMatchState(matchId, playerId);
        if (matchState) {
          io.to(`match_${matchId}`).emit('game_state_update', matchState);
        }
      }
    } catch (error) {
      logger.error(`Error processing player action:`, error);
      socket.emit('action_error', { error: error.message });
    }
  });

  // Phase change event - sync phase transitions between players
  socket.on('phase_change', (data) => {
    const { matchId, phase, round, phaseTimeRemaining } = data;
    
    // Broadcast phase change to all players in match
    io.to(`match_${matchId}`).emit('phase_changed', {
      phase,
      round,
      phaseTimeRemaining,
      timestamp: Date.now()
    });
    
    logger.info(`Phase changed to ${phase} (round ${round}) in match ${matchId}`);
  });
  
  // State synchronization request
  socket.on('sync_state', (data) => {
    const { matchId, playerId, lastSequence } = data;
    
    try {
      const matchState = multiplayerService.getMatchState(matchId, playerId, lastSequence);
      if (matchState) {
        socket.emit('state_sync', matchState);
      }
    } catch (error) {
      logger.error(`Error syncing state:`, error);
      socket.emit('sync_error', { error: error.message });
    }
  });
  
  // Ping handler for connection monitoring
  socket.on('ping', (data) => {
    const { matchId, playerId } = data;
    if (playerId) {
      multiplayerService.handlePlayerConnect(playerId, socket.id);
    }
    socket.emit('pong', { timestamp: Date.now() });
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
    const playerId = socket.handshake.auth?.userId || socket.id;
    
    // Handle disconnection in multiplayer service
    multiplayerService.handlePlayerDisconnect(playerId);
    
    // Remove from queue
    matchmakingService.leaveQueue(playerId);
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
