import express from 'express';
import taskService from '../services/taskService.js';

const router = express.Router();

// Get all tasks for a player
router.get('/', async (req, res) => {
  try {
    const playerId = req.query.playerId || req.headers['x-user-id'];
    if (!playerId) {
      return res.status(400).json({ error: 'Player ID required' });
    }

    const tasks = await taskService.getTasks(playerId);
    res.json(tasks);
  } catch (error) {
    console.error('Error getting tasks:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new task
router.post('/', async (req, res) => {
  try {
    const playerId = req.body.playerId || req.headers['x-user-id'];
    if (!playerId) {
      return res.status(400).json({ error: 'Player ID required' });
    }

    const task = await taskService.createTask(playerId, req.body);
    res.json(task);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: error.message });
  }
});

// Complete a task
router.post('/:taskId/complete', async (req, res) => {
  try {
    const playerId = req.body.playerId || req.headers['x-user-id'];
    if (!playerId) {
      return res.status(400).json({ error: 'Player ID required' });
    }

    const task = await taskService.completeTask(playerId, req.params.taskId);
    if (task) {
      res.json(task);
    } else {
      res.status(404).json({ error: 'Task not found' });
    }
  } catch (error) {
    console.error('Error completing task:', error);
    res.status(500).json({ error: error.message });
  }
});

// Set integration tokens
router.post('/integrations', (req, res) => {
  try {
    const playerId = req.body.playerId || req.headers['x-user-id'];
    const { type, token } = req.body;
    
    if (!playerId || !type || !token) {
      return res.status(400).json({ error: 'Player ID, type, and token required' });
    }

    taskService.setIntegration(playerId, type, token);
    res.json({ success: true });
  } catch (error) {
    console.error('Error setting integration:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get task buffs for a player
router.get('/buffs/:playerId', async (req, res) => {
  try {
    const buffs = await taskService.calculateTaskBuffs(req.params.playerId);
    res.json(buffs);
  } catch (error) {
    console.error('Error calculating task buffs:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

