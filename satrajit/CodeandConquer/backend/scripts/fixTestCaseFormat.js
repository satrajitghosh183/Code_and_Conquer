/**
 * Fix Test Case Format
 * 
 * This script fixes incorrectly formatted test cases that were generated.
 * It converts string-based test cases to proper array/object format.
 */

import database from '../src/config/database.js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROBLEMS_DIR = path.join(__dirname, '../../data/problems');

/**
 * Fix a single test case by parsing it properly
 */
function fixTestCase(testCase) {
  if (!testCase || typeof testCase !== 'object') {
    return null;
  }
  
  let { input, expectedOutput } = testCase;
  
  // Fix input
  if (Array.isArray(input) && input.length > 0) {
    // Check if first element is a string that needs parsing
    if (typeof input[0] === 'string' && input[0].includes('=')) {
      // Parse the string like "4, p = 0, banned = [1,2], k = 4"
      const parsed = parseInputString(input[0]);
      if (parsed && parsed.length > 0) {
        input = parsed;
      }
    } else if (typeof input[0] === 'string' && input[0].includes('\\[')) {
      // Has escaped brackets - needs parsing
      const cleaned = input[0].replace(/\\\[/g, '[').replace(/\\\]/g, ']');
      try {
        const parsed = JSON.parse(cleaned);
        input = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        // Try to parse as input string
        const parsed = parseInputString(cleaned);
        if (parsed && parsed.length > 0) {
          input = parsed;
        }
      }
    }
  }
  
  // Fix expectedOutput
  if (typeof expectedOutput === 'string') {
    // Remove escaped brackets
    let cleaned = expectedOutput.replace(/\\\[/g, '[').replace(/\\\]/g, ']');
    
    // Try JSON parse
    try {
      expectedOutput = JSON.parse(cleaned);
    } catch {
      // Try parsing as value
      expectedOutput = parseValue(cleaned);
    }
  }
  
  return {
    input: input,
    expectedOutput: expectedOutput
  };
}

/**
 * Parse input string like "4, p = 0, banned = [1,2], k = 4"
 */
function parseInputString(inputStr) {
  if (!inputStr || typeof inputStr !== 'string') {
    return [];
  }
  
  // Remove escaped brackets
  inputStr = inputStr.replace(/\\\[/g, '[').replace(/\\\]/g, ']');
  
  const values = [];
  let currentVar = '';
  let currentValue = '';
  let inAssignment = false;
  let bracketDepth = 0;
  
  for (let i = 0; i < inputStr.length; i++) {
    const char = inputStr[i];
    
    if (char === '=' && bracketDepth === 0) {
      inAssignment = true;
      continue;
    }
    
    if (char === '[') bracketDepth++;
    if (char === ']') bracketDepth--;
    
    if (char === ',' && bracketDepth === 0 && inAssignment) {
      // End of current assignment
      const parsed = parseValue(currentValue.trim());
      if (parsed !== null) {
        values.push(parsed);
      }
      currentVar = '';
      currentValue = '';
      inAssignment = false;
      continue;
    }
    
    if (inAssignment) {
      currentValue += char;
    } else if (!char.match(/\s/)) {
      currentVar += char;
    }
  }
  
  // Handle last assignment
  if (inAssignment && currentValue.trim()) {
    const parsed = parseValue(currentValue.trim());
    if (parsed !== null) {
      values.push(parsed);
    }
  }
  
  return values;
}

/**
 * Parse a single value
 */
function parseValue(valueStr) {
  if (!valueStr || typeof valueStr !== 'string') {
    return valueStr;
  }
  
  valueStr = valueStr.trim();
  
  // Remove escaped brackets
  valueStr = valueStr.replace(/\\\[/g, '[').replace(/\\\]/g, ']');
  
  // Try JSON parse first
  try {
    return JSON.parse(valueStr);
  } catch {}
  
  // Try array format
  if (valueStr.startsWith('[') && valueStr.endsWith(']')) {
    try {
      return JSON.parse(valueStr);
    } catch {
      // Manual parsing
      const content = valueStr.slice(1, -1).trim();
      if (!content) return [];
      
      return content.split(',').map(item => {
        const trimmed = item.trim();
        if (/^-?\d+$/.test(trimmed)) return parseInt(trimmed);
        if (/^-?\d*\.\d+$/.test(trimmed)) return parseFloat(trimmed);
        if (trimmed === 'true') return true;
        if (trimmed === 'false') return false;
        if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
            (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
          return trimmed.slice(1, -1);
        }
        return trimmed;
      });
    }
  }
  
  // Try number
  if (/^-?\d+$/.test(valueStr)) return parseInt(valueStr);
  if (/^-?\d*\.\d+$/.test(valueStr)) return parseFloat(valueStr);
  
  // Try boolean
  if (valueStr === 'true') return true;
  if (valueStr === 'false') return false;
  
  return valueStr;
}

