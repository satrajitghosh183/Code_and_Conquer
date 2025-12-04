import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('Supabase credentials not configured. User routes will be limited.');
}

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

// Get user game stats
router.get('/:userId/stats', async (req, res) => {
  try {
    if (!supabase) {
      return res.json({
        coins: 0,
        xp: 0,
        level: 1,
        problems_solved: 0,
        games_played: 0,
        wins: 0
      });
    }

    const { data, error } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', req.params.userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = row not found, which is OK for new users
      console.error('Error fetching user stats:', error);
      throw error;
    }

    // Return stats with both snake_case and camelCase for compatibility
    const stats = data || {};
    res.json({
      // Original snake_case from database
      coins: stats.coins || 0,
      xp: stats.xp || 0,
      level: stats.level || Math.floor((stats.xp || 0) / 100) + 1,
      problems_solved: stats.problems_solved || 0,
      games_played: stats.games_played || 0,
      wins: stats.wins || 0,
      // Also include camelCase for frontend compatibility
      problemsSolved: stats.problems_solved || 0,
      gamesPlayed: stats.games_played || 0
    });
  } catch (error) {
    console.error('Error in GET user stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update user stats (add coins, XP, etc.)
router.post('/:userId/stats/update', async (req, res) => {
  try {
    // Support both snake_case and camelCase field names
    const { 
      coins, 
      xp, 
      problemsSolved, problems_solved,
      gamesPlayed, games_played,
      wins 
    } = req.body;

    // Normalize to snake_case for database
    const problemsSolvedDelta = problemsSolved || problems_solved || 0;
    const gamesPlayedDelta = gamesPlayed || games_played || 0;

    if (!supabase) {
      return res.json({ success: true, message: 'Stats update skipped (no database)' });
    }

    const { data: existing, error: fetchError } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', req.params.userId)
      .single();

    // Ignore "row not found" errors - that just means new user
    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching existing stats:', fetchError);
    }

    const updates = {
      user_id: req.params.userId,
      coins: Math.max(0, (existing?.coins || 0) + (coins || 0)),
      xp: Math.max(0, (existing?.xp || 0) + (xp || 0)),
      problems_solved: Math.max(0, (existing?.problems_solved || 0) + problemsSolvedDelta),
      games_played: Math.max(0, (existing?.games_played || 0) + gamesPlayedDelta),
      wins: Math.max(0, (existing?.wins || 0) + (wins || 0)),
      updated_at: new Date().toISOString()
    };

    // Calculate level from XP (100 XP per level)
    updates.level = Math.floor(updates.xp / 100) + 1;

    let result;
    if (existing) {
      const { data, error } = await supabase
        .from('user_stats')
        .update(updates)
        .eq('user_id', req.params.userId)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating user stats:', error);
        throw error;
      }
      result = data;
    } else {
      updates.created_at = new Date().toISOString();
      const { data, error } = await supabase
        .from('user_stats')
        .insert(updates)
        .select()
        .single();
      
      if (error) {
        console.error('Error inserting user stats:', error);
        throw error;
      }
      result = data;
    }

    res.json({ 
      success: true, 
      stats: {
        ...result,
        // Also include camelCase for frontend compatibility
        problemsSolved: result?.problems_solved || 0,
        gamesPlayed: result?.games_played || 0
      }
    });
  } catch (error) {
    console.error('Error in POST user stats update:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
