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
}

export default new PublicDatabaseService();

