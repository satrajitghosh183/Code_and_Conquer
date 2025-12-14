/**
 * Simple Test Framework
 * A minimal testing framework for unit tests
 */

let testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

function describe(suiteName, testSuite) {
  console.log(`\n📦 ${suiteName}`);
  try {
    testSuite();
  } catch (error) {
    console.error(`❌ Suite failed: ${error.message}`);
    testResults.failed++;
  }
}

function it(testName, testFn) {
  try {
    testFn();
    console.log(`  ✅ ${testName}`);
    testResults.passed++;
    testResults.tests.push({ name: testName, status: 'passed' });
  } catch (error) {
    console.error(`  ❌ ${testName}`);
    console.error(`     Error: ${error.message}`);
    testResults.failed++;
    testResults.tests.push({ name: testName, status: 'failed', error: error.message });
  }
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`Expected ${expected} but got ${actual}`);
      }
    },
    toEqual(expected) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
      }
    },
    toBeTruthy() {
      if (!actual) {
        throw new Error(`Expected truthy value but got ${actual}`);
      }
    },
    toBeFalsy() {
      if (actual) {
        throw new Error(`Expected falsy value but got ${actual}`);
      }
    },
    toContain(item) {
      if (!actual.includes(item)) {
        throw new Error(`Expected ${actual} to contain ${item}`);
      }
    },
    toBeGreaterThan(expected) {
      if (actual <= expected) {
        throw new Error(`Expected ${actual} to be greater than ${expected}`);
      }
    },
    toBeLessThan(expected) {
      if (actual >= expected) {
        throw new Error(`Expected ${actual} to be less than ${expected}`);
      }
    },
    toBeGreaterThanOrEqual(expected) {
      if (actual < expected) {
        throw new Error(`Expected ${actual} to be greater than or equal to ${expected}`);
      }
    },
    toBeLessThanOrEqual(expected) {
      if (actual > expected) {
        throw new Error(`Expected ${actual} to be less than or equal to ${expected}`);
      }
    }
  };
}

function getTestResults() {
  return testResults;
}

function resetTestResults() {
  testResults = {
    passed: 0,
    failed: 0,
    tests: []
  };
}

export { describe, it, expect, getTestResults, resetTestResults };
