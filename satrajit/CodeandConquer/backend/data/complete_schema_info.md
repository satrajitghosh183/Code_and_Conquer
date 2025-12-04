# Complete Supabase Database Schema Documentation

**Generated:** 12/3/2025, 5:31:40 PM
**Database:** https://cbekdaqtdqqwzyexmfgp.supabase.co

---

## 📊 Summary

- **Total Tables:** 34
- **Total Columns (inferred):** 116
- **Total Rows:** 31,546
- **Tables with Data:** 6
- **Empty Tables:** 28

> ⚠️ **Note:** For complete column details with exact PostgreSQL types, constraints, and relationships, run the SQL queries in Supabase Dashboard (see SQL Queries section below).

---

## 📋 Tables

### User & Profile

#### `profiles`

**Row Count:** 4

**Columns:**

| Column Name | Type | Nullable | Sample Value |
|------------|------|----------|-------------|
| `id` | uuid | No | 65763e98-c3da-4f44-b11a-798dd21b2d89 |
| `username` | text | No | sauron_the_evil |
| `email` | text | No | to.satrajitghosh183@gmail.com |
| `full_name` | text | No | Satrajit Ghosh |
| `avatar_url` | text | No | https://cbekdaqtdqqwzyexmfgp.supabase.co |
| `bio` | text | No | I have the attention span of a toddler |
| `date_joined` | timestamp | No | 2025-10-25T18:42:38.500524+00:00 |
| `last_active` | timestamp | No | 2025-10-25T18:42:38.500524+00:00 |
| `is_premium` | boolean | No | false |
| `created_at` | timestamp | No | 2025-10-25T18:42:38.500524+00:00 |
| `updated_at` | timestamp | No | 2025-10-31T12:33:16.126868+00:00 |
| `subscription_tier` | text | No | free |

<details>
<summary>Sample Row Data</summary>

```json
{
  "id": "65763e98-c3da-4f44-b11a-798dd21b2d89",
  "username": "sauron_the_evil",
  "email": "to.satrajitghosh183@gmail.com",
  "full_name": "Satrajit Ghosh",
  "avatar_url": "https://cbekdaqtdqqwzyexmfgp.supabase.co/storage/v1/object/public/avatars/65763e98-c3da-4f44-b11a-798dd21b2d89/1761913989220.png",
  "bio": "I have the attention span of a toddler",
  "date_joined": "2025-10-25T18:42:38.500524+00:00",
  "last_active": "2025-10-25T18:42:38.500524+00:00",
  "is_premium": false,
  "created_at": "2025-10-25T18:42:38.500524+00:00",
  "updated_at": "2025-10-31T12:33:16.126868+00:00",
  "subscription_tier": "free"
}
```

</details>

---

#### `users`

**Row Count:** 1

**Columns:**

| Column Name | Type | Nullable | Sample Value |
|------------|------|----------|-------------|
| `user_id` | uuid | No | 86ea9541-f1b0-4f28-baa3-7808ef1e57bf |
| `leaderboard_rank` | integer | No | 1 |
| `username` | text | No | bob_john |
| `profile_picture` | text | No | https://example.com/avatar.png |
| `elo_rating` | integer | No | 1200 |
| `task_streak` | integer | No | 3 |
| `password` | text | No | hashed_password_here |
| `membership_status` | text | No | free |
| `daily_limit` | integer | No | 10 |

<details>
<summary>Sample Row Data</summary>

```json
{
  "user_id": "86ea9541-f1b0-4f28-baa3-7808ef1e57bf",
  "leaderboard_rank": 1,
  "username": "bob_john",
  "profile_picture": "https://example.com/avatar.png",
  "elo_rating": 1200,
  "task_streak": 3,
  "password": "hashed_password_here",
  "membership_status": "free",
  "daily_limit": 10
}
```

</details>

---

#### `user_progress`

**Row Count:** 0

**Columns:**

| Column Name | Type | Nullable | Sample Value |
|------------|------|----------|-------------|
| `id` | unknown | Yes | undefined |
| `user_id` | unknown | Yes | undefined |
| `coding_level` | unknown | Yes | undefined |
| `total_xp` | unknown | Yes | undefined |
| `current_rank` | unknown | Yes | undefined |
| `rank_level` | unknown | Yes | undefined |
| `badges` | unknown | Yes | undefined |
| `current_streak` | unknown | Yes | undefined |
| `longest_streak` | unknown | Yes | undefined |
| `last_activity_date` | unknown | Yes | undefined |
| `created_at` | unknown | Yes | undefined |
| `updated_at` | unknown | Yes | undefined |

