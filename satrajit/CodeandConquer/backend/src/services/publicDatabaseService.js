/**
 * Public Database Service
 * 
 * Service for interacting with public schema tables.
 * Provides CRUD operations for all application tables.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { PUBLIC_TABLES, getPublicTableName } from '../config/supabasePublicSchema.js';

dotenv.config();

// Initialize Supabase client
let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

class PublicDatabaseService {
  constructor() {
    this.hasAccess = !!supabase;
  }

  isAvailable() {
    return this.hasAccess;
  }

  /**
   * Generic CRUD operations for any public table
   */

  /**
   * Insert a record
   * @param {string} tableName - Table name (from PUBLIC_TABLES)
   * @param {Object} data - Data to insert
   * @returns {Promise<Object>} Inserted record
   */
  async insert(tableName, data) {
    if (!this.hasAccess) {
      throw new Error('Supabase service role key not configured');
    }

    try {
      // Remove fields that might not exist in the table
      const sanitizedData = { ...data };
      
      // For leaderboards table, don't include created_at (table might not have that column)
      if (tableName === PUBLIC_TABLES.LEADERBOARDS) {
        delete sanitizedData.created_at;
      }

      const { data: result, error } = await supabase
        .from(getPublicTableName(tableName))
        .insert(sanitizedData)
        .select()
        .single();

      if (error) {
        // Handle column not found errors (PGRST204) - retry without problematic columns
        if (error.code === 'PGRST204') {
          // If it's a created_at column error, retry without it
          if (error.message && error.message.includes('created_at')) {
            delete sanitizedData.created_at;
            const { data: retryResult, error: retryError } = await supabase
              .from(getPublicTableName(tableName))
              .insert(sanitizedData)
              .select()
              .single();
            if (retryError) {
              // If retry also fails, check if it's a table error
              if (retryError.code === 'PGRST205' || retryError.code === '42P01') {
                return null;
              }
              throw retryError;
            }
            return retryResult;
          }
        }
        throw error;
      }
      return result;
    } catch (error) {
      // Handle table not found errors (PGRST205) gracefully
      if (error.code === 'PGRST205' || error.code === '42P01') {
        // Table doesn't exist - return null silently
        return null;
      }
      // Handle column not found errors (PGRST204) gracefully
      if (error.code === 'PGRST204') {
        // Column doesn't exist - return null silently (already tried retry above)
        return null;
      }
      // Only log unexpected errors
      console.error(`Error inserting into ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Get a record by ID
   * @param {string} tableName - Table name
   * @param {string} id - Record ID
   * @returns {Promise<Object|null>} Record or null
   */
  async getById(tableName, id) {
    if (!this.hasAccess) {
      throw new Error('Supabase service role key not configured');
    }

    try {
      const { data, error } = await supabase
        .from(getPublicTableName(tableName))
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        // Handle not found (PGRST116) or table not found (PGRST205) errors gracefully
        if (error.code === 'PGRST116' || error.code === 'PGRST205' || error.code === '42P01') {
          return null;
        }
        throw error;
      }
      return data;
    } catch (error) {
      // Handle table not found errors gracefully
      if (error.code === 'PGRST205' || error.code === '42P01') {
        // Table doesn't exist - return null silently
        return null;
      }
      // Only log unexpected errors (not missing table or not found errors)
      if (error.code !== 'PGRST116') {
        console.error(`Error fetching from ${tableName}:`, error);
      }
      return null;
    }
  }

  /**
   * Update a record
   * @param {string} tableName - Table name
   * @param {string} id - Record ID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object>} Updated record
   */
  async update(tableName, id, updates) {
    if (!this.hasAccess) {
      throw new Error('Supabase service role key not configured');
    }

    try {
      // Remove fields that might not exist in the table
      const sanitizedUpdates = { ...updates };
      
      // For leaderboards table, don't include created_at
      if (tableName === PUBLIC_TABLES.LEADERBOARDS) {
        delete sanitizedUpdates.created_at;
      }

      const { data, error } = await supabase
        .from(getPublicTableName(tableName))
        .update(sanitizedUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        // Handle table/column not found errors gracefully
        if (error.code === 'PGRST204' || error.code === 'PGRST205' || error.code === '42P01') {
          return null;
        }
        throw error;
      }
      return data;
    } catch (error) {
      // Handle table/column not found errors gracefully
      if (error.code === 'PGRST204' || error.code === 'PGRST205' || error.code === '42P01') {
        // Table or column doesn't exist - return null silently
        return null;
      }
      // Only log unexpected errors
      console.error(`Error updating ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Delete a record
   * @param {string} tableName - Table name
   * @param {string} id - Record ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(tableName, id) {
    if (!this.hasAccess) {
      throw new Error('Supabase service role key not configured');
    }

    try {
      const { error } = await supabase
        .from(getPublicTableName(tableName))
        .delete()
        .eq('id', id);

      if (error) {
        // Handle table not found errors gracefully
        if (error.code === 'PGRST205' || error.code === '42P01') {
          // Table doesn't exist - return false silently
          return false;
        }
        throw error;
      }
      return true;
    } catch (error) {
      // Handle table not found errors gracefully
      if (error.code === 'PGRST205' || error.code === '42P01') {
        // Table doesn't exist - return false silently
        return false;
      }
      // Only log unexpected errors
      console.error(`Error deleting from ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Query records
   * @param {string} tableName - Table name
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Query results
   */
  async query(tableName, options = {}) {
    if (!this.hasAccess) {
      throw new Error('Supabase service role key not configured');
    }

    const { 
      select = '*', 
      where = {}, 
      orderBy = null, 
      limit = null,
      offset = null 
    } = options;

    try {
      let query = supabase
        .from(getPublicTableName(tableName))
        .select(select);

      Object.entries(where).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          query = query.in(key, value);
        } else if (typeof value === 'object' && value.operator) {
          // Support operators like { operator: 'gt', value: 100 }
          query = query[value.operator](key, value.value);
        } else {
          query = query.eq(key, value);
        }
      });

      if (orderBy) {
        query = query.order(orderBy.field, { ascending: orderBy.ascending !== false });
      }

      if (limit) {
        query = query.limit(limit);
      }

      if (offset) {
        query = query.range(offset, offset + (limit || 100) - 1);
      }

      const { data, error } = await query;
      if (error) {
        // Handle table not found errors (PGRST205) gracefully
        if (error.code === 'PGRST205' || error.code === '42P01') {
          // Table doesn't exist - return empty array silently (don't log)
          return [];
        }
        throw error;
      }
      return data || [];
    } catch (error) {
      // Handle table not found errors (PGRST205) gracefully
      if (error.code === 'PGRST205' || error.code === '42P01') {
        // Table doesn't exist - return empty array silently (don't log)
        return [];
      }
      // Only log unexpected errors (not missing table errors)
      console.error(`Error querying ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Convenience methods for common tables
   */

  // Profiles
  async getProfile(userId) {
    return this.getById(PUBLIC_TABLES.PROFILES, userId);
  }

  async updateProfile(userId, updates) {
    return this.update(PUBLIC_TABLES.PROFILES, userId, updates);
  }

  // Problems
  async getProblem(problemId) {
    return this.getById(PUBLIC_TABLES.PROBLEMS, problemId);
  }

  async getProblems(filters = {}) {
    return this.query(PUBLIC_TABLES.PROBLEMS, { where: filters });
  }

  async createProblem(problemData) {
    return this.insert(PUBLIC_TABLES.PROBLEMS, problemData);
  }

  // Submissions
  async getSubmission(submissionId) {
    return this.getById(PUBLIC_TABLES.SUBMISSIONS, submissionId);
  }

  async getUserSubmissions(userId, limit = 10) {
    return this.query(PUBLIC_TABLES.SUBMISSIONS, {
      where: { user_id: userId },
      orderBy: { field: 'submitted_at', ascending: false },
      limit: limit,
    });
  }

  async createSubmission(submissionData) {
    return this.insert(PUBLIC_TABLES.SUBMISSIONS, submissionData);
  }

  // Matches
  async getMatch(matchId) {
    try {
      return await this.getById(PUBLIC_TABLES.MATCHES, matchId);
    } catch (error) {
      console.error('Error getting match:', error);
      if (error.code === '42P01') return null; // Table doesn't exist
      throw error;
    }
  }

  async getUserMatches(userId, limit = 10) {
    try {
      // Get matches where user is player1 or player2
      const matchesAsPlayer1 = await this.query(PUBLIC_TABLES.MATCHES, {
        where: { player1_id: userId },
        orderBy: { field: 'created_at', ascending: false },
        limit: limit,
      });

      const matchesAsPlayer2 = await this.query(PUBLIC_TABLES.MATCHES, {
        where: { player2_id: userId },
        orderBy: { field: 'created_at', ascending: false },
        limit: limit,
      });

      // Combine and deduplicate
      const allMatches = [...matchesAsPlayer1, ...matchesAsPlayer2];
      const uniqueMatches = Array.from(new Map(allMatches.map(m => [m.id, m])).values());
      
      // Sort by created_at descending
      uniqueMatches.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      return uniqueMatches.slice(0, limit);
    } catch (error) {
      console.error('Error getting user matches:', error);
      if (error.code === '42P01') return []; // Table doesn't exist
      throw error;
    }
  }

  async createMatch(matchData) {
    try {
      return await this.insert(PUBLIC_TABLES.MATCHES, matchData);
    } catch (error) {
      console.error('Error creating match:', error);
      if (error.code === '42P01') {
        console.warn('Matches table does not exist, skipping save');
        return null;
      }
      throw error;
    }
  }

  async updateMatch(matchId, updates) {
    try {
      return await this.update(PUBLIC_TABLES.MATCHES, matchId, updates);
    } catch (error) {
      console.error('Error updating match:', error);
      if (error.code === '42P01') {
        console.warn('Matches table does not exist, skipping update');
        return null;
      }
      throw error;
    }
  }

  // User Progress
  async getUserProgress(userId) {
    return this.query(PUBLIC_TABLES.USER_PROGRESS, {
      where: { user_id: userId },
    }).then(results => results[0] || null);
  }

  async updateUserProgress(userId, updates) {
    const existing = await this.getUserProgress(userId);
    if (existing) {
      return this.update(PUBLIC_TABLES.USER_PROGRESS, existing.id, updates);
    } else {
      return this.insert(PUBLIC_TABLES.USER_PROGRESS, { user_id: userId, ...updates });
    }
  }

  // Subscriptions
  async getUserSubscription(userId) {
    const results = await this.query(PUBLIC_TABLES.SUBSCRIPTIONS, {
      where: { user_id: userId, status: 'active' },
      orderBy: { field: 'created_at', ascending: false },
      limit: 1,
    });
    return results[0] || null;
  }

  async createSubscription(subscriptionData) {
    return this.insert(PUBLIC_TABLES.SUBSCRIPTIONS, subscriptionData);
  }

  async updateSubscription(subscriptionId, updates) {
    return this.update(PUBLIC_TABLES.SUBSCRIPTIONS, subscriptionId, updates);
  }

  // Leaderboards
  async getLeaderboard(type = 'global', limit = 100) {
    try {
      const results = await this.query(PUBLIC_TABLES.LEADERBOARDS, {
        where: { leaderboard_type: type },
        orderBy: { field: 'score', ascending: false },
        limit: limit,
      });
      return results || [];
    } catch (error) {
      // Handle table not found errors gracefully
      if (error.code === 'PGRST205' || error.code === '42P01') {
        // Table doesn't exist - return empty array silently
        return [];
      }
      // Only log unexpected errors
      console.error('Error getting leaderboard:', error);
      throw error;
    }
  }

  async updateLeaderboard(userId, type, score) {
    try {
      const existing = await this.query(PUBLIC_TABLES.LEADERBOARDS, {
        where: { user_id: userId, leaderboard_type: type },
      }).then(results => results[0]);

      if (existing) {
        return this.update(PUBLIC_TABLES.LEADERBOARDS, existing.id, { 
          score: score,
          updated_at: new Date().toISOString() 
        });
      } else {
        // Insert without created_at since the table might not have that column
        const leaderboardData = {
          user_id: userId,
          leaderboard_type: type,
          score: score,
          updated_at: new Date().toISOString(),
        };
        
        // Try to insert without created_at first
        try {
          return await this.insert(PUBLIC_TABLES.LEADERBOARDS, leaderboardData);
        } catch (error) {
          // If it fails due to missing column, the insert method will handle it
          if (error.code === 'PGRST204' || error.code === 'PGRST205' || error.code === '42P01') {
            return null;
          }
          throw error;
        }
      }
    } catch (error) {
      // Handle table/column not found errors silently
      if (error.code === 'PGRST204' || error.code === 'PGRST205' || error.code === '42P01') {
        // Table or column doesn't exist - return null silently
        return null;
      }
      // Only log unexpected errors
      console.error('Error updating leaderboard:', error);
      throw error;
    }
  }

  // Achievements
  async getUserAchievements(userId) {
    return this.query(PUBLIC_TABLES.USER_ACHIEVEMENTS, {
      where: { user_id: userId },
    });
  }

  async grantAchievement(userId, achievementId, progress = {}) {
    return this.insert(PUBLIC_TABLES.USER_ACHIEVEMENTS, {
      user_id: userId,
      achievement_id: achievementId,
      progress: progress,
    });
  }

  // User Settings
  async getUserSettings(userId) {
    const results = await this.query(PUBLIC_TABLES.USER_SETTINGS, {
      where: { user_id: userId },
      limit: 1,
    });
    return results[0] || null;
  }

  async updateUserSettings(userId, updates) {
    const existing = await this.getUserSettings(userId);
    if (existing) {
      return this.update(PUBLIC_TABLES.USER_SETTINGS, existing.id, updates);
    } else {
      return this.insert(PUBLIC_TABLES.USER_SETTINGS, { user_id: userId, ...updates });
    }
  }

  // User Activity
  async createUserActivity(activityData) {
    return this.insert(PUBLIC_TABLES.USER_ACTIVITY, activityData);
  }

  async getUserActivities(userId, limit = 50) {
    return this.query(PUBLIC_TABLES.USER_ACTIVITY, {
      where: { user_id: userId },
      orderBy: { field: 'created_at', ascending: false },
      limit: limit,
    });
  }

  // Event Logs
  async createEventLog(eventData) {
    return this.insert(PUBLIC_TABLES.EVENT_LOGS, eventData);
  }

  async getEventLogs(userId = null, limit = 100) {
    const where = userId ? { user_id: userId } : {};
    return this.query(PUBLIC_TABLES.EVENT_LOGS, {
      where: where,
      orderBy: { field: 'created_at', ascending: false },
      limit: limit,
    });
  }

  // Transactions
  async createTransaction(transactionData) {
    return this.insert(PUBLIC_TABLES.TRANSACTIONS, transactionData);
  }

  async getUserTransactions(userId, limit = 50) {
    return this.query(PUBLIC_TABLES.TRANSACTIONS, {
      where: { user_id: userId },
      orderBy: { field: 'created_at', ascending: false },
      limit: limit,
    });
  }

  async updateTransaction(transactionId, updates) {
    return this.update(PUBLIC_TABLES.TRANSACTIONS, transactionId, updates);
  }

  // Customers
  async getCustomer(userId) {
    const results = await this.query(PUBLIC_TABLES.CUSTOMERS, {
      where: { user_id: userId },
      limit: 1,
    });
    return results[0] || null;
  }

  async createCustomer(customerData) {
    return this.insert(PUBLIC_TABLES.CUSTOMERS, customerData);
  }

  // Entitlements
  async getUserEntitlements(userId) {
    return this.query(PUBLIC_TABLES.ENTITLEMENTS, {
      where: { user_id: userId },
    });
  }

  async createEntitlement(entitlementData) {
    return this.insert(PUBLIC_TABLES.ENTITLEMENTS, entitlementData);
  }

  async deleteEntitlement(entitlementId) {
    return this.delete(PUBLIC_TABLES.ENTITLEMENTS, entitlementId);
  }

  // Game Actions
  async createGameAction(actionData) {
    return this.insert(PUBLIC_TABLES.GAME_ACTIONS, actionData);
  }

  async getMatchGameActions(matchId, limit = 100) {
    return this.query(PUBLIC_TABLES.GAME_ACTIONS, {
      where: { match_id: matchId },
      orderBy: { field: 'timestamp', ascending: true },
      limit: limit,
    });
  }

  // Match Results
  async getMatchResult(matchId) {
    const results = await this.query(PUBLIC_TABLES.MATCH_RESULTS, {
      where: { match_id: matchId },
      limit: 1,
    });
    return results[0] || null;
  }

  async createMatchResult(resultData) {
    return this.insert(PUBLIC_TABLES.MATCH_RESULTS, resultData);
  }

  async updateMatchResult(matchId, updates) {
    const existing = await this.getMatchResult(matchId);
    if (existing) {
      return this.update(PUBLIC_TABLES.MATCH_RESULTS, existing.id, updates);
    }
    return null;
  }

  // Towers
  async getAllTowers() {
    return this.query(PUBLIC_TABLES.TOWERS, {});
  }

  async getTower(towerId) {
    return this.getById(PUBLIC_TABLES.TOWERS, towerId);
  }

  async createTower(towerData) {
    return this.insert(PUBLIC_TABLES.TOWERS, towerData);
  }

  // Player Inventory
  async getUserInventory(userId) {
    return this.query(PUBLIC_TABLES.PLAYER_INVENTORY, {
      where: { user_id: userId },
    });
  }

  async addToInventory(inventoryData) {
    return this.insert(PUBLIC_TABLES.PLAYER_INVENTORY, inventoryData);
  }

  async updateInventory(inventoryId, updates) {
    return this.update(PUBLIC_TABLES.PLAYER_INVENTORY, inventoryId, updates);
  }

  // Tasks
  async getUserTasks(userId, filters = {}) {
    const where = { user_id: userId, ...filters };
    return this.query(PUBLIC_TABLES.TASKS, {
      where: where,
      orderBy: { field: 'due_date', ascending: true },
    });
  }

  async createTask(taskData) {
    return this.insert(PUBLIC_TABLES.TASKS, taskData);
  }

  async updateTask(taskId, updates) {
    return this.update(PUBLIC_TABLES.TASKS, taskId, updates);
  }

  async deleteTask(taskId) {
    return this.delete(PUBLIC_TABLES.TASKS, taskId);
  }

  // Task Integrations
  async getUserTaskIntegrations(userId) {
    return this.query(PUBLIC_TABLES.TASK_INTEGRATIONS, {
      where: { user_id: userId },
    });
  }

  async updateTaskIntegration(integrationId, updates) {
    return this.update(PUBLIC_TABLES.TASK_INTEGRATIONS, integrationId, updates);
  }

  // Match History (from migration)
  async createMatchHistory(historyData) {
    if (!this.hasAccess) return null;
    
    try {
      const { data, error } = await supabase
        .from('match_history')
        .insert(historyData)
        .select()
        .single();

      if (error) {
        if (error.code === '42P01' || error.code === 'PGRST205') {
          return null; // Table doesn't exist
        }
        throw error;
      }
      return data;
    } catch (error) {
      if (error.code === '42P01' || error.code === 'PGRST205') {
        return null;
      }
      console.error('Error creating match history:', error);
      throw error;
    }
  }

  async getUserMatchHistory(userId, limit = 20) {
    if (!this.hasAccess) return [];
    
    try {

      const { data, error } = await supabase
        .from('match_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        if (error.code === '42P01' || error.code === 'PGRST205') {
          return []; // Table doesn't exist
        }
        throw error;
      }
      return data || [];
    } catch (error) {
      if (error.code === '42P01' || error.code === 'PGRST205') {
        return [];
      }
      console.error('Error getting match history:', error);
      return [];
    }
  }

  // Daily Challenges (from migration)
  async getDailyChallenge(date = null) {
    if (!this.hasAccess) return null;
    
    try {

      const targetDate = date || new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('daily_challenges')
        .select('*')
        .eq('challenge_date', targetDate)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        if (error.code === '42P01' || error.code === 'PGRST205') {
          return null; // Table doesn't exist
        }
        throw error;
      }
      return data;
    } catch (error) {
      if (error.code === '42P01' || error.code === 'PGRST205') {
        return null;
      }
      console.error('Error getting daily challenge:', error);
      return null;
    }
  }

  async createDailyChallenge(challengeData) {
    if (!this.hasAccess) return null;
    
    try {

      const { data, error } = await supabase
        .from('daily_challenges')
        .insert(challengeData)
        .select()
        .single();

      if (error) {
        if (error.code === '42P01' || error.code === 'PGRST205') {
          return null; // Table doesn't exist
        }
        throw error;
      }
      return data;
    } catch (error) {
      if (error.code === '42P01' || error.code === 'PGRST205') {
        return null;
      }
      console.error('Error creating daily challenge:', error);
      throw error;
    }
  }

  async getUserDailyCompletion(userId, challengeId) {
    if (!this.hasAccess) return null;
    
    try {

      const { data, error } = await supabase
        .from('user_daily_completions')
        .select('*')
        .eq('user_id', userId)
        .eq('challenge_id', challengeId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        if (error.code === '42P01' || error.code === 'PGRST205') {
          return null; // Table doesn't exist
        }
        throw error;
      }
      return data;
    } catch (error) {
      if (error.code === '42P01' || error.code === 'PGRST205') {
        return null;
      }
      console.error('Error getting user daily completion:', error);
      return null;
    }
  }

  async completeDailyChallenge(userId, challengeId) {
    if (!this.hasAccess) return null;
    
    try {

      const { data, error } = await supabase
        .from('user_daily_completions')
        .insert({
          user_id: userId,
          challenge_id: challengeId,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        if (error.code === '42P01' || error.code === 'PGRST205') {
          return null; // Table doesn't exist
        }
        if (error.code === '23505') {
          // Already completed
          return await this.getUserDailyCompletion(userId, challengeId);
        }
        throw error;
      }
      return data;
    } catch (error) {
      if (error.code === '42P01' || error.code === 'PGRST205') {
        return null;
      }
      console.error('Error completing daily challenge:', error);
      throw error;
    }
  }

  // User Powerups (from migration)
  async getUserPowerups(userId) {
    if (!this.hasAccess) return [];
    
    try {

      const { data, error } = await supabase
        .from('user_powerups')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        if (error.code === '42P01' || error.code === 'PGRST205') {
          return []; // Table doesn't exist
        }
        throw error;
      }
      return data || [];
    } catch (error) {
      if (error.code === '42P01' || error.code === 'PGRST205') {
        return [];
      }
      console.error('Error getting user powerups:', error);
      return [];
    }
  }

  async addPowerup(userId, powerupType, quantity = 1, expiresAt = null) {
    if (!this.hasAccess) return null;
    
    try {

      // Check if powerup already exists
      const { data: existing } = await supabase
        .from('user_powerups')
        .select('*')
        .eq('user_id', userId)
        .eq('powerup_type', powerupType)
        .single();

      if (existing) {
        // Update quantity
        const { data, error } = await supabase
          .from('user_powerups')
          .update({
            quantity: existing.quantity + quantity,
            expires_at: expiresAt || existing.expires_at,
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new powerup
        const { data, error } = await supabase
          .from('user_powerups')
          .insert({
            user_id: userId,
            powerup_type: powerupType,
            quantity: quantity,
            expires_at: expiresAt,
          })
          .select()
          .single();

        if (error) {
          if (error.code === '42P01' || error.code === 'PGRST205') {
            return null; // Table doesn't exist
          }
          throw error;
        }
        return data;
      }
    } catch (error) {
      if (error.code === '42P01' || error.code === 'PGRST205') {
        return null;
      }
      console.error('Error adding powerup:', error);
      throw error;
    }
  }

  async usePowerup(userId, powerupType, quantity = 1) {
    if (!this.hasAccess) return false;
    
    try {

      const { data: existing } = await supabase
        .from('user_powerups')
        .select('*')
        .eq('user_id', userId)
        .eq('powerup_type', powerupType)
        .single();

      if (!existing || existing.quantity < quantity) {
        return false;
      }

      const newQuantity = existing.quantity - quantity;
      
      if (newQuantity <= 0) {
        // Delete if quantity reaches 0
        const { error } = await supabase
          .from('user_powerups')
          .delete()
          .eq('id', existing.id);
        
        if (error) throw error;
      } else {
        // Update quantity
        const { error } = await supabase
          .from('user_powerups')
          .update({ quantity: newQuantity })
          .eq('id', existing.id);
        
        if (error) throw error;
      }

      return true;
    } catch (error) {
      if (error.code === '42P01' || error.code === 'PGRST205') {
        return false;
      }
      console.error('Error using powerup:', error);
      return false;
    }
  }
}

export default new PublicDatabaseService();

