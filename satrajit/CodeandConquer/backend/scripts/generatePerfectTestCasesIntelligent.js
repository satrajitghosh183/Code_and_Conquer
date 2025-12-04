/**
 * Perfect Test Case Generator - Intelligent Parsing
 * 
 * This script intelligently extracts examples from problem descriptions
 * and converts them to perfect test cases that work for all languages.
 */

import database from '../src/config/database.js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROBLEMS_DIR = path.join(__dirname, '../../data/problems');

/**
 * Intelligently parse input from example string
 * Handles: "n = 4, p = 0, banned = [1,2], k = 4"
 */
function parseInputIntelligently(inputStr) {
  if (!inputStr || typeof inputStr !== 'string') {
    return [];
  }
  
  inputStr = inputStr.trim();
  
  // Remove escaped brackets
  inputStr = inputStr.replace(/\\\[/g, '[').replace(/\\\]/g, ']');
  
  const values = [];
  let currentVar = '';
  let currentValue = '';
  let inAssignment = false;
  let bracketDepth = 0;
  let stringDepth = 0;
  let inString = false;
  let stringChar = '';
  
  for (let i = 0; i < inputStr.length; i++) {
    const char = inputStr[i];
    const prevChar = i > 0 ? inputStr[i - 1] : '';
    const nextChar = i < inputStr.length - 1 ? inputStr[i + 1] : '';
    
    // Handle strings
    if ((char === '"' || char === "'") && prevChar !== '\\') {
      if (!inString) {
        inString = true;
        stringChar = char;
        stringDepth++;
      } else if (char === stringChar) {
        inString = false;
        stringDepth--;
        stringChar = '';
      }
    }
    
    // Track brackets (but not inside strings)
    if (!inString) {
      if (char === '[') bracketDepth++;
      if (char === ']') bracketDepth--;
    }
    
    // Start of assignment
    if (char === '=' && bracketDepth === 0 && !inString) {
      inAssignment = true;
      continue;
    }
    
    // End of assignment (comma at bracket depth 0)
    if (char === ',' && bracketDepth === 0 && !inString && inAssignment) {
      const parsed = parseValueIntelligently(currentValue.trim());
      if (parsed !== null) {
        values.push(parsed);
      }
      currentVar = '';
      currentValue = '';
      inAssignment = false;
      continue;
    }
    
    // Collect assignment value
    if (inAssignment) {
      currentValue += char;
    } else if (!char.match(/\s/) && !inAssignment) {
      currentVar += char;
    }
  }
  
  // Handle last assignment
  if (inAssignment && currentValue.trim()) {
    const parsed = parseValueIntelligently(currentValue.trim());
    if (parsed !== null) {
      values.push(parsed);
    }
  }
  
  return values.length > 0 ? values : [];
}

/**
 * Intelligently parse a value
 */
function parseValueIntelligently(valueStr) {
  if (!valueStr || typeof valueStr !== 'string') {
    return valueStr;
  }
  
  valueStr = valueStr.trim();
  
  // Remove escaped brackets
  valueStr = valueStr.replace(/\\\[/g, '[').replace(/\\\]/g, ']');
  
  // Try JSON parse first
  try {
    const parsed = JSON.parse(valueStr);
    return parsed;
  } catch {}
  
  // Try array format [1,2,3]
  if (valueStr.startsWith('[') && valueStr.endsWith(']')) {
    try {
      return JSON.parse(valueStr);
    } catch {
      // Manual array parsing
      const content = valueStr.slice(1, -1).trim();
      if (!content) return [];
      
      const items = [];
      let currentItem = '';
      let depth = 0;
      let inString = false;
      let stringChar = '';
      
      for (let i = 0; i < content.length; i++) {
        const char = content[i];
        const prevChar = i > 0 ? content[i - 1] : '';
        
        if ((char === '"' || char === "'") && prevChar !== '\\') {
          if (!inString) {
            inString = true;
            stringChar = char;
          } else if (char === stringChar) {
            inString = false;
            stringChar = '';
          }
        }
        
        if (!inString) {
          if (char === '[') depth++;
          if (char === ']') depth--;
        }
        
        if (char === ',' && depth === 0 && !inString) {
          const item = currentItem.trim();
          if (item) {
            items.push(parseValueIntelligently(item));
          }
          currentItem = '';
        } else {
          currentItem += char;
        }
      }
      
      const item = currentItem.trim();
      if (item) {
        items.push(parseValueIntelligently(item));
      }
      
      return items;
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
  
  // Return as string if it looks like text
  return valueStr;
}

/**
 * Extract examples from problem description
 */
function extractExamplesFromDescription(description) {
  const examples = [];
  
  if (!description) return examples;
  
  // Pattern: **Example N:** ... **Input:** ... **Output:** ...
  const exampleRegex = /\*\*Example\s+(\d+):\*\*([\s\S]*?)(?=\*\*Example\s+\d+:\*\*|$)/g;
  let match;
  
  while ((match = exampleRegex.exec(description)) !== null) {
    const block = match[2];
    
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
 * Generate perfect test cases from problem
 */
function generatePerfectTestCases(problem) {
  const testCases = [];
  const hiddenTestCases = [];
  
  // Extract examples from description
  const examples = extractExamplesFromDescription(problem.description || '');
  
  if (examples.length === 0) {
    return { testCases: [], hiddenTestCases: [] };
  }
  
  // Convert each example to a test case
  for (const example of examples) {
    try {
      // Parse input intelligently
      let input = parseInputIntelligently(example.input);
      
      // If parsing failed, try simpler approach
      if (!input || input.length === 0) {
        // Try to parse as single value
        input = [parseValueIntelligently(example.input)];
      }
      
      // Ensure input is an array
      if (!Array.isArray(input)) {
        input = [input];
      }
      
      // Parse output
      const output = parseValueIntelligently(example.output);
      
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
  
  return {
    testCases: testCases.slice(0, visibleCount),
    hiddenTestCases: testCases.slice(visibleCount)
  };
}

/**
 * Update problem
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
  console.log('=== Perfect Test Case Generator ===\n');
  console.log('Intelligently extracting examples and generating perfect test cases...\n');
  
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
      
      // Generate test cases
      const { testCases, hiddenTestCases } = generatePerfectTestCases(problem);
      
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
  console.log('\n✅ Perfect test case generation completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Failed:', error);
  process.exit(1);
});

