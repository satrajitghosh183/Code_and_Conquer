/**
 * TypeScript/JavaScript Type Definitions for Public Schema Tables
 * 
 * These types can be used for type checking and IDE autocomplete
 * when working with public schema tables.
 */

/**
 * @typedef {Object} Profile
 * @property {string} id - User UUID (FK to auth.users)
 * @property {string|null} username - Username
 * @property {string|null} email - Email
 * @property {string|null} full_name - Full name
 * @property {string|null} avatar_url - Avatar URL
 * @property {string|null} bio - Bio
 * @property {string|null} date_joined - Date joined timestamp
 * @property {string|null} last_active - Last active timestamp
 * @property {boolean} is_premium - Is premium flag
 * @property {string|null} created_at - Creation timestamp
 * @property {string|null} updated_at - Update timestamp
 * @property {string} subscription_tier - Subscription tier
 */

/**
 * @typedef {Object} Problem
 * @property {string} id - Problem UUID
 * @property {string} title - Problem title
 * @property {string} slug - Problem slug (unique)
 * @property {string} description - Problem description
 * @property {string} difficulty - Difficulty (easy, medium, hard)
 * @property {string|null} category - Category
 * @property {number} xp_reward - XP reward
 * @property {number} time_limit_ms - Time limit in milliseconds
 * @property {number} memory_limit_mb - Memory limit in MB
 * @property {Object|null} starter_code - Starter code (JSONB)
 * @property {Object|null} solution_code - Solution code (JSONB)
 * @property {Array} hints - Hints array
 * @property {boolean} is_premium - Is premium flag
 * @property {string|null} created_by - Creator UUID (FK to auth.users)
 * @property {string|null} created_at - Creation timestamp
 * @property {string|null} updated_at - Update timestamp
 * @property {string} tier_required - Tier required
 */

/**
 * @typedef {Object} Submission
 * @property {string} id - Submission UUID
 * @property {string} user_id - User UUID (FK to auth.users)
 * @property {string} problem_id - Problem UUID (FK to problems)
 * @property {string} code - Submitted code
 * @property {string} language - Programming language
 * @property {string|null} verdict - Verdict (accepted, wrong_answer, etc.)
 * @property {number|null} execution_time_ms - Execution time in milliseconds
 * @property {number|null} memory_used_mb - Memory used in MB
 * @property {number} test_cases_passed - Test cases passed
 * @property {number} test_cases_total - Total test cases
 * @property {number} score - Score
 * @property {string} submitted_at - Submission timestamp
 */

/**
 * @typedef {Object} Match
 * @property {string} id - Match UUID
 * @property {string|null} player1_id - Player 1 UUID (FK to auth.users)
 * @property {string|null} player2_id - Player 2 UUID (FK to auth.users)
 * @property {string|null} problem_id - Problem UUID (FK to problems)
 * @property {string} status - Status (waiting, running, finished)
 * @property {string|null} winner_id - Winner UUID (FK to auth.users)
 * @property {string|null} start_time - Start time timestamp
 * @property {string|null} end_time - End time timestamp
 * @property {string} match_type - Match type (ranked, casual)
 * @property {string} created_at - Creation timestamp
 */

/**
 * @typedef {Object} UserProgress
 * @property {string} id - Progress UUID
 * @property {string} user_id - User UUID (FK to auth.users, unique)
 * @property {string} coding_level - Coding level
 * @property {number} total_xp - Total XP
 * @property {string} current_rank - Current rank
 * @property {number} rank_level - Rank level
 * @property {Array} badges - Badges array
 * @property {number} current_streak - Current streak
 * @property {number} longest_streak - Longest streak
 * @property {string|null} last_activity_date - Last activity date
 * @property {string} created_at - Creation timestamp
 * @property {string} updated_at - Update timestamp
 */

