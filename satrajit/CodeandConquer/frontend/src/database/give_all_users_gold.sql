-- SQL script to give all users 10,000 gold
-- Run this in Supabase SQL Editor

-- Update all user_stats records to add 10,000 gold
UPDATE user_stats 
SET coins = COALESCE(coins, 0) + 10000;

-- Verify the update
SELECT 
  id,
  coins,
  updated_at
FROM user_stats
ORDER BY updated_at DESC
LIMIT 10;

