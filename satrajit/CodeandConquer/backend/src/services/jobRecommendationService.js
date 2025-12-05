/**
 * Job Recommendation Service
 * 
 * Service for generating personalized job recommendations based on:
 * 1. Problems solved by the user
 * 2. User's progression in the learning module
 * 3. Interview frequency data from LinkedIn extraction pipelines
 * 4. User's skill profile and coding patterns
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

// Skill category mappings for better matching
const SKILL_CATEGORIES = {
  'frontend': ['javascript', 'typescript', 'react', 'vue', 'angular', 'css', 'html', 'dom'],
  'backend': ['node', 'python', 'java', 'go', 'rust', 'c++', 'sql', 'api'],
  'data': ['python', 'sql', 'statistics', 'machine-learning', 'algorithms'],
  'systems': ['c++', 'rust', 'go', 'memory', 'optimization', 'algorithms'],
  'mobile': ['swift', 'kotlin', 'react-native', 'flutter']
};

// Problem difficulty to experience level mapping
const DIFFICULTY_TO_EXPERIENCE = {
  'easy': ['entry', 'mid'],
  'medium': ['mid', 'senior'],
  'hard': ['senior', 'lead']
};

class JobRecommendationService {
  constructor() {
    this.hasAccess = !!supabase;
  }

  isAvailable() {
    return this.hasAccess;
  }

  /**
   * Get the Supabase client
   * @returns {Object|null} Supabase client
   */
  getSupabaseClient() {
    return supabase;
  }

  /**
   * Get user's solved problems
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of problem IDs that user has solved
   */
  async getUserSolvedProblems(userId) {
    if (!this.hasAccess) {
      throw new Error('Supabase not configured');
    }

    try {
      const { data, error } = await supabase
        .from('submissions')
        .select('problem_id, problem:problems(id, title, difficulty, category)')
        .eq('user_id', userId)
        .eq('verdict', 'accepted')
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      // Get unique problem IDs
      const solvedProblemIds = [...new Set((data || []).map(s => s.problem_id))];
      
      return {
        problemIds: solvedProblemIds,
        submissions: data || []
      };
    } catch (error) {
      console.error('Error fetching user solved problems:', error);
      throw error;
    }
  }

  /**
   * Get user's learning progression
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User progression data
   */
  async getUserProgression(userId) {
    if (!this.hasAccess) {
      throw new Error('Supabase not configured');
    }

    try {
      // Get user progress
      const { data: userProgress, error: progressError } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (progressError && progressError.code !== 'PGRST116') {
        throw progressError;
      }

      // Get learning module progress
      const { data: moduleProgress, error: moduleError } = await supabase
        .from('user_module_progress')
        .select('module_id, completed, progress_percent')
        .eq('user_id', userId);

      if (moduleError) {
        console.warn('Error fetching module progress:', moduleError);
      }

      return {
        totalXp: userProgress?.total_xp || 0,
        level: userProgress?.computed_level || 1,
        codingLevel: userProgress?.coding_level || 'beginner',
        lifetimeProblemsSolved: userProgress?.lifetime_problems_solved || 0,
        currentStreak: userProgress?.current_streak || 0,
        longestStreak: userProgress?.longest_streak || 0,
        modulesCompleted: (moduleProgress || []).filter(m => m.completed).length,
        totalModulesProgress: moduleProgress?.length || 0,
        averageModuleProgress: moduleProgress?.length > 0
          ? moduleProgress.reduce((sum, m) => sum + (m.progress_percent || 0), 0) / moduleProgress.length
          : 0
      };
    } catch (error) {
      console.error('Error fetching user progression:', error);
      throw error;
    }
  }

  /**
   * Calculate match score for a job based on user's solved problems
   * @param {string} userId - User ID
   * @param {string} jobId - Job ID
   * @returns {Promise<Object>} Match score and details
   */
  async calculateJobMatchScore(userId, jobId) {
    if (!this.hasAccess) {
      throw new Error('Supabase not configured');
    }

    try {
      // Get user's solved problems
      const { problemIds, submissions } = await this.getUserSolvedProblems(userId);
      
      if (problemIds.length === 0) {
        return {
          matchScore: 0,
          problemsMatched: 0,
          progressionScore: 0,
          totalScore: 0,
          matchedProblems: []
        };
      }

      // Get job-problem mappings for this job
      const { data: jobMappings, error: mappingError } = await supabase
        .from('job_problem_mappings')
        .select('problem_id, frequency_score, difficulty_weight')
        .eq('job_id', jobId);

      if (mappingError) throw mappingError;

      if (!jobMappings || jobMappings.length === 0) {
        return {
          matchScore: 0,
          problemsMatched: 0,
          progressionScore: 0,
          totalScore: 0,
          matchedProblems: []
        };
      }

      // Calculate problem match score
      let totalFrequencyScore = 0;
      let matchedProblems = [];
      let problemsMatched = 0;

      for (const mapping of jobMappings) {
        if (problemIds.includes(mapping.problem_id)) {
          const submission = submissions.find(s => s.problem_id === mapping.problem_id);
          const problem = submission?.problem;
          
          // Weight the frequency score by difficulty
          const weightedScore = mapping.frequency_score * mapping.difficulty_weight;
          totalFrequencyScore += weightedScore;
          problemsMatched++;

          matchedProblems.push({
            problemId: mapping.problem_id,
            problemTitle: problem?.title || 'Unknown',
            difficulty: problem?.difficulty || 'unknown',
            frequencyScore: mapping.frequency_score,
            weightedScore: weightedScore
          });
        }
      }

      // Normalize problem match score (0-70 points)
      const maxPossibleScore = jobMappings.reduce((sum, m) => 
        sum + (m.frequency_score * m.difficulty_weight), 0
      );
      const problemMatchScore = maxPossibleScore > 0
        ? (totalFrequencyScore / maxPossibleScore) * 70
        : 0;

      // Get user progression for progression score (0-30 points)
      const progression = await this.getUserProgression(userId);
      const progressionScore = this.calculateProgressionScore(progression);

      // Total match score (0-100)
      const totalScore = problemMatchScore + progressionScore;

      return {
        matchScore: Math.round(problemMatchScore * 100) / 100,
        problemsMatched,
        progressionScore: Math.round(progressionScore * 100) / 100,
        totalScore: Math.round(totalScore * 100) / 100,
        matchedProblems,
        progression
      };
    } catch (error) {
      console.error('Error calculating job match score:', error);
      throw error;
    }
  }

  /**
   * Calculate progression score based on user's learning progress
   * @param {Object} progression - User progression data
   * @returns {number} Progression score (0-30)
   */
  calculateProgressionScore(progression) {
    let score = 0;

    // XP-based score (0-10 points)
    const xpScore = Math.min(10, (progression.totalXp / 10000) * 10);
    score += xpScore;

    // Level-based score (0-10 points)
    const levelScore = Math.min(10, (progression.level / 50) * 10);
    score += levelScore;

    // Learning module completion score (0-10 points)
    const moduleScore = progression.totalModulesProgress > 0
      ? (progression.modulesCompleted / progression.totalModulesProgress) * 10
      : 0;
    score += moduleScore;

    return Math.min(30, score);
  }

  /**
   * Generate job recommendations for a user
   * @param {string} userId - User ID
   * @param {Object} options - Options for recommendations
   * @returns {Promise<Array>} Array of recommended jobs with match scores
   */
  async getJobRecommendations(userId, options = {}) {
    if (!this.hasAccess) {
      throw new Error('Supabase not configured');
    }

    const {
      limit = 10,
      minMatchScore = 30,
      experienceLevel = null,
      location = null,
      remoteOnly = false
    } = options;

    try {
      // Get all active jobs
      let jobQuery = supabase
        .from('jobs')
        .select(`
          *,
          company:companies(*)
        `)
        .eq('is_active', true);

      if (experienceLevel) {
        jobQuery = jobQuery.eq('experience_level', experienceLevel);
      }

      if (location) {
        jobQuery = jobQuery.ilike('location', `%${location}%`);
      }

      if (remoteOnly) {
        jobQuery = jobQuery.eq('remote_allowed', true);
      }

      const { data: jobs, error: jobsError } = await jobQuery
        .order('interview_frequency_score', { ascending: false })
        .limit(100); // Get top 100 by frequency, then filter by match score

      if (jobsError) throw jobsError;

      if (!jobs || jobs.length === 0) {
        return [];
      }

      // Calculate match scores for each job
      const recommendations = [];
      for (const job of jobs) {
        const matchData = await this.calculateJobMatchScore(userId, job.id);
        
        if (matchData.totalScore >= minMatchScore) {
          const recommendationReason = this.generateRecommendationReason(
            matchData,
            job
          );

          recommendations.push({
            job: {
              id: job.id,
              title: job.title,
              description: job.description,
              company: job.company,
              location: job.location,
              remoteAllowed: job.remote_allowed,
              experienceLevel: job.experience_level,
              employmentType: job.employment_type,
              salaryMin: job.salary_min,
              salaryMax: job.salary_max,
              salaryCurrency: job.salary_currency,
              postedAt: job.posted_at,
              expiresAt: job.expires_at
            },
            matchScore: matchData.totalScore,
            problemsMatched: matchData.problemsMatched,
            progressionScore: matchData.progressionScore,
            recommendationReason,
            matchedProblems: matchData.matchedProblems.slice(0, 5) // Top 5 matched problems
          });
        }
      }

      // Sort by match score descending
      recommendations.sort((a, b) => b.matchScore - a.matchScore);

      // Store recommendations in database
      await this.storeRecommendations(userId, recommendations);

      return recommendations.slice(0, limit);
    } catch (error) {
      console.error('Error generating job recommendations:', error);
      throw error;
    }
  }

  /**
   * Generate human-readable recommendation reason
   * @param {Object} matchData - Match score data
   * @param {Object} job - Job data
   * @returns {string} Recommendation reason
   */
  generateRecommendationReason(matchData, job) {
    const reasons = [];

    if (matchData.problemsMatched > 0) {
      reasons.push(
        `You've solved ${matchData.problemsMatched} problem${matchData.problemsMatched > 1 ? 's' : ''} ` +
        `that frequently appear in interviews for this position`
      );
    }

    if (matchData.progressionScore > 20) {
      reasons.push('Your strong learning progression demonstrates readiness for this role');
    } else if (matchData.progressionScore > 10) {
      reasons.push('Your learning progress shows good preparation for this role');
    }

    if (job.interview_frequency_score > 0.7) {
      reasons.push('This job type is highly sought after in the industry');
    }

    return reasons.length > 0
      ? reasons.join('. ') + '.'
      : 'Based on your coding skills and progression, this role may be a good fit.';
  }

  /**
   * Store recommendations in database
   * @param {string} userId - User ID
   * @param {Array} recommendations - Array of recommendations
   */
  async storeRecommendations(userId, recommendations) {
    if (!this.hasAccess) return;

    try {
      const records = recommendations.map(rec => ({
        user_id: userId,
        job_id: rec.job.id,
        match_score: rec.matchScore,
        problems_matched: rec.problemsMatched,
        progression_score: rec.progressionScore,
        recommendation_reason: rec.recommendationReason
      }));

      // Upsert recommendations
      const { error } = await supabase
        .from('user_job_recommendations')
        .upsert(records, {
          onConflict: 'user_id,job_id',
          ignoreDuplicates: false
        });

      if (error) {
        console.warn('Error storing recommendations:', error);
      }
    } catch (error) {
      console.warn('Error storing recommendations:', error);
    }
  }

  /**
   * Get a specific job by ID
   * @param {string} jobId - Job ID
   * @returns {Promise<Object|null>} Job object
   */
  async getJobById(jobId) {
    if (!this.hasAccess) {
      throw new Error('Supabase not configured');
    }

    try {
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          company:companies(*)
        `)
        .eq('id', jobId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching job:', error);
      throw error;
    }
  }

  /**
   * Get user's saved recommendations
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of saved recommendations
   */
  async getUserRecommendations(userId, options = {}) {
    if (!this.hasAccess) {
      throw new Error('Supabase not configured');
    }

    const { limit = 20, minScore = 0 } = options;

    try {
      const { data, error } = await supabase
        .from('user_job_recommendations')
        .select(`
          *,
          job:jobs(
            *,
            company:companies(*)
          )
        `)
        .eq('user_id', userId)
        .gte('match_score', minScore)
        .order('match_score', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching user recommendations:', error);
      throw error;
    }
  }

  /**
   * Mark a recommendation as viewed
   * @param {string} userId - User ID
   * @param {string} jobId - Job ID
   */
  async markRecommendationViewed(userId, jobId) {
    if (!this.hasAccess) return;

    try {
      const { error } = await supabase
        .from('user_job_recommendations')
        .update({ viewed_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('job_id', jobId);

      if (error) {
        console.warn('Error marking recommendation as viewed:', error);
      }
    } catch (error) {
      console.warn('Error marking recommendation as viewed:', error);
    }
  }

  /**
   * Mark a recommendation as applied
   * @param {string} userId - User ID
   * @param {string} jobId - Job ID
   */
  async markRecommendationApplied(userId, jobId) {
    if (!this.hasAccess) return;

    try {
      const { error } = await supabase
        .from('user_job_recommendations')
        .update({ applied_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('job_id', jobId);

      if (error) {
        console.warn('Error marking recommendation as applied:', error);
      }
    } catch (error) {
      console.warn('Error marking recommendation as applied:', error);
    }
  }

  /**
   * Analyze user's skill profile based on solved problems
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User's skill profile
   */
  async analyzeUserSkillProfile(userId) {
    if (!this.hasAccess) {
      throw new Error('Supabase not configured');
    }

    try {
      const { problemIds, submissions } = await this.getUserSolvedProblems(userId);
      
      const skillProfile = {
        totalProblemsSolved: problemIds.length,
        difficultyBreakdown: { easy: 0, medium: 0, hard: 0 },
        categoryBreakdown: {},
        estimatedExperienceLevel: 'entry',
        strongestCategories: [],
        recommendedSkillAreas: []
      };

      if (submissions.length === 0) {
        return skillProfile;
      }

      // Analyze submissions
      for (const submission of submissions) {
        const problem = submission.problem;
        if (!problem) continue;

        // Count difficulty
        const difficulty = (problem.difficulty || 'medium').toLowerCase();
        if (skillProfile.difficultyBreakdown[difficulty] !== undefined) {
          skillProfile.difficultyBreakdown[difficulty]++;
        }

        // Count categories
        const category = problem.category || 'general';
        skillProfile.categoryBreakdown[category] = 
          (skillProfile.categoryBreakdown[category] || 0) + 1;
      }

      // Determine experience level based on solved problems
      const total = problemIds.length;
      const hardRatio = skillProfile.difficultyBreakdown.hard / Math.max(total, 1);
      const mediumRatio = skillProfile.difficultyBreakdown.medium / Math.max(total, 1);

      if (total >= 100 && hardRatio > 0.3) {
        skillProfile.estimatedExperienceLevel = 'lead';
      } else if (total >= 50 && (hardRatio > 0.2 || mediumRatio > 0.5)) {
        skillProfile.estimatedExperienceLevel = 'senior';
      } else if (total >= 20 && mediumRatio > 0.3) {
        skillProfile.estimatedExperienceLevel = 'mid';
      } else {
        skillProfile.estimatedExperienceLevel = 'entry';
      }

      // Get strongest categories
      const sortedCategories = Object.entries(skillProfile.categoryBreakdown)
        .sort((a, b) => b[1] - a[1]);
      
      skillProfile.strongestCategories = sortedCategories.slice(0, 5).map(([cat]) => cat);

      // Recommend skill areas to improve
      const allCategories = ['arrays', 'strings', 'trees', 'graphs', 'dynamic-programming', 'sorting', 'searching'];
      const solvedCategories = new Set(Object.keys(skillProfile.categoryBreakdown));
      
      skillProfile.recommendedSkillAreas = allCategories
        .filter(cat => !solvedCategories.has(cat) || skillProfile.categoryBreakdown[cat] < 5)
        .slice(0, 3);

      return skillProfile;
    } catch (error) {
      console.error('Error analyzing user skill profile:', error);
      throw error;
    }
  }

  /**
   * Get all available jobs (without user context)
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of jobs
   */
  async getAllJobs(options = {}) {
    if (!this.hasAccess) {
      throw new Error('Supabase not configured');
    }

    const {
      limit = 50,
      offset = 0,
      experienceLevel = null,
      location = null,
      remoteOnly = false,
      searchQuery = null,
      sortBy = 'posted_at',
      sortOrder = 'desc'
    } = options;

    try {
      let query = supabase
        .from('jobs')
        .select(`
          *,
          company:companies(*)
        `, { count: 'exact' })
        .eq('is_active', true);

      if (experienceLevel) {
        query = query.eq('experience_level', experienceLevel);
      }

      if (location) {
        query = query.ilike('location', `%${location}%`);
      }

      if (remoteOnly) {
        query = query.eq('remote_allowed', true);
      }

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }

      const { data, error, count } = await query
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return {
        jobs: data || [],
        total: count || 0,
        hasMore: (offset + limit) < (count || 0)
      };
    } catch (error) {
      console.error('Error fetching all jobs:', error);
      throw error;
    }
  }

  /**
   * Save a job for a user
   * @param {string} userId - User ID
   * @param {string} jobId - Job ID
   */
  async saveJob(userId, jobId) {
    if (!this.hasAccess) {
      throw new Error('Supabase not configured');
    }

    try {
      // Create a recommendation entry if it doesn't exist
      const { error } = await supabase
        .from('user_job_recommendations')
        .upsert({
          user_id: userId,
          job_id: jobId,
          match_score: 0, // Will be calculated on next recommendation fetch
          problems_matched: 0,
          progression_score: 0,
          recommendation_reason: 'Saved by user'
        }, {
          onConflict: 'user_id,job_id',
          ignoreDuplicates: true
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving job:', error);
      throw error;
    }
  }

  /**
   * Remove a saved job for a user
   * @param {string} userId - User ID
   * @param {string} jobId - Job ID
   */
  async unsaveJob(userId, jobId) {
    if (!this.hasAccess) {
      throw new Error('Supabase not configured');
    }

    try {
      const { error } = await supabase
        .from('user_job_recommendations')
        .delete()
        .eq('user_id', userId)
        .eq('job_id', jobId);

      if (error) throw error;
    } catch (error) {
      console.error('Error removing saved job:', error);
      throw error;
    }
  }

  /**
   * Get job statistics
   * @returns {Promise<Object>} Job statistics
   */
  async getJobStatistics() {
    if (!this.hasAccess) {
      throw new Error('Supabase not configured');
    }

    try {
      // Get total active jobs
      const { count: totalJobs } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Get jobs by experience level
      const { data: experienceLevels } = await supabase
        .from('jobs')
        .select('experience_level')
        .eq('is_active', true);

      const byExperience = {};
      (experienceLevels || []).forEach(j => {
        const level = j.experience_level || 'unspecified';
        byExperience[level] = (byExperience[level] || 0) + 1;
      });

      // Get total companies
      const { count: totalCompanies } = await supabase
        .from('companies')
        .select('*', { count: 'exact', head: true });

      // Get remote jobs count
      const { count: remoteJobs } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .eq('remote_allowed', true);

      return {
        totalJobs: totalJobs || 0,
        totalCompanies: totalCompanies || 0,
        remoteJobs: remoteJobs || 0,
        byExperienceLevel: byExperience,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error fetching job statistics:', error);
      throw error;
    }
  }

  /**
   * Get trending jobs (most viewed/applied)
   * @param {number} limit - Number of jobs to return
   * @returns {Promise<Array>} Array of trending jobs
   */
  async getTrendingJobs(limit = 10) {
    if (!this.hasAccess) {
      throw new Error('Supabase not configured');
    }

    try {
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          company:companies(*),
          recommendations:user_job_recommendations(count)
        `)
        .eq('is_active', true)
        .order('interview_frequency_score', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching trending jobs:', error);
      throw error;
    }
  }
}

export default new JobRecommendationService();

