import express from 'express';
import matchmakingService from '../services/matchmakingService.js';

const router = express.Router();

// Get match by ID
router.get('/:matchId', (req, res) => {
  try {
    const match = matchmakingService.getMatch(req.params.matchId);
    if (match) {
      res.json(match);
    } else {
      res.status(404).json({ error: 'Match not found' });
    }
  } catch (error) {
    console.error('Error getting match:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get match by player ID
router.get('/player/:playerId', (req, res) => {
  try {
    const match = matchmakingService.getMatchByPlayer(req.params.playerId);
    if (match) {
      res.json(match);
    } else {
      res.status(404).json({ error: 'No active match found' });
    }
  } catch (error) {
    console.error('Error getting match by player:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

