# Database Table Usage Matrix

This document tracks which database tables are actively used in the codebase and which are unused.

Last Updated: 2025-01-12

## Active Tables (Used in Code)

### Core User Tables
- **profiles** - User profile information (6 rows)
- **users** - User authentication data (1 row)
- **user_progress** - Coding progress tracking (empty, but used)
- **user_stats** - Game statistics (coins, games, wins) (newly created)
- **user_settings** - User preferences (empty, but used)
- **user_achievements** - User achievement records (empty, but used)
- **user_activity** - User activity logs (empty, but used)

### Problems & Submissions
- **problems** - Coding problems database (2359 rows) ✅
- **test_cases** - Test cases for problems (2361 rows) ✅
- **problem_versions** - Problem versioning (9436 rows) ✅
- **submissions** - User code submissions (empty, but used)

### Game & Matches
- **matches** - Match records (empty, but used)
- **match_history** - Detailed match history (created by migration)
- **match_results** - Match result data (empty, but used)
- **game_actions** - Game action logs (empty, but used)
- **towers** - Tower definitions (empty, but used)
- **player_inventory** - Player inventory items (empty, but used)
- **user_powerups** - User power-ups (created by migration)

### Leaderboards & Achievements
- **leaderboards** - Leaderboard entries (empty, but used)
- **achievements** - Achievement definitions (empty, but used)

### Payments & Subscriptions
- **customers** - Customer records (empty, but used)
- **subscriptions** - Subscription records (empty, but used)
- **transactions** - Transaction records (empty, but used)
- **entitlements** - User entitlements (empty, but used)

### Content & Learning
- **content_modules** - Learning modules (8 rows) ✅
- **user_module_progress** - User progress through modules (newly created)

### Daily Challenges
- **daily_challenges** - Daily challenge definitions (created by migration)
- **user_daily_completions** - User daily challenge completions (created by migration)

### Ads
- **video_ads** - Video advertisements (newly created, to be populated from videos.csv)
- **ad_impressions** - Ad impression tracking (newly created)
- **ad_interactions** - Ad interaction tracking (newly created)

### Analytics & Logging
- **event_logs** - Event logging (empty, but used)

### Tasks
- **tasks** - Task definitions (empty, but used)
- **task_integrations** - Task integration settings (empty, but used)

## Unused Tables (Not Referenced in Code)

These tables exist in the database but are not used anywhere in the codebase:

- **ab_tests** - A/B testing configuration (0 rows)
- **ads** - Old ads table (code uses `video_ads` instead) (0 rows)
- **auth_providers** - Auth provider configuration (0 rows)
- **career_recommendations** - Career recommendations (0 rows)
- **companies** - Company information (0 rows)
- **jobs** - Job listings (0 rows)
- **job_skills** - Job skill mappings (0 rows)
- **media_files** - Media file references (0 rows)
- **performance_metrics** - Performance metrics (0 rows)
- **problem_stats** - Problem statistics (0 rows)
- **problem_tags** - Problem tags (0 rows)

## Views

- **user_stats_with_level** - View combining user_progress with computed level (from migration)
- **user_stats** - Table for game-specific stats (coins, games, wins)

## Migration Status

### Applied Migrations
- ✅ `add_progression_system.sql` - Adds hero system, tech tree, match history, daily challenges
- ✅ `create_user_stats_view.sql` - Creates user_stats table
- ✅ `create_ad_tables.sql` - Creates video_ads, ad_impressions, ad_interactions tables
- ✅ `create_user_module_progress.sql` - Creates user_module_progress table

### Pending Actions
- ⏳ Run `importAdsFromCSV.js` to populate video_ads from videos.csv
- ⏳ Verify all migrations are applied to production database

## Table Population Status

### Tables with Data
- problems: 2359 rows
- test_cases: 2361 rows
- problem_versions: 9436 rows
- profiles: 6 rows
- users: 1 row
- content_modules: 8 rows

### Tables Ready for Data (Empty but Used)
All other active tables are empty but will be populated as users interact with the system.

## Cleanup Recommendations

1. **Safe to Remove** (all empty, not used in code):
   - ab_tests
   - ads (replaced by video_ads)
   - auth_providers
   - career_recommendations
   - companies
   - jobs
   - job_skills
   - media_files
   - performance_metrics
   - problem_stats
   - problem_tags

2. **Keep for Future Use** (may be needed later):
   - Consider keeping ab_tests if A/B testing is planned
   - Consider keeping companies/jobs if career features are planned

## Notes

- The `user_stats` table is separate from `user_progress`:
  - `user_stats`: Game-specific stats (coins, games_played, wins)
  - `user_progress`: Coding progress (xp, problems solved, streaks, heroes, tech tree)
  
- The `video_ads` table replaces the old `ads` table. The old table can be safely removed.

- All migrations use `IF NOT EXISTS` and `IF EXISTS` clauses to be idempotent and safe to run multiple times.

