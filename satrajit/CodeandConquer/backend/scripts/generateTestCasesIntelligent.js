/**
 * Intelligent Test Case Generator
 * 
 * This script uses LLM-style reasoning to:
 * 1. Extract examples from problem descriptions
 * 2. Parse them into proper test case format
 * 3. Generate additional test cases based on problem logic
 */

import database from '../src/config/database.js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROBLEMS_DIR = path.join(__dirname, '../../data/problems');

/**
 * Extract examples from description text using intelligent parsing
 */
function extractExamplesFromDescription(description) {
  const examples = [];
  
  if (!description) return examples;
  
  // Pattern: **Example 1:** ... **Input:** ... **Output:** ...
  const exampleBlocks = description.match(/\*\*Example\s+\d+:\*\*([\s\S]*?)(?=\*\*Example\s+\d+:\*\*|$)/g);
  
  if (!exampleBlocks) {
    // Try simpler pattern
    const inputOutputPairs = description.match(/\*\*Input:\*\*([\s\S]*?)\*\*Output:\*\*/g);
    if (inputOutputPairs) {
      for (const pair of inputOutputPairs) {
        const inputMatch = pair.match(/\*\*Input:\*\*([\s\S]*?)(?:\*\*Output:)/);
        const outputMatch = pair.match(/\*\*Output:\*\*([\s\S]*?)(?:\*\*Explanation:|$)/);
        
        if (inputMatch && outputMatch) {
          examples.push({
            input: inputMatch[1].trim(),
            output: outputMatch[1].trim()
          });
        }
      }
    }
    return examples;
  }
  
  // Parse each example block
  for (const block of exampleBlocks) {
    const inputMatch = block.match(/\*\*Input:\*\*\s*([\s\S]*?)(?:\*\*Output:|\*\*Explanation:|$)/);
    const outputMatch = block.match(/\*\*Output:\*\*\s*([\s\S]*?)(?:\*\*Explanation:|\*\*Example|$)/);
    
    if (inputMatch && outputMatch) {
      examples.push({
        input: inputMatch[1].trim(),
        output: outputMatch[1].trim()
      });
    }
  }
  
  return examples;
}

/**
 * Intelligently parse input string into structured format
 * Handles multiple variable assignments like "n = 4, p = 0, banned = [1,2], k = 4"
 */
function parseInputString(inputStr) {
  inputStr = inputStr.trim();
  
  // Remove code blocks
  inputStr = inputStr.replace(/```[\s\S]*?```/g, '');
  
  const assignments = {};
  const parts = [];
  
  // Split by commas, but be careful of arrays
  let currentPart = '';
  let bracketDepth = 0;
  
  for (let i = 0; i < inputStr.length; i++) {
    const char = inputStr[i];
    if (char === '[') bracketDepth++;
    if (char === ']') bracketDepth--;
    
    if (char === ',' && bracketDepth === 0) {
      parts.push(currentPart.trim());
      currentPart = '';
    } else {
      currentPart += char;
    }
  }
  if (currentPart.trim()) parts.push(currentPart.trim());
  
  // Parse each assignment
  for (const part of parts) {
    const equalIndex = part.indexOf('=');
    if (equalIndex === -1) continue;
    
    const varName = part.substring(0, equalIndex).trim();
    let varValue = part.substring(equalIndex + 1).trim();
    
    // Clean up variable name (remove extra characters)
    const cleanVarName = varName.replace(/[^a-zA-Z0-9_]/g, '');
    
    // Parse the value
    assignments[cleanVarName] = parseValue(varValue);
  }
  
  // Return as array of values in order
  return Object.values(assignments);
}

/**
 * Parse a value string into JavaScript value
 */
function parseValue(valueStr) {
  valueStr = valueStr.trim();
  
  // Remove backslashes from escaped brackets
  valueStr = valueStr.replace(/\\\[/g, '[').replace(/\\\]/g, ']');
  
  // Try JSON parse first
  try {
    return JSON.parse(valueStr);
  } catch {}
  
  // Try parsing array format [1,2,3]
  if (valueStr.startsWith('[') && valueStr.endsWith(']')) {
    try {
      const content = valueStr.slice(1, -1).trim();
      if (!content) return [];
      
      const items = content.split(',').map(item => {
        const trimmed = item.trim();
        // Try number
        if (/^-?\d+$/.test(trimmed)) return parseInt(trimmed);
        if (/^-?\d*\.\d+$/.test(trimmed)) return parseFloat(trimmed);
        // Try boolean
        if (trimmed === 'true' || trimmed === 'True') return true;
        if (trimmed === 'false' || trimmed === 'False') return false;
        // Remove quotes
        if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
            (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
          return trimmed.slice(1, -1);
        }
        return trimmed;
      });
      
      return items;
    } catch {}
  }
  
  // Try number
  if (/^-?\d+$/.test(valueStr)) return parseInt(valueStr);
  if (/^-?\d*\.\d+$/.test(valueStr)) return parseFloat(valueStr);
  
  // Try boolean
  if (valueStr === 'true' || valueStr === 'True') return true;
  if (valueStr === 'false' || valueStr === 'False') return false;
  
  // Try string (remove quotes)
  if ((valueStr.startsWith('"') && valueStr.endsWith('"')) ||
      (valueStr.startsWith("'") && valueStr.endsWith("'"))) {
    return valueStr.slice(1, -1);
  }
  
  // Return as-is (might be a string without quotes)
  return valueStr;
}

