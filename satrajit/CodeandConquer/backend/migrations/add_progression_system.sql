-- Migration: Add Progression System
-- This migration adds support for heroes, tech tree, and enhanced progression

-- Add new columns to user_progress table
ALTER TABLE user_progress
ADD COLUMN IF NOT EXISTS selected_hero TEXT DEFAULT 'python',
ADD COLUMN IF NOT EXISTS unlocked_heroes TEXT[] DEFAULT ARRAY['python', 'javascript'],
ADD COLUMN IF NOT EXISTS tech_tree JSONB DEFAULT '{
  "passiveGold": 0,
  "startingGold": 0,
  "troopHealth": 0,
  "troopDamage": 0,
  "towerRange": 0,
  "towerFireRate": 0,
  "abilityCooldown": 0,
  "unlockBasicTroops": 1,
  "unlockAdvancedTroops": 0,
  "unlockEliteTroops": 0,
  "baseDefense": 0
}'::JSONB,
ADD COLUMN IF NOT EXISTS available_tech_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS lifetime_problems_solved INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS lifetime_wins INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS lifetime_gold_earned INTEGER DEFAULT 0;

-- Create index on selected_hero for faster queries
CREATE INDEX IF NOT EXISTS idx_user_progress_selected_hero ON user_progress(selected_hero);

-- Create index on unlocked_heroes for array operations
CREATE INDEX IF NOT EXISTS idx_user_progress_unlocked_heroes ON user_progress USING GIN(unlocked_heroes);

-- Create index on tech_tree for JSONB queries
CREATE INDEX IF NOT EXISTS idx_user_progress_tech_tree ON user_progress USING GIN(tech_tree);

-- Create table for match history with detailed stats
CREATE TABLE IF NOT EXISTS match_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  opponent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  result TEXT NOT NULL CHECK (result IN ('win', 'loss', 'draw')),
  hero_used TEXT NOT NULL,
  gold_earned INTEGER DEFAULT 0,
  damage_dealt INTEGER DEFAULT 0,
  towers_placed INTEGER DEFAULT 0,
  troops_deployed INTEGER DEFAULT 0,
  problems_solved INTEGER DEFAULT 0,
  xp_gained INTEGER DEFAULT 0,
  duration_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for match_history
CREATE INDEX IF NOT EXISTS idx_match_history_user_id ON match_history(user_id);
CREATE INDEX IF NOT EXISTS idx_match_history_match_id ON match_history(match_id);
CREATE INDEX IF NOT EXISTS idx_match_history_created_at ON match_history(created_at DESC);

-- Create table for daily challenges
CREATE TABLE IF NOT EXISTS daily_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id UUID REFERENCES problems(id) ON DELETE CASCADE,
  challenge_date DATE NOT NULL UNIQUE,
  bonus_xp INTEGER DEFAULT 100,
  bonus_gold INTEGER DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on challenge_date
CREATE INDEX IF NOT EXISTS idx_daily_challenges_date ON daily_challenges(challenge_date DESC);

-- Create table for user daily challenge completions
CREATE TABLE IF NOT EXISTS user_daily_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id UUID REFERENCES daily_challenges(id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, challenge_id)
);

-- Create indexes for user_daily_completions
CREATE INDEX IF NOT EXISTS idx_user_daily_completions_user_id ON user_daily_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_daily_completions_challenge_id ON user_daily_completions(challenge_id);

-- Create table for power-ups and abilities
CREATE TABLE IF NOT EXISTS user_powerups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  powerup_type TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, powerup_type)
);

-- Create index on user_powerups
CREATE INDEX IF NOT EXISTS idx_user_powerups_user_id ON user_powerups(user_id);

-- Create function to calculate level from XP
CREATE OR REPLACE FUNCTION calculate_level(total_xp INTEGER)
RETURNS INTEGER AS $$
DECLARE
  level INTEGER := 1;
  xp_needed INTEGER := 0;
  xp_for_next INTEGER;
BEGIN
  WHILE total_xp >= xp_needed LOOP
    level := level + 1;
    xp_for_next := 50 + (level * 50);
    xp_needed := xp_needed + xp_for_next;
  END LOOP;
  
  RETURN level - 1;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to get user level
CREATE OR REPLACE FUNCTION get_user_level(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  user_xp INTEGER;
BEGIN
  SELECT total_xp INTO user_xp
  FROM user_progress
  WHERE user_id = user_uuid;
  
  IF user_xp IS NULL THEN
    RETURN 1;
  END IF;
  
  RETURN calculate_level(user_xp);
END;
$$ LANGUAGE plpgsql STABLE;

-- Add computed column for level (virtual column updated via trigger)
ALTER TABLE user_progress
ADD COLUMN IF NOT EXISTS computed_level INTEGER DEFAULT 1;

-- Create trigger to update computed_level when total_xp changes
CREATE OR REPLACE FUNCTION update_computed_level()
RETURNS TRIGGER AS $$
BEGIN
  NEW.computed_level := calculate_level(NEW.total_xp);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_computed_level
BEFORE INSERT OR UPDATE OF total_xp ON user_progress
FOR EACH ROW
EXECUTE FUNCTION update_computed_level();

-- Update existing rows to have computed_level
UPDATE user_progress SET computed_level = calculate_level(total_xp);

-- Create view for user stats with level
CREATE OR REPLACE VIEW user_stats_with_level AS
SELECT 
  up.*,
  calculate_level(up.total_xp) as level,
  CASE 
    WHEN calculate_level(up.total_xp) >= 40 THEN 'Master'
    WHEN calculate_level(up.total_xp) >= 25 THEN 'Expert'
    WHEN calculate_level(up.total_xp) >= 15 THEN 'Advanced'
    WHEN calculate_level(up.total_xp) >= 8 THEN 'Intermediate'
    ELSE 'Beginner'
  END as coding_level_computed
FROM user_progress up;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON match_history TO authenticated;
GRANT SELECT ON daily_challenges TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_daily_completions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_powerups TO authenticated;
GRANT SELECT ON user_stats_with_level TO authenticated;

-- Comments
COMMENT ON TABLE match_history IS 'Detailed history of all matches played by users';
COMMENT ON TABLE daily_challenges IS 'Daily coding challenges with bonus rewards';
COMMENT ON TABLE user_daily_completions IS 'Tracks which users completed which daily challenges';
COMMENT ON TABLE user_powerups IS 'User-owned power-ups and temporary abilities';
COMMENT ON FUNCTION calculate_level IS 'Calculates user level from total XP';
COMMENT ON FUNCTION get_user_level IS 'Returns the computed level for a user';

