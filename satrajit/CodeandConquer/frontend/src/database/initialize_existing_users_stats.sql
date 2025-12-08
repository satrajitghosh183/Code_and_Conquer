-- Initialize user_stats for all existing users who don't have stats yet
-- Run this after creating the user_stats table

-- Insert user_stats for all auth.users who don't have stats yet
INSERT INTO user_stats (id, coins, xp, level, problems_solved, games_played, wins)
SELECT 
  u.id,
  0 AS coins,  -- Initial coins
  0 AS xp,     -- Initial XP
  1 AS level,  -- Initial level
  0 AS problems_solved,
  0 AS games_played,
  0 AS wins
FROM auth.users u
LEFT JOIN user_stats us ON u.id = us.id
WHERE us.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Verify the insert
SELECT 
  COUNT(*) as total_users,
  COUNT(us.id) as users_with_stats,
  COUNT(*) - COUNT(us.id) as users_without_stats
FROM auth.users u
LEFT JOIN user_stats us ON u.id = us.id;

