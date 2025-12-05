/**
 * Master Test Runner
 * Orchestrates all automated tests and generates comprehensive report
 */

import { testUserAuthentication } from './automated/01_user_auth_test.js';
import { testProblemSubmission } from './automated/02_problem_submission_test.js';
import { testProgressionSystem } from './automated/03_progression_system_test.js';
import { testMultiplayerMatch } from './automated/04_multiplayer_match_test.js';
import { testLearningModules } from './automated/05_learning_modules_test.js';
import { testAdvertising } from './automated/06_advertising_test.js';
import { testLeaderboard } from './automated/07_leaderboard_test.js';
import { testPaymentSubscription } from './automated/08_payment_subscription_test.js';
import { testDailyChallenges } from './automated/09_daily_challenges_test.js';
import { testAnalyticsLogging } from './automated/10_analytics_logging_test.js';

const TEST_SUITES = [
  { name: 'User Authentication & Profile', fn: testUserAuthentication },
  { name: 'Problems & Submissions', fn: testProblemSubmission },
  { name: 'Progression System', fn: testProgressionSystem },
  { name: 'Multiplayer Match System', fn: testMultiplayerMatch },
  { name: 'Learning Modules', fn: testLearningModules },
  { name: 'Advertising System', fn: testAdvertising },
  { name: 'Leaderboard System', fn: testLeaderboard },
  { name: 'Payment & Subscriptions', fn: testPaymentSubscription },
  { name: 'Daily Challenges', fn: testDailyChallenges },
  { name: 'Analytics & Logging', fn: testAnalyticsLogging },
];

async function runAllTests() {
  console.log('\n' + '='.repeat(80));
  console.log('DATABASE VERIFICATION SUITE');
  console.log('='.repeat(80));
  console.log(`Started: ${new Date().toISOString()}\n`);

  const startTime = Date.now();
  const results = [];
  let totalPassed = 0;
  let totalFailed = 0;
  let totalTests = 0;

  for (let i = 0; i < TEST_SUITES.length; i++) {
    const suite = TEST_SUITES[i];
    console.log(`\n[${i + 1}/${TEST_SUITES.length}] Running: ${suite.name}`);
    console.log('-'.repeat(80));

    try {
      const suiteResult = await suite.fn();
      results.push({
        suite: suite.name,
        ...suiteResult,
      });

      totalPassed += suiteResult.passed;
      totalFailed += suiteResult.failed;
      totalTests += suiteResult.total;

      console.log(`\n✅ Suite Complete: ${suiteResult.passed} passed, ${suiteResult.failed} failed`);
    } catch (error) {
      console.error(`\n❌ Suite Error: ${error.message}`);
      console.error(error.stack);
      results.push({
        suite: suite.name,
        passed: 0,
        failed: 1,
        total: 1,
        passedTests: [],
        failedTests: [{ test: 'Suite execution', error: error.message }],
      });
      totalFailed += 1;
      totalTests += 1;
    }
  }

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Test Suites: ${TEST_SUITES.length}`);
  console.log(`Total Tests: ${totalTests}`);
  console.log(`✅ Passed: ${totalPassed}`);
  console.log(`❌ Failed: ${totalFailed}`);
  console.log(`Success Rate: ${totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : 0}%`);
  console.log(`Duration: ${duration}s`);
  console.log(`Completed: ${new Date().toISOString()}`);
  console.log('='.repeat(80));

  // Print detailed results
  console.log('\nDETAILED RESULTS BY SUITE:');
  console.log('='.repeat(80));

  results.forEach((result, index) => {
    console.log(`\n${index + 1}. ${result.suite}`);
    console.log(`   Tests: ${result.total} | Passed: ${result.passed} | Failed: ${result.failed}`);
    
    if (result.failed > 0) {
      console.log(`   Failed Tests:`);
      result.failedTests.forEach((test) => {
        console.log(`     - ${test.test}`);
        if (test.error) {
          console.log(`       Error: ${test.error}`);
        }
        if (test.details) {
          console.log(`       Details: ${test.details}`);
        }
      });
    }
  });

  // Print all failed tests
  if (totalFailed > 0) {
    console.log('\n' + '='.repeat(80));
    console.log('ALL FAILED TESTS:');
    console.log('='.repeat(80));
    
    results.forEach((result) => {
      if (result.failed > 0) {
        result.failedTests.forEach((test) => {
          console.log(`\n[${result.suite}] ${test.test}`);
          if (test.error) {
            console.log(`  Error: ${test.error}`);
          }
          if (test.details) {
            console.log(`  Details: ${test.details}`);
          }
        });
      }
    });
  }

  // Generate JSON report
  const report = {
    timestamp: new Date().toISOString(),
    duration: `${duration}s`,
    summary: {
      totalSuites: TEST_SUITES.length,
      totalTests,
      passed: totalPassed,
      failed: totalFailed,
      successRate: totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) + '%' : '0%',
    },
    suites: results,
  };

  // Save report to file
  try {
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const reportPath = path.join(__dirname, 'test_report.json');
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Test report saved to: ${reportPath}`);
  } catch (error) {
    console.warn(`\n⚠️  Could not save test report: ${error.message}`);
  }

  // Exit with appropriate code
  const exitCode = totalFailed > 0 ? 1 : 0;
  console.log(`\nExiting with code: ${exitCode}`);
  process.exit(exitCode);
}

// Handle unhandled errors
process.on('unhandledRejection', (error) => {
  console.error('\n❌ Unhandled Rejection:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('\n❌ Uncaught Exception:', error);
  process.exit(1);
});

// Run tests
runAllTests().catch((error) => {
  console.error('\n❌ Fatal Error:', error);
  process.exit(1);
});

