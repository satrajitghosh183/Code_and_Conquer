-- Quick Fix: Leaderboards RLS Policy
-- Run this immediately in Supabase SQL Editor to fix the RLS error
-- Date: 2025-12-05
-- Issue: "new row violates row-level security policy for table leaderboards"

-- Step 1: Make sure RLS is enabled
ALTER TABLE leaderboards ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Leaderboards are viewable by everyone" ON leaderboards;
DROP POLICY IF EXISTS "Users can update their own leaderboard entry" ON leaderboards;
DROP POLICY IF EXISTS "Users can insert their own leaderboard entry" ON leaderboards;
DROP POLICY IF EXISTS "Service role full access leaderboards" ON leaderboards;
DROP POLICY IF EXISTS "Anyone can insert leaderboard entries" ON leaderboards;
DROP POLICY IF EXISTS "Anyone can update leaderboard entries" ON leaderboards;

-- Step 3: Create new policies

-- Service role bypass (for admin/backend operations)
CREATE POLICY "Service role full access leaderboards" ON leaderboards
    FOR ALL USING (auth.role() = 'service_role');

-- Everyone can view the leaderboard
CREATE POLICY "Leaderboards are viewable by everyone" ON leaderboards
    FOR SELECT USING (true);

-- Allow any authenticated request to insert (backend creates entries on behalf of users)
CREATE POLICY "Anyone can insert leaderboard entries" ON leaderboards
    FOR INSERT WITH CHECK (true);

-- Allow any authenticated request to update (backend updates scores)
CREATE POLICY "Anyone can update leaderboard entries" ON leaderboards
    FOR UPDATE USING (true);

-- Step 4: Grant permissions to roles
GRANT ALL ON leaderboards TO service_role;
GRANT SELECT, INSERT, UPDATE ON leaderboards TO authenticated;
GRANT SELECT ON leaderboards TO anon;

-- Verify the policies were created
SELECT tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'leaderboards';

