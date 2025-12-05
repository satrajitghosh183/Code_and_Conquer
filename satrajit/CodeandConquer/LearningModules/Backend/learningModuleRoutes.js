/**
 * Learning Module Routes
 * 
 * API routes for learning modules and audio content.
 */

import express from 'express';
import learningModuleService from '../services/learningModuleService.js';

const router = express.Router();

/**
 * GET /api/learning-modules
 * Get all learning modules with optional filters
 */
router.get('/', async (req, res) => {
  try {
    const { category, difficulty, search } = req.query;
    const modules = await learningModuleService.getAllModules({
      category,
      difficulty,
      search,
    });
    res.json(modules);
  } catch (error) {
    console.error('Error fetching modules:', error);
    res.status(500).json({ error: 'Failed to fetch modules' });
  }
});

/**
 * GET /api/learning-modules/categories
 * Get all unique categories
 */
router.get('/categories', async (req, res) => {
  try {
    const categories = await learningModuleService.getCategories();
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

/**
 * GET /api/learning-modules/:id
 * Get a single module by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const module = await learningModuleService.getModuleById(req.params.id);
    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }
    res.json(module);
  } catch (error) {
    console.error('Error fetching module:', error);
    res.status(500).json({ error: 'Failed to fetch module' });
  }
});

/**
 * GET /api/learning-modules/:id/audio
 * Get signed URL for module's audio file
 */
router.get('/:id/audio', async (req, res) => {
  try {
    const module = await learningModuleService.getModuleById(req.params.id);
    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }

    if (!module.audioFilePath) {
      return res.status(404).json({ error: 'No audio available for this module' });
    }

    const expiresIn = parseInt(req.query.expires) || 3600;
    const signedUrl = await learningModuleService.getAudioUrl(module.audioFilePath, expiresIn);
    
    res.json({ 
      url: signedUrl,
      expiresIn,
      path: module.audioFilePath,
    });
  } catch (error) {
    console.error('Error getting audio URL:', error);
    res.status(500).json({ error: 'Failed to get audio URL' });
  }
});

/**
 * GET /api/learning-modules/user/:userId/progress
 * Get user's progress on all modules
 */
router.get('/user/:userId/progress', async (req, res) => {
  try {
    const progress = await learningModuleService.getUserProgress(req.params.userId);
    res.json(progress);
  } catch (error) {
    console.error('Error fetching user progress:', error);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

/**
 * POST /api/learning-modules/:id/progress
 * Update user's progress on a module
 */
router.post('/:id/progress', async (req, res) => {
  try {
    const { userId, completed, progressPercent, lastPosition } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const progress = await learningModuleService.updateUserProgress(
      userId,
      req.params.id,
      {
        completed,
        progress_percent: progressPercent,
        last_position: lastPosition,
      }
    );

    res.json(progress);
  } catch (error) {
    console.error('Error updating progress:', error);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

/**
 * GET /api/learning-modules/category/:category
 * Get modules by category
 */
router.get('/category/:category', async (req, res) => {
  try {
    const modules = await learningModuleService.getModulesByCategory(req.params.category);
    res.json(modules);
  } catch (error) {
    console.error('Error fetching modules by category:', error);
    res.status(500).json({ error: 'Failed to fetch modules' });
  }
});

/**
 * GET /api/learning-modules/audio/list
 * List all audio files in bucket (admin)
 */
router.get('/audio/list', async (req, res) => {
  try {
    const { path } = req.query;
    const files = await learningModuleService.listAudioFiles(path || '');
    res.json(files);
  } catch (error) {
    console.error('Error listing audio files:', error);
    res.status(500).json({ error: 'Failed to list audio files' });
  }
});

export default router;

