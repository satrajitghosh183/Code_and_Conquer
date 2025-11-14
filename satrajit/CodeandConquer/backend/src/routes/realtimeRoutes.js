/**
 * Realtime Routes
 * 
 * Routes for Supabase Realtime functionality.
 * Note: Most realtime functionality is handled via WebSocket connections.
 */

import express from 'express';
import realtimeService from '../services/realtimeService.js';

const router = express.Router();

// Middleware to check if realtime service is available
const checkRealtimeService = (req, res, next) => {
  if (!realtimeService.isAvailable()) {
    return res.status(503).json({ 
      error: 'Realtime service not available. Check SUPABASE_SERVICE_ROLE_KEY configuration.' 
    });
  }
  next();
};

/**
 * POST /api/realtime/messages
 * Insert a message into realtime.messages
 */
router.post('/messages', checkRealtimeService, async (req, res) => {
  try {
    const { topic, extension, payload, event = 'message', private: isPrivate = false } = req.body;
    
    if (!topic || !extension || !payload) {
      return res.status(400).json({ error: 'topic, extension, and payload are required' });
    }
    
    const message = await realtimeService.insertMessage(topic, extension, payload, event, isPrivate);
    res.json(message);
  } catch (error) {
    console.error('Error inserting message:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/realtime/messages
 * Query messages from realtime.messages
 */
router.get('/messages', checkRealtimeService, async (req, res) => {
  try {
    const { topic, limit = 100 } = req.query;
    
    const options = {
      limit: parseInt(limit),
      orderBy: { field: 'inserted_at', ascending: false },
    };
    
    if (topic) {
      options.where = { topic };
    }
    
    const messages = await realtimeService.queryMessages(options);
    res.json(messages);
  } catch (error) {
    console.error('Error querying messages:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/realtime/subscriptions/:userId
 * Get subscriptions for a user
 */
router.get('/subscriptions/:userId', checkRealtimeService, async (req, res) => {
  try {
    const { userId } = req.params;
    const subscriptions = await realtimeService.getUserSubscriptions(userId);
    res.json(subscriptions);
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/realtime/channels/:channelName/send
 * Send a message to a channel
 */
router.post('/channels/:channelName/send', checkRealtimeService, async (req, res) => {
  try {
    const { channelName } = req.params;
    const { event, payload } = req.body;
    
    if (!event || !payload) {
      return res.status(400).json({ error: 'event and payload are required' });
    }
    
    await realtimeService.sendMessage(channelName, event, payload);
    res.json({ success: true, message: 'Message sent' });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

