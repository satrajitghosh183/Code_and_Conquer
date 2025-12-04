/**
 * Script to generate test cases for problems that don't have them
 * and update both local files and Supabase database
 */

import database from '../src/config/database.js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROBLEMS_DIR = path.join(__dirname, '../../data/problems');

/**
 * Parse example input/output strings to extract actual values
 */
function parseExample(example) {
  try {
    const inputStr = example.input || '';
    const outputStr = example.output || '';
    
    // Try to extract values from strings like "nums = [2,7,11,15], target = 9"
    const inputValues = {};
    const parts = inputStr.split(',').map(p => p.trim());
    
    for (const part of parts) {
      if (part.includes('=')) {
        const [key, value] = part.split('=').map(s => s.trim());
        const cleanKey = key.replace(/[^a-zA-Z0-9_]/g, '');
        
        // Try to parse the value
        let parsedValue = value.trim();
        
        // Try JSON parse for arrays/objects
        try {
          parsedValue = JSON.parse(parsedValue);
        } catch {
          // If not JSON, try to extract array/object manually
          if (parsedValue.startsWith('[') && parsedValue.endsWith(']')) {
            parsedValue = parsedValue.slice(1, -1).split(',').map(v => {
              const trimmed = v.trim();
              if (trimmed === 'true') return true;
              if (trimmed === 'false') return false;
              if (trimmed === 'null') return null;
              if (/^-?\d+$/.test(trimmed)) return parseInt(trimmed);
              if (/^-?\d*\.\d+$/.test(trimmed)) return parseFloat(trimmed);
              if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
                return trimmed.slice(1, -1);
              }
              if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
                return trimmed.slice(1, -1);
              }
              return trimmed;
            });
          } else if (/^-?\d+$/.test(parsedValue)) {
            parsedValue = parseInt(parsedValue);
          } else if (/^-?\d*\.\d+$/.test(parsedValue)) {
            parsedValue = parseFloat(parsedValue);
          } else if (parsedValue === 'true') {
            parsedValue = true;
          } else if (parsedValue === 'false') {
            parsedValue = false;
          } else if (parsedValue === 'null') {
            parsedValue = null;
          } else if ((parsedValue.startsWith('"') && parsedValue.endsWith('"')) ||
                     (parsedValue.startsWith("'") && parsedValue.endsWith("'"))) {
            parsedValue = parsedValue.slice(1, -1);
          }
        }
        
        inputValues[cleanKey] = parsedValue;
      }
    }
    
    // Extract output value
    let expectedOutput = outputStr.trim();
    try {
      expectedOutput = JSON.parse(expectedOutput);
    } catch {
      if (expectedOutput.startsWith('[') && expectedOutput.endsWith(']')) {
        expectedOutput = expectedOutput.slice(1, -1).split(',').map(v => {
          const trimmed = v.trim();
          if (trimmed === 'true') return true;
          if (trimmed === 'false') return false;
          if (trimmed === 'null') return null;
          if (/^-?\d+$/.test(trimmed)) return parseInt(trimmed);
          if (/^-?\d*\.\d+$/.test(trimmed)) return parseFloat(trimmed);
          return trimmed;
        });
      } else if (/^-?\d+$/.test(expectedOutput)) {
        expectedOutput = parseInt(expectedOutput);
      } else if (/^-?\d*\.\d+$/.test(expectedOutput)) {
        expectedOutput = parseFloat(expectedOutput);
      } else if (expectedOutput === 'true') {
        expectedOutput = true;
      } else if (expectedOutput === 'false') {
        expectedOutput = false;
      } else if ((expectedOutput.startsWith('"') && expectedOutput.endsWith('"')) ||
                 (expectedOutput.startsWith("'") && expectedOutput.endsWith("'"))) {
        expectedOutput = expectedOutput.slice(1, -1);
      }
    }
    
    // Convert inputValues object to array if multiple values, or single value
    const inputArray = Object.keys(inputValues).length > 1 
      ? Object.values(inputValues)
      : Object.values(inputValues)[0];
    
    return {
      input: Array.isArray(inputArray) ? inputArray : [inputArray],
      expectedOutput: expectedOutput
    };
  } catch (error) {
    console.warn(`Failed to parse example: ${error.message}`);
    return null;
  }
}

