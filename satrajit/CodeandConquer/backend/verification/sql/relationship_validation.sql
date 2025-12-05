-- Relationship Validation SQL
-- Verifies all table relationships and foreign key constraints
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. One-to-One Relationships
-- ============================================

-- profiles <-> user_progress (1:1)
SELECT 
  'profiles <-> user_progress (1:1)' as relationship,
  COUNT(DISTINCT p.id) as profile_count,
  COUNT(DISTINCT up.user_id) as progress_count,
  COUNT(DISTINCT CASE WHEN up.user_id IS NULL THEN p.id END) as profiles_without_progress,
  COUNT(DISTINCT CASE WHEN p.id IS NULL THEN up.user_id END) as progress_without_profile
FROM profiles p
FULL OUTER JOIN user_progress up ON p.id = up.user_id;

-- profiles <-> user_stats (1:1)
SELECT 
  'profiles <-> user_stats (1:1)' as relationship,
  COUNT(DISTINCT p.id) as profile_count,
  COUNT(DISTINCT us.user_id) as stats_count,
  COUNT(DISTINCT CASE WHEN us.user_id IS NULL THEN p.id END) as profiles_without_stats,
  COUNT(DISTINCT CASE WHEN p.id IS NULL THEN us.user_id END) as stats_without_profile
FROM profiles p
FULL OUTER JOIN user_stats us ON p.id = us.user_id;

-- profiles <-> user_settings (1:1)
SELECT 
  'profiles <-> user_settings (1:1)' as relationship,
  COUNT(DISTINCT p.id) as profile_count,
  COUNT(DISTINCT us.user_id) as settings_count,
  COUNT(DISTINCT CASE WHEN us.user_id IS NULL THEN p.id END) as profiles_without_settings,
  COUNT(DISTINCT CASE WHEN p.id IS NULL THEN us.user_id END) as settings_without_profile
FROM profiles p
FULL OUTER JOIN user_settings us ON p.id = us.user_id;

-- ============================================
-- 2. One-to-Many Relationships
-- ============================================

-- users <-> submissions (1:N)
SELECT 
  'users <-> submissions (1:N)' as relationship,
  COUNT(DISTINCT p.id) as user_count,
  COUNT(DISTINCT s.id) as submission_count,
  COUNT(DISTINCT CASE WHEN s.id IS NULL THEN p.id END) as users_without_submissions,
  AVG(submission_count_per_user) as avg_submissions_per_user,
  MAX(submission_count_per_user) as max_submissions_per_user
FROM profiles p
LEFT JOIN (
  SELECT user_id, COUNT(*) as submission_count_per_user
  FROM submissions
  GROUP BY user_id
) s ON p.id = s.user_id;

-- problems <-> test_cases (1:N)
SELECT 
  'problems <-> test_cases (1:N)' as relationship,
  COUNT(DISTINCT p.id) as problem_count,
  COUNT(DISTINCT tc.id) as test_case_count,
  COUNT(DISTINCT CASE WHEN tc.id IS NULL THEN p.id END) as problems_without_test_cases,
  AVG(test_case_count_per_problem) as avg_test_cases_per_problem,
  MAX(test_case_count_per_problem) as max_test_cases_per_problem
FROM problems p
LEFT JOIN (
  SELECT problem_id, COUNT(*) as test_case_count_per_problem
  FROM test_cases
  GROUP BY problem_id
) tc ON p.id = tc.problem_id;

-- problems <-> problem_versions (1:N)
SELECT 
  'problems <-> problem_versions (1:N)' as relationship,
  COUNT(DISTINCT p.id) as problem_count,
  COUNT(DISTINCT pv.version_id) as version_count,
  COUNT(DISTINCT CASE WHEN pv.version_id IS NULL THEN p.id END) as problems_without_versions,
  AVG(version_count_per_problem) as avg_versions_per_problem
