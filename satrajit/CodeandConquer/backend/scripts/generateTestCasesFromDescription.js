/**
 * Script to generate test cases by analyzing problem descriptions, constraints, and starter code
 * Uses intelligent reasoning to create appropriate test cases
 */

import database from '../src/config/database.js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROBLEMS_DIR = path.join(__dirname, '../../data/problems');

/**
 * Analyze starter code to understand function signature and parameters
 */
function analyzeStarterCode(problem) {
  const starterCode = problem.starterCode || {};
  const jsCode = starterCode.javascript || starterCode.js || '';
  
  // Extract function name and parameters
  const functionMatch = jsCode.match(/function\s+(\w+)\s*\(([^)]*)\)/);
  if (functionMatch) {
    const params = functionMatch[2]
      .split(',')
      .map(p => p.trim())
      .filter(p => p);
    return { functionName: functionMatch[1], parameters: params };
  }
  
  // Try arrow function
  const arrowMatch = jsCode.match(/(\w+)\s*=\s*\(([^)]*)\)\s*=>/);
  if (arrowMatch) {
    const params = arrowMatch[2]
      .split(',')
      .map(p => p.trim())
      .filter(p => p);
    return { functionName: arrowMatch[1], parameters: params };
  }
  
  return null;
}

/**
 * Extract constraints from problem description
 */
function extractConstraints(constraints) {
  if (!Array.isArray(constraints)) return {};
  
  const result = {
    min: {},
    max: {},
    types: {}
  };
  
  for (const constraint of constraints) {
    // Parse patterns like "1 <= nums.length <= 10^4"
    const rangeMatch = constraint.match(/(\d+(?:\^\d+)?)\s*<=\s*(\w+)(?:\.(\w+))?\s*<=\s*(\d+(?:\^\d+)?)/);
    if (rangeMatch) {
      const min = parseNumber(rangeMatch[1]);
      const variable = rangeMatch[2];
      const property = rangeMatch[3];
      const max = parseNumber(rangeMatch[4]);
      
      if (property) {
        if (!result.min[variable]) result.min[variable] = {};
        if (!result.max[variable]) result.max[variable] = {};
        result.min[variable][property] = min;
        result.max[variable][property] = max;
      } else {
        result.min[variable] = min;
        result.max[variable] = max;
      }
    }
    
    // Parse patterns like "nums.length >= 2"
    const minMatch = constraint.match(/(\w+)(?:\.(\w+))?\s*>=\s*(\d+)/);
    if (minMatch) {
      const variable = minMatch[1];
      const property = minMatch[2];
      const min = parseInt(minMatch[3]);
      
      if (property) {
        if (!result.min[variable]) result.min[variable] = {};
        result.min[variable][property] = min;
      } else {
        result.min[variable] = min;
      }
    }
  }
  
  return result;
}

function parseNumber(str) {
  if (str.includes('^')) {
    const [base, exp] = str.split('^');
    return Math.pow(parseInt(base), parseInt(exp));
  }
  return parseInt(str);
}

/**
 * Generate test cases based on problem analysis
 * This is a simplified version - you can expand this with more sophisticated logic
 */
function generateTestCasesFromAnalysis(problem) {
  const testCases = [];
  const hiddenTestCases = [];
  
  // Get function signature
  const signature = analyzeStarterCode(problem);
  if (!signature) {
    return { testCases: [], hiddenTestCases: [] };
  }
  
  // Get constraints
  const constraints = extractConstraints(problem.constraints);
  
  // Try to infer test cases from common patterns
  const title = (problem.title || '').toLowerCase();
  
  // Array-based problems
  if (title.includes('array') || title.includes('sum') || title.includes('two sum')) {
    // Generate basic array test cases
    testCases.push({
      input: [[2, 7, 11, 15], 9],
      expectedOutput: [0, 1]
    });
    testCases.push({
      input: [[3, 2, 4], 6],
      expectedOutput: [1, 2]
    });
    hiddenTestCases.push({
      input: [[3, 3], 6],
      expectedOutput: [0, 1]
    });
  }
  
  // String-based problems
  else if (title.includes('string') || title.includes('palindrome') || title.includes('valid')) {
    testCases.push({
      input: ["abc"],
      expectedOutput: true
    });
    testCases.push({
      input: ["abcba"],
      expectedOutput: true
    });
  }
  
  // Tree/Graph problems
  else if (title.includes('tree') || title.includes('node') || title.includes('graph')) {
    // These are harder to generate without more context
    return { testCases: [], hiddenTestCases: [] };
  }
  
  // For other problems, we can't easily generate without more context
  // Return empty for now - these would need manual creation or LLM API
  
  return { testCases, hiddenTestCases };
}

