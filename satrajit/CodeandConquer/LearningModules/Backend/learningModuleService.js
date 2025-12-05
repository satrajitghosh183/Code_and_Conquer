/**
 * Learning Module Service
 * 
 * Service for managing learning modules - fetching content from content_modules table
 * and audio files from Supabase storage bucket.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Supabase client
let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// Configure your audio bucket name here
const AUDIO_BUCKET = process.env.AUDIO_BUCKET_NAME || 'audio-modules';

class LearningModuleService {
  constructor() {
    this.hasAccess = !!supabase;
  }

  isAvailable() {
    return this.hasAccess;
  }

  /**
   * Get all learning modules
   * @param {Object} filters - Optional filters (category, difficulty, search)
   * @returns {Promise<Array>} Array of module objects
   */
  async getAllModules(filters = {}) {
    if (!this.hasAccess) {
      throw new Error('Supabase not configured');
    }

    try {
      // Select all columns - let the database return what it has
      let query = supabase
        .from('content_modules')
        .select('*');

      // Apply filters only if they exist (columns may not exist in table)
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      // Try ordering by created_at (most likely to exist)
      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      return (data || []).map(item => this.mapModule(item));
    } catch (error) {
      console.error('Error fetching modules:', error);
      throw error;
    }
  }

  /**
   * Get a single learning module by ID with full content
   * @param {string} moduleId - Module ID
   * @returns {Promise<Object|null>} Module object with content
   */
  async getModuleById(moduleId) {
    if (!this.hasAccess) {
      throw new Error('Supabase not configured');
    }

    try {
      const { data, error } = await supabase
        .from('content_modules')
        .select('*')
        .eq('id', moduleId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return this.mapModule(data);
    } catch (error) {
      console.error('Error fetching module:', error);
      throw error;
    }
  }

  /**
   * Get signed URL for audio file
   * @param {string} audioPath - Path to audio file in bucket
   * @param {number} expiresIn - Expiration time in seconds (default 1 hour)
   * @returns {Promise<string>} Signed URL
   */
  async getAudioUrl(audioPath, expiresIn = 3600) {
    if (!this.hasAccess) {
      throw new Error('Supabase not configured');
    }

    try {
      const { data, error } = await supabase
        .storage
        .from(AUDIO_BUCKET)
        .createSignedUrl(audioPath, expiresIn);

      if (error) throw error;
      return data.signedUrl;
    } catch (error) {
      console.error('Error creating signed URL:', error);
      throw error;
    }
  }

  /**
   * List all audio files in a specific path
   * @param {string} path - Path prefix
   * @returns {Promise<Array>} Array of audio file objects
   */
  async listAudioFiles(path = '') {
    if (!this.hasAccess) {
      throw new Error('Supabase not configured');
    }

    try {
      const { data, error } = await supabase
        .storage
        .from(AUDIO_BUCKET)
        .list(path, {
          limit: 100,
          sortBy: { column: 'name', order: 'asc' },
        });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error listing audio files:', error);
      throw error;
    }
  }

  /**
   * Get user's progress on learning modules
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of progress records
   */
  async getUserProgress(userId) {
    if (!this.hasAccess) {
      throw new Error('Supabase not configured');
    }

    try {
      const { data, error } = await supabase
        .from('user_module_progress')
        .select('module_id, completed, completed_at, progress_percent, last_position')
        .eq('user_id', userId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user progress:', error);
      throw error;
    }
  }

  /**
   * Update user's progress on a module
   * @param {string} userId - User ID
   * @param {string} moduleId - Module ID
   * @param {Object} progress - Progress data
   * @returns {Promise<Object>} Updated progress record
   */
  async updateUserProgress(userId, moduleId, progress) {
    if (!this.hasAccess) {
      throw new Error('Supabase not configured');
    }

    try {
      const progressData = {
        user_id: userId,
        module_id: moduleId,
        ...progress,
        updated_at: new Date().toISOString(),
      };

      if (progress.completed) {
        progressData.completed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('user_module_progress')
        .upsert(progressData, { onConflict: 'user_id,module_id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating progress:', error);
      throw error;
    }
  }

  /**
   * Get modules by category
   * @param {string} category - Category name
   * @returns {Promise<Array>} Array of modules
   */
  async getModulesByCategory(category) {
    // Category column may not exist - return all modules filtered in memory
    const allModules = await this.getAllModules();
    if (!category) return allModules;
    return allModules.filter(m => m.category === category);
  }

  /**
   * Get all unique categories
   * @returns {Promise<Array>} Array of category names
   */
  async getCategories() {
    if (!this.hasAccess) {
      throw new Error('Supabase not configured');
    }

    try {
      // Get all modules and extract unique categories
      const modules = await this.getAllModules();
      const categories = [...new Set(modules.map(m => m.category).filter(Boolean))];
      return categories;
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  }

  /**
   * Map database fields to API response format
   * @param {Object} data - Raw database record
   * @returns {Object} Mapped module object
   */
  mapModule(data) {
    if (!data) return null;
    
    // Parse JSON fields if they're strings
    const parseJsonField = (field) => {
      if (!field) return [];
      if (Array.isArray(field)) return field;
      if (typeof field === 'string') {
        try {
          return JSON.parse(field);
        } catch (e) {
          return [];
        }
      }
      return [];
    };

    // Flexible mapping - handle various column name conventions
    return {
      id: data.id,
      title: data.title || data.name || '',
      description: data.description || data.summary || '',
      content: data.content || data.text || data.body || '',
      text: data.text || data.content || data.body || '',
      category: data.category || data.type || data.topic || null,
      difficulty: data.difficulty || data.level || null,
      durationMinutes: data.duration_minutes || data.duration || data.length || null,
      thumbnailUrl: data.thumbnail_url || data.image_url || data.thumbnail || null,
      audioFilePath: data.audio_file_path || data.audio_path || data.audio_url || data.mp3_path || null,
      codeExamples: parseJsonField(data.code_examples || data.examples),
      keyPoints: parseJsonField(data.key_points || data.takeaways || data.summary_points),
      prerequisites: parseJsonField(data.prerequisites),
      objectives: parseJsonField(data.objectives || data.learning_objectives),
      orderIndex: data.order_index || data.order || data.position || 0,
      createdAt: data.created_at || data.createdAt,
      updatedAt: data.updated_at || data.updatedAt,
    };
  }
}

export default new LearningModuleService();

