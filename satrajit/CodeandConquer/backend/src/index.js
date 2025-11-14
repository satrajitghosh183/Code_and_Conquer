import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import problemRoutes from './routes/problemRoutes.js';
import submissionRoutes from './routes/submissionRoutes.js';
import userRoutes from './routes/userRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import matchRoutes from './routes/matchRoutes.js';
import authRoutes from './routes/authRoutes.js';
import leaderboardRoutes from './routes/leaderboardRoutes.js';
import matchmakingService from './services/matchmakingService.js';
import gameService from './services/gameService.js';
import authDatabaseService from './services/authDatabaseService.js';
import authDatabaseRoutes from './routes/authDatabaseRoutes.js';
import storageService from './services/storageService.js';
import realtimeService from './services/realtimeService.js';
import publicDatabaseService from './services/publicDatabaseService.js';
import storageRoutes from './routes/storageRoutes.js';
import realtimeRoutes from './routes/realtimeRoutes.js';
import publicDatabaseRoutes from './routes/publicDatabaseRoutes.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/problems', problemRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/users', userRoutes);
app.use('/api', paymentRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/leaderboard', leaderboardRoutes); // Leaderboard routes
app.use('/auth', authRoutes);
app.use('/api/auth-db', authDatabaseRoutes); // Auth database routes
app.use('/api/storage', storageRoutes); // Storage routes
app.use('/api/realtime', realtimeRoutes); // Realtime routes
app.use('/api/public-db', publicDatabaseRoutes); // Public database routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Code and Conquer API is running',
    services: {
      authDatabase: authDatabaseService.isAvailable(),
      storage: storageService.isAvailable(),
      realtime: realtimeService.isAvailable(),
      publicDatabase: publicDatabaseService.isAvailable(),
    }
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Join queue for matchmaking
  socket.on('join_queue', async (playerData) => {
    try {
      const playerId = playerData.id || playerData.userId || socket.id;
      const result = await matchmakingService.joinQueue(playerId, {
        ...playerData,
        id: playerId,
        socketId: socket.id
      });

      if (result.matched && result.match) {
        // Notify both players
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
      console.error('Error in join_queue:', error);
      socket.emit('queue_error', { error: error.message });
    }
  });

  // Leave queue
  socket.on('leave_queue', (playerData) => {
    const playerId = playerData?.id || playerData?.userId || socket.id;
    matchmakingService.leaveQueue(playerId);
  });

  // Join match room
  socket.on('join_match', (matchId) => {
    socket.join(`match_${matchId}`);
    const match = matchmakingService.getMatch(matchId);
    if (match) {
      socket.emit('match_state', match);
    }
  });

  // Start match
  socket.on('start_match', async (matchId) => {
    const match = matchmakingService.getMatch(matchId);
    if (match) {
      match.state = 'briefing';
      await matchmakingService.updateMatch(matchId, { state: 'briefing' });
      io.to(`match_${matchId}`).emit('match_briefing', match);
      
      // Start game after briefing
      setTimeout(async () => {
        match.state = 'running';
        match.startTime = new Date().toISOString();
        await matchmakingService.updateMatch(matchId, { 
          state: 'running',
          startTime: match.startTime
        });
        io.to(`match_${matchId}`).emit('match_started', match);
      }, 30000); // 30 second briefing
    }
  });

  // Submit code during match
  socket.on('submit_code', async (data) => {
    const { matchId, playerId, code, problemId, difficulty, language = 'javascript' } = data;
    
    try {
      // Evaluate code using executor service
      const executorService = (await import('./services/executorService.js')).default;
      const database = (await import('./config/database.js')).default;
      
      const problem = await database.getProblemById(problemId);
      if (!problem) {
        socket.emit('coding_error', { error: 'Problem not found' });
        return;
      }

      const testCases = problem.testCases || [];
      const startTime = Date.now();
      
      const testResults = await executorService.runTestCases(
        code,
        language,
        testCases
      );
      
      const executionTimeMs = Date.now() - startTime;
      
      // Determine status
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
        
        // Broadcast updated game state
        const match = matchmakingService.getMatch(matchId);
        if (match) {
          io.to(`match_${matchId}`).emit('game_state_update', match.gameState);
        }
      }
    } catch (error) {
      console.error('Error evaluating code:', error);
      socket.emit('coding_error', { error: error.message });
    }
  });

  // Place tower
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

  // Spawn wave
  socket.on('spawn_wave', (data) => {
    const { matchId, waveNumber } = data;
    const result = gameService.spawnWave(matchId, waveNumber);
    
    if (result) {
      io.to(`match_${matchId}`).emit('wave_spawned', result);
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    matchmakingService.leaveQueue(socket.id);
  });
});

// Game loop - update all active matches
setInterval(() => {
  matchmakingService.matches.forEach((match, matchId) => {
    if (match.state === 'running') {
      gameService.updateGameState(matchId, 0.016); // ~60fps
      
      // Broadcast state to all players in match
      io.to(`match_${matchId}`).emit('game_state_update', match.gameState);
      
      // Check if match ended
      if (match.state === 'finished') {
        io.to(`match_${matchId}`).emit('match_ended', {
          winner: match.winner,
          finalState: match.gameState
        });
      }
    }
  });
}, 16); // ~60fps

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

httpServer.listen(PORT, () => {
  console.log(`Code and Conquer Backend running on port ${PORT}`);
  console.log(`Socket.IO server ready`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