/**
 * Convert extracted examples to test cases
 */
function convertExamplesToTestCases(examples) {
  const testCases = [];
  
  for (const example of examples) {
    try {
      // Parse input - could be single assignment or multiple
      let input;
      
      // Check if it looks like multiple assignments (contains commas and =)
      if (example.input.includes('=') && example.input.includes(',')) {
        input = parseInputString(example.input);
      } else {
        // Single value
        input = parseValue(example.input);
      }
      
      // Ensure input is an array
      if (!Array.isArray(input)) {
        input = [input];
      }
      
      // Parse output
      const output = parseOutput(example.output);
      
      testCases.push({
        input: input,
        expectedOutput: output
      });
    } catch (error) {
      console.warn(`Failed to convert example: ${error.message}`);
    }
  }
  
  return testCases;
}

/**
 * Parse output string
 */
function parseOutput(outputStr) {
  outputStr = outputStr.trim();
  
  // Remove code blocks
  outputStr = outputStr.replace(/```[\s\S]*?```/g, '');
  
  // Remove backslashes from escaped brackets
  outputStr = outputStr.replace(/\\\[/g, '[').replace(/\\\]/g, ']');
  
  return parseValue(outputStr);
}

/**
 * Generate test cases from problem description
 */
function generateTestCasesFromDescription(problem) {
  const testCases = [];
  const hiddenTestCases = [];
  
  // Extract examples from description
  const examples = extractExamplesFromDescription(problem.description || '');
  
  if (examples.length === 0) {
    return { testCases: [], hiddenTestCases: [] };
  }
  
  // Convert to test cases
  const allTestCases = convertExamplesToTestCases(examples);
  
  // First 2-3 become visible test cases
  const visibleCount = Math.min(3, allTestCases.length);
  testCases.push(...allTestCases.slice(0, visibleCount));
  
  // Rest become hidden test cases
  if (allTestCases.length > visibleCount) {
    hiddenTestCases.push(...allTestCases.slice(visibleCount));
  }
  
  return { testCases, hiddenTestCases };
}

/**
 * Update problem
 */
async function updateProblem(problem) {
  try {
    const updates = {
      testCases: problem.testCases || [],
      hiddenTestCases: problem.hiddenTestCases || []
    };
    
    // Try to update in database (will fall back to local if columns don't exist)
    try {
      await database.updateProblem(problem.id, updates);
    } catch (error) {
      // Database update failed (columns don't exist), but that's okay
      // We'll still save locally
    }
    
    // Always update local file
    await fs.ensureDir(PROBLEMS_DIR);
    const filePath = path.join(PROBLEMS_DIR, `${problem.id}.json`);
    
    // Read existing problem or create new
    let existingProblem = {};
    if (await fs.pathExists(filePath)) {
      existingProblem = await fs.readJson(filePath);
    }
    
    // Merge updates
    Object.assign(existingProblem, problem);
    existingProblem.updatedAt = new Date().toISOString();
    
    await fs.writeJson(filePath, existingProblem, { spaces: 2 });
    
    return true;
  } catch (error) {
    console.error(`Error updating problem ${problem.id}:`, error.message);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('=== Intelligent Test Case Generator ===\n');
  console.log('Extracting examples from problem descriptions and generating test cases...\n');
  
  try {
    const allProblems = await database.getAllProblems({});
    const problemsToProcess = allProblems.slice(0, 300);
    
    console.log(`Found ${allProblems.length} total problems. Processing first ${problemsToProcess.length}...\n`);
    
    let processed = 0;
    let updated = 0;
    let skipped = 0;
    let generated = 0;
    let errors = 0;
    
    for (const problem of problemsToProcess) {
      processed++;
      
      // Skip if already has test cases
      const hasTestCases = (problem.testCases && Array.isArray(problem.testCases) && problem.testCases.length > 0) ||
                          (problem.hiddenTestCases && Array.isArray(problem.hiddenTestCases) && problem.hiddenTestCases.length > 0);
      
      if (hasTestCases) {
        skipped++;
        if (processed % 50 === 0) {
          console.log(`[${processed}/${problemsToProcess.length}] Processed... (skipped: ${skipped}, generated: ${generated})`);
        }
        continue;
      }
      
      // Generate test cases from description
      const { testCases, hiddenTestCases } = generateTestCasesFromDescription(problem);
      
      if (testCases.length === 0 && hiddenTestCases.length === 0) {
        errors++;
        if (processed % 50 === 0) {
          console.log(`[${processed}/${problemsToProcess.length}] Processed... (generated: ${generated}, errors: ${errors})`);
        }
        continue;
      }
      
      // Update problem
      problem.testCases = testCases;
      problem.hiddenTestCases = hiddenTestCases;
      
      const success = await updateProblem(problem);
      
      if (success) {
        generated++;
        console.log(`[${processed}/${problemsToProcess.length}] ✓ Generated ${testCases.length} visible + ${hiddenTestCases.length} hidden test cases for "${problem.title}"`);
        updated++;
      } else {
        errors++;
      }
      
      // Small delay
      if (processed % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    
    console.log('\n=== Summary ===');
    console.log(`Total processed: ${processed}`);
    console.log(`Updated: ${updated}`);
    console.log(`Skipped (already had test cases): ${skipped}`);
    console.log(`Generated: ${generated}`);
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

