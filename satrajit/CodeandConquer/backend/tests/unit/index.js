/**
 * Unit Test Runner
 * Runs all unit tests and generates a test report
 */

import { getTestResults, resetTestResults } from './test-framework.js';
import './utils.test.js';
import './api.test.js';
import './models.test.js';

// Run tests and generate report
const results = getTestResults();

console.log('\n' + '='.repeat(60));
console.log('UNIT TEST RESULTS');
console.log('='.repeat(60));
console.log(`Total Tests: ${results.passed + results.failed}`);
console.log(`✅ Passed: ${results.passed}`);
console.log(`❌ Failed: ${results.failed}`);
console.log(`Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
console.log('='.repeat(60));

// Generate JSON report for GitHub Actions
const fs = await import('fs');
const path = await import('path');
const { fileURLToPath } = await import('url');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const reportPath = path.join(__dirname, '../../test-results.json');

const report = {
  timestamp: new Date().toISOString(),
  summary: {
    total: results.passed + results.failed,
    passed: results.passed,
    failed: results.failed,
    successRate: ((results.passed / (results.passed + results.failed)) * 100).toFixed(1) + '%'
  },
  tests: results.tests
};

fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`\n📄 Test report saved to: ${reportPath}`);

// Exit with appropriate code
if (results.failed > 0) {
  console.log('\n❌ Some tests failed. Exiting with code 1.');
  process.exit(1);
} else {
  console.log('\n✅ All tests passed!');
  process.exit(0);
}
