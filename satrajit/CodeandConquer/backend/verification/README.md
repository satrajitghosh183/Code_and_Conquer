# Database Verification Suite

Comprehensive verification suite for Code and Conquer database architecture, API endpoints, and data integrity.

## Overview

This verification suite includes:
- **10 Automated Test Scripts** - Programmatic verification of all database operations
- **4 SQL Verification Files** - Schema, integrity, relationships, and performance checks
- **1 Manual API Checklist** - Step-by-step manual testing guide
- **1 Master Test Runner** - Orchestrates all automated tests with reporting

## Directory Structure

```
verification/
├── automated/           # Automated Node.js test scripts
│   ├── 01_user_auth_test.js
│   ├── 02_problem_submission_test.js
│   ├── 03_progression_system_test.js
│   ├── 04_multiplayer_match_test.js
│   ├── 05_learning_modules_test.js
│   ├── 06_advertising_test.js
│   ├── 07_leaderboard_test.js
│   ├── 08_payment_subscription_test.js
│   ├── 09_daily_challenges_test.js
│   └── 10_analytics_logging_test.js
├── sql/                # SQL verification queries
│   ├── schema_verification.sql
│   ├── data_integrity_checks.sql
│   ├── relationship_validation.sql
│   └── performance_indexes.sql
├── manual/             # Manual testing guides
│   └── api_test_checklist.md
├── utils/              # Test utilities
│   └── test_helpers.js
├── run_all_tests.js    # Master test runner
└── README.md           # This file
```

## Prerequisites

1. **Node.js** (v18 or higher)
2. **Supabase Database** - Configured with all tables
3. **Environment Variables** - Set in `backend/.env`:
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```
4. **Database Migration** - Run the fix migration (required for tests to pass)

## Required: Run Database Migration First

Before running the verification tests, you MUST run the `fix_verification_issues.sql` migration in your Supabase SQL Editor:

1. Open Supabase Dashboard -> SQL Editor
2. Copy the contents of `backend/migrations/fix_verification_issues.sql`
3. Paste and execute in the SQL Editor
4. Verify no errors occurred

This migration fixes:
- **RLS Policies**: Allows service_role to bypass RLS for administrative operations
- **Foreign Key Constraints**: Changes FK references from `users` to `profiles` table
- **Missing Columns**: Adds `test_results`, `tags`, `coins_reward` columns
- **Data Types**: Changes `achievement_id` to TEXT for flexibility
- **Permissions**: Grants proper permissions to service_role and authenticated users

**Note**: Without this migration, many tests will fail with RLS violations or FK constraint errors.

## Quick Start

### Run All Automated Tests

```bash
cd backend
node verification/run_all_tests.js
```

This will:
- Run all 10 test suites
- Display progress and results
- Generate a JSON report (`test_report.json`)
- Exit with code 0 (success) or 1 (failures)

### Run Individual Test Suite

```bash
# Example: Run only user authentication tests
node -e "import('./verification/automated/01_user_auth_test.js').then(m => m.testUserAuthentication().then(r => console.log(JSON.stringify(r, null, 2))))"
```

### Run SQL Verification

1. Open Supabase Dashboard → SQL Editor
2. Copy and paste contents of SQL files:
   - `sql/schema_verification.sql` - Verify table structure
   - `sql/data_integrity_checks.sql` - Check data consistency
   - `sql/relationship_validation.sql` - Verify relationships
   - `sql/performance_indexes.sql` - Check indexes
3. Execute each query and review results

## Test Coverage

### Automated Tests

| Test Suite | Tables Verified | Key Operations |
|------------|----------------|----------------|
| User Auth | profiles, user_progress, user_stats, user_settings, user_achievements, user_activity | CRUD, streak, XP |
| Problems & Submissions | problems, test_cases, problem_versions, submissions | Fetch, submit, history |
| Progression | user_progress (extended), heroes, tech_tree | XP, levels, unlocks, upgrades |
| Multiplayer | matches, match_history, match_results, game_actions, towers, inventory, powerups | Create, play, complete |
| Learning Modules | content_modules, user_module_progress | Fetch, progress tracking |
| Advertising | video_ads, ad_impressions, ad_interactions | Random ad, logging |
| Leaderboard | leaderboards | Score calculation, updates |
| Payments | customers, subscriptions, transactions, entitlements | Lifecycle management |
| Daily Challenges | daily_challenges, user_daily_completions | Create, complete |
| Analytics | event_logs, user_activity | Event logging |

### SQL Verification

- **Schema Verification**: All 34 tables, columns, constraints, indexes
- **Data Integrity**: Foreign keys, consistency checks, NULL violations
- **Relationships**: 1:1, 1:N relationships, foreign key constraints
- **Performance**: Index existence, usage statistics, recommendations

## Expected Results

### Successful Test Run

```
================================================================================
DATABASE VERIFICATION SUITE
================================================================================
Started: 2025-01-12T10:00:00.000Z