/**
 * Update problem in database and local file
 */
async function updateProblem(problem) {
  try {
    const { testCases, hiddenTestCases } = problem;
    
    const updates = {
      testCases: testCases || [],
      hiddenTestCases: hiddenTestCases || []
    };
    
    const updated = await database.updateProblem(problem.id, updates);
    return updated !== null;
  } catch (error) {
    console.error(`Error updating problem ${problem.id}:`, error.message);
    return false;
  }
}

/**
 * Update local JSON file
 */
async function updateLocalFile(problem) {
  try {
    await fs.ensureDir(PROBLEMS_DIR);
    const filePath = path.join(PROBLEMS_DIR, `${problem.id}.json`);
    await fs.writeJson(filePath, problem, { spaces: 2 });
    return true;
  } catch (error) {
    console.error(`Error updating local file for problem ${problem.id}:`, error.message);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('⚠️  This script can only generate test cases for very common problem patterns.');
  console.log('⚠️  For complex problems, test cases need to be created manually or using an LLM API.\n');
  console.log('Starting test case generation...\n');
  
  try {
    const allProblems = await database.getAllProblems({});
    const problemsToProcess = allProblems.slice(0, 300);
    
    console.log(`Found ${allProblems.length} total problems. Processing first ${problemsToProcess.length}...\n`);
    
    let processed = 0;
    let updated = 0;
    let skipped = 0;
    let generated = 0;
    let needsManual = 0;
    
    for (const problem of problemsToProcess) {
      processed++;
      
      // Check if problem already has test cases
      const hasTestCases = (problem.testCases && Array.isArray(problem.testCases) && problem.testCases.length > 0) ||
                          (problem.hiddenTestCases && Array.isArray(problem.hiddenTestCases) && problem.hiddenTestCases.length > 0);
      
      if (hasTestCases) {
        skipped++;
        if (processed % 50 === 0) {
          console.log(`[${processed}/${problemsToProcess.length}] Processed... (skipped: ${skipped}, generated: ${generated})`);
        }
        continue;
      }
      
      // Generate test cases
      const { testCases, hiddenTestCases } = generateTestCasesFromAnalysis(problem);
      
      if (testCases.length === 0 && hiddenTestCases.length === 0) {
        needsManual++;
        if (processed % 50 === 0) {
          console.log(`[${processed}/${problemsToProcess.length}] Processed... (needs manual: ${needsManual})`);
        }
        continue;
      }
      
      // Update problem
      problem.testCases = testCases;
      problem.hiddenTestCases = hiddenTestCases;
      
      const dbUpdated = await updateProblem(problem);
      const localUpdated = await updateLocalFile(problem);
      
      if (dbUpdated || localUpdated) {
        generated++;
        if (processed % 10 === 0) {
          console.log(`[${processed}/${problemsToProcess.length}] Generated test cases for "${problem.title}"`);
        }
        updated++;
      }
    }
    
    console.log('\n=== Summary ===');
    console.log(`Total processed: ${processed}`);
    console.log(`Updated: ${updated}`);
    console.log(`Skipped (already had test cases): ${skipped}`);
    console.log(`Generated from patterns: ${generated}`);
    console.log(`Need manual creation: ${needsManual}`);
    console.log('\n⚠️  Most problems need manual test case creation or an LLM API to generate properly.');
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main().then(() => {
  console.log('\nScript completed!');
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});

