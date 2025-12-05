/**
 * Dashboard Routes
 */

import express from 'express';
import { getDashboardStats, getDailyChallenge, getXPHistory } from '../controllers/dashboardController.js';

const router = express.Router();

// Get dashboard statistics for a user
router.get('/stats/:userId', getDashboardStats);

// Get XP activity history for charts
router.get('/xp-history/:userId', getXPHistory);

// Get daily challenge/problem of the day
// Supports both /daily-challenge and /daily-challenge/:userId for backward compatibility
router.get('/daily-challenge/:userId', getDailyChallenge);
router.get('/daily-challenge', getDailyChallenge);

export default router;

