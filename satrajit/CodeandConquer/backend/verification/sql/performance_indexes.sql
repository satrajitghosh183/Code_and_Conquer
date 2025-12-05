-- Performance Indexes SQL
-- Checks for critical indexes on frequently queried columns
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. Check Existing Indexes
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
-- 2. Required Indexes Checklist
-- ============================================

-- Indexes on user_id columns (most common filter)
SELECT 
  'Required Index: user_id' as index_check,
  table_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE schemaname = 'public' 
        AND tablename = table_name 
        AND indexdef LIKE '%user_id%'
    ) THEN 'EXISTS'
    ELSE 'MISSING'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'submissions', 'user_progress', 'user_stats', 'user_settings',
    'user_achievements', 'user_activity', 'match_history', 
    'user_module_progress', 'user_daily_completions', 'user_powerups',
    'player_inventory', 'leaderboards', 'subscriptions', 'transactions',
    'entitlements', 'customers', 'tasks', 'event_logs'
  )
ORDER BY table_name;

-- Indexes on created_at columns (for sorting)
SELECT 
  'Required Index: created_at' as index_check,
  table_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE schemaname = 'public' 
        AND tablename = table_name 
        AND indexdef LIKE '%created_at%'
    ) THEN 'EXISTS'
    ELSE 'MISSING'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'profiles', 'submissions', 'matches', 'match_history',
    'user_activity', 'event_logs', 'transactions', 'content_modules'
  )
ORDER BY table_name;

-- Indexes on problem_id columns
SELECT 
  'Required Index: problem_id' as index_check,
  table_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE schemaname = 'public' 
        AND tablename = table_name 
        AND indexdef LIKE '%problem_id%'
    ) THEN 'EXISTS'
    ELSE 'MISSING'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('submissions', 'test_cases', 'problem_versions', 'matches')
ORDER BY table_name;

-- Indexes on match_id columns
SELECT 
  'Required Index: match_id' as index_check,
  table_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE schemaname = 'public' 
        AND tablename = table_name 
        AND indexdef LIKE '%match_id%'
    ) THEN 'EXISTS'
    ELSE 'MISSING'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('match_history', 'match_results', 'game_actions')
ORDER BY table_name;

-- ============================================
-- 3. Composite Indexes
-- ============================================

-- Check for composite indexes on common query patterns
SELECT 
  'Composite Index Check' as index_check,
  indexname,
  tablename,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND (
    indexdef LIKE '%user_id%' AND indexdef LIKE '%created_at%'
    OR indexdef LIKE '%user_id%' AND indexdef LIKE '%problem_id%'
    OR indexdef LIKE '%match_id%' AND indexdef LIKE '%timestamp%'
  )
ORDER BY tablename, indexname;

-- ============================================
-- 4. Leaderboard Score Index
-- ============================================

-- Critical index for leaderboard queries
SELECT 
  'Leaderboard Score Index' as index_check,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE schemaname = 'public' 
        AND tablename = 'leaderboards' 
        AND (indexdef LIKE '%score%' OR indexname LIKE '%score%')
    ) THEN 'EXISTS'
    ELSE 'MISSING'
  END as status;

-- ============================================
-- 5. Unique Indexes
-- ============================================

-- Check for unique indexes on columns that should be unique
SELECT 
  'Unique Index Check' as index_check,
  indexname,
  tablename,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexdef LIKE '%UNIQUE%'
ORDER BY tablename, indexname;

-- ============================================
-- 6. Index Usage Statistics
-- ============================================

-- Check index usage (requires pg_stat_user_indexes)
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- ============================================
-- 7. Missing Indexes Recommendations
-- ============================================

-- Find tables with user_id but no index
SELECT 
  'Missing Index Recommendation' as recommendation,
  t.table_name,
  'CREATE INDEX idx_' || t.table_name || '_user_id ON ' || t.table_name || '(user_id);' as create_statement
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public'
  AND c.column_name = 'user_id'
  AND NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
      AND tablename = t.table_name 
      AND indexdef LIKE '%user_id%'
  )
ORDER BY t.table_name;

-- Find tables with created_at but no index
SELECT 
  'Missing Index Recommendation' as recommendation,
  t.table_name,
  'CREATE INDEX idx_' || t.table_name || '_created_at ON ' || t.table_name || '(created_at DESC);' as create_statement
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public'
  AND c.column_name = 'created_at'
  AND NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
      AND tablename = t.table_name 
      AND indexdef LIKE '%created_at%'
  )
ORDER BY t.table_name;

-- ============================================
-- 8. Index Size Analysis
-- ============================================

-- Check index sizes
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;

-- ============================================
-- 9. Unused Indexes (Potential for Cleanup)
-- ============================================

-- Find indexes that are never used
SELECT 
  'Unused Index' as check_type,
  schemaname,
  tablename,
  indexname,
  idx_scan as scan_count
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0
  AND indexname NOT LIKE '%_pkey'  -- Don't flag primary keys
ORDER BY tablename, indexname;

-- ============================================
-- 10. Critical Indexes Summary
-- ============================================

SELECT 
  'Critical Indexes Summary' as summary,
  COUNT(*) as total_indexes,
  COUNT(CASE WHEN indexdef LIKE '%user_id%' THEN 1 END) as user_id_indexes,
  COUNT(CASE WHEN indexdef LIKE '%created_at%' THEN 1 END) as created_at_indexes,
  COUNT(CASE WHEN indexdef LIKE '%problem_id%' THEN 1 END) as problem_id_indexes,
  COUNT(CASE WHEN indexdef LIKE '%match_id%' THEN 1 END) as match_id_indexes,
  COUNT(CASE WHEN indexdef LIKE '%score%' THEN 1 END) as score_indexes
FROM pg_indexes
WHERE schemaname = 'public';

