-- Initialize user_progress for all existing users who don't have progress yet
-- Run this after creating the user_progress table

-- Insert user_progress for all auth.users who don't have progress yet
INSERT INTO user_progress (user_id, hero, loadout, tech_tree_progress, unlocked_items)
SELECT 
  u.id,
  'default' AS hero,
  '{}'::jsonb AS loadout,
  '{}'::jsonb AS tech_tree_progress,
  '[]'::jsonb AS unlocked_items
FROM auth.users u
LEFT JOIN user_progress up ON u.id = up.user_id
WHERE up.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Verify the insert
SELECT 
  COUNT(*) as total_users,
  COUNT(up.user_id) as users_with_progress,
  COUNT(*) - COUNT(up.user_id) as users_without_progress
FROM auth.users u
LEFT JOIN user_progress up ON u.id = up.user_id;

