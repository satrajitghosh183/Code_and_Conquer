/**
 * Daily Challenge Service
 * Handles daily coding challenges
 */

import publicDatabaseService from './publicDatabaseService.js';
import database from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

class DailyChallengeService {
  constructor() {
    // Cache for today's challenge
    this.todayChallenge = null;
    this.todayDate = null;
  }

  /**
   * Get today's daily challenge
   */
  async getTodaysChallenge() {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Check cache
      if (this.todayChallenge && this.todayDate === today) {
        return this.todayChallenge;
      }

      // Get from database
      let challenge = await publicDatabaseService.getDailyChallenge(today);

      // If no challenge exists, create a dummy one
      if (!challenge) {
        challenge = await this.createDummyChallenge(today);
      }

      // Cache it
      this.todayChallenge = challenge;
      this.todayDate = today;

      return challenge;
    } catch (error) {
      console.error('Error getting today\'s challenge:', error);
      return this.createDummyChallenge(new Date().toISOString().split('T')[0]);
    }
  }

  /**
   * Create a daily challenge from available runnable problems
   */
  async createDummyChallenge(date) {
    try {
      // Get all problems with test cases (runnable problems)
      const allProblems = await database.getAllProblems({});
      
      // Filter to only include problems with valid test cases
      const runnableProblems = allProblems.filter(p => {
        const hasVisible = p.testCases && Array.isArray(p.testCases) && p.testCases.length > 0;
        const hasHidden = p.hiddenTestCases && Array.isArray(p.hiddenTestCases) && p.hiddenTestCases.length > 0;
        return hasVisible || hasHidden;
      });

      if (runnableProblems.length === 0) {
        console.warn('No runnable problems available for daily challenge');
        return null;
      }

      // Prefer medium difficulty, but fall back to any available problem
      const mediumProblems = runnableProblems.filter(p => 
        p.difficulty?.toLowerCase() === 'medium'
      );
      const easyProblems = runnableProblems.filter(p => 
        p.difficulty?.toLowerCase() === 'easy'
      );
      
      // Use a deterministic seed based on date for consistent challenge per day
      const dateSeed = date.split('-').join('');
      const seedNumber = parseInt(dateSeed) || Date.now();
      
      // Pick problem based on date (pseudo-random but consistent for the day)
      let problemPool = mediumProblems.length > 0 ? mediumProblems : 
                        (easyProblems.length > 0 ? easyProblems : runnableProblems);
      
      const problemIndex = seedNumber % problemPool.length;
      const problem = problemPool[problemIndex];

      // Set bonus based on difficulty
      const difficultyBonuses = {
        'easy': { xp: 50, gold: 25 },
        'medium': { xp: 100, gold: 50 },
        'hard': { xp: 200, gold: 100 }
      };
      const bonus = difficultyBonuses[problem.difficulty?.toLowerCase()] || difficultyBonuses['medium'];

      const challengeData = {
        id: uuidv4(),
        problem_id: problem.id,
        challenge_date: date,
        bonus_xp: bonus.xp,
        bonus_gold: bonus.gold,
        created_at: new Date().toISOString(),
      };

      // Try to save to database (but don't fail if it doesn't work)
      if (publicDatabaseService.isAvailable()) {
        try {
          await publicDatabaseService.createDailyChallenge(challengeData);
        } catch (error) {
          // Silently ignore - the challenge will still be returned
          console.warn('Could not persist daily challenge:', error.message);
        }
      }

      console.log(`Daily challenge created: ${problem.title} (${problem.difficulty})`);
      return challengeData;
    } catch (error) {
      console.error('Error creating daily challenge:', error);
      return null;
    }
  }

  /**
   * Check if user has completed today's challenge
   */
  async hasCompletedTodaysChallenge(userId) {
    try {
      const challenge = await this.getTodaysChallenge();
      if (!challenge) return false;

      if (publicDatabaseService.isAvailable()) {
        const completion = await publicDatabaseService.getUserDailyCompletion(userId, challenge.id);
        return !!completion;
      }

      return false;
    } catch (error) {
      console.error('Error checking challenge completion:', error);
      return false;
    }
  }

  /**
   * Mark today's challenge as completed for a user
   */
  async completeTodaysChallenge(userId) {
    try {
      const challenge = await this.getTodaysChallenge();
      if (!challenge) {
        return { success: false, message: 'No challenge available today' };
      }

      // Check if already completed
      if (await this.hasCompletedTodaysChallenge(userId)) {
        return { success: false, message: 'Challenge already completed' };
      }

      // Mark as completed
      if (publicDatabaseService.isAvailable()) {
        await publicDatabaseService.completeDailyChallenge(userId, challenge.id);
      }

      return {
        success: true,
        bonusXp: challenge.bonus_xp || 100,
        bonusGold: challenge.bonus_gold || 50,
      };
    } catch (error) {
      console.error('Error completing daily challenge:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Get challenge for a specific date
   */
  async getChallengeByDate(date) {
    try {
      return await publicDatabaseService.getDailyChallenge(date);
    } catch (error) {
      console.error('Error getting challenge by date:', error);
      return null;
    }
  }

  /**
   * Create a daily challenge for a specific date
   */
  async createChallenge(date, problemId, bonusXp = 100, bonusGold = 50) {
    try {
      const challengeData = {
        id: uuidv4(),
        problem_id: problemId,
        challenge_date: date,
        bonus_xp: bonusXp,
        bonus_gold: bonusGold,
        created_at: new Date().toISOString(),
      };

      if (publicDatabaseService.isAvailable()) {
        return await publicDatabaseService.createDailyChallenge(challengeData);
      }

      return challengeData;
    } catch (error) {
      console.error('Error creating challenge:', error);
      throw error;
    }
  }
}

export default new DailyChallengeService();

