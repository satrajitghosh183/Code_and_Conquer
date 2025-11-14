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
        problemsSolved: 0,
        gamesPlayed: 0,
        wins: 0
      });
    }

    const { data, error } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', req.params.userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    res.json(data || {
      coins: 0,
      xp: 0,
      level: 1,
      problemsSolved: 0,
      gamesPlayed: 0,
      wins: 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user stats (add coins, XP, etc.)
router.post('/:userId/stats/update', async (req, res) => {
  try {
    const { coins, xp, problemsSolved, gamesPlayed, wins } = req.body;

    if (!supabase) {
      return res.json({ success: true, message: 'Stats update skipped (no database)' });
    }

    const { data: existing } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', req.params.userId)
      .single();

    const updates = {
      user_id: req.params.userId,
      coins: (existing?.coins || 0) + (coins || 0),
      xp: (existing?.xp || 0) + (xp || 0),
      problems_solved: (existing?.problems_solved || 0) + (problemsSolved || 0),
      games_played: (existing?.games_played || 0) + (gamesPlayed || 0),
      wins: (existing?.wins || 0) + (wins || 0),
      updated_at: new Date().toISOString()
    };

    // Calculate level from XP (100 XP per level)
    updates.level = Math.floor(updates.xp / 100) + 1;

    if (existing) {
      const { error } = await supabase
        .from('user_stats')
        .update(updates)
        .eq('user_id', req.params.userId);
      
      if (error) throw error;
    } else {
      updates.created_at = new Date().toISOString();
      const { error } = await supabase
        .from('user_stats')
        .insert(updates);
      
      if (error) throw error;
    }

    res.json({ success: true, stats: updates });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

