-- Comprehensive Fix Script for All Issues
-- Run this in Supabase SQL Editor
-- This script fixes issues for ALL users, not just one

-- 1. Create user_stats for ALL users who don't have it yet
INSERT INTO user_stats (id, coins, xp, level, problems_solved, games_played, wins)
SELECT 
  u.id,
  COALESCE((SELECT coins FROM user_stats WHERE id = u.id), 10000) AS coins, -- Give 10k if new, keep existing if exists
  0 AS xp,
  1 AS level,
  0 AS problems_solved,
  0 AS games_played,
  0 AS wins
FROM auth.users u
LEFT JOIN user_stats us ON u.id = us.id
WHERE us.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 2. Give 10k coins to all existing users who have less than 10k
UPDATE user_stats
SET 
  coins = GREATEST(coins, 10000),
  updated_at = NOW()
WHERE coins < 10000;

-- 3. Summary: Show how many users have stats now
SELECT 
  COUNT(DISTINCT u.id) as total_users,
  COUNT(DISTINCT us.id) as users_with_stats,
  COUNT(DISTINCT u.id) - COUNT(DISTINCT us.id) as users_without_stats,
  AVG(us.coins) as avg_coins,
  MIN(us.coins) as min_coins,
  MAX(us.coins) as max_coins
FROM auth.users u
LEFT JOIN user_stats us ON u.id = us.id;

-- 3. Disable RLS on user_progress (remove all security policies)
ALTER TABLE user_progress DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies on user_progress
DROP POLICY IF EXISTS "Users can view own progress" ON user_progress;
DROP POLICY IF EXISTS "Users can insert own progress" ON user_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON user_progress;
DROP POLICY IF EXISTS "System can insert user progress" ON user_progress;

-- 4. Create base_upgrades table if it doesn't exist (from base_upgrades_schema.sql)
CREATE TABLE IF NOT EXISTS base_upgrades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  base_level INTEGER DEFAULT 1 NOT NULL CHECK (base_level >= 1 AND base_level <= 10),
  total_upgrades INTEGER DEFAULT 0 NOT NULL,
  last_upgrade_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_base_upgrades_user_id ON base_upgrades(user_id);

-- Disable RLS on base_upgrades (remove all security policies)
ALTER TABLE base_upgrades DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies on base_upgrades
DROP POLICY IF EXISTS "Users can view own base upgrades" ON base_upgrades;
DROP POLICY IF EXISTS "Users can insert own base upgrades" ON base_upgrades;
DROP POLICY IF EXISTS "Users can update own base upgrades" ON base_upgrades;

-- 5. Create subscriptions table if it doesn't exist
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'inactive',
  plan VARCHAR(50) DEFAULT 'free',
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);

-- Disable RLS on subscriptions (remove all security policies)
ALTER TABLE subscriptions DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies on subscriptions
DROP POLICY IF EXISTS "Users can view own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can insert own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can update own subscriptions" ON subscriptions;

-- 6. Disable RLS on user_stats (remove all security policies)
ALTER TABLE user_stats DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies on user_stats
DROP POLICY IF EXISTS "Users can view own stats" ON user_stats;
DROP POLICY IF EXISTS "Users can update own stats" ON user_stats;
DROP POLICY IF EXISTS "System can insert user stats" ON user_stats;

-- 7. Disable RLS on any other common tables (if they exist)
-- profiles table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
    -- Drop all policies (they vary, so we'll drop common ones)
    DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
    DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
    DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
    DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
  END IF;
END $$;

-- 8. Final summary of all tables
SELECT 
  'user_stats' as table_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT id) as unique_users
FROM user_stats
UNION ALL
SELECT 
  'base_upgrades' as table_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT user_id) as unique_users
FROM base_upgrades
UNION ALL
SELECT 
  'subscriptions' as table_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT user_id) as unique_users
FROM subscriptions
UNION ALL
SELECT 
  'user_progress' as table_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT user_id) as unique_users
FROM user_progress;

