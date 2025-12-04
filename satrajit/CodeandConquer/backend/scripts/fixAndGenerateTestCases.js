/**
 * Fix and Generate Test Cases - Using Intelligent Analysis
 * 
 * This script will:
 * 1. Read problems from database
 * 2. Use intelligent parsing to extract examples from descriptions
 * 3. Generate properly formatted test cases
 * 4. Save to both local files and database
 */

import database from '../src/config/database.js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROBLEMS_DIR = path.join(__dirname, '../../data/problems');

/**
 * Intelligently parse example input from description
 * Example: "n = 4, p = 0, banned = [1,2], k = 4"
 */
function parseExampleInput(inputStr) {
  if (!inputStr) return [];
  
  inputStr = inputStr.trim();
  
  // Handle escaped brackets
  inputStr = inputStr.replace(/\\\[/g, '[').replace(/\\\]/g, ']');
  
  const values = [];
  let current = '';
  let inBrackets = 0;
  let currentKey = '';
  let currentValue = '';
  
  // Split by comma but respect brackets
  const parts = [];
  for (let i = 0; i < inputStr.length; i++) {
    const char = inputStr[i];
    if (char === '[') inBrackets++;
    if (char === ']') inBrackets--;
    
    if (char === ',' && inBrackets === 0) {
      parts.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) parts.push(current.trim());
  
  // Parse each part (variable = value)
  for (const part of parts) {
    const equalIdx = part.indexOf('=');
    if (equalIdx === -1) continue;
    
    const varName = part.substring(0, equalIdx).trim().replace(/[^a-zA-Z0-9_]/g, '');
    let varValue = part.substring(equalIdx + 1).trim();
    
    // Parse the value
    values.push(parseValue(varValue));
  }
  
  return values;
}

/**
 * Parse a value string into JavaScript value
 */
function parseValue(valueStr) {
  valueStr = valueStr.trim();
  
  // Remove escaped brackets
  valueStr = valueStr.replace(/\\\[/g, '[').replace(/\\\]/g, ']');
  
  // Try JSON parse
  try {
    return JSON.parse(valueStr);
  } catch {}
  
  // Try array format
  if (valueStr.startsWith('[') && valueStr.endsWith(']')) {
    const content = valueStr.slice(1, -1).trim();
    if (!content) return [];
    
    try {
      return JSON.parse(valueStr);
    } catch {
      // Manual parsing
      const items = content.split(',').map(item => {
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
      return items;
    }
  }
  
  // Try number
  if (/^-?\d+$/.test(valueStr)) return parseInt(valueStr);
  if (/^-?\d*\.\d+$/.test(valueStr)) return parseFloat(valueStr);
  
  // Try boolean
  if (valueStr === 'true') return true;
  if (valueStr === 'false') return false;
  
  // Try string without quotes
  if (valueStr.match(/^"[^"]*"$/)) {
    return valueStr.slice(1, -1);
  }
  if (valueStr.match(/^'[^']*'$/)) {
    return valueStr.slice(1, -1);
  }
  
  // Return as string if it looks like one
  return valueStr;
}

/**
 * Parse output
 */
function parseExampleOutput(outputStr) {
  if (!outputStr) return null;
  
  outputStr = outputStr.trim();
  outputStr = outputStr.replace(/\\\[/g, '[').replace(/\\\]/g, ']');
  
  return parseValue(outputStr);
}

/**
 * Extract examples from problem description
 */
function extractExamples(description) {
  const examples = [];
  
  if (!description) return examples;
  
  // Find all example blocks
  const exampleRegex = /\*\*Example\s+\d+:\*\*([\s\S]*?)(?=\*\*Example\s+\d+:\*\*|$)/g;
  let match;
  
  while ((match = exampleRegex.exec(description)) !== null) {
    const block = match[1];
    
    // Extract Input
    const inputMatch = block.match(/\*\*Input:\*\*\s*([\s\S]*?)(?:\*\*Output:|\*\*Explanation:|$)/);
    // Extract Output
    const outputMatch = block.match(/\*\*Output:\*\*\s*([\s\S]*?)(?:\*\*Explanation:|\*\*Example|$)/);
    
    if (inputMatch && outputMatch) {
      examples.push({
        input: inputMatch[1].trim(),
        output: outputMatch[1].trim()
      });
    }
  }
  
  // If no examples found, try simpler pattern
  if (examples.length === 0) {
    const simpleInputMatch = description.match(/\*\*Input:\*\*\s*([\s\S]*?)\*\*Output:/);
    const simpleOutputMatch = description.match(/\*\*Output:\*\*\s*([\s\S]*?)(?:\*\*Explanation:|$)/);
    
    if (simpleInputMatch && simpleOutputMatch) {
      examples.push({
        input: simpleInputMatch[1].trim(),
        output: simpleOutputMatch[1].trim()
      });
    }
  }
  
  return examples;
}

/**
 * Generate test cases from problem
 */
function generateTestCases(problem) {
  const testCases = [];
  const hiddenTestCases = [];
  
  // Extract examples from description
  const examples = extractExamples(problem.description || '');
  
  if (examples.length === 0) {
    return { testCases: [], hiddenTestCases: [] };
  }
  
  // Convert each example to a test case
  for (const example of examples) {
    try {
      const input = parseExampleInput(example.input);
      const output = parseExampleOutput(example.output);
      
      if (input.length > 0 && output !== null) {
        testCases.push({
          input: input,
          expectedOutput: output
        });
      }
    } catch (error) {
      console.warn(`Failed to parse example: ${error.message}`);
    }
  }
  
  // First 2-3 become visible, rest become hidden
  const visibleCount = Math.min(3, testCases.length);
  const visible = testCases.slice(0, visibleCount);
  const hidden = testCases.slice(visibleCount);
  
  return {
    testCases: visible,
    hiddenTestCases: hidden
  };
}

/**
 * Update problem
 */
async function updateProblem(problem) {
  try {
    // Update local file first
    await fs.ensureDir(PROBLEMS_DIR);
    const filePath = path.join(PROBLEMS_DIR, `${problem.id}.json`);
    
    let existingProblem = {};
    if (await fs.pathExists(filePath)) {
      existingProblem = await fs.readJson(filePath);
    }
    
    // Merge all problem data
    const fullProblem = {
      ...existingProblem,
      ...problem,
      testCases: problem.testCases || [],
      hiddenTestCases: problem.hiddenTestCases || [],
      updatedAt: new Date().toISOString()
    };
    
    await fs.writeJson(filePath, fullProblem, { spaces: 2 });
    
    // Try to update in database (gracefully handle missing columns)
    try {
      await database.updateProblem(problem.id, {
        testCases: fullProblem.testCases,
        hiddenTestCases: fullProblem.hiddenTestCases
      });
    } catch (error) {
      // Database columns might not exist - that's okay, we saved locally
    }
    
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
  
  try {
    const allProblems = await database.getAllProblems({});
    const problemsToProcess = allProblems.slice(0, 300);
    
    console.log(`Processing ${problemsToProcess.length} problems...\n`);
    
    let processed = 0;
    let updated = 0;
    let skipped = 0;
    let generated = 0;
    let errors = 0;
    
    for (const problem of problemsToProcess) {
      processed++;
      
      // Check if already has test cases
      const hasTestCases = (problem.testCases && Array.isArray(problem.testCases) && problem.testCases.length > 0) ||
                          (problem.hiddenTestCases && Array.isArray(problem.hiddenTestCases) && problem.hiddenTestCases.length > 0);
      
      if (hasTestCases) {
        skipped++;
        if (processed % 50 === 0) {
          console.log(`Progress: ${processed}/${problemsToProcess.length} (skipped: ${skipped}, generated: ${generated})`);
        }
        continue;
      }
      
      // Generate test cases
      const { testCases, hiddenTestCases } = generateTestCases(problem);
      
      if (testCases.length === 0 && hiddenTestCases.length === 0) {
        errors++;
        continue;
      }
      
      // Update problem
      problem.testCases = testCases;
      problem.hiddenTestCases = hiddenTestCases;
      
      const success = await updateProblem(problem);
      
      if (success) {
        generated++;
        console.log(`[${processed}/${problemsToProcess.length}] ✓ "${problem.title}" - ${testCases.length} visible, ${hiddenTestCases.length} hidden`);
        updated++;
      } else {
        errors++;
      }
    }
    
    console.log('\n=== Summary ===');
    console.log(`Processed: ${processed}`);
    console.log(`Updated: ${updated}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Generated: ${generated}`);
    console.log(`Errors: ${errors}`);
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});