/**
 * Check if test case needs fixing
 */
function needsFixing(testCase) {
  if (!testCase || typeof testCase !== 'object') {
    return true;
  }
  
  // Check if input is a string that needs parsing
  if (Array.isArray(testCase.input) && testCase.input.length > 0) {
    const firstInput = testCase.input[0];
    if (typeof firstInput === 'string' && (firstInput.includes('=') || firstInput.includes('\\['))) {
      return true;
    }
  }
  
  // Check if expectedOutput is a string with escaped brackets
  if (typeof testCase.expectedOutput === 'string' && testCase.expectedOutput.includes('\\[')) {
    return true;
  }
  
  return false;
}

/**
 * Fix test cases for a problem
 */
async function fixProblemTestCases(problemId) {
  try {
    const problem = await database.getProblemById(problemId);
    if (!problem) {
      return { fixed: false, reason: 'Problem not found' };
    }
    
    const testCases = problem.testCases || [];
    const hiddenTestCases = problem.hiddenTestCases || [];
    
    let fixedTestCases = [];
    let fixedHiddenTestCases = [];
    let needsUpdate = false;
    
    // Fix visible test cases
    for (const testCase of testCases) {
      if (needsFixing(testCase)) {
        const fixed = fixTestCase(testCase);
        if (fixed) {
          fixedTestCases.push(fixed);
          needsUpdate = true;
        } else {
          fixedTestCases.push(testCase); // Keep original if can't fix
        }
      } else {
        fixedTestCases.push(testCase); // Already correct
      }
    }
    
    // Fix hidden test cases
    for (const testCase of hiddenTestCases) {
      if (needsFixing(testCase)) {
        const fixed = fixTestCase(testCase);
        if (fixed) {
          fixedHiddenTestCases.push(fixed);
          needsUpdate = true;
        } else {
          fixedHiddenTestCases.push(testCase);
        }
      } else {
        fixedHiddenTestCases.push(testCase);
      }
    }
    
    if (!needsUpdate) {
      return { fixed: false, reason: 'No fixes needed' };
    }
    
    // Update problem
    await database.updateProblem(problemId, {
      testCases: fixedTestCases,
      hiddenTestCases: fixedHiddenTestCases
    });
    
    // Also update local file
    await fs.ensureDir(PROBLEMS_DIR);
    const filePath = path.join(PROBLEMS_DIR, `${problemId}.json`);
    if (await fs.pathExists(filePath)) {
      const localProblem = await fs.readJson(filePath);
      localProblem.testCases = fixedTestCases;
      localProblem.hiddenTestCases = fixedHiddenTestCases;
      localProblem.updatedAt = new Date().toISOString();
      await fs.writeJson(filePath, localProblem, { spaces: 2 });
    }
    
    return { fixed: true, testCasesCount: fixedTestCases.length, hiddenCount: fixedHiddenTestCases.length };
  } catch (error) {
    return { fixed: false, reason: error.message };
  }
}

/**
 * Main function
 */
async function main() {
  console.log('=== Fix Test Case Format ===\n');
  
  try {
    const allProblems = await database.getAllProblems({});
    const problemsToProcess = allProblems.slice(0, 300);
    
    console.log(`Found ${allProblems.length} total problems. Processing first ${problemsToProcess.length}...\n`);
    
    let processed = 0;
    let fixed = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const problem of problemsToProcess) {
      processed++;
      
      // Only process problems that have test cases
      const hasTestCases = (problem.testCases && Array.isArray(problem.testCases) && problem.testCases.length > 0) ||
                          (problem.hiddenTestCases && Array.isArray(problem.hiddenTestCases) && problem.hiddenTestCases.length > 0);
      
      if (!hasTestCases) {
        skipped++;
        continue;
      }
      
      // Check if any test case needs fixing
      const testCases = problem.testCases || [];
      const needsFixingCheck = testCases.some(tc => needsFixing(tc)) || 
                               (problem.hiddenTestCases || []).some(tc => needsFixing(tc));
      
      if (!needsFixingCheck) {
        skipped++;
        continue;
      }
      
      const result = await fixProblemTestCases(problem.id);
      
      if (result.fixed) {
        fixed++;
        console.log(`[${processed}/${problemsToProcess.length}] ✓ Fixed "${problem.title}" - ${result.testCasesCount} visible, ${result.hiddenCount} hidden test cases`);
      } else {
        if (result.reason !== 'No fixes needed') {
          errors++;
          console.log(`[${processed}/${problemsToProcess.length}] ✗ Failed to fix "${problem.title}": ${result.reason}`);
        } else {
          skipped++;
        }
      }
    }
    
    console.log('\n=== Summary ===');
    console.log(`Processed: ${processed}`);
    console.log(`Fixed: ${fixed}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Errors: ${errors}`);
    
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

