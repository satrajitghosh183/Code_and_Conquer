-- SQL script to give all users 10,000 gold
-- Run this in Supabase SQL Editor
-- IMPORTANT: Run database/initialize_existing_users_stats.sql first if user_stats doesn't exist for all users

-- First, ensure all users have user_stats entries
INSERT INTO user_stats (id, coins, xp, level, problems_solved, games_played, wins)
SELECT 
  u.id,
  0 AS coins,
  0 AS xp,
  1 AS level,
  0 AS problems_solved,
  0 AS games_played,
  0 AS wins
FROM auth.users u
LEFT JOIN user_stats us ON u.id = us.id
WHERE us.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Update all user_stats records to add 10,000 gold
UPDATE user_stats 
SET coins = COALESCE(coins, 0) + 10000;

-- Verify the update
SELECT 
  id,
  coins,
  xp,
  level,
  updated_at
FROM user_stats
ORDER BY updated_at DESC
LIMIT 10;

-- Show summary
SELECT 
  COUNT(*) as total_users_with_stats,
  SUM(coins) as total_coins,
  AVG(coins) as avg_coins,
  MIN(coins) as min_coins,
  MAX(coins) as max_coins
FROM user_stats;

