import publicDatabaseService from '../services/publicDatabaseService.js';
import database from '../config/database.js';
import authDatabaseService from '../services/authDatabaseService.js';
import { PUBLIC_TABLES } from '../config/supabasePublicSchema.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Get leaderboard
 * GET /api/leaderboard?type=global&limit=100
 */
export const getLeaderboard = async (req, res) => {
  try {
    const { type = 'global', limit = 100 } = req.query;

    if (!publicDatabaseService.isAvailable()) {
      // Return empty array if database is not available
      return res.json([]);
    }

    const supabase = database.getSupabaseClient();
    if (!supabase) {
      return res.json([]);
    }

    // Get ALL users from profiles or auth.users table
    let allUsers = [];
    try {
      // Try to get from profiles table first
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .limit(10000); // Get all profiles
      
      if (profilesError) {
        console.warn('Error fetching profiles:', profilesError.message);
      }
      
      if (profiles && profiles.length > 0) {
        allUsers = profiles;
      } else {
        // Fallback to auth.users table via Supabase Admin API if profiles doesn't exist or is empty
        try {
          // Use Supabase Admin API - create admin client if needed
          // The service role key should have admin access
          const adminClient = supabase;
          if (adminClient && adminClient.auth && adminClient.auth.admin) {
            const { data: authUsersData, error: authError } = await adminClient.auth.admin.listUsers();
            
            if (!authError && authUsersData && authUsersData.users) {
              allUsers = authUsersData.users.map(user => ({
                id: user.id,
                username: user.user_metadata?.username || user.email?.split('@')[0] || 'Anonymous',
                avatar_url: user.user_metadata?.avatar_url || null
              }));
            }
          } else if (authDatabaseService.isAvailable()) {
            // Fallback: Use authDatabaseService to get users
            // Note: This uses a different method - listUsers from admin API
            try {
              // We'll need to get users via the profiles table or another method
              // For now, just log that we couldn't get users
              console.warn('Admin API not available, cannot fetch all users from auth.users');
            } catch (e) {
              console.warn('Error fetching users:', e.message);
            }
          }
        } catch (error) {
          console.warn('Could not fetch users from auth.users:', error.message);
        }
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      // Continue with empty array - will return empty leaderboard
    }

    // Get or create leaderboard entries for all users
    const leaderboardEntries = await Promise.all(
      allUsers.map(async (user) => {
        try {
          // Get user stats (may not exist for new users)
          let userStats = null;
          try {
            const { data, error } = await supabase
              .from('user_stats')
              .select('*')
              .eq('user_id', user.id)
              .single();
            if (!error) {
              userStats = data;
            }
          } catch (error) {
            // User stats don't exist yet - that's ok, use defaults
            userStats = null;
          }

          // Calculate leaderboard score (XP + problems solved * 10)
          const score = (userStats?.xp || 0) + ((userStats?.problems_solved || 0) * 10);

          // Get or create leaderboard entry
          let leaderboardEntry = await publicDatabaseService.query(PUBLIC_TABLES.LEADERBOARDS, {
            where: { user_id: user.id, leaderboard_type: type }
          }).then(results => results[0]);

          if (!leaderboardEntry) {
            // Create new leaderboard entry with score 0 if user has no stats
            try {
              // Insert without created_at since the table might not have that column
              const leaderboardData = {
                id: uuidv4(),
                user_id: user.id,
                leaderboard_type: type,
                score: score,
                updated_at: new Date().toISOString()
              };
              
              leaderboardEntry = await publicDatabaseService.insert(PUBLIC_TABLES.LEADERBOARDS, leaderboardData);
              
              // If insert returns null (table doesn't exist), create default entry
              if (!leaderboardEntry) {
                leaderboardEntry = {
                  user_id: user.id,
                  leaderboard_type: type,
                  score: score
                };
              }
            } catch (error) {
              // Silently handle all errors - just use default entry
              // Common errors: RLS violations (42501), table/column not found (PGRST204/205, 42P01)
              leaderboardEntry = {
                user_id: user.id,
                leaderboard_type: type,
                score: score
              };
            }
          } else {
            // Update score if it's different
            if (leaderboardEntry.score !== score) {
              try {
                const updated = await publicDatabaseService.update(PUBLIC_TABLES.LEADERBOARDS, leaderboardEntry.id, {
                  score: score,
                  updated_at: new Date().toISOString()
                });
                if (updated) {
                  leaderboardEntry = updated;
                }
              } catch (error) {
                // Silently handle all update errors
              }
            }
          }

          return {
            rank: 0, // Will be set after sorting
            userId: user.id,
            username: user.username || user.id?.split('@')[0] || 'Anonymous',
            avatar: user.avatar_url || null,
            score: leaderboardEntry.score || score || 0,
            xp: userStats?.xp || 0,
            level: userStats?.level || 1,
            problemsSolved: userStats?.problems_solved || 0,
            wins: userStats?.wins || 0,
            gamesPlayed: userStats?.games_played || 0,
          };
        } catch (error) {
          console.error(`Error processing user ${user.id}:`, error);
          // Return default entry on error
          return {
            rank: 0,
            userId: user.id,
            username: user.username || user.id?.split('@')[0] || 'Anonymous',
            avatar: user.avatar_url || null,
            score: 0,
            xp: 0,
            level: 1,
            problemsSolved: 0,
            wins: 0,
            gamesPlayed: 0,
          };
        }
      })
    );

    // Get existing leaderboard entries for users not in allUsers
    let existingLeaderboard = [];
    try {
      existingLeaderboard = await publicDatabaseService.getLeaderboard(type, 10000); // Get all entries
    } catch (error) {
      console.warn('Error getting existing leaderboard:', error.message);
    }

    // Merge and deduplicate
    const leaderboardMap = new Map();
    
    // Add entries from all users
    leaderboardEntries.forEach(entry => {
      leaderboardMap.set(entry.userId, entry);
    });
    
    // Add entries from existing leaderboard that aren't in allUsers
    existingLeaderboard.forEach(entry => {
      if (!leaderboardMap.has(entry.user_id)) {
        leaderboardMap.set(entry.user_id, {
          rank: 0,
          userId: entry.user_id,
          username: entry.user_id?.split('@')[0] || 'Anonymous',
          avatar: null,
          score: entry.score || 0,
          xp: 0,
          level: 1,
          problemsSolved: 0,
          wins: 0,
          gamesPlayed: 0,
        });
      }
    });

    // Convert map to array and sort by score
    let enrichedLeaderboard = Array.from(leaderboardMap.values());
    enrichedLeaderboard.sort((a, b) => b.score - a.score);

    // Add rank numbers
    enrichedLeaderboard.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    // Limit results
    enrichedLeaderboard = enrichedLeaderboard.slice(0, parseInt(limit));

    res.json(enrichedLeaderboard);
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get user's leaderboard position
 * GET /api/leaderboard/user/:userId
 */
export const getUserLeaderboardPosition = async (req, res) => {
  try {
    const { userId } = req.params;
    const { type = 'global' } = req.query;

    if (!publicDatabaseService.isAvailable()) {
      return res.json({ rank: null, score: 0 });
    }

    // Get leaderboard
    const leaderboard = await publicDatabaseService.getLeaderboard(type, 10000); // Get all entries

    // Find user's position
    const userIndex = leaderboard.findIndex(entry => entry.user_id === userId);
    
    if (userIndex === -1) {
      return res.json({ rank: null, score: 0 });
    }

    const userEntry = leaderboard[userIndex];
    
    // Get user stats
    const supabase = database.getSupabaseClient();
    if (!supabase) {
      return res.json({
        rank: userIndex + 1,
        score: userEntry.score || 0,
      });
    }

    const { data: userStats } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    const { data: profile } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', userId)
      .single();

    res.json({
      rank: userIndex + 1,
      score: userEntry.score || 0,
      xp: userStats?.xp || 0,
      level: userStats?.level || 1,
      problemsSolved: userStats?.problems_solved || 0,
      wins: userStats?.wins || 0,
      username: profile?.username || userId?.split('@')[0] || 'Anonymous',
      avatar: profile?.avatar_url || null,
    });
  } catch (error) {
    console.error('Error getting user leaderboard position:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Update leaderboard (usually called internally after submissions/matches)
 * POST /api/leaderboard/update
 */
export const updateLeaderboard = async (req, res) => {
  try {
    const { userId, type = 'global', score } = req.body;

    if (!userId || score === undefined) {
      return res.status(400).json({ error: 'userId and score are required' });
    }

    if (!publicDatabaseService.isAvailable()) {
      return res.json({ success: true, message: 'Leaderboard update skipped (no database)' });
    }

    await publicDatabaseService.updateLeaderboard(userId, type, score);

    res.json({ success: true, message: 'Leaderboard updated' });
  } catch (error) {
    console.error('Error updating leaderboard:', error);
    res.status(500).json({ error: error.message });
  }
};

