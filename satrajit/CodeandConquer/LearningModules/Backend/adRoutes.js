/**
 * Ad Routes
 * 
 * API routes for video advertisements.
 */

import express from 'express';
import adService from '../services/adService.js';

const router = express.Router();

/**
 * GET /api/ads/video
 * Get a random video ad for ad break
 */
router.get('/video', async (req, res) => {
  try {
    const ad = await adService.getRandomVideoAd();
    res.json(ad);
  } catch (error) {
    console.error('Error fetching video ad:', error);
    res.status(500).json({ error: 'Failed to fetch video ad' });
  }
});

/**
 * GET /api/ads
 * Get all active ads (admin)
 */
router.get('/', async (req, res) => {
  try {
    const ads = await adService.getAllAds();
    res.json(ads);
  } catch (error) {
    console.error('Error fetching ads:', error);
    res.status(500).json({ error: 'Failed to fetch ads' });
  }
});

/**
 * POST /api/ads
 * Create a new ad (admin)
 */
router.post('/', async (req, res) => {
  try {
    const { youtube_url, sponsor, title, description, priority, start_date, end_date } = req.body;
    
    if (!youtube_url) {
      return res.status(400).json({ error: 'youtube_url is required' });
    }

    const ad = await adService.createAd({
      youtube_url,
      sponsor,
      title,
      description,
      priority,
      start_date,
      end_date,
    });

    res.status(201).json(ad);
  } catch (error) {
    console.error('Error creating ad:', error);
    res.status(500).json({ error: 'Failed to create ad' });
  }
});

/**
 * PUT /api/ads/:id
 * Update an ad (admin)
 */
router.put('/:id', async (req, res) => {
  try {
    const ad = await adService.updateAd(req.params.id, req.body);
    res.json(ad);
  } catch (error) {
    console.error('Error updating ad:', error);
    res.status(500).json({ error: 'Failed to update ad' });
  }
});

/**
 * DELETE /api/ads/:id
 * Delete an ad (admin)
 */
router.delete('/:id', async (req, res) => {
  try {
    await adService.deleteAd(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting ad:', error);
    res.status(500).json({ error: 'Failed to delete ad' });
  }
});

/**
 * POST /api/ads/:id/impression
 * Log an ad impression
 */
router.post('/:id/impression', async (req, res) => {
  try {
    const { userId } = req.body;
    await adService.logImpression(req.params.id, userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error logging impression:', error);
    res.status(500).json({ error: 'Failed to log impression' });
  }
});

/**
 * POST /api/ads/:id/skip
 * Log an ad skip
 */
router.post('/:id/skip', async (req, res) => {
  try {
    const { userId, watchTime } = req.body;
    await adService.logSkip(req.params.id, watchTime, userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error logging skip:', error);
    res.status(500).json({ error: 'Failed to log skip' });
  }
});

/**
 * POST /api/ads/:id/completed
 * Log ad completion
 */
router.post('/:id/completed', async (req, res) => {
  try {
    const { userId } = req.body;
    await adService.logCompletion(req.params.id, userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error logging completion:', error);
    res.status(500).json({ error: 'Failed to log completion' });
  }
});

export default router;

