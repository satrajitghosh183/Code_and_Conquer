/**
 * LLM-Style Test Case Generator
 * 
 * This script uses intelligent reasoning to:
 * 1. Extract examples from problem descriptions (they're embedded in markdown)
 * 2. Parse examples into proper test case format
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
 * Extract examples from description text
 * Examples are often embedded in markdown format
 */
function extractExamplesFromDescription(description) {
  const examples = [];
  
  // Pattern: **Example 1:** ... **Input:** ... **Output:** ...
  const exampleRegex = /\*\*Example\s+(\d+):\*\*[\s\S]*?\*\*Input:\*\*\s*([\s\S]*?)(?:\*\*Output:\*\*|\*\*Explanation:)/g;
  
  let match;
  while ((match = exampleRegex.exec(description)) !== null) {
    const exampleNum = match[1];
    const inputStr = match[2].trim();
    
    // Try to find output in the next part
    const afterInput = description.substring(match.index + match[0].length);
    const outputMatch = afterInput.match(/\*\*Output:\*\*\s*([\s\S]*?)(?:\*\*Explanation:|\*\*Example|$)/);
    
    if (outputMatch) {
      const outputStr = outputMatch[1].trim();
      examples.push({
        input: inputStr,
        output: outputStr,
        explanation: null
      });
    }
  }
  
  // Also try simpler pattern: Input: ... Output: ...
  if (examples.length === 0) {
    const simpleRegex = /\*\*Input:\*\*\s*([\s\S]*?)(?:\*\*Output:\*\*)/g;
    let simpleMatch;
    while ((simpleMatch = simpleRegex.exec(description)) !== null) {
      const inputStr = simpleMatch[1].trim();
      const afterInput = description.substring(simpleMatch.index + simpleMatch[0].length);
      const outputMatch = afterInput.match(/\*\*Output:\*\*\s*([\s\S]*?)(?:\*\*Explanation:|\*\*Example|$)/);
      
      if (outputMatch) {
        const outputStr = outputMatch[1].trim();
        examples.push({
          input: inputStr,
          output: outputStr
        });
      }
    }
  }
  
  return examples;
}

/**
 * Parse input string from example into structured format
 */
function parseInput(inputStr) {
  // Remove markdown code blocks if present
  inputStr = inputStr.replace(/```[\s\S]*?```/g, '').trim();
  
  // Extract variable assignments
  const assignments = {};
  const lines = inputStr.split('\n').map(l => l.trim()).filter(l => l);
  
  for (const line of lines) {
    // Pattern: variable = value
    const assignMatch = line.match(/(\w+)\s*=\s*(.+)/);
    if (assignMatch) {
      const varName = assignMatch[1].trim();
      let varValue = assignMatch[2].trim();
      
      // Remove trailing commas and semicolons
      varValue = varValue.replace(/[,;]$/, '');
      
      // Try to parse as JSON
      try {
        assignments[varName] = JSON.parse(varValue);
      } catch {
        // Try manual parsing
        assignments[varName] = parseValue(varValue);
      }
    }
  }
  
  // Return as array of values in order, or single value
  const values = Object.values(assignments);
  return values.length > 1 ? values : values[0];
}

/**
 * Parse a single value
 */
function parseValue(valueStr) {
  valueStr = valueStr.trim();
  
  // Try JSON parse
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
      
      return content.split(',').map(v => {
        const trimmed = v.trim();
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
    }
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
  
  return valueStr;
}

/**
 * Parse output string
 */
function parseOutput(outputStr) {
  outputStr = outputStr.trim();
  
  // Remove markdown code blocks
  outputStr = outputStr.replace(/```[\s\S]*?```/g, '').trim();
  
  return parseValue(outputStr);
}

/**
 * Convert extracted examples to test cases
 */
function convertExamplesToTestCases(examples) {
  const testCases = [];
  
  for (const example of examples) {
    try {
      const input = parseInput(example.input);
      const output = parseOutput(example.output);
      
      // Ensure input is an array
      const inputArray = Array.isArray(input) ? input : [input];
      
      testCases.push({
        input: inputArray,
        expectedOutput: output
      });
    } catch (error) {
      console.warn(`Failed to convert example: ${error.message}`);
    }
  }
  
  return testCases;
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
    
    await database.updateProblem(problem.id, updates);
    
    // Update local file
    await fs.ensureDir(PROBLEMS_DIR);
    const filePath = path.join(PROBLEMS_DIR, `${problem.id}.json`);
    await fs.writeJson(filePath, problem, { spaces: 2 });
    
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
  console.log('=== LLM-Style Test Case Generator ===\n');
  console.log('This script extracts examples from problem descriptions and converts them to test cases.\n');
  
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

