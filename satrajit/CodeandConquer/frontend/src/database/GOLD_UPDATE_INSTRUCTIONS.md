# Gold Update Instructions

## Problem
Gold is not updating in the frontend even after running SQL scripts.

## Root Causes
1. **Backend API might not be reading from `user_stats` table**
2. **Response structure mismatch** - API might return data in different format
3. **RLS policies** might be blocking reads
4. **SQL scripts not run** in Supabase

## Solution Steps

### Step 1: Run Database Schema Script
Run `database/user_stats_schema.sql` in Supabase SQL Editor:
- Creates `user_stats` table
- Sets up auto-creation trigger for new users
- Configures RLS policies

### Step 2: Initialize Existing Users
Run `database/initialize_existing_users_stats.sql`:
- Creates `user_stats` entries for all existing users
- Ensures everyone has a stats record

### Step 3: Give All Users 10k Gold
Run `database/give_all_users_gold.sql`:
- Creates missing entries
- Adds 10,000 gold to all users
- Shows verification queries

### Step 4: Verify in Supabase
Run this query to check:
```sql
SELECT id, coins, xp, level, updated_at 
FROM user_stats 
ORDER BY updated_at DESC 
LIMIT 10;
```

### Step 5: Check Browser Console
Open browser DevTools Console and look for:
- `[GameContext] Loaded stats from API:` - Shows what API returns
- `[GameContext] Loaded stats from Supabase:` - Shows direct DB read
- `[Dashboard] User stats from API:` - Dashboard API response
- `[Dashboard] User stats from Supabase:` - Dashboard direct DB read

### Step 6: Test Direct Supabase Query
The frontend now has a fallback that queries Supabase directly if the API fails.
Check the console to see which method is being used.

## Troubleshooting

### If API returns 404:
- User stats don't exist - run `initialize_existing_users_stats.sql`
- Backend endpoint might be wrong - check backend code

### If API returns data but coins are 0:
- SQL script wasn't run - run `give_all_users_gold.sql`
- RLS policy blocking - check RLS policies in Supabase

### If coins show in DB but not in UI:
- Response structure mismatch - check console logs
- Frontend not parsing correctly - check `GameContext.jsx` data mapping

## Quick Fix Script
Run `database/verify_and_fix_gold.sql` to:
- Check current state
- Show users who need updates
- Update all users to have at least 10k gold
- Verify the update

## Manual Refresh
- Click on the Coins badge in Dashboard to refresh
- Or use browser console: `window.location.reload()`