FROM problems p
LEFT JOIN (
  SELECT problem_id, COUNT(*) as version_count_per_problem
  FROM problem_versions
  GROUP BY problem_id
) pv ON p.id = pv.problem_id;

-- matches <-> match_history (1:N)
SELECT 
  'matches <-> match_history (1:N)' as relationship,
  COUNT(DISTINCT m.id) as match_count,
  COUNT(DISTINCT mh.id) as history_count,
  COUNT(DISTINCT CASE WHEN mh.id IS NULL THEN m.id END) as matches_without_history,
  AVG(history_count_per_match) as avg_history_per_match
FROM matches m
LEFT JOIN (
  SELECT match_id, COUNT(*) as history_count_per_match
  FROM match_history
  GROUP BY match_id
) mh ON m.id = mh.match_id;

-- matches <-> game_actions (1:N)
SELECT 
  'matches <-> game_actions (1:N)' as relationship,
  COUNT(DISTINCT m.id) as match_count,
  COUNT(DISTINCT ga.id) as action_count,
  COUNT(DISTINCT CASE WHEN ga.id IS NULL THEN m.id END) as matches_without_actions,
  AVG(action_count_per_match) as avg_actions_per_match
FROM matches m
LEFT JOIN (
  SELECT match_id, COUNT(*) as action_count_per_match
  FROM game_actions
  GROUP BY match_id
) ga ON m.id = ga.match_id;

-- users <-> user_achievements (1:N)
SELECT 
  'users <-> user_achievements (1:N)' as relationship,
  COUNT(DISTINCT p.id) as user_count,
  COUNT(DISTINCT ua.id) as achievement_count,
  COUNT(DISTINCT CASE WHEN ua.id IS NULL THEN p.id END) as users_without_achievements,
  AVG(achievement_count_per_user) as avg_achievements_per_user
FROM profiles p
LEFT JOIN (
  SELECT user_id, COUNT(*) as achievement_count_per_user
  FROM user_achievements
  GROUP BY user_id
) ua ON p.id = ua.user_id;

-- users <-> user_activity (1:N)
SELECT 
  'users <-> user_activity (1:N)' as relationship,
  COUNT(DISTINCT p.id) as user_count,
  COUNT(DISTINCT ua.id) as activity_count,
  COUNT(DISTINCT CASE WHEN ua.id IS NULL THEN p.id END) as users_without_activity,
  AVG(activity_count_per_user) as avg_activities_per_user
FROM profiles p
LEFT JOIN (
  SELECT user_id, COUNT(*) as activity_count_per_user
  FROM user_activity
  GROUP BY user_id
) ua ON p.id = ua.user_id;

-- ============================================
-- 3. Foreign Key Relationships Verification
-- ============================================

-- Verify all foreign key constraints exist
SELECT
  'Foreign Key Constraints' as check_type,
  tc.table_name AS from_table,
  kcu.column_name AS from_column,
  ccu.table_name AS to_table,
  ccu.column_name AS to_column,
  CASE 
    WHEN tc.constraint_name IS NOT NULL THEN 'EXISTS'
    ELSE 'MISSING'
  END as constraint_status
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- ============================================
-- 4. Expected Relationships Checklist
-- ============================================

-- Expected relationships to verify:
SELECT 
  'Expected Relationships' as check_type,
  'submissions.user_id -> profiles.id' as relationship,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
      WHERE tc.table_name = 'submissions' 
        AND kcu.column_name = 'user_id'
        AND ccu.table_name = 'profiles'
        AND ccu.column_name = 'id'
    ) THEN 'EXISTS'
    ELSE 'MISSING'
  END as status
UNION ALL
SELECT 
  'Expected Relationships' as check_type,
  'submissions.problem_id -> problems.id' as relationship,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
      WHERE tc.table_name = 'submissions' 
        AND kcu.column_name = 'problem_id'
        AND ccu.table_name = 'problems'
        AND ccu.column_name = 'id'
    ) THEN 'EXISTS'
    ELSE 'MISSING'
  END as status
