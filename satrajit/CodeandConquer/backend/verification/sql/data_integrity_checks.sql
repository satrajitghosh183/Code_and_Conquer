-- Data Integrity Checks SQL
-- Validates data consistency across tables
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. Foreign Key Integrity Checks
-- ============================================

-- Check for orphaned submissions (user_id doesn't exist in profiles)
SELECT 
  'Orphaned Submissions' as check_type,
  COUNT(*) as orphaned_count
FROM submissions s
LEFT JOIN profiles p ON s.user_id = p.id
WHERE p.id IS NULL;

-- Check for orphaned submissions (problem_id doesn't exist in problems)
SELECT 
  'Orphaned Submissions (Problem)' as check_type,
  COUNT(*) as orphaned_count
FROM submissions s
LEFT JOIN problems p ON s.problem_id = p.id
WHERE p.id IS NULL;

-- Check for orphaned test_cases
SELECT 
  'Orphaned Test Cases' as check_type,
  COUNT(*) as orphaned_count
FROM test_cases tc
LEFT JOIN problems p ON tc.problem_id = p.id
WHERE p.id IS NULL;

-- Check for orphaned match_history
SELECT 
  'Orphaned Match History' as check_type,
  COUNT(*) as orphaned_count
FROM match_history mh
LEFT JOIN matches m ON mh.match_id = m.id
WHERE m.id IS NULL;

-- Check for orphaned user_progress
SELECT 
  'Orphaned User Progress' as check_type,
  COUNT(*) as orphaned_count
FROM user_progress up
LEFT JOIN profiles p ON up.user_id = p.id
WHERE p.id IS NULL;

-- Check for orphaned user_stats
SELECT 
  'Orphaned User Stats' as check_type,
  COUNT(*) as orphaned_count
FROM user_stats us
LEFT JOIN profiles p ON us.user_id = p.id
WHERE p.id IS NULL;

-- ============================================
-- 2. User Progress Consistency Checks
-- ============================================

-- Check XP vs Level consistency
SELECT 
  'XP vs Level Inconsistency' as check_type,
  user_id,
  total_xp,
  coding_level,
  CASE 
    WHEN total_xp < 100 THEN 'Beginner'
    WHEN total_xp < 250 THEN 'Intermediate'
    WHEN total_xp < 500 THEN 'Advanced'
    WHEN total_xp < 1000 THEN 'Expert'
    ELSE 'Master'
  END as expected_level
FROM user_progress
WHERE coding_level != CASE 
    WHEN total_xp < 100 THEN 'Beginner'
    WHEN total_xp < 250 THEN 'Intermediate'
    WHEN total_xp < 500 THEN 'Advanced'
    WHEN total_xp < 1000 THEN 'Expert'
    ELSE 'Master'
  END;

-- Check streak consistency
SELECT 
  'Streak Inconsistency' as check_type,
  user_id,
  current_streak,
  longest_streak
FROM user_progress
WHERE current_streak > longest_streak;

-- Check last_activity_date consistency
SELECT 
  'Activity Date Inconsistency' as check_type,
  user_id,
  last_activity_date,
  current_streak
FROM user_progress
WHERE last_activity_date IS NULL AND current_streak > 0;

-- ============================================
-- 3. Leaderboard Score Accuracy
-- ============================================

-- Verify leaderboard scores match user_stats
SELECT 
  'Leaderboard Score Mismatch' as check_type,
  l.user_id,
  l.score as leaderboard_score,
  (COALESCE(us.xp, 0) + (COALESCE(us.problems_solved, 0) * 10)) as calculated_score
FROM leaderboards l
LEFT JOIN user_stats us ON l.user_id = us.user_id
WHERE l.leaderboard_type = 'global'
  AND ABS(l.score - (COALESCE(us.xp, 0) + (COALESCE(us.problems_solved, 0) * 10))) > 1;

-- ============================================
-- 4. Match History vs Matches Consistency
-- ============================================

-- Check match_history entries match matches
SELECT 
  'Match History Mismatch' as check_type,
  mh.match_id,
  mh.user_id,
  m.status as match_status
FROM match_history mh
LEFT JOIN matches m ON mh.match_id = m.id
WHERE m.status IS NULL OR m.status = 'active';

-- Check match results consistency
SELECT 
  'Match Result Mismatch' as check_type,
  mr.match_id,
  mr.player1_score,
  mr.player2_score,
  m.winner_id
FROM match_results mr
LEFT JOIN matches m ON mr.match_id = m.id
WHERE m.id IS NULL;

-- ============================================
-- 5. Submission Counts vs User Stats
-- ============================================

-- Verify problems_solved count matches actual submissions
SELECT 
  'Problems Solved Count Mismatch' as check_type,
  us.user_id,
  us.problems_solved as stats_count,
  COUNT(DISTINCT s.problem_id) as actual_count
FROM user_stats us
LEFT JOIN submissions s ON us.user_id = s.user_id 
  AND s.verdict = 'accepted'
GROUP BY us.user_id, us.problems_solved
HAVING us.problems_solved != COUNT(DISTINCT s.problem_id);

-- ============================================
-- 6. Date Field Validations
-- ============================================

-- Check for future dates in created_at
SELECT 
  'Future Created Dates' as check_type,
  'profiles' as table_name,
  id,
  created_at
FROM profiles
WHERE created_at > NOW()
UNION ALL
SELECT 
  'Future Created Dates' as check_type,
  'submissions' as table_name,
  id::text,
  submitted_at
FROM submissions
WHERE submitted_at > NOW()
UNION ALL
SELECT 
  'Future Created Dates' as check_type,
  'matches' as table_name,
  id::text,
  created_at
FROM matches
WHERE created_at > NOW();

-- Check for dates before 2020 (likely invalid)
SELECT 
  'Invalid Old Dates' as check_type,
  'profiles' as table_name,
  id,
  created_at
FROM profiles
WHERE created_at < '2020-01-01'
UNION ALL
SELECT 
  'Invalid Old Dates' as check_type,
  'submissions' as table_name,
  id::text,
  submitted_at
FROM submissions
WHERE submitted_at < '2020-01-01';

-- ============================================
-- 7. NULL Constraint Violations
-- ============================================

-- Check for NULL in required fields
SELECT 
  'NULL in Required Fields' as check_type,
  'profiles' as table_name,
  id,
  CASE 
    WHEN username IS NULL THEN 'username'
    WHEN email IS NULL THEN 'email'
    ELSE 'OK'
  END as null_field
FROM profiles
WHERE username IS NULL OR email IS NULL;

SELECT 
  'NULL in Required Fields' as check_type,
  'submissions' as table_name,
  id::text,
  CASE 
    WHEN user_id IS NULL THEN 'user_id'
    WHEN problem_id IS NULL THEN 'problem_id'
    WHEN code IS NULL THEN 'code'
    WHEN language IS NULL THEN 'language'
    ELSE 'OK'
  END as null_field
FROM submissions
WHERE user_id IS NULL OR problem_id IS NULL OR code IS NULL OR language IS NULL;

-- ============================================
-- 8. Duplicate Prevention Checks
-- ============================================

-- Check for duplicate usernames
SELECT 
  'Duplicate Usernames' as check_type,
  username,
  COUNT(*) as count
FROM profiles
GROUP BY username
HAVING COUNT(*) > 1;

-- Check for duplicate emails
SELECT 
  'Duplicate Emails' as check_type,
  email,
  COUNT(*) as count
FROM profiles
GROUP BY email
HAVING COUNT(*) > 1;

-- Check for duplicate daily challenge completions
SELECT 
  'Duplicate Daily Completions' as check_type,
  user_id,
  challenge_id,
  COUNT(*) as count
FROM user_daily_completions
GROUP BY user_id, challenge_id
HAVING COUNT(*) > 1;

-- ============================================
-- 9. Referential Integrity Summary
-- ============================================

SELECT 
  'Referential Integrity Summary' as check_type,
  COUNT(DISTINCT CASE WHEN p.id IS NULL THEN s.user_id END) as orphaned_submissions_users,
  COUNT(DISTINCT CASE WHEN pr.id IS NULL THEN s.problem_id END) as orphaned_submissions_problems,
  COUNT(DISTINCT CASE WHEN p2.id IS NULL THEN up.user_id END) as orphaned_user_progress,
  COUNT(DISTINCT CASE WHEN p3.id IS NULL THEN us.user_id END) as orphaned_user_stats
FROM submissions s
FULL OUTER JOIN profiles p ON s.user_id = p.id
FULL OUTER JOIN problems pr ON s.problem_id = pr.id
FULL OUTER JOIN user_progress up ON up.user_id = p.id
FULL OUTER JOIN user_stats us ON us.user_id = p.id;

-- ============================================
-- 10. Data Type Consistency
-- ============================================

-- Check for invalid JSON in JSONB columns
SELECT 
  'Invalid JSON in JSONB' as check_type,
  'problems' as table_name,
  id,
  'tags' as column_name
FROM problems
WHERE tags IS NOT NULL 
  AND NOT (tags::text ~ '^(\[|\{)');

-- Check for negative values where not allowed
SELECT 
  'Negative Values' as check_type,
  'user_progress' as table_name,
  user_id,
  'total_xp' as column_name,
  total_xp
FROM user_progress
WHERE total_xp < 0
UNION ALL
SELECT 
  'Negative Values' as check_type,
  'user_stats' as table_name,
  user_id,
  'coins' as column_name,
  coins
FROM user_stats
WHERE coins < 0;

-- ============================================
-- 11. Subscription Consistency
-- ============================================

-- Check subscription dates consistency
SELECT 
  'Subscription Date Inconsistency' as check_type,
  id,
  user_id,
  start_date,
  end_date,
  current_period_start,
  current_period_end
FROM subscriptions
WHERE end_date < start_date
  OR current_period_end < current_period_start
  OR (end_date IS NOT NULL AND start_date IS NULL);

-- Check subscription status consistency
SELECT 
  'Subscription Status Inconsistency' as check_type,
  id,
  user_id,
  status,
  end_date
FROM subscriptions
WHERE status = 'active' 
  AND end_date IS NOT NULL 
  AND end_date < NOW();

-- ============================================
-- 12. Match Status Consistency
-- ============================================

-- Check matches with winner but status not completed
SELECT 
  'Match Status Inconsistency' as check_type,
  id,
  status,
  winner_id
FROM matches
WHERE winner_id IS NOT NULL 
  AND status != 'completed';

-- Check matches completed without end_time
SELECT 
  'Match End Time Missing' as check_type,
  id,
  status,
  end_time
FROM matches
WHERE status = 'completed' 
  AND end_time IS NULL;

