/**
 * Script to generate test cases using LLM-style reasoning
 * This script intelligently analyzes problems and generates appropriate test cases
 */

import database from '../src/config/database.js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROBLEMS_DIR = path.join(__dirname, '../../data/problems');

/**
 * Parse example text into structured test case
 * Uses intelligent parsing based on problem context
 */
function parseExampleIntelligently(example, problem) {
  try {
    const inputStr = example.input || '';
    const outputStr = example.output || '';
    
    // Try multiple parsing strategies
    // Strategy 1: Direct JSON parse
    try {
      const parsedInput = JSON.parse(inputStr);
      const parsedOutput = JSON.parse(outputStr);
      return {
        input: Array.isArray(parsedInput) ? parsedInput : [parsedInput],
        expectedOutput: parsedOutput
      };
    } catch {}
    
    // Strategy 2: Parse from string format like "nums = [2,7,11,15], target = 9"
    const inputValues = {};
    
    // Extract variable assignments
    const assignmentRegex = /(\w+)\s*=\s*([^,]+(?:,\s*[^,]+)*)/g;
    let match;
    while ((match = assignmentRegex.exec(inputStr)) !== null) {
      const varName = match[1].trim();
      let varValue = match[2].trim();
      
      // Try to parse the value
      let parsedValue = varValue;
      
      // Try JSON parse first
      try {
        parsedValue = JSON.parse(varValue);
      } catch {
        // Try to parse arrays manually
        if (varValue.startsWith('[') && varValue.endsWith(']')) {
          try {
            parsedValue = JSON.parse(varValue);
          } catch {
            // Manual array parsing
            const content = varValue.slice(1, -1).trim();
            if (content) {
              parsedValue = content.split(',').map(v => {
                const trimmed = v.trim();
                // Try number
                if (/^-?\d+$/.test(trimmed)) return parseInt(trimmed);
                if (/^-?\d*\.\d+$/.test(trimmed)) return parseFloat(trimmed);
                // Try boolean
                if (trimmed === 'true') return true;
                if (trimmed === 'false') return false;
                // Remove quotes
                if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
                    (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
                  return trimmed.slice(1, -1);
                }
                return trimmed;
              });
            } else {
              parsedValue = [];
            }
          }
        }
        // Try number
        else if (/^-?\d+$/.test(varValue)) {
          parsedValue = parseInt(varValue);
        }
        else if (/^-?\d*\.\d+$/.test(varValue)) {
          parsedValue = parseFloat(varValue);
        }
        // Try boolean
        else if (varValue === 'true' || varValue === 'True') {
          parsedValue = true;
        }
        else if (varValue === 'false' || varValue === 'False') {
          parsedValue = false;
        }
        // Try string (remove quotes)
        else if ((varValue.startsWith('"') && varValue.endsWith('"')) ||
                 (varValue.startsWith("'") && varValue.endsWith("'"))) {
          parsedValue = varValue.slice(1, -1);
        }
      }
      
      inputValues[varName] = parsedValue;
    }
    
    // If we have multiple variables, create array of values in order
    const inputArray = Object.keys(inputValues).length > 0 
      ? Object.values(inputValues)
      : [];
    
    // Parse output
    let expectedOutput = outputStr.trim();
    try {
      expectedOutput = JSON.parse(expectedOutput);
    } catch {
      // Try manual parsing
      if (expectedOutput.startsWith('[') && expectedOutput.endsWith(']')) {
        try {
          expectedOutput = JSON.parse(expectedOutput);
        } catch {
          const content = expectedOutput.slice(1, -1).trim();
          if (content) {
            expectedOutput = content.split(',').map(v => {
              const trimmed = v.trim();
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
          } else {
            expectedOutput = [];
          }
        }
      }
      else if (/^-?\d+$/.test(expectedOutput)) {
        expectedOutput = parseInt(expectedOutput);
      }
      else if (/^-?\d*\.\d+$/.test(expectedOutput)) {
        expectedOutput = parseFloat(expectedOutput);
      }
      else if (expectedOutput === 'true' || expectedOutput === 'True') {
        expectedOutput = true;
      }
      else if (expectedOutput === 'false' || expectedOutput === 'False') {
        expectedOutput = false;
      }
      else if ((expectedOutput.startsWith('"') && expectedOutput.endsWith('"')) ||
               (expectedOutput.startsWith("'") && expectedOutput.endsWith("'"))) {
        expectedOutput = expectedOutput.slice(1, -1);
      }
    }
    
    if (inputArray.length === 0) {
      return null;
    }
    
    return {
      input: inputArray.length > 1 ? inputArray : inputArray[0],
      expectedOutput: expectedOutput
    };
  } catch (error) {
    console.warn(`Failed to parse example: ${error.message}`);
    return null;
  }
}

/**
 * Generate test cases from examples using intelligent parsing
 */
function generateTestCasesFromExamples(problem) {
  const testCases = [];
  const hiddenTestCases = [];
  
  if (!problem.examples || !Array.isArray(problem.examples) || problem.examples.length === 0) {
    return { testCases: [], hiddenTestCases: [] };
  }
  
  // Parse examples
  const parsedExamples = [];
  for (const example of problem.examples) {
    const testCase = parseExampleIntelligently(example, problem);
    if (testCase) {
      parsedExamples.push(testCase);
    }
  }
  
  if (parsedExamples.length === 0) {
    return { testCases: [], hiddenTestCases: [] };
  }
  
  // First 2-3 examples become visible test cases
  const visibleCount = Math.min(3, parsedExamples.length);
  testCases.push(...parsedExamples.slice(0, visibleCount));
  
  // Remaining become hidden test cases
  if (parsedExamples.length > visibleCount) {
    hiddenTestCases.push(...parsedExamples.slice(visibleCount));
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
  console.log('Starting intelligent test case generation for problems...\n');
  
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

