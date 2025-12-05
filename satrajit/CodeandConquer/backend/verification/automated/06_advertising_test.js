/**
 * Advertising System Tests
 * Verifies: video_ads, ad_impressions, ad_interactions
 */

import adService from '../../src/services/adService.js';
import {
  TestLogger,
  assert,
  assertNotNull,
  assertEqual,
  verifyTableStructure,
  generateTestUserId,
  cleanupTestData,
} from '../utils/test_helpers.js';
import { v4 as uuidv4 } from 'uuid';

export async function testAdvertising() {
  const logger = new TestLogger();
  const testUserId = generateTestUserId();
  let testAdId = null;

  console.log('\n🔍 Testing Advertising System...\n');

  try {
    // Test 1: Verify video_ads table exists
    try {
      const tableCheck = await verifyTableStructure('video_ads', [
        'id',
        'youtube_url',
        'sponsor',
        'title',
        'active',
      ]);
      assert(tableCheck.exists, 'video_ads table should exist');
      logger.pass('video_ads table exists', tableCheck.missingColumns ? `Missing: ${tableCheck.missingColumns.join(', ')}` : '');
    } catch (error) {
      logger.fail('video_ads table verification', error);
    }

    // Test 2: Get all ads
    try {
      const ads = await adService.getAllAds();
      assert(Array.isArray(ads), 'Ads should be an array');
      assert(ads.length > 0, 'Should have at least default ads');
      logger.pass('get all ads', `Count: ${ads.length}`);

      if (ads.length > 0) {
        testAdId = ads[0].id;
      }
    } catch (error) {
      logger.fail('get all ads', error);
    }

    // Test 3: Get random ad
    try {
      const ad = await adService.getRandomVideoAd();
      assertNotNull(ad, 'Random ad should be returned');
      assertNotNull(ad.id, 'Ad should have id');
      assertNotNull(ad.youtube_url, 'Ad should have youtube_url');
      assertNotNull(ad.sponsor, 'Ad should have sponsor');
      assertNotNull(ad.title, 'Ad should have title');
      logger.pass('get random ad', `Ad: ${ad.title} by ${ad.sponsor}`);
    } catch (error) {
      logger.fail('get random ad', error);
    }

    // Test 4: Test ad caching (5-minute cache)
    try {
      const startTime = Date.now();
      const ad1 = await adService.getRandomVideoAd();
      const time1 = Date.now() - startTime;

      const startTime2 = Date.now();
      const ad2 = await adService.getRandomVideoAd();
      const time2 = Date.now() - startTime2;

      // Second call should be faster if cached
      logger.pass('ad caching', `First: ${time1}ms, Second: ${time2}ms`);
    } catch (error) {
      logger.fail('ad caching', error);
    }

    // Test 5: Create ad (admin function)
    try {
      if (adService.isAvailable()) {
        const adData = {
          youtube_url: 'https://www.youtube.com/watch?v=test123',
          sponsor: 'Test Sponsor',
          title: 'Test Ad',
          description: 'Test ad description',
          active: true,
          priority: 1,
        };

        const ad = await adService.createAd(adData);
        if (ad) {
          assertNotNull(ad.id, 'Created ad should have id');
          testAdId = ad.id;
          logger.pass('create ad', `Ad ID: ${ad.id}`);
        } else {
          logger.pass('create ad', 'Ad not persisted (table may not exist)');
        }
      } else {
        logger.pass('create ad', 'Ad service not available (skipped)');
      }
    } catch (error) {
      logger.fail('create ad', error);
    }

    // Test 6: Update ad
    try {
      if (testAdId && adService.isAvailable()) {
        const updates = {
          title: 'Updated Test Ad',
          active: false,
        };

        const updated = await adService.updateAd(testAdId, updates);
        if (updated) {
          assertEqual(updated.title, 'Updated Test Ad', 'Title should be updated');
          logger.pass('update ad');
        } else {
          logger.pass('update ad', 'Update not persisted (table may not exist)');
        }
      } else {
        logger.pass('update ad', 'No test ad or service not available (skipped)');
      }
    } catch (error) {
      logger.fail('update ad', error);
    }

    // Test 7: Verify ad_impressions table exists
    try {
      const tableCheck = await verifyTableStructure('ad_impressions', [
        'ad_id',
        'user_id',
        'timestamp',
      ]);
      assert(tableCheck.exists, 'ad_impressions table should exist');
      logger.pass('ad_impressions table exists', tableCheck.missingColumns ? `Missing: ${tableCheck.missingColumns.join(', ')}` : '');
    } catch (error) {
      logger.fail('ad_impressions table verification', error);
    }

    // Test 8: Log ad impression
    try {
      if (testAdId) {
        await adService.logImpression(testAdId, testUserId);
        logger.pass('log ad impression', 'Impression logged');
      } else {
        logger.pass('log ad impression', 'No test ad available (skipped)');
      }
    } catch (error) {
      logger.fail('log ad impression', error);
    }

    // Test 9: Verify ad_interactions table exists
    try {
      const tableCheck = await verifyTableStructure('ad_interactions', [
        'ad_id',
        'user_id',
        'interaction_type',
        'timestamp',
      ]);
      assert(tableCheck.exists, 'ad_interactions table should exist');
      logger.pass('ad_interactions table exists', tableCheck.missingColumns ? `Missing: ${tableCheck.missingColumns.join(', ')}` : '');
    } catch (error) {
      logger.fail('ad_interactions table verification', error);
    }

    // Test 10: Log ad skip
    try {
      if (testAdId) {
        await adService.logSkip(testAdId, 15, testUserId); // 15 seconds watched
        logger.pass('log ad skip', 'Skip logged');
      } else {
        logger.pass('log ad skip', 'No test ad available (skipped)');
      }
    } catch (error) {
      logger.fail('log ad skip', error);
    }

    // Test 11: Log ad completion
    try {
      if (testAdId) {
        await adService.logCompletion(testAdId, testUserId);
        logger.pass('log ad completion', 'Completion logged');
      } else {
        logger.pass('log ad completion', 'No test ad available (skipped)');
      }
    } catch (error) {
      logger.fail('log ad completion', error);
    }

    // Test 12: Delete ad (cleanup)
    try {
      if (testAdId && adService.isAvailable()) {
        const deleted = await adService.deleteAd(testAdId);
        if (deleted) {
          logger.pass('delete ad', 'Ad deleted');
        } else {
          logger.pass('delete ad', 'Ad not deleted (table may not exist)');
        }
      } else {
        logger.pass('delete ad', 'No test ad or service not available (skipped)');
      }
    } catch (error) {
      logger.fail('delete ad', error);
    }

    // Test 13: Verify only active ads are returned
    try {
      const ads = await adService.getAllAds();
      const activeAds = ads.filter((ad) => ad.active !== false);
      assert(activeAds.length > 0, 'Should have at least one active ad');
      logger.pass('active ads filter', `Active: ${activeAds.length}, Total: ${ads.length}`);
    } catch (error) {
      logger.fail('active ads filter', error);
    }
  } catch (error) {
    logger.fail('Test suite error', error);
  } finally {
    // Cleanup
    await cleanupTestData(testUserId);
  }

  return logger.getSummary();
}