/**
 * Generate test cases from examples
 */
function generateTestCasesFromExamples(problem) {
  const testCases = [];
  const hiddenTestCases = [];
  
  if (!problem.examples || !Array.isArray(problem.examples) || problem.examples.length === 0) {
    return { testCases: [], hiddenTestCases: [] };
  }
  
  // Convert first 2-3 examples to visible test cases
  const visibleExamples = problem.examples.slice(0, Math.min(3, problem.examples.length));
  for (const example of visibleExamples) {
    const testCase = parseExample(example);
    if (testCase) {
      testCases.push(testCase);
    }
  }
  
  // If there are more examples, use them as hidden test cases
  if (problem.examples.length > 3) {
    const hiddenExamples = problem.examples.slice(3);
    for (const example of hiddenExamples) {
      const testCase = parseExample(example);
      if (testCase) {
        hiddenTestCases.push(testCase);
      }
    }
  }
  
  // Generate additional hidden test cases based on constraints
  if (problem.constraints && Array.isArray(problem.constraints)) {
    // Try to generate edge cases based on constraints
    // This is a simplified version - you might want to expand this
    if (testCases.length > 0) {
      const firstTest = testCases[0];
      if (firstTest && Array.isArray(firstTest.input)) {
        // Add empty array case if applicable
        const emptyCase = {
          input: [[]],
          expectedOutput: [] // This would need to be calculated properly
        };
        // Only add if it makes sense for the problem
      }
    }
  }
  
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
    
    // Use database.updateProblem which handles both Supabase and local
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
    const filePath = path.join(PROBLEMS_DIR, `${problem.id}.json`);
    await fs.writeJson(filePath, problem, { spaces: 2 });
    return true;
  } catch (error) {
    console.error(`Error updating local file for problem ${problem.id}:`, error.message);
    return false;
  }
}

/**
 * Main function to process problems
 */
async function main() {
  console.log('Starting test case generation for problems...\n');
  
  try {
    // Fetch first 300 problems from database
    console.log('Fetching problems from database...');
    const allProblems = await database.getAllProblems({});
    const problemsToProcess = allProblems.slice(0, 300);
    
    console.log(`Found ${allProblems.length} total problems. Processing first ${problemsToProcess.length}...\n`);
    
    let processed = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const problem of problemsToProcess) {
      processed++;
      
      // Check if problem already has test cases
      const hasTestCases = (problem.testCases && Array.isArray(problem.testCases) && problem.testCases.length > 0) ||
                          (problem.hiddenTestCases && Array.isArray(problem.hiddenTestCases) && problem.hiddenTestCases.length > 0);
      
      if (hasTestCases) {
        console.log(`[${processed}/${problemsToProcess.length}] Skipping "${problem.title}" (${problem.id}) - already has test cases`);
        skipped++;
        continue;
      }
      
      console.log(`[${processed}/${problemsToProcess.length}] Processing "${problem.title}" (${problem.id})...`);
      
      // Generate test cases from examples
      const { testCases, hiddenTestCases } = generateTestCasesFromExamples(problem);
      
      if (testCases.length === 0 && hiddenTestCases.length === 0) {
        console.log(`  ⚠️  No test cases could be generated (no valid examples found)`);
        errors++;
        continue;
      }
      
      // Update problem with test cases
      problem.testCases = testCases;
      problem.hiddenTestCases = hiddenTestCases;
      
      // Update in database (handles both Supabase and local)
      const dbUpdated = await updateProblem(problem);
      
      // Also update local file directly to ensure it's saved
      const localUpdated = await updateLocalFile(problem);
      
      if (dbUpdated || localUpdated) {
        console.log(`  ✓ Generated ${testCases.length} visible and ${hiddenTestCases.length} hidden test cases`);
        console.log(`  ✓ Updated in database and local file`);
        updated++;
      } else {
        console.log(`  ✗ Failed to update problem`);
        errors++;
      }
      
      // Small delay to avoid overwhelming the database
      if (processed % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log('\n=== Summary ===');
    console.log(`Total processed: ${processed}`);
    console.log(`Updated: ${updated}`);
    console.log(`Skipped (already had test cases): ${skipped}`);
    console.log(`Errors: ${errors}`);
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
main().then(() => {
  console.log('\nScript completed!');
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});

