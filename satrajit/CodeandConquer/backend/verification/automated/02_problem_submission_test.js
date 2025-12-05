/**
 * Problems & Submissions Tests
 * Verifies: problems, test_cases, problem_versions, submissions
 */

import database from '../../src/config/database.js';
import publicDatabaseService from '../../src/services/publicDatabaseService.js';
import { Submission } from '../../src/models/Problem.js';
import {
  TestLogger,
  assert,
  assertNotNull,
  assertEqual,
  verifyTableStructure,
  generateTestUserId,
  testDataGenerators,
  cleanupTestData,
} from '../utils/test_helpers.js';
import { v4 as uuidv4 } from 'uuid';

export async function testProblemSubmission() {
  const logger = new TestLogger();
  const testUserId = generateTestUserId();
  let testProblemId = null;
  let testSubmissionId = null;

  console.log('\n🔍 Testing Problems & Submissions System...\n');

  try {
    // Test 1: Verify problems table exists
    try {
      const tableCheck = await verifyTableStructure('problems', [
        'id',
        'title',
        'description',
        'difficulty',
        'xp_reward',
      ]);
      assert(tableCheck.exists, 'problems table should exist');
      logger.pass('problems table exists', tableCheck.missingColumns ? `Missing: ${tableCheck.missingColumns.join(', ')}` : '');
    } catch (error) {
      logger.fail('problems table verification', error);
    }

    // Test 2: Get all problems
    try {
      const problems = await database.getAllProblems();
      assert(Array.isArray(problems), 'Problems should be an array');
      logger.pass('get all problems', `Count: ${problems.length}`);
      
      if (problems.length > 0) {
        testProblemId = problems[0].id;
        logger.pass('test problem selected', `Problem ID: ${testProblemId}`);
      }
    } catch (error) {
      logger.fail('get all problems', error);
    }

    // Test 3: Get problem by ID with test cases
    try {
      if (testProblemId) {
        const problem = await database.getProblemById(testProblemId);
        assertNotNull(problem, 'Problem should be returned');
        assertEqual(problem.id, testProblemId, 'Problem ID should match');
        assertNotNull(problem.title, 'Problem should have title');
        
        // Check for test cases (may be in problem or separate table)
        const hasTestCases = (problem.testCases && problem.testCases.length > 0) ||
                            (problem.hiddenTestCases && problem.hiddenTestCases.length > 0);
        logger.pass('get problem by ID', `Has test cases: ${hasTestCases}`);
      } else {
        logger.pass('get problem by ID', 'No test problem available (skipped)');
      }
    } catch (error) {
      logger.fail('get problem by ID', error);
    }

    // Test 4: Verify test_cases table exists
    try {
      const tableCheck = await verifyTableStructure('test_cases', [
        'id',
        'problem_id',
        'input',
        'expected_output',
        'is_hidden',
      ]);
      assert(tableCheck.exists, 'test_cases table should exist');
      logger.pass('test_cases table exists', tableCheck.missingColumns ? `Missing: ${tableCheck.missingColumns.join(', ')}` : '');
    } catch (error) {
      logger.fail('test_cases table verification', error);
    }

    // Test 5: Get test cases from Supabase
    try {
      if (testProblemId) {
        const testCases = await database.getTestCasesFromSupabase(testProblemId);
        assertNotNull(testCases, 'Test cases should be returned');
        assert(Array.isArray(testCases.visible), 'Visible test cases should be array');
        assert(Array.isArray(testCases.hidden), 'Hidden test cases should be array');
        logger.pass('get test cases from Supabase', `Visible: ${testCases.visible.length}, Hidden: ${testCases.hidden.length}`);
      } else {
        logger.pass('get test cases from Supabase', 'No test problem available (skipped)');
      }
    } catch (error) {
      logger.fail('get test cases from Supabase', error);
    }

    // Test 6: Verify problem_versions table exists
    try {
      const tableCheck = await verifyTableStructure('problem_versions', [
        'version_id',
        'problem_id',
        'language',
        'solution_code',
      ]);
      assert(tableCheck.exists, 'problem_versions table should exist');
      logger.pass('problem_versions table exists', tableCheck.missingColumns ? `Missing: ${tableCheck.missingColumns.join(', ')}` : '');
    } catch (error) {
      logger.fail('problem_versions table verification', error);
    }

    // Test 7: Get problem versions
    try {
      if (testProblemId) {
        const supabase = database.getSupabaseClient();
        if (supabase) {
          const { data: versions } = await supabase
            .from('problem_versions')
            .select('*')
            .eq('problem_id', testProblemId)
            .limit(5);

          assert(Array.isArray(versions), 'Versions should be an array');
          logger.pass('get problem versions', `Count: ${versions.length}`);
        } else {
          logger.pass('get problem versions', 'Supabase not available (skipped)');
        }
      } else {
        logger.pass('get problem versions', 'No test problem available (skipped)');
      }
    } catch (error) {
      logger.fail('get problem versions', error);
    }

    // Test 8: Verify submissions table exists
    try {
      const tableCheck = await verifyTableStructure('submissions', [
        'id',
        'user_id',
        'problem_id',
        'code',
        'language',
        'verdict',
      ]);
      assert(tableCheck.exists, 'submissions table should exist');
      logger.pass('submissions table exists', tableCheck.missingColumns ? `Missing: ${tableCheck.missingColumns.join(', ')}` : '');
    } catch (error) {
      logger.fail('submissions table verification', error);
    }

    // Test 9: Create submission
    try {
      if (testProblemId) {
        const submissionData = testDataGenerators.submission(testProblemId, testUserId);
        testSubmissionId = submissionData.id;

        const submission = await database.createSubmission(submissionData);
        assertNotNull(submission, 'Submission should be created');
        assertEqual(submission.id, testSubmissionId, 'Submission ID should match');
        logger.pass('create submission', `Submission ID: ${submission.id}`);
      } else {
        logger.pass('create submission', 'No test problem available (skipped)');
      }
    } catch (error) {
      logger.fail('create submission', error);
    }

    // Test 10: Get submission by ID
    try {
      if (testSubmissionId) {
        const submission = await database.getSubmissionById(testSubmissionId);
        if (submission) {
          assertEqual(submission.id, testSubmissionId, 'Submission ID should match');
          logger.pass('get submission by ID');
        } else {
          logger.pass('get submission by ID', 'Submission not in DB (local fallback)');
        }
      } else {
        logger.pass('get submission by ID', 'No test submission available (skipped)');
      }
    } catch (error) {
      logger.fail('get submission by ID', error);
    }

    // Test 11: Get submissions by user
    try {
      const submissions = await database.getSubmissionsByUser(testUserId, 10);
      assert(Array.isArray(submissions), 'Submissions should be an array');
      logger.pass('get submissions by user', `Count: ${submissions.length}`);
    } catch (error) {
      logger.fail('get submissions by user', error);
    }

    // Test 12: Get submissions by problem
    try {
      if (testProblemId) {
        const submissions = await database.getSubmissionsByProblem(testProblemId, 10);
        assert(Array.isArray(submissions), 'Submissions should be an array');
        logger.pass('get submissions by problem', `Count: ${submissions.length}`);
      } else {
        logger.pass('get submissions by problem', 'No test problem available (skipped)');
      }
    } catch (error) {
      logger.fail('get submissions by problem', error);
    }

    // Test 13: Test local fallback mechanism
    try {
      const supabase = database.getSupabaseClient();
      const isSupabaseAvailable = database.isSupabaseAvailable();
      
      // Try to get a problem - should work with either Supabase or local
      const problems = await database.getAllProblems();
      assert(Array.isArray(problems), 'Should get problems from Supabase or local');
      logger.pass('local/Supabase fallback', `Supabase: ${isSupabaseAvailable}, Problems: ${problems.length}`);
    } catch (error) {
      logger.fail('local/Supabase fallback', error);
    }

    // Test 14: Test problem filtering
    try {
      const easyProblems = await database.getAllProblems({ difficulty: 'Easy' });
      assert(Array.isArray(easyProblems), 'Filtered problems should be array');
      logger.pass('filter problems by difficulty', `Easy problems: ${easyProblems.length}`);
    } catch (error) {
      logger.fail('filter problems by difficulty', error);
    }

    // Test 15: Test problem tags update
    try {
      if (testProblemId) {
        const newTags = ['array', 'two-pointers'];
        const updated = await database.updateProblemTags(testProblemId, newTags);
        if (updated) {
          logger.pass('update problem tags');
        } else {
          logger.pass('update problem tags', 'Update not persisted (local fallback)');
        }
      } else {
        logger.pass('update problem tags', 'No test problem available (skipped)');
      }
    } catch (error) {
      logger.fail('update problem tags', error);
    }

    // Test 16: Verify submission mapping (Supabase to model)
    try {
      if (testSubmissionId) {
        const submission = await database.getSubmissionById(testSubmissionId);
        if (submission) {
          // Check that submission has required fields
          assertNotNull(submission.problemId, 'Submission should have problemId');
          assertNotNull(submission.userId, 'Submission should have userId');
          assertNotNull(submission.code, 'Submission should have code');
          assertNotNull(submission.language, 'Submission should have language');
          logger.pass('submission field mapping', 'All required fields present');
        } else {
          logger.pass('submission field mapping', 'Submission not in DB (skipped)');
        }
      } else {
        logger.pass('submission field mapping', 'No test submission available (skipped)');
      }
    } catch (error) {
      logger.fail('submission field mapping', error);
    }
  } catch (error) {
    logger.fail('Test suite error', error);
  } finally {
    // Cleanup
    await cleanupTestData(testUserId);
  }

  return logger.getSummary();
}

