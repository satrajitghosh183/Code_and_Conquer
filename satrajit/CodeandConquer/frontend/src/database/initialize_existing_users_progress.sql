-- Initialize user_progress for all existing users who don't have progress yet
-- Run this after creating the user_progress table

-- First, check if the table exists and what columns it has
-- If the table doesn't have a 'hero' column, we'll use a different approach

-- Check if hero column exists, if not, add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_progress' AND column_name = 'hero'
  ) THEN
    -- Add hero column if it doesn't exist
    ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS hero VARCHAR(50) DEFAULT 'default';
  END IF;
END $$;

-- Insert user_progress for all auth.users who don't have progress yet
-- Use COALESCE to handle missing columns gracefully
INSERT INTO user_progress (user_id, loadout, tech_tree_progress, unlocked_items)
SELECT 
  u.id,
  COALESCE('{}'::jsonb, '{}'::jsonb) AS loadout,
  COALESCE('{}'::jsonb, '{}'::jsonb) AS tech_tree_progress,
  COALESCE('[]'::jsonb, '[]'::jsonb) AS unlocked_items
FROM auth.users u
LEFT JOIN user_progress up ON u.id = up.user_id
WHERE up.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- If hero column exists, update it for new records
UPDATE user_progress 
SET hero = 'default' 
WHERE hero IS NULL;

-- Verify the insert
SELECT 
  COUNT(*) as total_users,
  COUNT(up.user_id) as users_with_progress,
  COUNT(*) - COUNT(up.user_id) as users_without_progress
FROM auth.users u
LEFT JOIN user_progress up ON u.id = up.user_id;