---

#### `user_settings`

**Row Count:** 0

*No column information available. Run SQL queries to get complete structure.*

---

#### `user_achievements`

**Row Count:** 0

*No column information available. Run SQL queries to get complete structure.*

---

#### `user_activity`

**Row Count:** 0

*No column information available. Run SQL queries to get complete structure.*

---

#### `auth_providers`

**Row Count:** 0

*No column information available. Run SQL queries to get complete structure.*

---

### Problems & Submissions

#### `problems`

**Row Count:** 2,359

**Columns:**

| Column Name | Type | Nullable | Sample Value |
|------------|------|----------|-------------|
| `id` | uuid | No | c07f56a7-fe01-4d73-b1a2-3d71c7c8e83f |
| `title` | text | No | Reverse Integer |
| `slug` | text | No | reverse-integer |
| `description` | text | No | Given a signed 32-bit integer `x`, retur |
| `difficulty` | text | No | Medium |
| `category` | null | Yes | NULL |
| `xp_reward` | integer | No | 0 |
| `time_limit_ms` | integer | No | 5000 |
| `memory_limit_mb` | integer | No | 256 |
| `starter_code` | null | Yes | NULL |
| `solution_code` | null | Yes | NULL |
| `hints` | array/jsonb | No | [] |
| `is_premium` | boolean | No | false |
| `created_by` | null | Yes | NULL |
| `created_at` | timestamp | No | 2025-11-14T21:15:05.229309+00:00 |
| `updated_at` | timestamp | No | 2025-11-14T21:15:05.229309+00:00 |
| `tier_required` | text | No | free |

<details>
<summary>Sample Row Data</summary>

```json
{
  "id": "c07f56a7-fe01-4d73-b1a2-3d71c7c8e83f",
  "title": "Reverse Integer",
  "slug": "reverse-integer",
  "description": "Given a signed 32-bit integer `x`, return `x` _with its digits reversed_. If reversing `x` causes the value to go outside the signed 32-bit integer range `[-231, 231 - 1]`, then return `0`.\n\n**Assume the environment does not allow you to store 64-bit integers (signed or unsigned).**\n\n**Example 1:**\n\n**Input:** x = 123\n**Output:** 321\n\n**Example 2:**\n\n**Input:** x = -123\n**Output:** -321\n\n**Example 3:**\n\n**Input:** x = 120\n**Output:** 21\n\n**Constraints:**\n\n*   `-231 <= x <= 231 - 1`",
  "difficulty": "Medium",
  "category": null,
  "xp_reward": 0,
  "time_limit_ms": 5000,
  "memory_limit_mb": 256,
  "starter_code": null,
  "solution_code": null,
  "hints": [],
  "is_premium": false,
  "created_by": null,
  "created_at": "2025-11-14T21:15:05.229309+00:00",
  "updated_at": "2025-11-14T21:15:05.229309+00:00",
  "tier_required": "free"
}
```

</details>

---

#### `problem_stats`

**Row Count:** 0

*No column information available. Run SQL queries to get complete structure.*

---

#### `problem_tags`

**Row Count:** 0

*No column information available. Run SQL queries to get complete structure.*

---

#### `problem_versions`

**Row Count:** 9,436

**Columns:**

