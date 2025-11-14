/**
 * Auth Database Service
 * 
 * Service for interacting with Supabase auth tables.
 * These tables are in the 'auth' schema and require service role key access.
 * 
 * NOTE: Most auth operations should be done through Supabase Auth API,
 * but this service provides direct database access when needed for advanced use cases.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { AUTH_TABLES, getTableName } from '../config/supabaseAuthSchema.js';

dotenv.config();

// Initialize Supabase Admin Client (requires service role key)
let supabaseAdmin = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

class AuthDatabaseService {
  constructor() {
    this.hasAccess = !!supabaseAdmin;
  }

  /**
   * Check if service has access to auth tables
   */
  isAvailable() {
    return this.hasAccess;
  }

  /**
   * Get user by ID from auth.users table
   * @param {string} userId - User UUID
   * @returns {Promise<Object|null>} User object or null
   */
  async getUserById(userId) {
    if (!this.hasAccess) {
      throw new Error('Supabase service role key not configured');
    }

    try {
      // Note: Direct access to auth.users requires using RPC or Admin API
      // For now, we'll use the Supabase Admin API approach
      const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
      
      if (error) throw error;
      return data?.user || null;
    } catch (error) {
      console.error('Error fetching user from auth.users:', error);
      throw error;
    }
  }

  /**
   * Get user by email from auth.users table
   * @param {string} email - User email
   * @returns {Promise<Object|null>} User object or null
   */
  async getUserByEmail(email) {
    if (!this.hasAccess) {
      throw new Error('Supabase service role key not configured');
    }

    try {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers();
      
      if (error) throw error;
      return data?.users?.find(u => u.email === email) || null;
    } catch (error) {
      console.error('Error fetching user by email:', error);
      throw error;
    }
  }

  /**
   * Get all sessions for a user
   * @param {string} userId - User UUID
   * @returns {Promise<Array>} Array of session objects
   */
  async getUserSessions(userId) {
    if (!this.hasAccess) {
      throw new Error('Supabase service role key not configured');
    }

    try {
      // Access auth.sessions via RPC or direct query
      // Note: This requires proper permissions
      const { data, error } = await supabaseAdmin
        .rpc('get_user_sessions', { user_id: userId })
        .catch(() => {
          // Fallback: Use Admin API
          return supabaseAdmin.auth.admin.listUserSessions(userId);
        });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user sessions:', error);
      return [];
    }
  }

  /**
   * Get user identities (OAuth providers, etc.)
   * @param {string} userId - User UUID
   * @returns {Promise<Array>} Array of identity objects
   */
  async getUserIdentities(userId) {
    if (!this.hasAccess) {
      throw new Error('Supabase service role key not configured');
    }

    try {
      const { data, error } = await supabaseAdmin
        .from('identities')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user identities:', error);
      return [];
    }
  }

  /**
   * Get refresh tokens for a user
   * @param {string} userId - User UUID
   * @returns {Promise<Array>} Array of refresh token objects
   */
  async getUserRefreshTokens(userId) {
    if (!this.hasAccess) {
      throw new Error('Supabase service role key not configured');
    }

    try {
      const { data, error } = await supabaseAdmin
        .from('refresh_tokens')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching refresh tokens:', error);
      return [];
    }
  }

  /**
   * Revoke all sessions for a user
   * @param {string} userId - User UUID
   * @returns {Promise<boolean>} Success status
   */
  async revokeUserSessions(userId) {
    if (!this.hasAccess) {
      throw new Error('Supabase service role key not configured');
    }

    try {
      const { error } = await supabaseAdmin.auth.admin.signOut(userId, 'global');
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error revoking user sessions:', error);
      throw error;
    }
  }

  /**
   * Get OAuth authorizations for a user
   * @param {string} userId - User UUID
   * @returns {Promise<Array>} Array of OAuth authorization objects
   */
  async getUserOAuthAuthorizations(userId) {
    if (!this.hasAccess) {
      throw new Error('Supabase service role key not configured');
    }

    try {
      const { data, error } = await supabaseAdmin
        .from('oauth_authorizations')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching OAuth authorizations:', error);
      return [];
    }
  }

  /**
   * Get MFA factors for a user
   * @param {string} userId - User UUID
   * @returns {Promise<Array>} Array of MFA factor objects
   */
  async getUserMFAFactors(userId) {
    if (!this.hasAccess) {
      throw new Error('Supabase service role key not configured');
    }

    try {
      const { data, error } = await supabaseAdmin
        .from('mfa_factors')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching MFA factors:', error);
      return [];
    }
  }

  /**
   * Get audit log entries (requires admin access)
   * @param {Object} filters - Filter options (instanceId, userId, etc.)
   * @param {number} limit - Maximum number of entries
   * @returns {Promise<Array>} Array of audit log entries
   */
  async getAuditLogs(filters = {}, limit = 100) {
    if (!this.hasAccess) {
      throw new Error('Supabase service role key not configured');
    }

    try {
      let query = supabaseAdmin
        .from('audit_log_entries')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (filters.instanceId) {
        query = query.eq('instance_id', filters.instanceId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      return [];
    }
  }

  /**
   * Get flow state by ID
   * @param {string} flowStateId - Flow state UUID
   * @returns {Promise<Object|null>} Flow state object or null
   */
  async getFlowState(flowStateId) {
    if (!this.hasAccess) {
      throw new Error('Supabase service role key not configured');
    }

    try {
      const { data, error } = await supabaseAdmin
        .from('flow_state')
        .select('*')
        .eq('id', flowStateId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      return data;
    } catch (error) {
      console.error('Error fetching flow state:', error);
      return null;
    }
  }

  /**
   * Generic method to query any auth table
   * WARNING: Use with caution, ensure proper permissions
   * @param {string} tableName - Table name (from AUTH_TABLES)
   * @param {Object} options - Query options (select, where, orderBy, limit)
   * @returns {Promise<Array>} Query results
   */
  async queryAuthTable(tableName, options = {}) {
    if (!this.hasAccess) {
      throw new Error('Supabase service role key not configured');
    }

    const { select = '*', where = {}, orderBy = null, limit = null } = options;

    try {
      let query = supabaseAdmin
        .from(getTableName(tableName))
        .select(select);

      // Apply where clauses
      Object.entries(where).forEach(([key, value]) => {
        query = query.eq(key, value);
      });

      // Apply ordering
      if (orderBy) {
        query = query.order(orderBy.field, { ascending: orderBy.ascending !== false });
      }

      // Apply limit
      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error(`Error querying ${tableName}:`, error);
      throw error;
    }
  }
}

export default new AuthDatabaseService();

