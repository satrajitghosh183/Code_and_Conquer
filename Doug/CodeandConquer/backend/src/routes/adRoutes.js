import express from 'express';
import { getRandomAd } from '../controllers/adController.js';

const router = express.Router();

/**
 * GET /api/ads/random
 * Get a random ad from the CSV file
 */
router.get('/random', getRandomAd);

export default router;

