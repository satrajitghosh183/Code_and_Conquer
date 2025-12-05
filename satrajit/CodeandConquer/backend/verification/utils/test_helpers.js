/**
 * Test Helpers - Common utilities for database verification tests
 */

import { v4 as uuidv4 } from 'uuid';
import database from '../../src/config/database.js';
import publicDatabaseService from '../../src/services/publicDatabaseService.js';

/**
 * Generate a random test user ID
 */
export function generateTestUserId() {
  return uuidv4();
}

/**
 * Generate a random test email
 */
export function generateTestEmail() {
  return `test_${Date.now()}_${Math.random().toString(36).substring(7)}@test.com`;
}

/**
 * Generate a random test username
 */
export function generateTestUsername() {
  return `testuser_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

/**
 * Create a test user profile
 * After running fix_verification_issues.sql, this should work with service_role
 */
export async function createTestProfile(userId = null) {
  const testUserId = userId || generateTestUserId();
  const testEmail = generateTestEmail();
  const testUsername = generateTestUsername();

  const profileData = {
    id: testUserId,
    username: testUsername,
    email: testEmail,
    full_name: 'Test User',
    avatar_url: 'https://example.com/avatar.png',
    bio: 'Test user for verification',
    date_joined: new Date().toISOString(),
    last_active: new Date().toISOString(),
    is_premium: false,
    subscription_tier: 'free',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    const supabase = database.getSupabaseClient();
    if (supabase) {
      // Try direct insert with supabase client (uses service_role key)
      const { data, error } = await supabase
        .from('profiles')
        .insert([profileData])
        .select()
        .single();
      
      if (error) {
        console.error('Error inserting into profiles:', error);
        console.warn('Could not create test profile in DB:', error.message);
        return profileData; // Return local data as fallback
      }
      return data || profileData;
    }
    return profileData;
  } catch (error) {
    console.warn('Could not create test profile in DB:', error.message);
    return profileData;
  }
}

/**
 * Check if a test profile exists in the database
 */
export async function profileExistsInDB(userId) {
  try {
    const supabase = database.getSupabaseClient();
    if (!supabase) return false;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();
    
    return !error && data !== null;
  } catch {
    return false;
  }
}

/**
 * Clean up test data
 */
export async function cleanupTestData(userId) {
  if (!userId) return;

  try {
    const supabase = database.getSupabaseClient();
    if (!supabase) return;

    // Delete in reverse order of dependencies
    const tables = [
      'user_activity',
      'user_achievements',
      'user_daily_completions',
      'user_module_progress',
      'user_powerups',
      'player_inventory',
      'match_history',
      'submissions',
      'user_stats',
      'user_progress',
      'user_settings',
      'profiles',
    ];

    for (const table of tables) {
      try {
        await supabase.from(table).delete().eq('user_id', userId);
      } catch (error) {
        // Ignore errors for tables that might not exist
      }
    }
  } catch (error) {
    console.warn('Cleanup error:', error.message);
  }
}

/**
 * Assert helper - throws error if condition is false
 */
export function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

/**
 * Assert equals helper
 */
export function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(
      `Assertion failed: ${message || 'Values not equal'}\nExpected: ${expected}\nActual: ${actual}`
    );
  }
}

/**
 * Assert not null helper
 */
export function assertNotNull(value, message) {
  if (value === null || value === undefined) {
    throw new Error(`Assertion failed: ${message || 'Value is null or undefined'}`);
  }
}

/**
 * Assert array contains helper
 */
export function assertContains(array, item, message) {
  if (!Array.isArray(array) || !array.includes(item)) {
    throw new Error(
      `Assertion failed: ${message || 'Array does not contain item'}\nArray: ${JSON.stringify(array)}\nItem: ${item}`
    );
  }
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(condition, timeout = 5000, interval = 100) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  throw new Error('Timeout waiting for condition');
}

/**
 * Test result logger
 */
export class TestLogger {
  constructor() {
    this.passed = [];
    this.failed = [];
  }

  pass(testName, details = '') {
    this.passed.push({ test: testName, details });
    console.log(`✅ PASS: ${testName}${details ? ` - ${details}` : ''}`);
  }

  fail(testName, error, details = '') {
    this.failed.push({ test: testName, error: error.message, details });
    console.error(`❌ FAIL: ${testName}${details ? ` - ${details}` : ''}`);
    console.error(`   Error: ${error.message}`);
  }

  getSummary() {
    return {
      passed: this.passed.length,
      failed: this.failed.length,
      total: this.passed.length + this.failed.length,
      passedTests: this.passed,
      failedTests: this.failed,
    };
  }

  printSummary() {
    const summary = this.getSummary();
    console.log('\n' + '='.repeat(60));
    console.log('TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${summary.total}`);
    console.log(`✅ Passed: ${summary.passed}`);
    console.log(`❌ Failed: ${summary.failed}`);
    console.log(`Success Rate: ${((summary.passed / summary.total) * 100).toFixed(1)}%`);
    console.log('='.repeat(60));

    if (summary.failed > 0) {
      console.log('\nFAILED TESTS:');
      summary.failedTests.forEach((test) => {
        console.log(`  - ${test.test}`);
        console.log(`    Error: ${test.error}`);
        if (test.details) console.log(`    Details: ${test.details}`);
      });
    }
  }
}

