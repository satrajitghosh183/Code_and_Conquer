import express from 'express';
import { getLeaderboard, getUserLeaderboardPosition, updateLeaderboard } from '../controllers/leaderboardController.js';

const router = express.Router();

// Get leaderboard
router.get('/', getLeaderboard);

// Get user's leaderboard position
router.get('/user/:userId', getUserLeaderboardPosition);

// Update leaderboard (internal use)
router.post('/update', updateLeaderboard);

export default router;

