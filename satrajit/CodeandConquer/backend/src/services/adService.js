/**
 * Ad Service
 * 
 * Service for managing video advertisements.
 * Stores ad videos and sponsors, returns random ads for ad breaks.
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

// Default video ads (fallback if database is not configured)
const DEFAULT_VIDEO_ADS = [
  {
    id: '1',
    youtube_url: 'https://www.youtube.com/watch?v=IwzF26o0AuU',
    sponsor: 'Code & Conquer',
    title: 'Learn to Code',
  },
  {
    id: '2',
    youtube_url: 'https://www.youtube.com/watch?v=6vEEVNAOFFY',
    sponsor: 'Tech Academy',
    title: 'Master Programming',
  },
  {
    id: '3',
    youtube_url: 'https://www.youtube.com/watch?v=Bcpu-jqAL6w',
    sponsor: 'DevTools Pro',
    title: 'Developer Tools',
  },
  {
    id: '4',
    youtube_url: 'https://www.youtube.com/watch?v=yJched2MvZ8',
    sponsor: 'CodeCamp',
    title: 'Coding Bootcamp',
  },
  {
    id: '5',
    youtube_url: 'https://www.youtube.com/watch?v=xTpv9lc_qMw',
    sponsor: 'TechLearn',
    title: 'Online Learning',
  },
];

class AdService {
  constructor() {
    this.hasAccess = !!supabase;
    this.cachedAds = null;
    this.cacheTime = 0;
    this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  }

  isAvailable() {
    return this.hasAccess;
  }

  /**
   * Get a random video ad
   * @returns {Promise<Object>} Random video ad object
   */
  async getRandomVideoAd() {
    try {
      const ads = await this.getAllAds();
      if (ads.length === 0) {
        return DEFAULT_VIDEO_ADS[Math.floor(Math.random() * DEFAULT_VIDEO_ADS.length)];
      }
      return ads[Math.floor(Math.random() * ads.length)];
    } catch (error) {
      console.error('Error getting random ad:', error);
      // Fallback to default ads
      return DEFAULT_VIDEO_ADS[Math.floor(Math.random() * DEFAULT_VIDEO_ADS.length)];
    }
  }

  /**
   * Get all video ads from database or use defaults
   * @returns {Promise<Array>} Array of ad objects
   */
  async getAllAds() {
    // Check cache
    if (this.cachedAds && (Date.now() - this.cacheTime) < this.CACHE_DURATION) {
      return this.cachedAds;
    }

    if (!this.hasAccess) {
      return DEFAULT_VIDEO_ADS;
    }

    try {
      const { data, error } = await supabase
        .from('video_ads')
        .select('*')
        .eq('active', true);

      if (error) {
        // Table might not exist, use defaults
        if (error.code === '42P01') {
          console.log('video_ads table not found, using default ads');
          return DEFAULT_VIDEO_ADS;
        }
        throw error;
      }

      if (!data || data.length === 0) {
        return DEFAULT_VIDEO_ADS;
      }

      // Update cache
      this.cachedAds = data;
      this.cacheTime = Date.now();

      return data;
    } catch (error) {
      console.error('Error fetching ads from database:', error);
      return DEFAULT_VIDEO_ADS;
    }
  }

  /**
   * Add a new video ad (admin)
   * @param {Object} adData - Ad data
   * @returns {Promise<Object>} Created ad
   */
  async createAd(adData) {
    if (!this.hasAccess) {
      throw new Error('Database not configured');
    }

    try {
      const { data, error } = await supabase
        .from('video_ads')
        .insert([{
          youtube_url: adData.youtube_url,
          sponsor: adData.sponsor,
          title: adData.title,
          description: adData.description,
          active: adData.active !== false,
          priority: adData.priority || 1,
          start_date: adData.start_date,
          end_date: adData.end_date,
        }])
        .select()
        .single();

      if (error) throw error;

      // Invalidate cache
      this.cachedAds = null;

      return data;
    } catch (error) {
      console.error('Error creating ad:', error);
      throw error;
    }
  }

  /**
   * Update an existing ad (admin)
   * @param {string} adId - Ad ID
   * @param {Object} adData - Updated ad data
   * @returns {Promise<Object>} Updated ad
   */
  async updateAd(adId, adData) {
    if (!this.hasAccess) {
      throw new Error('Database not configured');
    }

    try {
      const { data, error } = await supabase
        .from('video_ads')
        .update({
          ...adData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', adId)
        .select()
        .single();

      if (error) throw error;

      // Invalidate cache
      this.cachedAds = null;

      return data;
    } catch (error) {
      console.error('Error updating ad:', error);
      throw error;
    }
  }

  /**
   * Delete an ad (admin)
   * @param {string} adId - Ad ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteAd(adId) {
    if (!this.hasAccess) {
      throw new Error('Database not configured');
    }

    try {
      const { error } = await supabase
        .from('video_ads')
        .delete()
        .eq('id', adId);

      if (error) throw error;

      // Invalidate cache
      this.cachedAds = null;

      return true;
    } catch (error) {
      console.error('Error deleting ad:', error);
      throw error;
    }
  }

  /**
   * Log an ad impression (for analytics)
   * @param {string} adId - Ad ID
   * @param {string} userId - User ID (optional)
   * @returns {Promise<void>}
   */
  async logImpression(adId, userId = null) {
    if (!this.hasAccess) return;

    try {
      await supabase
        .from('ad_impressions')
        .insert([{
          ad_id: adId,
          user_id: userId,
          timestamp: new Date().toISOString(),
        }]);
    } catch (error) {
      // Don't throw - impressions are not critical
      console.error('Error logging impression:', error);
    }
  }

  /**
   * Log an ad skip
   * @param {string} adId - Ad ID
   * @param {number} watchTime - Seconds watched before skip
   * @param {string} userId - User ID (optional)
   * @returns {Promise<void>}
   */
  async logSkip(adId, watchTime, userId = null) {
    if (!this.hasAccess) return;

    try {
      await supabase
        .from('ad_interactions')
        .insert([{
          ad_id: adId,
          user_id: userId,
          interaction_type: 'skip',
          watch_time_seconds: watchTime,
          timestamp: new Date().toISOString(),
        }]);
    } catch (error) {
      console.error('Error logging skip:', error);
    }
  }

  /**
   * Log ad completion
   * @param {string} adId - Ad ID
   * @param {string} userId - User ID (optional)
   * @returns {Promise<void>}
   */
  async logCompletion(adId, userId = null) {
    if (!this.hasAccess) return;

    try {
      await supabase
        .from('ad_interactions')
        .insert([{
          ad_id: adId,
          user_id: userId,
          interaction_type: 'completed',
          timestamp: new Date().toISOString(),
        }]);
    } catch (error) {
      console.error('Error logging completion:', error);
    }
  }
}

export default new AdService();

