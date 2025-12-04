/**
 * Public Database Routes
 * 
 * Routes for accessing public schema tables.
 * Provides CRUD operations for all application tables.
 */

import express from 'express';
import publicDatabaseService from '../services/publicDatabaseService.js';
import { PUBLIC_TABLES } from '../config/supabasePublicSchema.js';

const router = express.Router();

// Middleware to check if service is available
const checkService = (req, res, next) => {
  if (!publicDatabaseService.isAvailable()) {
    return res.status(503).json({ 
      error: 'Public database service not available. Check SUPABASE_SERVICE_ROLE_KEY configuration.' 
    });
  }
  next();
};

/**
 * Generic CRUD routes for any table
 */

/**
 * POST /api/public-db/:table
 * Insert a record
 */
router.post('/:table', checkService, async (req, res) => {
  try {
    const { table } = req.params;
    const tableName = `public.${table}`;
    
    if (!Object.values(PUBLIC_TABLES).includes(tableName)) {
      return res.status(400).json({ error: 'Invalid table name' });
    }
    
    const result = await publicDatabaseService.insert(tableName, req.body);
    res.json(result);
  } catch (error) {
    console.error('Error inserting record:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/public-db/:table/:id
 * Get a record by ID
 */
router.get('/:table/:id', checkService, async (req, res) => {
  try {
    const { table, id } = req.params;
    const tableName = `public.${table}`;
    
    if (!Object.values(PUBLIC_TABLES).includes(tableName)) {
      return res.status(400).json({ error: 'Invalid table name' });
    }
    
    const result = await publicDatabaseService.getById(tableName, id);
    
    if (!result) {
      return res.status(404).json({ error: 'Record not found' });
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching record:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/public-db/:table/:id
 * Update a record
 */
router.put('/:table/:id', checkService, async (req, res) => {
  try {
    const { table, id } = req.params;
    const tableName = `public.${table}`;
    
    if (!Object.values(PUBLIC_TABLES).includes(tableName)) {
      return res.status(400).json({ error: 'Invalid table name' });
    }
    
    const result = await publicDatabaseService.update(tableName, id, req.body);
    res.json(result);
  } catch (error) {
    console.error('Error updating record:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/public-db/:table/:id
 * Delete a record
 */
router.delete('/:table/:id', checkService, async (req, res) => {
  try {
    const { table, id } = req.params;
    const tableName = `public.${table}`;
    
    if (!Object.values(PUBLIC_TABLES).includes(tableName)) {
      return res.status(400).json({ error: 'Invalid table name' });
    }
    
    await publicDatabaseService.delete(tableName, id);
    res.json({ success: true, message: 'Record deleted' });
  } catch (error) {
    console.error('Error deleting record:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/public-db/:table
 * Query records
 */
router.get('/:table', checkService, async (req, res) => {
  try {
    const { table } = req.params;
    const tableName = `public.${table}`;
    
    if (!Object.values(PUBLIC_TABLES).includes(tableName)) {
      return res.status(400).json({ error: 'Invalid table name' });
    }
    
    const { select, where, orderBy, limit, offset } = req.query;
    
    const options = {};
    if (select) options.select = select;
    if (where) options.where = JSON.parse(where);
    if (orderBy) {
      const [field, direction] = orderBy.split(':');
      options.orderBy = { field, ascending: direction !== 'desc' };
    }
    if (limit) options.limit = parseInt(limit);
    if (offset) options.offset = parseInt(offset);
    
    const results = await publicDatabaseService.query(tableName, options);
    res.json(results);
  } catch (error) {
    console.error('Error querying records:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Convenience routes for common operations
 */

/**
 * GET /api/public-db/profiles/:userId
 * Get user profile
 */
router.get('/profiles/:userId', checkService, async (req, res) => {
  try {
    const { userId } = req.params;
    const profile = await publicDatabaseService.getProfile(userId);
    
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    res.json(profile);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/public-db/users/:userId/submissions
 * Get user submissions
 */
router.get('/users/:userId/submissions', checkService, async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 10 } = req.query;
    const submissions = await publicDatabaseService.getUserSubmissions(userId, parseInt(limit));
    res.json(submissions);
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/public-db/users/:userId/matches
 * Get user matches
 */
router.get('/users/:userId/matches', checkService, async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 10 } = req.query;
    const matches = await publicDatabaseService.getUserMatches(userId, parseInt(limit));
    res.json(matches);
  } catch (error) {
    console.error('Error fetching matches:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/public-db/users/:userId/progress
 * Get user progress
 */
router.get('/users/:userId/progress', checkService, async (req, res) => {
  try {
    const { userId } = req.params;
    const progress = await publicDatabaseService.getUserProgress(userId);
    res.json(progress);
  } catch (error) {
    console.error('Error fetching progress:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/public-db/leaderboards/:type
 * Get leaderboard
 */
router.get('/leaderboards/:type', checkService, async (req, res) => {
  try {
    const { type } = req.params;
    const { limit = 100 } = req.query;
    const leaderboard = await publicDatabaseService.getLeaderboard(type, parseInt(limit));
    res.json(leaderboard);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

