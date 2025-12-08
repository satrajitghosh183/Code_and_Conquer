/**
 * Dashboard Controller
 * Handles dashboard statistics and daily challenge
 */

import database from '../config/database.js';
import publicDatabaseService from '../services/publicDatabaseService.js';
import dailyChallengeService from '../services/dailyChallengeService.js';
import { PUBLIC_TABLES } from '../config/supabasePublicSchema.js';

/**
 * Get dashboard statistics for a user
 * GET /api/dashboard/stats/:userId
 */
export const getDashboardStats = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const supabase = database.getSupabaseClient();
    if (!supabase) {
      return res.json({
        problemsSolved: 0,
        dayStreak: 0,
        towersUnlocked: 0,
        globalRank: null,
        rankScore: 0
      });
    }

    // Get user stats (note: user_stats uses 'id' column, not 'user_id')
    let userStats = null;
    try {
      const { data, error } = await supabase
        .from('user_stats')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (!error && data) {
        userStats = data;
      }
    } catch (error) {
      // User stats don't exist yet - that's ok
      console.warn('Error fetching user stats:', error.message);
    }

    // Get user progress (for day streak)
    let userProgress = null;
    let dayStreak = 0;
    try {
      userProgress = await publicDatabaseService.getUserProgress(userId);
      if (userProgress) {
        // Use current_streak from database (it's already calculated and updated by submission controller)
        // The submission controller updates current_streak and last_activity_date when a problem is solved
        dayStreak = userProgress.current_streak || 0;
        
        // If last_activity_date exists, verify streak is still valid
        if (userProgress.last_activity_date) {
          const lastActivity = new Date(userProgress.last_activity_date);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const lastActivityDate = new Date(lastActivity);
          lastActivityDate.setHours(0, 0, 0, 0);
          
          const daysDiff = Math.floor((today - lastActivityDate) / (1000 * 60 * 60 * 24));
          
          // If user hasn't been active in more than 1 day, streak should be 0
          if (daysDiff > 1) {
            dayStreak = 0;
          }
          // If daysDiff === 0, user was active today, current_streak is correct
          // If daysDiff === 1, user was active yesterday, current_streak should be incremented when they solve today
        }
      }
    } catch (error) {
      // User progress doesn't exist yet - that's ok
      console.warn('Error fetching user progress:', error.message);
    }

    // Calculate towers unlocked (based on level - 1 tower per 5 levels, starting at level 5)
    const level = userStats?.level || 1;
    const towersUnlocked = Math.max(0, Math.floor((level - 1) / 5));

    // Get global rank
    let globalRank = null;
    let rankScore = 0;
    try {
      // Get user's leaderboard score
      const score = (userStats?.xp || 0) + ((userStats?.problems_solved || 0) * 10);
      rankScore = score;

      // Get all users from profiles to calculate rank
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id')
        .limit(10000);
      
      if (profiles && profiles.length > 0) {
        // Get stats for all users to calculate rank
        // Note: user_stats uses 'id' column, not 'user_id'
        const allUsersStats = await Promise.all(
          profiles.map(async (profile) => {
            try {
              const { data: stats } = await supabase
                .from('user_stats')
                .select('xp, problems_solved')
                .eq('id', profile.id)
                .single();
              
              if (stats) {
                return {
                  user_id: profile.id,
                  score: (stats.xp || 0) + ((stats.problems_solved || 0) * 10)
                };
              }
              return { user_id: profile.id, score: 0 };
            } catch (error) {
              // User stats don't exist - that's ok, score is 0
              return { user_id: profile.id, score: 0 };
            }
          })
        );
        
        // Sort by score (descending) and find rank
        allUsersStats.sort((a, b) => b.score - a.score);
        const userRankIndex = allUsersStats.findIndex(u => u.user_id === userId);
        if (userRankIndex !== -1) {
          globalRank = userRankIndex + 1;
        } else if (score > 0) {
          // User has score but not in profiles, estimate rank
          // Count how many users have a higher score
          const usersWithHigherScore = allUsersStats.filter(u => u.score > score).length;
          globalRank = usersWithHigherScore + 1;
        }
      }
    } catch (error) {
      // Leaderboard calculation failed - that's ok
      if (error.code !== 'PGRST205' && error.code !== '42P01') {
        console.warn('Error calculating global rank:', error.message);
      }
    }

    // Log stats for debugging
    console.log(`[Dashboard] Stats for user ${userId}:`, {
      problemsSolved: userStats?.problems_solved || 0,
      dayStreak,
      towersUnlocked,
      globalRank,
      coins: userStats?.coins || 0,
      xp: userStats?.xp || 0
    });

    res.json({
      // Main dashboard stats
      problemsSolved: userStats?.problems_solved || 0,
      dayStreak: dayStreak,
      towersUnlocked: towersUnlocked,
      globalRank: globalRank,
      rankScore: rankScore,
      // User stats (for top bar)
      xp: userStats?.xp || 0,
      level: userStats?.level || Math.floor((userStats?.xp || 0) / 100) + 1,
      coins: userStats?.coins || 0,
      gamesPlayed: userStats?.games_played || 0,
      wins: userStats?.wins || 0,
      // Also include camelCase versions for frontend compatibility
      problems_solved: userStats?.problems_solved || 0,
      games_played: userStats?.games_played || 0
    });
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get daily challenge/problem of the day
 * GET /api/dashboard/daily-challenge
 */
