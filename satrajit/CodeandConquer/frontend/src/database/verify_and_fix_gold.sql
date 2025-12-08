-- Verify and fix gold for all users
-- Run this in Supabase SQL Editor to check and update gold

-- Step 1: Check current state
SELECT 
  'Current State' as step,
  COUNT(*) as total_users,
  COUNT(CASE WHEN coins >= 10000 THEN 1 END) as users_with_10k_plus,
  COUNT(CASE WHEN coins < 10000 THEN 1 END) as users_below_10k,
  AVG(coins) as avg_coins,
  MIN(coins) as min_coins,
  MAX(coins) as max_coins
FROM user_stats;

-- Step 2: Show users who need gold update
SELECT 
  id,
  coins as current_coins,
  (coins + 10000) as new_coins,
  xp,
  level
FROM user_stats
WHERE coins < 10000
ORDER BY coins DESC
LIMIT 20;

-- Step 3: Update all users to have at least 10,000 gold
-- This adds 10,000 to existing coins (so if someone has 500, they'll have 10,500)
UPDATE user_stats 
SET coins = COALESCE(coins, 0) + 10000
WHERE coins < 10000 OR coins IS NULL;

-- Step 4: Verify the update
SELECT 
  'After Update' as step,
  COUNT(*) as total_users,
  COUNT(CASE WHEN coins >= 10000 THEN 1 END) as users_with_10k_plus,
  AVG(coins) as avg_coins,
  MIN(coins) as min_coins,
  MAX(coins) as max_coins
FROM user_stats;

-- Step 5: Show sample of updated users
SELECT 
  id,
  coins,
  xp,
  level,
  updated_at
FROM user_stats
ORDER BY updated_at DESC
LIMIT 10;