/**
 * Verify table exists and has required columns
 */
export async function verifyTableStructure(tableName, requiredColumns = []) {
  const supabase = database.getSupabaseClient();
  if (!supabase) {
    return { exists: false, error: 'Supabase not available' };
  }

  try {
    // Try to select from table - if it exists, this will work
    const { data, error } = await supabase.from(tableName).select('*').limit(1);

    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST205') {
        return { exists: false, error: 'Table does not exist' };
      }
      throw error;
    }

    // If we got data, check columns
    if (data && data.length > 0) {
      const actualColumns = Object.keys(data[0]);
      const missingColumns = requiredColumns.filter((col) => !actualColumns.includes(col));

      return {
        exists: true,
        columns: actualColumns,
        missingColumns: missingColumns.length > 0 ? missingColumns : null,
      };
    }

    // Table exists but is empty - we can't verify columns without a row
    return { exists: true, columns: null, note: 'Table exists but is empty' };
  } catch (error) {
    return { exists: false, error: error.message };
  }
}

/**
 * Predefined achievement UUIDs (must match what's in the database)
 * These are deterministic UUIDs for testing
 */
export const ACHIEVEMENT_IDS = {
  FIRST_PROBLEM: '00000000-0000-0000-0000-000000000001',
  FIRST_WIN: '00000000-0000-0000-0000-000000000002',
  STREAK_3: '00000000-0000-0000-0000-000000000003',
  STREAK_7: '00000000-0000-0000-0000-000000000004',
  LEVEL_5: '00000000-0000-0000-0000-000000000005',
  LEVEL_10: '00000000-0000-0000-0000-000000000006',
  PROBLEMS_10: '00000000-0000-0000-0000-000000000007',
  PROBLEMS_50: '00000000-0000-0000-0000-000000000008',
  FIRST_SUBMISSION: '00000000-0000-0000-0000-000000000009',
};

/**
 * Generate random test data for various fields
 */
export const testDataGenerators = {
  problem: () => ({
    title: `Test Problem ${Date.now()}`,
    slug: `test-problem-${Date.now()}`,
    description: 'Test problem description',
    difficulty: 'Easy',
    category: 'algorithm',
    xp_reward: 10,
    time_limit_ms: 5000,
    memory_limit_mb: 256,
    starter_code: '{}',
    solution_code: '',
    hints: '[]',
    is_premium: false,
    tags: '[]',
    constraints: '[]',
    examples: '[]',
  }),

  submission: (problemId, userId) => ({
    id: uuidv4(),
    problem_id: problemId,
    user_id: userId,
    code: 'function solution() { return 42; }',
    language: 'javascript',
    verdict: 'accepted',
    test_results: JSON.stringify([]),
    execution_time_ms: 100,
    memory_used_mb: 10,
    test_cases_passed: 5,
    test_cases_total: 5,
    score: 100,
    submitted_at: new Date().toISOString(),
  }),

  match: (player1Id, player2Id, problemId) => ({
    id: uuidv4(),
    player1_id: player1Id,
    player2_id: player2Id,
    problem_id: problemId,
    status: 'active',
    start_time: new Date().toISOString(),
    match_type: 'ranked',
  }),
};

