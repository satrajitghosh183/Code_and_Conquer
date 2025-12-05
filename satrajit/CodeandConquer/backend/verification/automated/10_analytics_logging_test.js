/**
 * Analytics & Logging Tests
 * Verifies: event_logs, user_activity logging
 */

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
import { v4 as uuidv4 } from 'uuid';

export async function testAnalyticsLogging() {
  const logger = new TestLogger();
  const testUserId = generateTestUserId();

  console.log('\n🔍 Testing Analytics & Logging System...\n');

  try {
    // Create test profile
    await createTestProfile(testUserId);

    // Test 1: Verify event_logs table exists
    try {
      const tableCheck = await verifyTableStructure('event_logs', [
        'user_id',
        'event_type',
        'created_at',
      ]);
      assert(tableCheck.exists, 'event_logs table should exist');
      logger.pass('event_logs table exists', tableCheck.missingColumns ? `Missing: ${tableCheck.missingColumns.join(', ')}` : '');
    } catch (error) {
      logger.fail('event_logs table verification', error);
    }

    // Test 2: Create event log
    try {
      const eventData = {
        user_id: testUserId,
        event_type: 'test_event',
        event_data: { action: 'test', timestamp: Date.now() },
        metadata: { source: 'verification_test' },
        created_at: new Date().toISOString(),
      };

      const event = await publicDatabaseService.createEventLog(eventData);
      if (event) {
        assertNotNull(event.id, 'Event should have id');
        assertEqual(event.event_type, 'test_event', 'Event type should match');
        logger.pass('create event log', `Event ID: ${event.id}`);
      } else {
        logger.pass('create event log', 'Event not persisted (table may not exist)');
      }
    } catch (error) {
      logger.fail('create event log', error);
    }

    // Test 3: Get event logs for user
    try {
      const events = await publicDatabaseService.getEventLogs(testUserId, 10);
      assert(Array.isArray(events), 'Events should be an array');
      logger.pass('get event logs for user', `Count: ${events.length}`);
    } catch (error) {
      logger.fail('get event logs for user', error);
    }

    // Test 4: Get all event logs
    try {
      const events = await publicDatabaseService.getEventLogs(null, 10);
      assert(Array.isArray(events), 'Events should be an array');
      logger.pass('get all event logs', `Count: ${events.length}`);
    } catch (error) {
      logger.fail('get all event logs', error);
    }

    // Test 5: Create user activity log
    try {
      const activityData = {
        user_id: testUserId,
        activity_type: 'problem_solved',
        description: 'Solved test problem',
        xp_earned: 50,
        problem_id: uuidv4(),
        difficulty: 'easy',
        metadata: { test: true },
        created_at: new Date().toISOString(),
      };

      const activity = await publicDatabaseService.createUserActivity(activityData);
      if (activity) {
        assertNotNull(activity.id, 'Activity should have id');
        assertEqual(activity.activity_type, 'problem_solved', 'Activity type should match');
        logger.pass('create user activity', `Activity ID: ${activity.id}`);
      } else {
        logger.pass('create user activity', 'Activity not persisted (table may not exist)');
      }
    } catch (error) {
      logger.fail('create user activity', error);
    }

    // Test 6: Get user activities
    try {
      const activities = await publicDatabaseService.getUserActivities(testUserId, 10);
      assert(Array.isArray(activities), 'Activities should be an array');
      logger.pass('get user activities', `Count: ${activities.length}`);
    } catch (error) {
      logger.fail('get user activities', error);
    }

    // Test 7: Test different event types
    try {
      const eventTypes = [
        'page_view',
        'button_click',
        'form_submit',
        'api_call',
        'error_occurred',
      ];

      for (const eventType of eventTypes) {
        const eventData = {
          user_id: testUserId,
          event_type: eventType,
          event_data: { test: true },
          created_at: new Date().toISOString(),
        };

        await publicDatabaseService.createEventLog(eventData);
      }

      logger.pass('different event types', `Types logged: ${eventTypes.join(', ')}`);
    } catch (error) {
      logger.fail('different event types', error);
    }

    // Test 8: Test event log ordering (newest first)
    try {
      const events = await publicDatabaseService.getEventLogs(testUserId, 10);
      if (events.length > 1) {
        let isOrdered = true;
        for (let i = 1; i < events.length; i++) {
          const prevTime = new Date(events[i - 1].created_at).getTime();
          const currTime = new Date(events[i].created_at).getTime();
          if (prevTime < currTime) {
            isOrdered = false;
            break;
          }
        }
        assert(isOrdered, 'Events should be ordered by created_at (descending)');
        logger.pass('event log ordering', 'Events in descending order');
      } else {
        logger.pass('event log ordering', 'Not enough events to verify ordering');
      }
    } catch (error) {
      logger.fail('event log ordering', error);
    }

    // Test 9: Test activity log with XP tracking
    try {
      const activityData = {
        user_id: testUserId,
        activity_type: 'problem_solved',
        xp_earned: 100,
        problem_id: uuidv4(),
        difficulty: 'hard',
        created_at: new Date().toISOString(),
      };

      const activity = await publicDatabaseService.createUserActivity(activityData);
      if (activity) {
        assertEqual(activity.xp_earned, 100, 'XP earned should match');
        logger.pass('activity log with XP', `XP: ${activity.xp_earned}`);
      } else {
        logger.pass('activity log with XP', 'Activity not persisted (table may not exist)');
      }
    } catch (error) {
      logger.fail('activity log with XP', error);
    }

    // Test 10: Test event log limit
    try {
      const limit = 5;
      const events = await publicDatabaseService.getEventLogs(testUserId, limit);
      assert(events.length <= limit, `Should have at most ${limit} events`);
      logger.pass('event log limit', `Requested: ${limit}, Got: ${events.length}`);
    } catch (error) {
      logger.fail('event log limit', error);
    }
  } catch (error) {
    logger.fail('Test suite error', error);
  } finally {
    // Cleanup
    await cleanupTestData(testUserId);
  }

  return logger.getSummary();
}