UNION ALL
SELECT 
  'Expected Relationships' as check_type,
  'test_cases.problem_id -> problems.id' as relationship,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
      WHERE tc.table_name = 'test_cases' 
        AND kcu.column_name = 'problem_id'
        AND ccu.table_name = 'problems'
        AND ccu.column_name = 'id'
    ) THEN 'EXISTS'
    ELSE 'MISSING'
  END as status
UNION ALL
SELECT 
  'Expected Relationships' as check_type,
  'user_progress.user_id -> profiles.id' as relationship,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
      WHERE tc.table_name = 'user_progress' 
        AND kcu.column_name = 'user_id'
        AND ccu.table_name = 'profiles'
        AND ccu.column_name = 'id'
    ) THEN 'EXISTS'
    ELSE 'MISSING'
  END as status
UNION ALL
SELECT 
  'Expected Relationships' as check_type,
  'match_history.match_id -> matches.id' as relationship,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
      WHERE tc.table_name = 'match_history' 
        AND kcu.column_name = 'match_id'
        AND ccu.table_name = 'matches'
        AND ccu.column_name = 'id'
    ) THEN 'EXISTS'
    ELSE 'MISSING'
  END as status;

-- ============================================
-- 5. Relationship Cardinality Verification
-- ============================================

-- Check for violations of 1:1 relationships
SELECT 
  '1:1 Violation: user_progress' as check_type,
  user_id,
  COUNT(*) as count
FROM user_progress
GROUP BY user_id
HAVING COUNT(*) > 1;

SELECT 
  '1:1 Violation: user_stats' as check_type,
  user_id,
  COUNT(*) as count
FROM user_stats
GROUP BY user_id
HAVING COUNT(*) > 1;

SELECT 
  '1:1 Violation: user_settings' as check_type,
  user_id,
  COUNT(*) as count
FROM user_settings
GROUP BY user_id
HAVING COUNT(*) > 1;

-- ============================================
-- 6. Cascade Delete Verification
-- ============================================

-- Check ON DELETE CASCADE rules
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS referenced_table,
  rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- ============================================
-- 7. Self-Referencing Relationships
-- ============================================

-- Check for self-referencing foreign keys (if any)
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS referenced_table,
  ccu.column_name AS referenced_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name = ccu.table_name
ORDER BY tc.table_name;

-- ============================================
-- 8. Missing Relationships (Potential Issues)
-- ============================================

-- Check for tables that should have relationships but don't
SELECT 
  'Potential Missing Relationship' as check_type,
  'user_module_progress.user_id -> profiles.id' as relationship,
  COUNT(*) as orphaned_count
FROM user_module_progress ump
LEFT JOIN profiles p ON ump.user_id = p.id
WHERE p.id IS NULL;

SELECT 
  'Potential Missing Relationship' as check_type,
  'user_module_progress.module_id -> content_modules.id' as relationship,
  COUNT(*) as orphaned_count
FROM user_module_progress ump
LEFT JOIN content_modules cm ON ump.module_id = cm.id
WHERE cm.id IS NULL;

-- ============================================
-- 9. Relationship Summary
-- ============================================

SELECT 
  'Relationship Summary' as check_type,
  COUNT(DISTINCT tc.table_name) as tables_with_fks,
  COUNT(*) as total_foreign_keys,
  COUNT(DISTINCT CASE WHEN rc.delete_rule = 'CASCADE' THEN tc.constraint_name END) as cascade_deletes,
  COUNT(DISTINCT CASE WHEN rc.delete_rule = 'RESTRICT' THEN tc.constraint_name END) as restrict_deletes,
  COUNT(DISTINCT CASE WHEN rc.delete_rule = 'SET NULL' THEN tc.constraint_name END) as set_null_deletes
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.referential_constraints rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public';

