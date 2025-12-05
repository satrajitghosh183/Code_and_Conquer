-- Schema Verification SQL
-- Verifies all 34 tables exist with correct structure
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. Check All Tables Exist
-- ============================================

SELECT 
  table_name,
  CASE 
    WHEN table_name IN (
      'profiles', 'users', 'user_progress', 'user_stats', 'user_settings', 
      'user_achievements', 'user_activity', 'problems', 'test_cases', 
      'problem_versions', 'submissions', 'matches', 'match_history', 
      'match_results', 'game_actions', 'towers', 'player_inventory', 
      'user_powerups', 'leaderboards', 'achievements', 'customers', 
      'subscriptions', 'transactions', 'entitlements', 'content_modules', 
      'user_module_progress', 'daily_challenges', 'user_daily_completions', 
      'video_ads', 'ad_impressions', 'ad_interactions', 'event_logs', 
      'tasks', 'task_integrations'
    ) THEN 'EXISTS'
    ELSE 'MISSING'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- ============================================
-- 2. Get Complete Table Structure
-- ============================================

SELECT 
  t.table_name,
  c.column_name,
  c.data_type,
  c.character_maximum_length,
  c.is_nullable,
  c.column_default,
  c.ordinal_position
FROM information_schema.tables t
JOIN information_schema.columns c 
  ON t.table_schema = c.table_schema 
  AND t.table_name = c.table_name
WHERE t.table_schema = 'public'
  AND t.table_name IN (
    'profiles', 'user_progress', 'user_stats', 'problems', 'test_cases',
    'submissions', 'matches', 'match_history', 'content_modules',
    'user_module_progress', 'daily_challenges', 'video_ads', 'leaderboards'
  )
ORDER BY t.table_name, c.ordinal_position;

-- ============================================
-- 3. Check Primary Keys
-- ============================================

SELECT
  tc.table_name,
  kcu.column_name,
  tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'PRIMARY KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- ============================================
-- 4. Check Foreign Keys
-- ============================================

SELECT
  tc.table_name AS from_table,
  kcu.column_name AS from_column,
  ccu.table_name AS to_table,
  ccu.column_name AS to_column,
  tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- ============================================
-- 5. Check Unique Constraints
-- ============================================

SELECT
  tc.table_name,
  kcu.column_name,
  tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'UNIQUE'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- ============================================
-- 6. Check Indexes
-- ============================================

SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- ============================================
-- 7. Check Check Constraints
-- ============================================

SELECT
  tc.table_name,
  tc.constraint_name,
  cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc
  ON tc.constraint_name = cc.constraint_name
WHERE tc.constraint_type = 'CHECK'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- ============================================
-- 8. Verify Critical Columns for Each Table
-- ============================================

-- Profiles table
SELECT 
  'profiles' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
  AND column_name IN ('id', 'username', 'email', 'is_premium', 'subscription_tier')
ORDER BY column_name;

-- User Progress table
SELECT 
  'user_progress' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'user_progress'
  AND column_name IN ('user_id', 'total_xp', 'coding_level', 'current_rank', 'current_streak')
ORDER BY column_name;

-- Problems table
SELECT 
  'problems' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'problems'
  AND column_name IN ('id', 'title', 'description', 'difficulty', 'xp_reward')
ORDER BY column_name;

-- Submissions table
SELECT 
  'submissions' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'submissions'
  AND column_name IN ('id', 'user_id', 'problem_id', 'code', 'language', 'verdict')
ORDER BY column_name;

-- Matches table
SELECT 
  'matches' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'matches'
  AND column_name IN ('id', 'player1_id', 'player2_id', 'problem_id', 'status')
ORDER BY column_name;

-- ============================================
-- 9. Check Triggers
-- ============================================

SELECT
  trigger_name,
  event_object_table as table_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- ============================================
-- 10. Check Functions/Stored Procedures
-- ============================================

SELECT
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- ============================================
-- 11. Table Row Counts
-- ============================================

SELECT 
  schemaname,
  tablename,
  n_tup_ins - n_tup_del as estimated_rows
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ============================================
-- 12. Check Data Types for JSONB Columns
-- ============================================

SELECT
  table_name,
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (data_type = 'jsonb' OR udt_name = 'jsonb')
ORDER BY table_name, column_name;

-- ============================================
-- 13. Check Timestamp Columns
-- ============================================

SELECT
  table_name,
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (data_type LIKE '%timestamp%' OR data_type LIKE '%date%')
ORDER BY table_name, column_name;

-- ============================================
-- 14. Verify Required Tables Summary
-- ============================================

SELECT 
  'Required Tables Check' as check_type,
  COUNT(*) as total_tables,
  COUNT(CASE WHEN table_name IN (
    'profiles', 'user_progress', 'user_stats', 'problems', 'test_cases',
    'submissions', 'matches', 'match_history', 'content_modules',
    'user_module_progress', 'daily_challenges', 'video_ads', 'leaderboards'
  ) THEN 1 END) as required_tables_found
FROM information_schema.tables
WHERE table_schema = 'public';

