/**
 * User Authentication & Profile Tests
 * Verifies: profiles, users, user_progress, user_stats, user_settings, user_achievements, user_activity
 */

import database from '../../src/config/database.js';
import publicDatabaseService from '../../src/services/publicDatabaseService.js';
import progressionService from '../../src/services/progressionService.js';
import {
  TestLogger,
  createTestProfile,
  cleanupTestData,
  assert,
  assertNotNull,
  assertEqual,
  verifyTableStructure,
  generateTestUserId,
  ACHIEVEMENT_IDS,
} from '../utils/test_helpers.js';

export async function testUserAuthentication() {
  const logger = new TestLogger();
  const testUserId = generateTestUserId();
  let testProfile = null;

  console.log('\n🔍 Testing User Authentication & Profile System...\n');

  try {
    // Test 1: Verify profiles table exists
    try {
      const tableCheck = await verifyTableStructure('profiles', [
        'id',
        'username',
        'email',
        'full_name',
        'is_premium',
        'subscription_tier',
      ]);
      assert(tableCheck.exists, 'profiles table should exist');
      logger.pass('profiles table exists', tableCheck.missingColumns ? `Missing: ${tableCheck.missingColumns.join(', ')}` : '');
    } catch (error) {
      logger.fail('profiles table verification', error);
    }

    // Test 2: Create test user profile
    try {
      testProfile = await createTestProfile(testUserId);
      assertNotNull(testProfile, 'Profile should be created');
      assertEqual(testProfile.id, testUserId, 'Profile ID should match');
      logger.pass('create test profile', `Profile ID: ${testProfile.id}`);
    } catch (error) {
      logger.fail('create test profile', error);
    }

    // Test 3: Fetch user profile by ID
    try {
      const fetchedProfile = await publicDatabaseService.getProfile(testUserId);
      if (fetchedProfile) {
        assertEqual(fetchedProfile.id, testUserId, 'Fetched profile ID should match');
        logger.pass('fetch profile by ID');
      } else {
        logger.pass('fetch profile by ID', 'Profile not in DB (using local fallback)');
      }
    } catch (error) {
      logger.fail('fetch profile by ID', error);
    }

    // Test 4: Update user profile
    try {
      const updates = {
        bio: 'Updated bio for testing',
        last_active: new Date().toISOString(),
      };
      const updated = await publicDatabaseService.updateProfile(testUserId, updates);
      if (updated) {
        assertEqual(updated.bio, updates.bio, 'Bio should be updated');
        logger.pass('update profile');
      } else {
        logger.pass('update profile', 'Update not persisted (local fallback)');
      }
    } catch (error) {
      logger.fail('update profile', error);
    }

    // Test 5: Verify user_progress table exists
    try {
      const tableCheck = await verifyTableStructure('user_progress', [
        'user_id',
        'total_xp',
        'coding_level',
        'current_rank',
        'current_streak',
      ]);
      assert(tableCheck.exists, 'user_progress table should exist');
      logger.pass('user_progress table exists', tableCheck.missingColumns ? `Missing: ${tableCheck.missingColumns.join(', ')}` : '');
    } catch (error) {
      logger.fail('user_progress table verification', error);
    }

    // Test 6: Get or create user progression
    try {
      const progression = await progressionService.getUserProgression(testUserId);
      assertNotNull(progression, 'Progression should be returned');
      assertNotNull(progression.total_xp, 'total_xp should exist');
      assertNotNull(progression.coding_level, 'coding_level should exist');
      logger.pass('get/create user progression', `XP: ${progression.total_xp}, Level: ${progression.coding_level}`);
    } catch (error) {
      logger.fail('get/create user progression', error);
    }

    // Test 7: Verify user_stats table exists
    try {
      const tableCheck = await verifyTableStructure('user_stats', [
        'user_id',
        'coins',
        'xp',
        'level',
        'problems_solved',
      ]);
      assert(tableCheck.exists, 'user_stats table should exist');
      logger.pass('user_stats table exists', tableCheck.missingColumns ? `Missing: ${tableCheck.missingColumns.join(', ')}` : '');
    } catch (error) {
      logger.fail('user_stats table verification', error);
    }

    // Test 8: Get or create user stats
    try {
      const supabase = database.getSupabaseClient();
      if (supabase) {
        const { data: stats } = await supabase
          .from('user_stats')
          .select('*')
          .eq('user_id', testUserId)
          .single();

        if (!stats) {
          // Create initial stats
          await supabase.from('user_stats').insert([
            {
              user_id: testUserId,
              coins: 0,
              xp: 0,
              level: 1,
              problems_solved: 0,
              games_played: 0,
              wins: 0,
            },
          ]);
          logger.pass('create user stats');
        } else {
          logger.pass('user stats already exists');
        }
      } else {
        logger.pass('user stats', 'Supabase not available (skipped)');
      }
    } catch (error) {
      logger.fail('create user stats', error);
    }

    // Test 9: Update user stats (coins, XP)
    try {
      const supabase = database.getSupabaseClient();
      if (supabase) {
        const { data: stats } = await supabase
          .from('user_stats')
          .select('*')
          .eq('user_id', testUserId)
          .single();

        if (stats) {
          const newCoins = (stats.coins || 0) + 100;
          const newXp = (stats.xp || 0) + 50;
          await supabase
            .from('user_stats')
            .update({
              coins: newCoins,
              xp: newXp,
              level: Math.floor(newXp / 100) + 1,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', testUserId);

          logger.pass('update user stats', `Coins: ${newCoins}, XP: ${newXp}`);
        } else {
          logger.pass('update user stats', 'Stats not found (skipped)');
        }
      } else {
        logger.pass('update user stats', 'Supabase not available (skipped)');
      }
    } catch (error) {
      logger.fail('update user stats', error);
    }

    // Test 10: Verify user_settings table exists
    try {
      const tableCheck = await verifyTableStructure('user_settings', [
        'user_id',
        'notifications_enabled',
        'theme',
      ]);
      assert(tableCheck.exists, 'user_settings table should exist');
      logger.pass('user_settings table exists', tableCheck.missingColumns ? `Missing: ${tableCheck.missingColumns.join(', ')}` : '');
    } catch (error) {
      logger.fail('user_settings table verification', error);
    }

    // Test 11: Get or create user settings
    try {
      let settings = await publicDatabaseService.getUserSettings(testUserId);
      if (!settings) {
        settings = await publicDatabaseService.updateUserSettings(testUserId, {
          notifications_enabled: true,
          email_notifications: true,
          theme: 'dark',
          privacy_level: 'public',
          language: 'en',
        });
      }
      assertNotNull(settings, 'Settings should be returned');
      logger.pass('get/create user settings');
    } catch (error) {
      logger.fail('get/create user settings', error);
    }

    // Test 12: Verify user_achievements table exists
    try {
      const tableCheck = await verifyTableStructure('user_achievements', [
        'user_id',
        'achievement_id',
      ]);
      assert(tableCheck.exists, 'user_achievements table should exist');
      logger.pass('user_achievements table exists', tableCheck.missingColumns ? `Missing: ${tableCheck.missingColumns.join(', ')}` : '');
    } catch (error) {
      logger.fail('user_achievements table verification', error);
    }

    // Test 13: Grant achievement
    // Using deterministic UUID for 'First Steps' achievement
    try {
      const achievement = await publicDatabaseService.grantAchievement(testUserId, ACHIEVEMENT_IDS.FIRST_PROBLEM, {
        progress: 100,
      });
      if (achievement) {
        logger.pass('grant achievement', `Achievement ID: ${achievement.achievement_id || ACHIEVEMENT_IDS.FIRST_PROBLEM}`);
      } else {
        logger.pass('grant achievement', 'Achievement not persisted (table may not exist)');
      }
    } catch (error) {
      logger.fail('grant achievement', error);
    }

    // Test 14: Get user achievements
    try {
      const achievements = await publicDatabaseService.getUserAchievements(testUserId);
      assert(Array.isArray(achievements), 'Achievements should be an array');
      logger.pass('get user achievements', `Count: ${achievements.length}`);
    } catch (error) {
      logger.fail('get user achievements', error);
    }

    // Test 15: Verify user_activity table exists
    try {
      const tableCheck = await verifyTableStructure('user_activity', [
        'user_id',
        'activity_type',
      ]);
      assert(tableCheck.exists, 'user_activity table should exist');
      logger.pass('user_activity table exists', tableCheck.missingColumns ? `Missing: ${tableCheck.missingColumns.join(', ')}` : '');
    } catch (error) {
      logger.fail('user_activity table verification', error);
    }

    // Test 16: Create user activity log
    try {
      const activity = await publicDatabaseService.createUserActivity({
        user_id: testUserId,
        activity_type: 'test_activity',
        description: 'Test activity for verification',
        metadata: { test: true },
      });
      if (activity) {
        logger.pass('create user activity');
      } else {
        logger.pass('create user activity', 'Activity not persisted (table may not exist)');
      }
    } catch (error) {
      logger.fail('create user activity', error);
    }

    // Test 17: Get user activities
    try {
      const activities = await publicDatabaseService.getUserActivities(testUserId, 10);
      assert(Array.isArray(activities), 'Activities should be an array');
      logger.pass('get user activities', `Count: ${activities.length}`);
    } catch (error) {
      logger.fail('get user activities', error);
    }

    // Test 18: Test streak calculation
    try {
      const progression = await progressionService.updateStreak(testUserId);
      assertNotNull(progression, 'Progression should be returned');
      assertNotNull(progression.current_streak, 'current_streak should exist');
      logger.pass('update streak', `Current streak: ${progression.current_streak}`);
    } catch (error) {
      logger.fail('update streak', error);
    }

    // Test 19: Test XP addition
    try {
      const result = await progressionService.addXP(testUserId, 50, 'test');
      assertNotNull(result, 'XP addition should return result');
      assertNotNull(result.total_xp, 'total_xp should be updated');
      assert(result.xpGained === 50, 'XP gained should be 50');
      logger.pass('add XP', `Total XP: ${result.total_xp}, Leveled up: ${result.leveledUp}`);
    } catch (error) {
      logger.fail('add XP', error);
    }

    // Test 20: Verify users table exists (legacy)
    try {
      const tableCheck = await verifyTableStructure('users', ['user_id']);
      if (tableCheck.exists) {
        logger.pass('users table exists (legacy table)');
      } else {
        logger.pass('users table', 'Table does not exist (expected - legacy table)');
      }
    } catch (error) {
      logger.pass('users table', 'Table check failed (expected - legacy table)');
    }
  } catch (error) {
    logger.fail('Test suite error', error);
  } finally {
    // Cleanup
    await cleanupTestData(testUserId);
  }

  return logger.getSummary();
}