[1/10] Running: User Authentication & Profile
--------------------------------------------------------------------------------
✅ PASS: profiles table exists
✅ PASS: create test profile
...
✅ Suite Complete: 20 passed, 0 failed

...

================================================================================
TEST SUMMARY
================================================================================
Total Test Suites: 10
Total Tests: 200
✅ Passed: 195
❌ Failed: 5
Success Rate: 97.5%
Duration: 45.32s
================================================================================
```

### Test Report JSON

After running tests, a `test_report.json` file is generated with:
- Timestamp and duration
- Summary statistics
- Detailed results per suite
- Failed tests with error messages

## Manual Testing

Follow the comprehensive checklist in `manual/api_test_checklist.md`:

1. **Setup**: Create test user account
2. **Test Each Domain**: Follow checklist items
3. **Verify Database**: Check tables after each operation
4. **Document Issues**: Note any failures or unexpected behavior

## SQL Verification Queries

### Schema Verification

Run `sql/schema_verification.sql` to verify:
- All 34 tables exist
- Column definitions are correct
- Primary keys, foreign keys, unique constraints
- Indexes exist
- Triggers and functions

### Data Integrity

Run `sql/data_integrity_checks.sql` to check:
- Foreign key integrity (no orphaned records)
- User progress consistency (XP vs level)
- Leaderboard score accuracy
- Match history consistency
- Submission counts accuracy
- Date field validations
- NULL constraint violations

### Relationships

Run `sql/relationship_validation.sql` to verify:
- 1:1 relationships (profiles ↔ user_progress, user_stats)
- 1:N relationships (users → submissions, problems → test_cases)
- Foreign key constraints
- Cascade delete rules

### Performance Indexes

Run `sql/performance_indexes.sql` to check:
- Indexes on user_id columns
- Indexes on created_at columns
- Composite indexes
- Leaderboard score index
- Unused indexes (potential cleanup)

## Troubleshooting

### Common Issues

**Issue**: Tests fail with "Supabase not configured"
- **Solution**: Ensure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set in `.env`

**Issue**: Tests fail with "Table does not exist"
- **Solution**: Run database migrations in `backend/migrations/`

**Issue**: SQL queries return no results
- **Solution**: Some tables may be empty - this is expected for new databases

**Issue**: Foreign key violations
- **Solution**: Check data integrity SQL results and fix orphaned records

**Issue**: Tests fail with "new row violates row-level security policy"
- **Solution**: Run `backend/migrations/fix_verification_issues.sql` in Supabase SQL Editor
- This adds RLS policies that allow service_role to bypass RLS

**Issue**: Tests fail with "violates foreign key constraint ... not present in table 'users'"
- **Solution**: Run `backend/migrations/fix_verification_issues.sql` in Supabase SQL Editor
- This changes FK references from the legacy `users` table to `profiles` table

**Issue**: Tests fail with "Could not find the 'column_name' column in the schema cache"
- **Solution**: Run `backend/migrations/fix_verification_issues.sql` in Supabase SQL Editor
- This adds missing columns: `test_results`, `tags`, `coins_reward`

**Issue**: Tests fail with "invalid input syntax for type uuid"
- **Solution**: Run `backend/migrations/fix_verification_issues.sql` in Supabase SQL Editor
- This changes `achievement_id` column to TEXT type

**Issue**: Tests fail with "Cannot coerce the result to a single JSON object"
- **Solution**: This occurs when trying to update a row that doesn't exist
- Ensure test profile is created successfully (check RLS policies)

### Test Data Cleanup

Tests automatically clean up test data, but if needed:

```sql
-- Manual cleanup (use with caution!)
DELETE FROM user_activity WHERE user_id LIKE 'test_%';
DELETE FROM user_achievements WHERE user_id LIKE 'test_%';
DELETE FROM submissions WHERE user_id LIKE 'test_%';
-- ... etc
```

## Success Criteria

All verification passes when:

- ✅ All 34 tables verified to exist with correct schema
- ✅ All CRUD operations functional for each table
- ✅ All data flow patterns working correctly
- ✅ Foreign key relationships intact
- ✅ No orphaned records in database
- ✅ All API endpoints respond correctly
- ✅ Error handling works for edge cases
- ✅ Fallback mechanisms functional

## Next Steps

After verification:

1. **Fix Issues**: Address any failed tests or SQL warnings
2. **Document Findings**: Update database documentation
3. **Optimize**: Address performance index recommendations
4. **Schedule**: Set up regular verification runs (CI/CD)

## Contributing

When adding new features:

1. Add corresponding test cases to appropriate test suite
2. Update SQL verification queries if new tables/columns added
3. Update manual checklist with new API endpoints
4. Run full test suite before committing

## Support

For issues or questions:
- Check test output for specific error messages
- Review SQL query results in Supabase Dashboard
- Consult database schema documentation in `backend/data/`

