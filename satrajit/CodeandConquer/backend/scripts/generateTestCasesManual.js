/**
 * Manual Test Case Generator - Using LLM Reasoning
 * 
 * This script will intelligently parse examples from problem descriptions
 * and generate properly formatted test cases.
 * 
 * For problems where automated parsing fails, you can manually add test cases
 * using this script's helper functions.
 */

import database from '../src/config/database.js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROBLEMS_DIR = path.join(__dirname, '../../data/problems');

/**
 * Manually generate test cases for a specific problem using LLM reasoning
 * This is where you can add manual test case generation for complex problems
 */
function generateTestCasesManually(problem) {
  const title = problem.title || '';
  const description = problem.description || '';
  
  // Extract examples from description text more carefully
  const examples = [];
  
  // Pattern: **Example N:** ... **Input:** ... **Output:** ...
  const exampleBlocks = [];
  let currentBlock = null;
  
  const lines = description.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Start of example
    if (line.includes('**Example') && line.includes(':**')) {
      if (currentBlock) exampleBlocks.push(currentBlock);
      currentBlock = { input: '', output: '', explanation: '' };
    }
    
    // Input line
    if (line.includes('**Input:**')) {
      const inputMatch = line.match(/\*\*Input:\*\*\s*(.+)/);
      if (inputMatch) {
        if (currentBlock) currentBlock.input = inputMatch[1];
      } else {
        // Input might be on next line
        if (i + 1 < lines.length && currentBlock) {
          currentBlock.input = lines[i + 1].trim();
        }
      }
    }
    
    // Output line
    if (line.includes('**Output:**')) {
      const outputMatch = line.match(/\*\*Output:\*\*\s*(.+)/);
      if (outputMatch) {
        if (currentBlock) currentBlock.output = outputMatch[1];
      } else {
        // Output might be on next line
        if (i + 1 < lines.length && currentBlock) {
          currentBlock.output = lines[i + 1].trim();
        }
      }
    }
  }
  
  if (currentBlock) exampleBlocks.push(currentBlock);
  
  // Parse each example block
  for (const block of exampleBlocks) {
    if (!block.input || !block.output) continue;
    
    // Clean up input/output strings
    let inputStr = block.input.trim();
    let outputStr = block.output.trim();
    
    // Remove escaped brackets
    inputStr = inputStr.replace(/\\\[/g, '[').replace(/\\\]/g, ']');
    outputStr = outputStr.replace(/\\\[/g, '[').replace(/\\\]/g, ']');
    
    // Parse input (could be multiple assignments like "n = 4, p = 0, banned = [1,2], k = 4")
    const inputValues = parseMultipleAssignments(inputStr);
    
    // Parse output
    const outputValue = parseValue(outputStr);
    
    if (inputValues.length > 0 && outputValue !== null) {
      examples.push({
        input: inputValues,
        expectedOutput: outputValue
      });
    }
  }
  
  return examples;
}

/**
 * Parse multiple variable assignments from a string
 * Example: "n = 4, p = 0, banned = [1,2], k = 4" -> [4, 0, [1,2], 4]
 */
function parseMultipleAssignments(str) {
  const values = [];
  let currentVar = '';
  let currentValue = '';
  let inAssignment = false;
  let bracketDepth = 0;
  
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    
    if (char === '=' && bracketDepth === 0) {
      inAssignment = true;
      continue;
    }
    
    if (char === '[') bracketDepth++;
    if (char === ']') bracketDepth--;
    
    if (char === ',' && bracketDepth === 0 && inAssignment) {
      // End of current assignment
      const parsed = parseValue(currentValue.trim());
      if (parsed !== null) values.push(parsed);
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
    if (parsed !== null) values.push(parsed);
  }
  
  return values;
}

/**
 * Parse a single value string into JavaScript value
 */
function parseValue(valueStr) {
  if (!valueStr) return null;
  
  valueStr = valueStr.trim();
  
  // Try JSON parse first
  try {
    return JSON.parse(valueStr);
  } catch {}
  
  // Try array format [1,2,3]
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
  
  // Return as string
  return valueStr;
}

/**
 * Generate test cases for a problem
 */
function generateTestCases(problem) {
  const examples = generateTestCasesManually(problem);
  
  if (examples.length === 0) {
    return { testCases: [], hiddenTestCases: [] };
  }
  
  // First 2-3 become visible, rest become hidden
  const visibleCount = Math.min(3, examples.length);
  
  return {
    testCases: examples.slice(0, visibleCount),
    hiddenTestCases: examples.slice(visibleCount)
  };
}

/**
 * Update problem with test cases
 */
async function updateProblem(problem) {
  try {
    await fs.ensureDir(PROBLEMS_DIR);
    const filePath = path.join(PROBLEMS_DIR, `${problem.id}.json`);
    
    // Get full problem data
    let fullProblem = await database.getProblemById(problem.id);
    if (!fullProblem) {
      fullProblem = { ...problem };
    }
    
    // Update test cases
    fullProblem.testCases = problem.testCases || [];
    fullProblem.hiddenTestCases = problem.hiddenTestCases || [];
    fullProblem.updatedAt = new Date().toISOString();
    
    // Save locally
    await fs.writeJson(filePath, fullProblem, { spaces: 2 });
    
    // Try to update in database
    try {
      await database.updateProblem(problem.id, {
        testCases: fullProblem.testCases,
        hiddenTestCases: fullProblem.hiddenTestCases
      });
    } catch (error) {
      // Database columns might not exist - that's okay
    }
    
    return true;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('=== Manual Test Case Generator ===\n');
  
  try {
    const allProblems = await database.getAllProblems({});
    const problemsToProcess = allProblems.slice(0, 300);
    
    console.log(`Processing ${problemsToProcess.length} problems...\n`);
    
    let processed = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const problem of problemsToProcess) {
      processed++;
      
      // Skip if already has test cases
      const hasTestCases = (problem.testCases && Array.isArray(problem.testCases) && problem.testCases.length > 0) ||
                          (problem.hiddenTestCases && Array.isArray(problem.hiddenTestCases) && problem.hiddenTestCases.length > 0);
      
      if (hasTestCases) {
        skipped++;
        continue;
      }
      
      // Generate test cases
      const { testCases, hiddenTestCases } = generateTestCases(problem);
      
      if (testCases.length === 0 && hiddenTestCases.length === 0) {
        errors++;
        continue;
      }
      
      // Update
      problem.testCases = testCases;
      problem.hiddenTestCases = hiddenTestCases;
      
      const success = await updateProblem(problem);
      
      if (success) {
        updated++;
        console.log(`[${processed}/${problemsToProcess.length}] ✓ "${problem.title}" - ${testCases.length} visible, ${hiddenTestCases.length} hidden`);
      } else {
        errors++;
      }
    }
    
    console.log(`\n=== Summary ===`);
    console.log(`Processed: ${processed}`);
    console.log(`Updated: ${updated}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Errors: ${errors}`);
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Failed:', error);
  process.exit(1);
});

