/**
 * Progression System Tests
 * Verifies: user_progress extended fields (heroes, tech_tree), XP, levels, tech points
 */

import progressionService from '../../src/services/progressionService.js';
import { HEROES, TECH_TREE } from '../../src/models/Hero.js';
import {
  TestLogger,
  assert,
  assertNotNull,
  assertEqual,
  generateTestUserId,
  cleanupTestData,
  createTestProfile,
} from '../utils/test_helpers.js';

export async function testProgressionSystem() {
  const logger = new TestLogger();
  const testUserId = generateTestUserId();

  console.log('\n🔍 Testing Progression System...\n');

  try {
    // Create test profile first
    await createTestProfile(testUserId);

    // Test 1: Get user progression (should create if doesn't exist)
    try {
      const progression = await progressionService.getUserProgression(testUserId);
      assertNotNull(progression, 'Progression should be returned');
      assertNotNull(progression.total_xp, 'total_xp should exist');
      assertNotNull(progression.coding_level, 'coding_level should exist');
      assertNotNull(progression.current_rank, 'current_rank should exist');
      logger.pass('get/create user progression', `XP: ${progression.total_xp}, Level: ${progression.coding_level}`);
    } catch (error) {
      logger.fail('get/create user progression', error);
    }

    // Test 2: Add XP and verify level calculation
    try {
      const initialProgression = await progressionService.getUserProgression(testUserId);
      const initialXp = initialProgression.total_xp || 0;
      const initialLevel = progressionService.calculateLevel(initialXp);

      const result = await progressionService.addXP(testUserId, 150, 'test');
      assertNotNull(result, 'XP addition should return result');
      assert(result.total_xp > initialXp, 'Total XP should increase');
      assertEqual(result.xpGained, 150, 'XP gained should be 150');
      assert(result.total_xp === initialXp + 150, 'Total XP should be initial + 150');

      const newLevel = progressionService.calculateLevel(result.total_xp);
      assert(newLevel >= initialLevel, 'Level should not decrease');

      logger.pass('add XP', `XP: ${initialXp} → ${result.total_xp}, Level: ${initialLevel} → ${newLevel}, Leveled up: ${result.leveledUp}`);
    } catch (error) {
      logger.fail('add XP', error);
    }

    // Test 3: Verify level calculation function
    try {
      const level0 = progressionService.calculateLevel(0);
      const level1 = progressionService.calculateLevel(100);
      const level2 = progressionService.calculateLevel(250);
      const level3 = progressionService.calculateLevel(450);

      assertEqual(level0, 1, 'Level 0 XP should be level 1');
      assert(level1 >= 1, 'Level 1 should be at least 1');
      assert(level2 >= level1, 'Level should increase with XP');
      assert(level3 >= level2, 'Level should increase with XP');

      logger.pass('level calculation', `Levels: 0XP=${level0}, 100XP=${level1}, 250XP=${level2}, 450XP=${level3}`);
    } catch (error) {
      logger.fail('level calculation', error);
    }

    // Test 4: Test rank updates based on level
    try {
      // Add enough XP to reach a higher rank
      await progressionService.addXP(testUserId, 1000, 'test');
      const progression = await progressionService.getUserProgression(testUserId);
      const level = progressionService.calculateLevel(progression.total_xp);

      assertNotNull(progression.current_rank, 'current_rank should exist');
      assertNotNull(progression.rank_level, 'rank_level should exist');

      // Verify rank is appropriate for level
      if (level >= 50) {
        assert(progression.current_rank === 'Legend', 'Level 50+ should be Legend');
      } else if (level >= 30) {
        assert(progression.current_rank === 'Diamond', 'Level 30+ should be Diamond');
      } else if (level >= 20) {
        assert(progression.current_rank === 'Platinum', 'Level 20+ should be Platinum');
      } else if (level >= 10) {
        assert(progression.current_rank === 'Gold', 'Level 10+ should be Gold');
      } else if (level >= 5) {
        assert(progression.current_rank === 'Silver', 'Level 5+ should be Silver');
      } else {
        assert(progression.current_rank === 'Bronze', 'Level <5 should be Bronze');
      }

      logger.pass('rank updates', `Level: ${level}, Rank: ${progression.current_rank} ${progression.rank_level}`);
    } catch (error) {
      logger.fail('rank updates', error);
    }

    // Test 5: Test coding level updates
    try {
      const progression = await progressionService.getUserProgression(testUserId);
      const level = progressionService.calculateLevel(progression.total_xp);

      assertNotNull(progression.coding_level, 'coding_level should exist');

      // Verify coding level is appropriate
      if (level >= 40) {
        assert(progression.coding_level === 'Master', 'Level 40+ should be Master');
      } else if (level >= 25) {
        assert(progression.coding_level === 'Expert', 'Level 25+ should be Expert');
      } else if (level >= 15) {
        assert(progression.coding_level === 'Advanced', 'Level 15+ should be Advanced');
      } else if (level >= 8) {
        assert(progression.coding_level === 'Intermediate', 'Level 8+ should be Intermediate');
      } else {
        assert(progression.coding_level === 'Beginner', 'Level <8 should be Beginner');
      }

      logger.pass('coding level updates', `Level: ${level}, Coding Level: ${progression.coding_level}`);
    } catch (error) {
      logger.fail('coding level updates', error);
    }

    // Test 6: Test hero unlocking
    try {
      const progression = await progressionService.getUserProgression(testUserId);
      const level = progressionService.calculateLevel(progression.total_xp);

      // Find a hero that can be unlocked at current level
      const unlockableHero = Object.values(HEROES).find(
        (hero) => hero.unlockLevel <= level && !(progression.unlocked_heroes || []).includes(hero.id)
      );

      if (unlockableHero) {
        await progressionService.unlockHero(testUserId, unlockableHero.id);
        const updatedProgression = await progressionService.getUserProgression(testUserId);
        const unlockedHeroes = updatedProgression.unlocked_heroes || [];

        assert(unlockedHeroes.includes(unlockableHero.id), 'Hero should be unlocked');
        logger.pass('unlock hero', `Hero: ${unlockableHero.name} (${unlockableHero.id})`);
      } else {
        logger.pass('unlock hero', 'No unlockable heroes at current level');
      }
    } catch (error) {
      logger.fail('unlock hero', error);
    }

    // Test 7: Test hero selection
    try {
      const progression = await progressionService.getUserProgression(testUserId);
      const unlockedHeroes = progression.unlocked_heroes || ['python', 'javascript'];

      if (unlockedHeroes.length > 0) {
        const heroToSelect = unlockedHeroes[0];
        await progressionService.selectHero(testUserId, heroToSelect);
        const updatedProgression = await progressionService.getUserProgression(testUserId);

        assertEqual(updatedProgression.selected_hero, heroToSelect, 'Hero should be selected');
        logger.pass('select hero', `Selected: ${heroToSelect}`);
      } else {
        logger.pass('select hero', 'No unlocked heroes available');
      }
    } catch (error) {
      logger.fail('select hero', error);
    }

    // Test 8: Test tech tree upgrades
    try {
      const progression = await progressionService.getUserProgression(testUserId);
      const availableTechPoints = progression.available_tech_points || 0;

      if (availableTechPoints > 0) {
        // Find a tech that can be upgraded
        const techTree = progression.tech_tree || {};
        const upgradableTech = Object.values(TECH_TREE).find(
          (tech) => (techTree[tech.id] || 0) < tech.maxLevel
        );

        if (upgradableTech) {
          const currentLevel = techTree[upgradableTech.id] || 0;
          const cost = upgradableTech.costs[currentLevel] || 0;

          if (availableTechPoints >= cost) {
            await progressionService.upgradeTech(testUserId, upgradableTech.id);
            const updatedProgression = await progressionService.getUserProgression(testUserId);
            const updatedTechTree = updatedProgression.tech_tree || {};

            assert(updatedTechTree[upgradableTech.id] > currentLevel, 'Tech level should increase');
            logger.pass('upgrade tech', `Tech: ${upgradableTech.name}, Level: ${currentLevel} → ${updatedTechTree[upgradableTech.id]}`);
          } else {
            logger.pass('upgrade tech', `Not enough tech points (need ${cost}, have ${availableTechPoints})`);
          }
        } else {
          logger.pass('upgrade tech', 'No upgradable tech available');
        }
      } else {
        logger.pass('upgrade tech', 'No tech points available');
      }
    } catch (error) {
      logger.fail('upgrade tech', error);
    }

    // Test 9: Test tech points awarding on level up
    try {
      const initialProgression = await progressionService.getUserProgression(testUserId);
      const initialLevel = progressionService.calculateLevel(initialProgression.total_xp);
      const initialTechPoints = initialProgression.available_tech_points || 0;

      // Add enough XP to level up
      const xpNeeded = 500; // Should be enough to level up
      const result = await progressionService.addXP(testUserId, xpNeeded, 'test');
      const newLevel = progressionService.calculateLevel(result.total_xp);

      if (result.leveledUp) {
        assert(result.techPointsGained > 0, 'Should gain tech points on level up');
        assert(result.available_tech_points > initialTechPoints, 'Available tech points should increase');
        logger.pass('tech points on level up', `Gained: ${result.techPointsGained}, Total: ${result.available_tech_points}`);
      } else {
        logger.pass('tech points on level up', 'No level up occurred');
      }
    } catch (error) {
      logger.fail('tech points on level up', error);
    }

    // Test 10: Test match loadout generation
    try {
      const loadout = await progressionService.getMatchLoadout(testUserId);
      assertNotNull(loadout, 'Loadout should be returned');
      assertNotNull(loadout.hero, 'Loadout should have hero');
      assertNotNull(loadout.bonuses, 'Loadout should have bonuses');
      assertNotNull(loadout.availableUnits, 'Loadout should have available units');
      assertNotNull(loadout.availableTowers, 'Loadout should have available towers');
      assertNotNull(loadout.level, 'Loadout should have level');
      assertNotNull(loadout.rank, 'Loadout should have rank');

      logger.pass('match loadout generation', `Hero: ${loadout.hero.name}, Level: ${loadout.level}, Rank: ${loadout.rank}`);
    } catch (error) {
      logger.fail('match loadout generation', error);
    }

    // Test 11: Test streak updates
    try {
      const progression = await progressionService.getUserProgression(testUserId);
      const initialStreak = progression.current_streak || 0;

      const updated = await progressionService.updateStreak(testUserId);
      assertNotNull(updated, 'Streak update should return result');
      assertNotNull(updated.current_streak, 'current_streak should exist');
      assertNotNull(updated.longest_streak, 'longest_streak should exist');
      assert(updated.current_streak >= initialStreak, 'Streak should not decrease');

      logger.pass('update streak', `Current: ${updated.current_streak}, Longest: ${updated.longest_streak}`);
    } catch (error) {
      logger.fail('update streak', error);
    }

    // Test 12: Get heroes with status
    try {
      const heroes = await progressionService.getHeroesWithStatus(testUserId);
      assert(Array.isArray(heroes), 'Heroes should be an array');
      assert(heroes.length > 0, 'Should have at least one hero');

      heroes.forEach((hero) => {
        assertNotNull(hero.id, 'Hero should have id');
        assertNotNull(hero.name, 'Hero should have name');
        assert(typeof hero.unlocked === 'boolean', 'Hero should have unlocked status');
        assert(typeof hero.selected === 'boolean', 'Hero should have selected status');
        assert(typeof hero.canUnlock === 'boolean', 'Hero should have canUnlock status');
      });

      logger.pass('get heroes with status', `Count: ${heroes.length}`);
    } catch (error) {
      logger.fail('get heroes with status', error);
    }

    // Test 13: Get tech tree with status
    try {
      const techTree = await progressionService.getTechTreeWithStatus(testUserId);
      assert(Array.isArray(techTree), 'Tech tree should be an array');
      assert(techTree.length > 0, 'Should have at least one tech');

      techTree.forEach((tech) => {
        assertNotNull(tech.id, 'Tech should have id');
        assertNotNull(tech.name, 'Tech should have name');
        assert(typeof tech.currentLevel === 'number', 'Tech should have currentLevel');
        assert(typeof tech.canUpgrade === 'boolean', 'Tech should have canUpgrade status');
      });

      logger.pass('get tech tree with status', `Count: ${techTree.length}`);
    } catch (error) {
      logger.fail('get tech tree with status', error);
    }
  } catch (error) {
    logger.fail('Test suite error', error);
  } finally {
    // Cleanup
    await cleanupTestData(testUserId);
  }

  return logger.getSummary();
}