| Column Name | Type | Nullable | Sample Value |
|------------|------|----------|-------------|
| `version_id` | integer | No | 1388 |
| `language` | text | No | javascript |
| `solution_code` | text | No | 
    ```javascript
function reverseStrin |
| `explanation_md` | null | Yes | NULL |
| `created_at` | timestamp | No | 2025-11-14T21:16:33.374818 |
| `entry_point` | null | Yes | NULL |
| `problem_id` | uuid | No | 08957b92-4f52-41d3-915b-d2ce8fe5612f |

<details>
<summary>Sample Row Data</summary>

```json
{
  "version_id": 1388,
  "language": "javascript",
  "solution_code": "\n    ```javascript\nfunction reverseString(s) {\n    let left = 0, right = s.length - 1;\n    while (left < right) {\n        [s[left], s[right]] = [s[right], s[left]];\n        left++;\n        right--;\n    }\n}\n```\n    \n    The algorithm follows a two-pointer approach. Initialize two pointers, `left` and `right`, at the beginning and end of the input array. Using a while loop, run until the `left` pointer is greater than or equal to the `right` pointer. In the loop, swap the elements at the `left` and `right` pointers. Increment the `left` pointer and decrement the `right` pointer. Repeat this process until the loop terminates, which means the entire string has been reversed.\n    ",
  "explanation_md": null,
  "created_at": "2025-11-14T21:16:33.374818",
  "entry_point": null,
  "problem_id": "08957b92-4f52-41d3-915b-d2ce8fe5612f"
}
```

</details>

---

#### `submissions`

**Row Count:** 0

**Columns:**

| Column Name | Type | Nullable | Sample Value |
|------------|------|----------|-------------|
| `id` | unknown | Yes | undefined |
| `user_id` | unknown | Yes | undefined |
| `problem_id` | unknown | Yes | undefined |
| `code` | unknown | Yes | undefined |
| `language` | unknown | Yes | undefined |
| `verdict` | unknown | Yes | undefined |
| `execution_time_ms` | unknown | Yes | undefined |
| `memory_used_mb` | unknown | Yes | undefined |
| `test_cases_passed` | unknown | Yes | undefined |
| `test_cases_total` | unknown | Yes | undefined |
| `score` | unknown | Yes | undefined |
| `submitted_at` | unknown | Yes | undefined |

---

#### `test_cases`

**Row Count:** 19,738

**Columns:**

| Column Name | Type | Nullable | Sample Value |
|------------|------|----------|-------------|
| `id` | uuid | No | 724e125f-5d49-4fb5-9e10-a9e99ce063b3 |
| `problem_id` | uuid | No | 1f5066e5-9864-4b86-85e2-5e983d8df9eb |
| `input` | jsonb | No | {"raw":"nums = [10,20,30]"} |
| `expected_output` | jsonb | No | {"raw":"10/(20/30)"} |
| `is_hidden` | boolean | No | false |
| `explanation` | null | Yes | NULL |
| `weight` | integer | No | 1 |
| `created_at` | timestamp | No | 2025-11-14T21:36:34.511855+00:00 |

<details>
<summary>Sample Row Data</summary>

```json
{
  "id": "724e125f-5d49-4fb5-9e10-a9e99ce063b3",
  "problem_id": "1f5066e5-9864-4b86-85e2-5e983d8df9eb",
  "input": {
    "raw": "nums = [10,20,30]"
  },
  "expected_output": {
    "raw": "10/(20/30)"
  },
  "is_hidden": false,
  "explanation": null,
  "weight": 1,
  "created_at": "2025-11-14T21:36:34.511855+00:00"
}
```

</details>

---

### Game & Matches

#### `matches`

**Row Count:** 0

**Columns:**

| Column Name | Type | Nullable | Sample Value |
|------------|------|----------|-------------|
| `id` | unknown | Yes | undefined |
| `player1_id` | unknown | Yes | undefined |
| `player2_id` | unknown | Yes | undefined |
| `problem_id` | unknown | Yes | undefined |
| `status` | unknown | Yes | undefined |
| `winner_id` | unknown | Yes | undefined |
| `start_time` | unknown | Yes | undefined |
| `end_time` | unknown | Yes | undefined |
| `match_type` | unknown | Yes | undefined |
| `created_at` | unknown | Yes | undefined |

---

#### `match_results`

**Row Count:** 0

*No column information available. Run SQL queries to get complete structure.*

---

#### `game_actions`

**Row Count:** 0

*No column information available. Run SQL queries to get complete structure.*

---

#### `towers`

**Row Count:** 0

*No column information available. Run SQL queries to get complete structure.*

---

#### `player_inventory`

**Row Count:** 0

*No column information available. Run SQL queries to get complete structure.*

---

### Leaderboards & Achievements

#### `leaderboards`

**Row Count:** 0

*No column information available. Run SQL queries to get complete structure.*

---

#### `achievements`

**Row Count:** 0

*No column information available. Run SQL queries to get complete structure.*

---

### Payments & Subscriptions

#### `customers`

**Row Count:** 0

*No column information available. Run SQL queries to get complete structure.*

---

#### `subscriptions`

**Row Count:** 0

**Columns:**

| Column Name | Type | Nullable | Sample Value |
|------------|------|----------|-------------|
| `id` | unknown | Yes | undefined |
| `user_id` | unknown | Yes | undefined |
| `membership_type` | unknown | Yes | undefined |
| `payment_status` | unknown | Yes | undefined |
| `start_date` | unknown | Yes | undefined |
| `end_date` | unknown | Yes | undefined |
| `renewal_date` | unknown | Yes | undefined |
| `stripe_subscription_id` | unknown | Yes | undefined |
| `created_at` | unknown | Yes | undefined |
| `stripe_customer_id` | unknown | Yes | undefined |
| `stripe_price_id` | unknown | Yes | undefined |
| `auto_renewal` | unknown | Yes | undefined |
| `status` | unknown | Yes | undefined |
| `price_id` | unknown | Yes | undefined |
| `current_period_start` | unknown | Yes | undefined |
| `current_period_end` | unknown | Yes | undefined |
| `canceled_at` | unknown | Yes | undefined |
| `updated_at` | unknown | Yes | undefined |

---

#### `transactions`

**Row Count:** 0

*No column information available. Run SQL queries to get complete structure.*

---

#### `entitlements`

**Row Count:** 0

*No column information available. Run SQL queries to get complete structure.*

---

### Content & Media

#### `content_modules`

**Row Count:** 8

**Columns:**

| Column Name | Type | Nullable | Sample Value |
|------------|------|----------|-------------|
| `id` | uuid | No | e03d3a1e-607d-48c1-8ff0-fa7b4ad6096a |
| `title` | text | No | Strings |
| `content_type` | null | Yes | NULL |
| `content_url` | text | No | https://cbekdaqtdqqwzyexmfgp.supabase.co |
| `description` | text | No | In programming, Strings are the most com |
| `duration_seconds` | integer | No | 40 |
| `difficulty` | null | Yes | NULL |
| `tags` | array/jsonb | No | [] |
| `view_count` | integer | No | 0 |
| `is_premium` | boolean | No | false |
| `created_at` | timestamp | No | 2025-11-19T00:24:40.198707+00:00 |

<details>
<summary>Sample Row Data</summary>

```json
{
  "id": "e03d3a1e-607d-48c1-8ff0-fa7b4ad6096a",
  "title": "Strings",
  "content_type": null,
  "content_url": "https://cbekdaqtdqqwzyexmfgp.supabase.co/storage/v1/object/public/text_audio/stringsmodule.mp3",
  "description": "In programming, Strings are the most common and easiest method of working with text, especially relatively short amounts of text like a few sentences. A String is a “string” of characters, but it’s often much more. In most languages (e.g. C++, Java, Python, and JavaScript) a String is not a literal array of characters, but a pointer to the actual data. Strings contain built-in features for comparison, creating subsections of Strings, concatenation, and more, which makes it possible to edit the content of a String. The custom comparison operation is important because since Strings are pointers in most languages, normal “equals” comparisons compare the pointers, not the actual text content of the Strings, which can be confusing. An understanding of Strings is vital to effective programming.\n",
  "duration_seconds": 40,
  "difficulty": null,
  "tags": [],
  "view_count": 0,
  "is_premium": false,
  "created_at": "2025-11-19T00:24:40.198707+00:00"
}
```

</details>

---

#### `media_files`

**Row Count:** 0

*No column information available. Run SQL queries to get complete structure.*

---

### Career & Jobs

#### `companies`

**Row Count:** 0

*No column information available. Run SQL queries to get complete structure.*

---

#### `jobs`

**Row Count:** 0

*No column information available. Run SQL queries to get complete structure.*

---

#### `job_skills`

**Row Count:** 0

*No column information available. Run SQL queries to get complete structure.*

---

#### `career_recommendations`

**Row Count:** 0

*No column information available. Run SQL queries to get complete structure.*

---

### Analytics & Logging

#### `event_logs`

**Row Count:** 0

*No column information available. Run SQL queries to get complete structure.*

---

#### `performance_metrics`

**Row Count:** 0

*No column information available. Run SQL queries to get complete structure.*

---

#### `ads`

**Row Count:** 0

*No column information available. Run SQL queries to get complete structure.*

---

#### `ab_tests`

**Row Count:** 0

*No column information available. Run SQL queries to get complete structure.*

---

## 🔍 SQL Queries for Complete Schema Information

To get **complete and accurate** schema information including:
- Exact PostgreSQL data types
- All constraints (primary keys, foreign keys, unique, check)
- Indexes
- Relationships
- Table sizes and statistics

**Run these queries in Supabase Dashboard → SQL Editor:**

See file: `backend/src/scripts/get_detailed_schema.sql`

### Quick Start Queries:

1. **Complete table structure with all columns:**
```sql
SELECT 
  t.table_name,
  c.column_name,
  c.data_type,
  c.is_nullable,
  c.column_default
FROM information_schema.tables t
JOIN information_schema.columns c 
  ON t.table_schema = c.table_schema AND t.table_name = c.table_name
WHERE t.table_schema = 'public'
ORDER BY t.table_name, c.ordinal_position;
```

2. **Foreign key relationships:**
```sql
SELECT
  tc.table_name AS from_table,
  kcu.column_name AS from_column,
  ccu.table_name AS to_table,
  ccu.column_name AS to_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public';
```

