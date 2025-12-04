/**
 * Achievement Service
 * Handles achievement management and user achievements
 */

import publicDatabaseService from './publicDatabaseService.js';
import { PUBLIC_TABLES } from '../config/supabasePublicSchema.js';
import { v4 as uuidv4 } from 'uuid';

class AchievementService {
  constructor() {
    // Dummy achievements data - in production, these should be in the database
    this.defaultAchievements = [
      {
        id: uuidv4(),
        name: 'First Steps',
        description: 'Solve your first problem',
        category: 'coding',
        icon_url: null,
        xp_reward: 10,
        rarity: 'common',
        criteria: { problems_solved: 1 },
      },
      {
        id: uuidv4(),
        name: 'Problem Solver',
        description: 'Solve 10 problems',
        category: 'coding',
        icon_url: null,
        xp_reward: 50,
        rarity: 'common',
        criteria: { problems_solved: 10 },
      },
      {
        id: uuidv4(),
        name: 'Master Coder',
        description: 'Solve 100 problems',
        category: 'coding',
        icon_url: null,
        xp_reward: 500,
        rarity: 'rare',
        criteria: { problems_solved: 100 },
      },
      {
        id: uuidv4(),
        name: 'Winner',
        description: 'Win your first match',
        category: 'gaming',
        icon_url: null,
        xp_reward: 25,
        rarity: 'common',
        criteria: { wins: 1 },
      },
      {
        id: uuidv4(),
        name: 'Streak Master',
        description: 'Maintain a 7-day streak',
        category: 'consistency',
        icon_url: null,
        xp_reward: 100,
        rarity: 'rare',
        criteria: { streak: 7 },
      },
    ];
  }

  /**
   * Get all available achievements
   */
  async getAllAchievements() {
    try {
      if (publicDatabaseService.isAvailable()) {
        const achievements = await publicDatabaseService.query(PUBLIC_TABLES.ACHIEVEMENTS, {});
        
        // If no achievements in DB, return defaults (dummy implementation)
        if (!achievements || achievements.length === 0) {
          return this.defaultAchievements;
        }
        
        return achievements;
      }
      
      // Return dummy achievements if DB not available
      return this.defaultAchievements;
    } catch (error) {
      console.error('Error getting achievements:', error);
      return this.defaultAchievements;
    }
  }

  /**
   * Get a specific achievement by ID
   */
  async getAchievement(achievementId) {
    try {
      if (publicDatabaseService.isAvailable()) {
        const achievement = await publicDatabaseService.getById(PUBLIC_TABLES.ACHIEVEMENTS, achievementId);
        if (achievement) return achievement;
      }
      
      // Return from defaults if not in DB
      return this.defaultAchievements.find(a => a.id === achievementId);
    } catch (error) {
      console.error('Error getting achievement:', error);
      return this.defaultAchievements.find(a => a.id === achievementId);
    }
  }

  /**
   * Get user's achievements
   */
  async getUserAchievements(userId) {
    try {
      if (publicDatabaseService.isAvailable()) {
        return await publicDatabaseService.getUserAchievements(userId);
      }
      return [];
    } catch (error) {
      console.error('Error getting user achievements:', error);
      return [];
    }
  }

  /**
   * Check if user has earned an achievement
   */
  async hasAchievement(userId, achievementId) {
    const userAchievements = await this.getUserAchievements(userId);
    return userAchievements.some(ua => ua.achievement_id === achievementId);
  }

  /**
   * Grant an achievement to a user
   */
  async grantAchievement(userId, achievementId, progress = {}) {
    try {
      // Check if already has achievement
      const hasIt = await this.hasAchievement(userId, achievementId);
      if (hasIt) {
        return null; // Already earned
      }

      if (publicDatabaseService.isAvailable()) {
        return await publicDatabaseService.grantAchievement(userId, achievementId, progress);
      }
      
      // Dummy return if DB not available
      return {
        id: uuidv4(),
        user_id: userId,
        achievement_id: achievementId,
        earned_at: new Date().toISOString(),
        progress: progress,
      };
    } catch (error) {
      console.error('Error granting achievement:', error);
      return null;
    }
  }

  /**
   * Check and award achievements based on user progress
   * This is a dummy implementation - in production, this should check actual criteria
   */
  async checkAndAwardAchievements(userId, progressData) {
    try {
      const allAchievements = await this.getAllAchievements();
      const newAchievements = [];

      for (const achievement of allAchievements) {
        // Skip if user already has it
        if (await this.hasAchievement(userId, achievement.id)) {
          continue;
        }

        // Check criteria (dummy implementation)
        const criteria = achievement.criteria || {};
        let shouldAward = false;

        if (criteria.problems_solved && progressData.problemsSolved >= criteria.problems_solved) {
          shouldAward = true;
        } else if (criteria.wins && progressData.wins >= criteria.wins) {
          shouldAward = true;
        } else if (criteria.streak && progressData.streak >= criteria.streak) {
          shouldAward = true;
        }

        if (shouldAward) {
          const granted = await this.grantAchievement(userId, achievement.id, progressData);
          if (granted) {
            newAchievements.push(achievement);
          }
        }
      }

      return newAchievements;
    } catch (error) {
      console.error('Error checking achievements:', error);
      return [];
    }
  }

  /**
   * Initialize default achievements in database (dummy implementation helper)
   */
  async initializeDefaultAchievements() {
    try {
      if (!publicDatabaseService.isAvailable()) {
        return;
      }

      const existing = await publicDatabaseService.query(PUBLIC_TABLES.ACHIEVEMENTS, {});
      
      // If no achievements exist, create defaults
      if (!existing || existing.length === 0) {
        for (const achievement of this.defaultAchievements) {
          try {
            await publicDatabaseService.insert(PUBLIC_TABLES.ACHIEVEMENTS, achievement);
          } catch (error) {
            console.warn('Could not create default achievement:', error.message);
          }
        }
      }
    } catch (error) {
      console.warn('Error initializing default achievements:', error.message);
    }
  }
}

export default new AchievementService();

