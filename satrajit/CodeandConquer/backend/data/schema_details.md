# Supabase Database Schema Documentation

**Generated:** 12/3/2025, 5:33:35 PM
**Database:** https://cbekdaqtdqqwzyexmfgp.supabase.co

---

## Summary

- **Total Tables:** 34
- **Total Columns:** 116
- **Total Relationships:** 6
- **Total Rows:** 31,546
- **Tables with Data:** 6

---

## Tables

### profiles

**Row Count:** 4

#### Columns

| Column Name | Type | Nullable | Sample Value |
|------------|------|----------|-------------|
| `id` | uuid | No | 65763e98-c3da-4f44-b11a-798dd2 |
| `username` | text | No | sauron_the_evil |
| `email` | text | No | to.satrajitghosh183@gmail.com |
| `full_name` | text | No | Satrajit Ghosh |
| `avatar_url` | text | No | https://cbekdaqtdqqwzyexmfgp.s |
| `bio` | text | No | I have the attention span of a |
| `date_joined` | timestamp/date | No | 2025-10-25T18:42:38.500524+00: |
| `last_active` | timestamp/date | No | 2025-10-25T18:42:38.500524+00: |
| `is_premium` | boolean | No | false |
| `created_at` | timestamp/date | No | 2025-10-25T18:42:38.500524+00: |
| `updated_at` | timestamp/date | No | 2025-10-31T12:33:16.126868+00: |
| `subscription_tier` | text | No | free |

---

### user_progress

**Row Count:** 0

#### Columns

| Column Name | Type | Nullable | Sample Value |
|------------|------|----------|-------------|
| `id` | unknown | Yes | NULL |
| `user_id` | unknown | Yes | NULL |
| `coding_level` | unknown | Yes | NULL |
| `total_xp` | unknown | Yes | NULL |
| `current_rank` | unknown | Yes | NULL |
| `rank_level` | unknown | Yes | NULL |
| `badges` | unknown | Yes | NULL |
| `current_streak` | unknown | Yes | NULL |
| `longest_streak` | unknown | Yes | NULL |
| `last_activity_date` | unknown | Yes | NULL |
| `created_at` | unknown | Yes | NULL |
| `updated_at` | unknown | Yes | NULL |

---

### user_settings

**Row Count:** 0

---

### user_achievements

**Row Count:** 0

---

### user_activity

**Row Count:** 0

---

### auth_providers

**Row Count:** 0

---

### users

**Row Count:** 1

#### Columns

| Column Name | Type | Nullable | Sample Value |
|------------|------|----------|-------------|
| `user_id` | uuid | No | 86ea9541-f1b0-4f28-baa3-7808ef |
| `leaderboard_rank` | integer | No | 1 |
| `username` | text | No | bob_john |
| `profile_picture` | text | No | https://example.com/avatar.png |
| `elo_rating` | integer | No | 1200 |
| `task_streak` | integer | No | 3 |
| `password` | text | No | hashed_password_here |
| `membership_status` | text | No | free |
| `daily_limit` | integer | No | 10 |

#### Relationships

- **References:** `users` via `user_id` → `id`
- **References:** `users` via `user_id` → `id`

---

### problems

**Row Count:** 2,359

#### Columns

| Column Name | Type | Nullable | Sample Value |
|------------|------|----------|-------------|
| `id` | uuid | No | c07f56a7-fe01-4d73-b1a2-3d71c7 |
| `title` | text | No | Reverse Integer |
| `slug` | text | No | reverse-integer |
| `description` | text | No | Given a signed 32-bit integer  |
| `difficulty` | text | No | Medium |
| `category` | null | Yes | NULL |
| `xp_reward` | integer | No | 0 |
| `time_limit_ms` | integer | No | 5000 |
| `memory_limit_mb` | integer | No | 256 |
| `starter_code` | null | Yes | NULL |
| `solution_code` | null | Yes | NULL |
| `hints` | array/json | No |  |
| `is_premium` | boolean | No | false |
| `created_by` | null | Yes | NULL |
| `created_at` | timestamp/date | No | 2025-11-14T21:15:05.229309+00: |
| `updated_at` | timestamp/date | No | 2025-11-14T21:15:05.229309+00: |
| `tier_required` | text | No | free |

#### Relationships

- **Referenced by:** `problem_versions` via `problem_id` → `id`
- **Referenced by:** `problem_versions` via `problem_id` → `id`
- **Referenced by:** `test_cases` via `problem_id` → `id`
- **Referenced by:** `test_cases` via `problem_id` → `id`

---

### problem_stats

**Row Count:** 0

---

### problem_tags

**Row Count:** 0

---

### problem_versions

**Row Count:** 9,436

#### Columns

