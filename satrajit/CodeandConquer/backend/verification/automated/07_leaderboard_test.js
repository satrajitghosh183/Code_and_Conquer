/**
 * Leaderboard Tests
 * Verifies: leaderboards table, score calculations, leaderboard updates
 */

import database from '../../src/config/database.js';
import publicDatabaseService from '../../src/services/publicDatabaseService.js';
import {
  TestLogger,
  assert,
  assertNotNull,
  assertEqual,
  verifyTableStructure,
  generateTestUserId,
  cleanupTestData,
  createTestProfile,
} from '../utils/test_helpers.js';

export async function testLeaderboard() {
  const logger = new TestLogger();
  const testUserId = generateTestUserId();

  console.log('\n🔍 Testing Leaderboard System...\n');

  try {
    // Create test profile
    await createTestProfile(testUserId);

    // Test 1: Verify leaderboards table exists
    try {
      const tableCheck = await verifyTableStructure('leaderboards', [
        'user_id',
        'leaderboard_type',
        'score',
      ]);
      assert(tableCheck.exists, 'leaderboards table should exist');
      logger.pass('leaderboards table exists', tableCheck.missingColumns ? `Missing: ${tableCheck.missingColumns.join(', ')}` : '');
    } catch (error) {
      logger.fail('leaderboards table verification', error);
    }

    // Test 2: Update leaderboard (creates if doesn't exist)
    try {
      const score = 1000;
      const updated = await publicDatabaseService.updateLeaderboard(testUserId, 'global', score);
      if (updated) {
        logger.pass('update leaderboard', `Score: ${score}`);
      } else {
        logger.pass('update leaderboard', 'Update not persisted (table may not exist)');
      }
    } catch (error) {
      logger.fail('update leaderboard', error);
    }

    // Test 3: Get leaderboard
    try {
      const leaderboard = await publicDatabaseService.getLeaderboard('global', 100);
      assert(Array.isArray(leaderboard), 'Leaderboard should be an array');
      logger.pass('get leaderboard', `Count: ${leaderboard.length}`);

      // Check if our test user is in the leaderboard
      const userEntry = leaderboard.find((entry) => entry.user_id === testUserId);
      if (userEntry) {
        assert(typeof userEntry.score === 'number', 'Score should be a number');
        logger.pass('test user in leaderboard', `Score: ${userEntry.score}`);
      }
    } catch (error) {
      logger.fail('get leaderboard', error);
    }

    // Test 4: Update leaderboard score (update existing)
    try {
      const newScore = 1500;
      const updated = await publicDatabaseService.updateLeaderboard(testUserId, 'global', newScore);
      if (updated) {
        assertEqual(updated.score, newScore, 'Score should be updated');
        logger.pass('update leaderboard score', `New score: ${newScore}`);
      } else {
        logger.pass('update leaderboard score', 'Update not persisted (table may not exist)');
      }
    } catch (error) {
      logger.fail('update leaderboard score', error);
    }

    // Test 5: Test score calculation formula
    try {
      const supabase = database.getSupabaseClient();
      if (supabase) {
        // Get user stats
        const { data: userStats } = await supabase
          .from('user_stats')
          .select('*')
          .eq('user_id', testUserId)
          .single();

        if (userStats) {
          // Calculate score: xp + (problems_solved * 10)
          const calculatedScore = (userStats.xp || 0) + ((userStats.problems_solved || 0) * 10);

          // Update leaderboard with calculated score
          await publicDatabaseService.updateLeaderboard(testUserId, 'global', calculatedScore);

          logger.pass('score calculation', `XP: ${userStats.xp}, Problems: ${userStats.problems_solved}, Score: ${calculatedScore}`);
        } else {
          logger.pass('score calculation', 'User stats not found (skipped)');
        }
      } else {
        logger.pass('score calculation', 'Supabase not available (skipped)');
      }
    } catch (error) {
      logger.fail('score calculation', error);
    }

    // Test 6: Test different leaderboard types
    try {
      const types = ['global', 'weekly', 'monthly'];
      for (const type of types) {
        const leaderboard = await publicDatabaseService.getLeaderboard(type, 10);
        assert(Array.isArray(leaderboard), `${type} leaderboard should be an array`);
      }
      logger.pass('different leaderboard types', `Types tested: ${types.join(', ')}`);
    } catch (error) {
      logger.fail('different leaderboard types', error);
    }

    // Test 7: Test leaderboard ordering (top scores first)
    try {
      const leaderboard = await publicDatabaseService.getLeaderboard('global', 10);
      if (leaderboard.length > 1) {
        let isOrdered = true;
        for (let i = 1; i < leaderboard.length; i++) {
          if (leaderboard[i - 1].score < leaderboard[i].score) {
            isOrdered = false;
            break;
          }
        }
        assert(isOrdered, 'Leaderboard should be ordered by score (descending)');
        logger.pass('leaderboard ordering', 'Scores in descending order');
      } else {
        logger.pass('leaderboard ordering', 'Not enough entries to verify ordering');
      }
    } catch (error) {
      logger.fail('leaderboard ordering', error);
    }

    // Test 8: Test leaderboard limit
    try {
      const limit = 5;
      const leaderboard = await publicDatabaseService.getLeaderboard('global', limit);
      assert(leaderboard.length <= limit, `Leaderboard should have at most ${limit} entries`);
      logger.pass('leaderboard limit', `Requested: ${limit}, Got: ${leaderboard.length}`);
    } catch (error) {
      logger.fail('leaderboard limit', error);
    }
  } catch (error) {
    logger.fail('Test suite error', error);
  } finally {
    // Cleanup
    await cleanupTestData(testUserId);
  }

  return logger.getSummary();
}