/**
 * @typedef {Object} Subscription
 * @property {string} id - Subscription UUID
 * @property {string} user_id - User UUID (FK to auth.users)
 * @property {string} membership_type - Membership type
 * @property {string} payment_status - Payment status
 * @property {string} start_date - Start date timestamp
 * @property {string|null} end_date - End date timestamp
 * @property {string|null} renewal_date - Renewal date timestamp
 * @property {string|null} stripe_subscription_id - Stripe subscription ID
 * @property {string} created_at - Creation timestamp
 * @property {string|null} stripe_customer_id - Stripe customer ID
 * @property {string|null} stripe_price_id - Stripe price ID
 * @property {boolean} auto_renewal - Auto renewal flag
 * @property {string} status - Status (active, canceled, etc.)
 * @property {string} price_id - Price ID
 * @property {string} current_period_start - Current period start
 * @property {string} current_period_end - Current period end
 * @property {string|null} canceled_at - Canceled timestamp
 * @property {string} updated_at - Update timestamp
 */

/**
 * @typedef {Object} Leaderboard
 * @property {string} id - Leaderboard UUID
 * @property {string} user_id - User UUID (FK to auth.users)
 * @property {string} leaderboard_type - Leaderboard type
 * @property {number} score - Score
 * @property {number|null} rank - Rank
 * @property {string|null} period_start - Period start date
 * @property {string|null} period_end - Period end date
 * @property {string} updated_at - Update timestamp
 */

/**
 * @typedef {Object} Achievement
 * @property {string} id - Achievement UUID
 * @property {string} name - Achievement name (unique)
 * @property {string} description - Description
 * @property {string|null} category - Category
 * @property {string|null} icon_url - Icon URL
 * @property {number} xp_reward - XP reward
 * @property {string} rarity - Rarity (common, rare, epic, legendary)
 * @property {Object|null} criteria - Criteria (JSONB)
 * @property {string} created_at - Creation timestamp
 */

/**
 * @typedef {Object} UserAchievement
 * @property {string} id - User achievement UUID
 * @property {string} user_id - User UUID (FK to auth.users)
 * @property {string} achievement_id - Achievement UUID (FK to achievements)
 * @property {string} earned_at - Earned timestamp
 * @property {Object} progress - Progress (JSONB)
 */

/**
 * @typedef {Object} MatchResult
 * @property {string} id - Result UUID
 * @property {string} match_id - Match UUID (FK to matches, unique)
 * @property {number} player1_score - Player 1 score
 * @property {number} player2_score - Player 2 score
 * @property {number} player1_damage_dealt - Player 1 damage dealt
 * @property {number} player2_damage_dealt - Player 2 damage dealt
 * @property {number} player1_towers_destroyed - Player 1 towers destroyed
 * @property {number} player2_towers_destroyed - Player 2 towers destroyed
 * @property {Object} bonuses - Bonuses (JSONB)
 * @property {string} created_at - Creation timestamp
 */

/**
 * @typedef {Object} GameAction
 * @property {string} id - Action UUID
 * @property {string} match_id - Match UUID (FK to matches)
 * @property {string|null} user_id - User UUID (FK to auth.users)
 * @property {string} action_type - Action type
 * @property {Object|null} action_data - Action data (JSONB)
 * @property {string} timestamp - Timestamp
 */

/**
 * @typedef {Object} Tower
 * @property {string} id - Tower UUID
 * @property {string} name - Tower name (unique)
 * @property {string} tower_type - Tower type
 * @property {number} base_hp - Base HP
 * @property {number} base_damage - Base damage
 * @property {number} unlock_level - Unlock level
 * @property {number} cost - Cost
 * @property {string|null} description - Description
 * @property {string|null} icon_url - Icon URL
 * @property {Array} buffs - Buffs array
 * @property {Array} debuffs - Debuffs array
 */

/**
 * @typedef {Object} TestCase
 * @property {string} id - Test case UUID
 * @property {string} problem_id - Problem UUID (FK to problems)
 * @property {Object} input - Input (JSONB)
 * @property {Object} expected_output - Expected output (JSONB)
 * @property {boolean} is_hidden - Is hidden flag
 * @property {string|null} explanation - Explanation
 * @property {number} weight - Weight
 * @property {string} created_at - Creation timestamp
 */

/**
 * @typedef {Object} Customer
 * @property {string} id - Customer UUID
 * @property {string} user_id - User UUID (FK to auth.users, unique)
 * @property {string} stripe_customer_id - Stripe customer ID (unique)
 * @property {string} created_at - Creation timestamp
 */