| Column Name | Type | Nullable | Sample Value |
|------------|------|----------|-------------|
| `version_id` | integer | No | 1388 |
| `language` | text | No | javascript |
| `solution_code` | text | No | 
    ```javascript
function re |
| `explanation_md` | null | Yes | NULL |
| `created_at` | timestamp/date | No | 2025-11-14T21:16:33.374818 |
| `entry_point` | null | Yes | NULL |
| `problem_id` | uuid | No | 08957b92-4f52-41d3-915b-d2ce8f |

#### Relationships

- **References:** `problems` via `problem_id` → `id`
- **References:** `problems` via `problem_id` → `id`

---

### submissions

**Row Count:** 0

#### Columns

| Column Name | Type | Nullable | Sample Value |
|------------|------|----------|-------------|
| `id` | unknown | Yes | NULL |
| `user_id` | unknown | Yes | NULL |
| `problem_id` | unknown | Yes | NULL |
| `code` | unknown | Yes | NULL |
| `language` | unknown | Yes | NULL |
| `verdict` | unknown | Yes | NULL |
| `execution_time_ms` | unknown | Yes | NULL |
| `memory_used_mb` | unknown | Yes | NULL |
| `test_cases_passed` | unknown | Yes | NULL |
| `test_cases_total` | unknown | Yes | NULL |
| `score` | unknown | Yes | NULL |
| `submitted_at` | unknown | Yes | NULL |

---

### test_cases

**Row Count:** 19,738

#### Columns

| Column Name | Type | Nullable | Sample Value |
|------------|------|----------|-------------|
| `id` | uuid | No | 724e125f-5d49-4fb5-9e10-a9e99c |
| `problem_id` | uuid | No | 1f5066e5-9864-4b86-85e2-5e983d |
| `input` | json/object | No | [object Object] |
| `expected_output` | json/object | No | [object Object] |
| `is_hidden` | boolean | No | false |
| `explanation` | null | Yes | NULL |
| `weight` | integer | No | 1 |
| `created_at` | timestamp/date | No | 2025-11-14T21:36:34.511855+00: |

#### Relationships

- **References:** `problems` via `problem_id` → `id`
- **References:** `problems` via `problem_id` → `id`

---

### matches

**Row Count:** 0

#### Columns

| Column Name | Type | Nullable | Sample Value |
|------------|------|----------|-------------|
| `id` | unknown | Yes | NULL |
| `player1_id` | unknown | Yes | NULL |
| `player2_id` | unknown | Yes | NULL |
| `problem_id` | unknown | Yes | NULL |
| `status` | unknown | Yes | NULL |
| `winner_id` | unknown | Yes | NULL |
| `start_time` | unknown | Yes | NULL |
| `end_time` | unknown | Yes | NULL |
| `match_type` | unknown | Yes | NULL |
| `created_at` | unknown | Yes | NULL |

---

### match_results

**Row Count:** 0

---

### game_actions

**Row Count:** 0

---

### towers

**Row Count:** 0

---

### player_inventory

**Row Count:** 0

---

### leaderboards

**Row Count:** 0

---

### achievements

**Row Count:** 0

---

### customers

**Row Count:** 0

---

### subscriptions

**Row Count:** 0

#### Columns

| Column Name | Type | Nullable | Sample Value |
|------------|------|----------|-------------|
| `id` | unknown | Yes | NULL |
| `user_id` | unknown | Yes | NULL |
| `membership_type` | unknown | Yes | NULL |
| `payment_status` | unknown | Yes | NULL |
| `start_date` | unknown | Yes | NULL |
| `end_date` | unknown | Yes | NULL |
| `renewal_date` | unknown | Yes | NULL |
| `stripe_subscription_id` | unknown | Yes | NULL |
| `created_at` | unknown | Yes | NULL |
| `stripe_customer_id` | unknown | Yes | NULL |
| `stripe_price_id` | unknown | Yes | NULL |
| `auto_renewal` | unknown | Yes | NULL |
| `status` | unknown | Yes | NULL |
| `price_id` | unknown | Yes | NULL |
| `current_period_start` | unknown | Yes | NULL |
| `current_period_end` | unknown | Yes | NULL |
| `canceled_at` | unknown | Yes | NULL |
| `updated_at` | unknown | Yes | NULL |

---

### transactions

**Row Count:** 0

---

### entitlements

**Row Count:** 0

---

### content_modules

**Row Count:** 8

#### Columns

| Column Name | Type | Nullable | Sample Value |
|------------|------|----------|-------------|
| `id` | uuid | No | e03d3a1e-607d-48c1-8ff0-fa7b4a |
| `title` | text | No | Strings |
| `content_type` | null | Yes | NULL |
| `content_url` | text | No | https://cbekdaqtdqqwzyexmfgp.s |
| `description` | text | No | In programming, Strings are th |
| `duration_seconds` | integer | No | 40 |
| `difficulty` | null | Yes | NULL |
| `tags` | array/json | No |  |
| `view_count` | integer | No | 0 |
| `is_premium` | boolean | No | false |
| `created_at` | timestamp/date | No | 2025-11-19T00:24:40.198707+00: |

---

### media_files

**Row Count:** 0

---

### companies

**Row Count:** 0

---

### jobs

**Row Count:** 0

---

### job_skills

**Row Count:** 0

---

### career_recommendations

**Row Count:** 0

---

### event_logs

**Row Count:** 0

---

### performance_metrics

**Row Count:** 0

---

### ads

**Row Count:** 0

---

### ab_tests

**Row Count:** 0

---

## Relationship Diagram

```
users.user_id → users.id
users.user_id → users.id
problem_versions.problem_id → problems.id
problem_versions.problem_id → problems.id
test_cases.problem_id → problems.id
test_cases.problem_id → problems.id
```

