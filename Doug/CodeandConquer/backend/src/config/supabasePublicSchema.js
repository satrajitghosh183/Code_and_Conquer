/**
 * Supabase Public Schema Reference
 * 
 * This file documents all public schema tables available in the database.
 * These are the main application tables for CodeandConquer.
 */

export const PUBLIC_TABLES = {
  // User & Profile
  PROFILES: 'public.profiles',
  USER_PROGRESS: 'public.user_progress',
  USER_SETTINGS: 'public.user_settings',
  USER_ACHIEVEMENTS: 'public.user_achievements',
  USER_ACTIVITY: 'public.user_activity',
  AUTH_PROVIDERS: 'public.auth_providers',
  USERS: 'public.users',
  
  // Problems & Submissions
  PROBLEMS: 'public.problems',
  PROBLEM_STATS: 'public.problem_stats',
  PROBLEM_TAGS: 'public.problem_tags',
  PROBLEM_VERSIONS: 'public.problem_versions',
  SUBMISSIONS: 'public.submissions',
  TEST_CASES: 'public.test_cases',
  
  // Game & Matches
  MATCHES: 'public.matches',
  MATCH_RESULTS: 'public.match_results',
  GAME_ACTIONS: 'public.game_actions',
  TOWERS: 'public.towers',
  PLAYER_INVENTORY: 'public.player_inventory',
  
  // Leaderboards & Achievements
  LEADERBOARDS: 'public.leaderboards',
  ACHIEVEMENTS: 'public.achievements',
  
  // Payments & Subscriptions
  CUSTOMERS: 'public.customers',
  SUBSCRIPTIONS: 'public.subscriptions',
  TRANSACTIONS: 'public.transactions',
  ENTITLEMENTS: 'public.entitlements',
  
  // Content & Media
  CONTENT_MODULES: 'public.content_modules',
  MEDIA_FILES: 'public.media_files',
  
  // Career & Jobs
  COMPANIES: 'public.companies',
  JOBS: 'public.jobs',
  JOB_SKILLS: 'public.job_skills',
  CAREER_RECOMMENDATIONS: 'public.career_recommendations',
  
  // Analytics & Logging
  EVENT_LOGS: 'public.event_logs',
  PERFORMANCE_METRICS: 'public.performance_metrics',
  ADS: 'public.ads',
  AB_TESTS: 'public.ab_tests',
  
  // Tasks
  TASKS: 'public.tasks',
  TASK_INTEGRATIONS: 'public.task_integrations',
};

// Field mappings for key tables
export const PROFILES_FIELDS = {
  id: 'id',
  username: 'username',
  email: 'email',
  fullName: 'full_name',
  avatarUrl: 'avatar_url',
  bio: 'bio',
  dateJoined: 'date_joined',
  lastActive: 'last_active',
  isPremium: 'is_premium',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  subscriptionTier: 'subscription_tier',
};

export const PROBLEMS_FIELDS = {
  id: 'id',
  title: 'title',
  slug: 'slug',
  description: 'description',
  difficulty: 'difficulty',
  category: 'category',
  xpReward: 'xp_reward',
  timeLimitMs: 'time_limit_ms',
  memoryLimitMb: 'memory_limit_mb',
  starterCode: 'starter_code',
  solutionCode: 'solution_code',
  hints: 'hints',
  isPremium: 'is_premium',
  createdBy: 'created_by',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  tierRequired: 'tier_required',
};

export const SUBMISSIONS_FIELDS = {
  id: 'id',
  userId: 'user_id',
  problemId: 'problem_id',
  code: 'code',
  language: 'language',
  verdict: 'verdict',
  executionTimeMs: 'execution_time_ms',
  memoryUsedMb: 'memory_used_mb',
  testCasesPassed: 'test_cases_passed',
  testCasesTotal: 'test_cases_total',
  score: 'score',
  submittedAt: 'submitted_at',
};

export const MATCHES_FIELDS = {
  id: 'id',
  player1Id: 'player1_id',
  player2Id: 'player2_id',
  problemId: 'problem_id',
  status: 'status',
  winnerId: 'winner_id',
  startTime: 'start_time',
  endTime: 'end_time',
  matchType: 'match_type',
  createdAt: 'created_at',
};

export const USER_PROGRESS_FIELDS = {
  id: 'id',
  userId: 'user_id',
  codingLevel: 'coding_level',
  totalXp: 'total_xp',
  currentRank: 'current_rank',
  rankLevel: 'rank_level',
  badges: 'badges',
  currentStreak: 'current_streak',
  longestStreak: 'longest_streak',
  lastActivityDate: 'last_activity_date',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

export const SUBSCRIPTIONS_FIELDS = {
  id: 'id',
  userId: 'user_id',
  membershipType: 'membership_type',
  paymentStatus: 'payment_status',
  startDate: 'start_date',
  endDate: 'end_date',
  renewalDate: 'renewal_date',
  stripeSubscriptionId: 'stripe_subscription_id',
  createdAt: 'created_at',
  stripeCustomerId: 'stripe_customer_id',
  stripePriceId: 'stripe_price_id',
  autoRenewal: 'auto_renewal',
  status: 'status',
  priceId: 'price_id',
  currentPeriodStart: 'current_period_start',
  currentPeriodEnd: 'current_period_end',
  canceledAt: 'canceled_at',
  updatedAt: 'updated_at',
};

export function getPublicTableName(fullTableName) {
  return fullTableName.replace('public.', '');
}

export function isPublicTable(tableName) {
  return Object.values(PUBLIC_TABLES).includes(tableName) || 
         tableName.startsWith('public.');
}

