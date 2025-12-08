-- Comprehensive Fix Script for All Issues
-- Run this in Supabase SQL Editor

-- 1. Ensure user_stats exists for the specific user and give them 10k coins
INSERT INTO user_stats (id, coins, xp, level, problems_solved, games_played, wins)
VALUES (
  'd14f3b48-b889-450f-a792-eef12ed36476',
  10000,
  0,
  1,
  0,
  0,
  0
)
ON CONFLICT (id) DO UPDATE
SET 
  coins = GREATEST(user_stats.coins, 10000),
  updated_at = NOW();

-- 2. Verify user_stats was created/updated
SELECT id, coins, xp, level, updated_at 
FROM user_stats 
WHERE id = 'd14f3b48-b889-450f-a792-eef12ed36476';

-- 3. Fix user_progress RLS to allow service role inserts
-- Drop existing policies
DROP POLICY IF EXISTS "System can insert user progress" ON user_progress;

-- Create policy that allows service role (backend) to insert
CREATE POLICY "System can insert user progress"
  ON user_progress
  FOR INSERT
  WITH CHECK (true);

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

-- Enable RLS
ALTER TABLE base_upgrades ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own base upgrades" ON base_upgrades;
DROP POLICY IF EXISTS "Users can insert own base upgrades" ON base_upgrades;
DROP POLICY IF EXISTS "Users can update own base upgrades" ON base_upgrades;

-- Create RLS policies
CREATE POLICY "Users can view own base upgrades"
  ON base_upgrades
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own base upgrades"
  ON base_upgrades
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own base upgrades"
  ON base_upgrades
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

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

-- Enable RLS for subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can insert own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can update own subscriptions" ON subscriptions;

-- Create RLS policies for subscriptions
CREATE POLICY "Users can view own subscriptions"
  ON subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions"
  ON subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions"
  ON subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 6. Summary query
SELECT 
  'user_stats' as table_name,
  COUNT(*) as record_count,
  SUM(CASE WHEN id = 'd14f3b48-b889-450f-a792-eef12ed36476' THEN 1 ELSE 0 END) as target_user_exists
FROM user_stats
UNION ALL
SELECT 
  'base_upgrades' as table_name,
  COUNT(*) as record_count,
  SUM(CASE WHEN user_id = 'd14f3b48-b889-450f-a792-eef12ed36476' THEN 1 ELSE 0 END) as target_user_exists
FROM base_upgrades
UNION ALL
SELECT 
  'subscriptions' as table_name,
  COUNT(*) as record_count,
  SUM(CASE WHEN user_id = 'd14f3b48-b889-450f-a792-eef12ed36476' THEN 1 ELSE 0 END) as target_user_exists
FROM subscriptions;

