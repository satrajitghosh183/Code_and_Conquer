/**
 * Auth Database Routes
 * 
 * Routes for accessing Supabase auth tables.
 * These routes require service role key and should be protected.
 * 
 * NOTE: Most auth operations should use Supabase Auth API.
 * These routes are for advanced use cases only.
 */

import express from 'express';
import authDatabaseService from '../services/authDatabaseService.js';

const router = express.Router();

// Middleware to check if auth database service is available
const checkAuthService = (req, res, next) => {
  if (!authDatabaseService.isAvailable()) {
    return res.status(503).json({ 
      error: 'Auth database service not available. Check SUPABASE_SERVICE_ROLE_KEY configuration.' 
    });
  }
  next();
};

/**
 * GET /api/auth-db/user/:userId
 * Get user by ID from auth.users table
 */
router.get('/user/:userId', checkAuthService, async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await authDatabaseService.getUserById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/auth-db/user/email/:email
 * Get user by email from auth.users table
 */
router.get('/user/email/:email', checkAuthService, async (req, res) => {
  try {
    const { email } = req.params;
    const user = await authDatabaseService.getUserByEmail(email);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error fetching user by email:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/auth-db/user/:userId/sessions
 * Get all sessions for a user
 */
router.get('/user/:userId/sessions', checkAuthService, async (req, res) => {
  try {
    const { userId } = req.params;
    const sessions = await authDatabaseService.getUserSessions(userId);
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching user sessions:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/auth-db/user/:userId/sessions
 * Revoke all sessions for a user
 */
router.delete('/user/:userId/sessions', checkAuthService, async (req, res) => {
  try {
    const { userId } = req.params;
    await authDatabaseService.revokeUserSessions(userId);
    res.json({ success: true, message: 'All sessions revoked' });
  } catch (error) {
    console.error('Error revoking sessions:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/auth-db/user/:userId/identities
 * Get all identities (OAuth providers) for a user
 */
router.get('/user/:userId/identities', checkAuthService, async (req, res) => {
  try {
    const { userId } = req.params;
    const identities = await authDatabaseService.getUserIdentities(userId);
    res.json(identities);
  } catch (error) {
    console.error('Error fetching user identities:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/auth-db/user/:userId/mfa-factors
 * Get all MFA factors for a user
 */
router.get('/user/:userId/mfa-factors', checkAuthService, async (req, res) => {
  try {
    const { userId } = req.params;
    const factors = await authDatabaseService.getUserMFAFactors(userId);
    res.json(factors);
  } catch (error) {
    console.error('Error fetching MFA factors:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/auth-db/user/:userId/oauth-authorizations
 * Get all OAuth authorizations for a user
 */
router.get('/user/:userId/oauth-authorizations', checkAuthService, async (req, res) => {
  try {
    const { userId } = req.params;
    const authorizations = await authDatabaseService.getUserOAuthAuthorizations(userId);
    res.json(authorizations);
  } catch (error) {
    console.error('Error fetching OAuth authorizations:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/auth-db/audit-logs
 * Get audit log entries
 * Query params: instanceId, limit (default: 100)
 */
router.get('/audit-logs', checkAuthService, async (req, res) => {
  try {
    const { instanceId, limit = 100 } = req.query;
    const filters = {};
    if (instanceId) filters.instanceId = instanceId;
    
    const logs = await authDatabaseService.getAuditLogs(filters, parseInt(limit));
    res.json(logs);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/auth-db/flow-state/:flowStateId
 * Get flow state by ID
 */
router.get('/flow-state/:flowStateId', checkAuthService, async (req, res) => {
  try {
    const { flowStateId } = req.params;
    const flowState = await authDatabaseService.getFlowState(flowStateId);
    
    if (!flowState) {
      return res.status(404).json({ error: 'Flow state not found' });
    }
    
    res.json(flowState);
  } catch (error) {
    console.error('Error fetching flow state:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/auth-db/query
 * Generic query endpoint for auth tables
 * Body: { tableName, select, where, orderBy, limit }
 * 
 * WARNING: Use with extreme caution. Ensure proper authorization.
 */
router.post('/query', checkAuthService, async (req, res) => {
  try {
    const { tableName, select, where, orderBy, limit } = req.body;
    
    if (!tableName) {
      return res.status(400).json({ error: 'tableName is required' });
    }
    
    // Validate table name is an auth table
    if (!tableName.startsWith('auth.')) {
      return res.status(400).json({ error: 'Only auth schema tables are allowed' });
    }
    
    const results = await authDatabaseService.queryAuthTable(tableName, {
      select: select || '*',
      where: where || {},
      orderBy: orderBy || null,
      limit: limit || null
    });
    
    res.json(results);
  } catch (error) {
    console.error('Error querying auth table:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