/**
 * Get XP activity history for the chart
 * GET /api/dashboard/xp-history/:userId
 */
export const getXPHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const { days = 7 } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const supabase = database.getSupabaseClient();
    
    // Generate dates for the last N days
    const dateLabels = [];
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      dateLabels.push(date.toISOString().split('T')[0]);
    }

    // Initialize XP data with zeros
    const xpByDate = {};
    dateLabels.forEach(date => {
      xpByDate[date] = 0;
    });

    if (supabase) {
      try {
        // Get submissions from the last N days
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() - (days - 1));
        startDate.setHours(0, 0, 0, 0);

        const { data: submissions, error } = await supabase
          .from('submissions')
          .select('submitted_at, verdict, score')
          .eq('user_id', userId)
          .gte('submitted_at', startDate.toISOString())
          .order('submitted_at', { ascending: true });

        if (!error && submissions) {
          // Calculate XP from accepted submissions
          submissions.forEach(sub => {
            if (sub.verdict === 'accepted' || sub.verdict === 'Accepted') {
              const date = new Date(sub.submitted_at).toISOString().split('T')[0];
              if (xpByDate[date] !== undefined) {
                // Base XP per problem solved (can be adjusted)
                xpByDate[date] += sub.score || 20;
              }
            }
          });
        }

        // Also try to get from user_activity table if it exists
        try {
          const { data: activities } = await supabase
            .from('user_activity')
            .select('created_at, xp_earned, activity_type')
            .eq('user_id', userId)
            .gte('created_at', startDate.toISOString());

          if (activities) {
            activities.forEach(activity => {
              const date = new Date(activity.created_at).toISOString().split('T')[0];
              if (xpByDate[date] !== undefined && activity.xp_earned) {
                xpByDate[date] += activity.xp_earned;
              }
            });
          }
        } catch (activityError) {
          // user_activity table might not exist, ignore
        }
      } catch (dbError) {
        console.warn('Error fetching XP history from database:', dbError.message);
      }
    }

    // Format response for chart
    const history = dateLabels.map(date => ({
      date,
      dayName: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
      xp: xpByDate[date]
    }));

    // Calculate totals
    const totalXP = Object.values(xpByDate).reduce((sum, xp) => sum + xp, 0);
    const avgXP = Math.round(totalXP / days);

    res.json({
      history,
      summary: {
        totalXP,
        avgXP,
        days: parseInt(days),
        activeDays: Object.values(xpByDate).filter(xp => xp > 0).length
      }
    });
  } catch (error) {
    console.error('Error getting XP history:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getDailyChallenge = async (req, res) => {
  try {
    // Support both route param and query param for userId
    const userId = req.params.userId || req.query.userId; // Optional: to check if user has completed it
    
    // Get today's challenge using the service
    let challenge = await dailyChallengeService.getTodaysChallenge();
    
    // If no challenge, try to create one
    if (!challenge) {
      console.log('No daily challenge found, attempting to create one...');
      // Clear cache and try again
      dailyChallengeService.todayChallenge = null;
      dailyChallengeService.todayDate = null;
      challenge = await dailyChallengeService.getTodaysChallenge();
    }

    if (!challenge) {
      // Last resort: return a fallback challenge
      console.warn('Could not create daily challenge, returning fallback');
      return res.json({
        problem: {
          id: null,
          displayId: 1,
          title: 'Daily Challenge Not Available',
          description: 'Check back later for today\'s challenge!',
          difficulty: 'medium',
          tags: [],
          category: 'Algorithm',
          firstTag: 'Algorithm'
        },
        challenge: {
          id: null,
          bonusXp: 100,
          bonusGold: 50,
          completed: false,
        },
        expiresAt: new Date().toISOString(),
        expiresIn: '0h 0m',
        rewards: { xp: 100, coins: 50 }
      });
    }

    // Get problem details
    let problemDetails = await database.getProblemById(challenge.problem_id);
    
    if (!problemDetails) {
      console.warn(`Daily challenge problem not found: ${challenge.problem_id}`);
      // Try to get any random problem instead
      const allProblems = await database.getAllProblems({});
      const runnableProblems = allProblems.filter(p => {
        const hasVisible = p.testCases && Array.isArray(p.testCases) && p.testCases.length > 0;
        const hasHidden = p.hiddenTestCases && Array.isArray(p.hiddenTestCases) && p.hiddenTestCases.length > 0;
        return hasVisible || hasHidden;
      });
      
      if (runnableProblems.length > 0) {
        problemDetails = runnableProblems[0];
        challenge.problem_id = problemDetails.id;
      } else {
        return res.status(404).json({ error: 'No problems available for daily challenge' });
      }
    }

    // Check if user has completed it (if userId provided)
    let completed = false;
    if (userId) {
      completed = await dailyChallengeService.hasCompletedTodaysChallenge(userId);
    }

    // Calculate expiration time (end of today in UTC)
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0, 0);
    const expirationTime = new Date(today);
    expirationTime.setUTCHours(23, 59, 59, 999);
    const now = new Date();
    const timeUntilExpiration = expirationTime - now;
    const hoursUntilExpiration = Math.floor(timeUntilExpiration / (1000 * 60 * 60));
    const minutesUntilExpiration = Math.floor((timeUntilExpiration % (1000 * 60 * 60)) / (1000 * 60));

    // Get displayId
    const displayId = problemDetails.displayId || problemDetails.problemNumber || problemDetails.id;

    // Get first tag or category for display
    const firstTag = (problemDetails.tags && problemDetails.tags.length > 0) 
      ? (typeof problemDetails.tags[0] === 'string' ? problemDetails.tags[0] : problemDetails.tags[0].name || problemDetails.tags[0])
      : (problemDetails.category || 'Algorithm');

    res.json({
      problem: {
        id: problemDetails.id,
        displayId: displayId,
        title: problemDetails.title,
        description: problemDetails.description || problemDetails.title,
        difficulty: problemDetails.difficulty,
        tags: problemDetails.tags || [],
        category: problemDetails.category || firstTag,
        firstTag: firstTag
      },
      challenge: {
        id: challenge.id,
        bonusXp: challenge.bonus_xp || 100,
        bonusGold: challenge.bonus_gold || 50,
        completed: completed,
      },
      expiresAt: expirationTime.toISOString(),
      expiresIn: `${hoursUntilExpiration}h ${minutesUntilExpiration}m`,
      rewards: {
        xp: challenge.bonus_xp || 100,
        coins: challenge.bonus_gold || 50
      }
    });
  } catch (error) {
    console.error('Error getting daily challenge:', error);
    res.status(500).json({ error: error.message });
  }
};