/**
 * @typedef {Object} Transaction
 * @property {string} id - Transaction UUID
 * @property {string} user_id - User UUID (FK to auth.users)
 * @property {number} amount - Amount
 * @property {string} currency - Currency (default: USD)
 * @property {string|null} payment_method - Payment method
 * @property {string|null} payment_provider_id - Payment provider ID
 * @property {string} transaction_type - Transaction type
 * @property {string} status - Status (pending, completed, failed)
 * @property {string} created_at - Creation timestamp
 */

/**
 * @typedef {Object} EventLog
 * @property {string} id - Log UUID
 * @property {string|null} user_id - User UUID (FK to auth.users)
 * @property {string} event_name - Event name
 * @property {Object} event_data - Event data (JSONB)
 * @property {string|null} ip_address - IP address
 * @property {string|null} user_agent - User agent
 * @property {string} created_at - Creation timestamp
 */

/**
 * @typedef {Object} UserActivity
 * @property {string} id - Activity UUID
 * @property {string|null} user_id - User UUID (FK to auth.users)
 * @property {string} activity_type - Activity type
 * @property {string|null} module - Module
 * @property {number} time_spent_seconds - Time spent in seconds
 * @property {Object} metadata - Metadata (JSONB)
 * @property {string} created_at - Creation timestamp
 */

/**
 * @typedef {Object} UserSettings
 * @property {string} id - Settings UUID
 * @property {string} user_id - User UUID (FK to auth.users, unique)
 * @property {boolean} notifications_enabled - Notifications enabled
 * @property {boolean} email_notifications - Email notifications
 * @property {string} theme - Theme (dark, light)
 * @property {string} privacy_level - Privacy level
 * @property {string} language - Language
 * @property {string} created_at - Creation timestamp
 * @property {string} updated_at - Update timestamp
 */

/**
 * @typedef {Object} Job
 * @property {string} id - Job UUID
 * @property {string|null} company_id - Company UUID (FK to companies)
 * @property {string} title - Job title
 * @property {string} description - Description
 * @property {number|null} salary_min - Minimum salary
 * @property {number|null} salary_max - Maximum salary
 * @property {string|null} location - Location
 * @property {boolean} remote_allowed - Remote allowed flag
 * @property {string|null} experience_level - Experience level
 * @property {string} employment_type - Employment type
 * @property {string} posted_at - Posted timestamp
 * @property {string|null} expires_at - Expiration timestamp
 * @property {boolean} is_active - Is active flag
 */

/**
 * @typedef {Object} Company
 * @property {string} id - Company UUID
 * @property {string} name - Company name
 * @property {string|null} description - Description
 * @property {string|null} logo_url - Logo URL
 * @property {string|null} website - Website
 * @property {string|null} size - Company size
 * @property {string|null} industry - Industry
 * @property {string|null} location - Location
 * @property {string} created_at - Creation timestamp
 */

/**
 * @typedef {Object} MediaFile
 * @property {string} id - File UUID
 * @property {string|null} user_id - User UUID (FK to auth.users)
 * @property {string} file_type - File type
 * @property {string} file_url - File URL
 * @property {number|null} file_size_bytes - File size in bytes
 * @property {string|null} mime_type - MIME type
 * @property {string|null} storage_path - Storage path
 * @property {string} uploaded_at - Upload timestamp
 */

export const PublicTypes = {
  Profile: 'Profile',
  Problem: 'Problem',
  Submission: 'Submission',
  Match: 'Match',
  UserProgress: 'UserProgress',
  Subscription: 'Subscription',
  Leaderboard: 'Leaderboard',
  Achievement: 'Achievement',
  UserAchievement: 'UserAchievement',
  MatchResult: 'MatchResult',
  GameAction: 'GameAction',
  Tower: 'Tower',
  TestCase: 'TestCase',
  Customer: 'Customer',
  Transaction: 'Transaction',
  EventLog: 'EventLog',
  UserActivity: 'UserActivity',
  UserSettings: 'UserSettings',
  Job: 'Job',
  Company: 'Company',
  MediaFile: 'MediaFile',
};

