/**
 * Fix Design Problem Test Cases
 * 
 * Design problems use constructor/method call format
 * This script generates appropriate test cases for them
 */

import database from '../src/config/database.js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROBLEMS_DIR = path.join(__dirname, '../../data/problems');

/**
 * Parse design problem example from description
 */
function parseDesignExample(description) {
  if (!description) return null;
  
  // Look for Input/Output arrays pattern
  // Input: ["Constructor", "method1", "method2", ...]
  // [[args], [args], [args], ...]
  // Output: [null, result1, result2, ...]
  
  const inputMatch = description.match(/\*\*Input\*\*\s*([\s\S]*?)\*\*Output\*\*/i);
  const outputMatch = description.match(/\*\*Output\*\*\s*([\s\S]*?)(?:\*\*Explanation|$)/i);
  
  if (!inputMatch || !outputMatch) return null;
  
  const inputText = inputMatch[1].trim().replace(/\\\[/g, '[').replace(/\\\]/g, ']');
  const outputText = outputMatch[1].trim().replace(/\\\[/g, '[').replace(/\\\]/g, ']');
  
  // Try to parse as JSON arrays
  try {
    // Extract the two arrays from input (method names and args)
    const methodsMatch = inputText.match(/\[(.*?)\]/s);
    const argsMatch = inputText.match(/\[\[.*?\]\]/gs);
    
    if (methodsMatch) {
      const methodsStr = methodsMatch[0];
      const methods = JSON.parse(methodsStr.replace(/"/g, '"').replace(/"/g, '"').replace(/\s+/g, '').replace(/","/g, '", "'));
      
      let args = [];
      if (argsMatch && argsMatch.length > 0) {
        try {
          // Find the args array (second array in input)
          const argsArrayMatch = inputText.match(/\]\s*\n?\s*(\[[\s\S]*\])\s*$/);
          if (argsArrayMatch) {
            args = JSON.parse(argsArrayMatch[1]);
          }
        } catch {}
      }
      
      const output = JSON.parse(outputText);
      
      return {
        input: { methods, args },
        expectedOutput: output
      };
    }
  } catch (e) {
    // Failed to parse
  }
  
  return null;
}

/**
 * Generate fallback test case for design problems
 */
function generateDesignTestCase(problem) {
  const description = problem.description || '';
  
  // Try to parse from description
  const parsed = parseDesignExample(description);
  if (parsed) {
    return {
      testCases: [parsed],
      hiddenTestCases: [parsed]
    };
  }
  
  // Create a placeholder test case that indicates this is a design problem
  return {
    testCases: [{
      input: { note: "Design problem - manual testing required" },
      expectedOutput: null,
      isDesign: true
    }],
    hiddenTestCases: []
  };
}

/**
 * Check if problem is a design problem
 */
function isDesignProblem(problem) {
  const title = (problem.title || '').toLowerCase();
  const description = (problem.description || '').toLowerCase();
  
  return title.includes('design') || 
         description.includes('implement the') ||
         description.includes('implement a') ||
         description.includes('class:') ||
         description.includes('class `') ||
         description.includes('design a');
}

/**
 * Update problem with test cases
 */
async function updateProblem(problem) {
  const filePath = path.join(PROBLEMS_DIR, `${problem.id}.json`);
  await fs.writeJson(filePath, problem, { spaces: 2 });
}

/**
 * Main
 */
async function main() {
  console.log('=== Fixing Design Problem Test Cases ===\n');
  
  const allProblems = await database.getAllProblems({});
  
  let fixed = 0;
  let skipped = 0;
  
  for (const problem of allProblems) {
    const hasTestCases = problem.testCases && 
                        Array.isArray(problem.testCases) && 
                        problem.testCases.length > 0;
    
    if (hasTestCases) {
      skipped++;
      continue;
    }
    
    // Check if it's a design problem or has no test cases
    if (isDesignProblem(problem) || !hasTestCases) {
      const generated = generateDesignTestCase(problem);
      
      problem.testCases = generated.testCases;
      problem.hiddenTestCases = generated.hiddenTestCases;
      problem.updatedAt = new Date().toISOString();
      
      await updateProblem(problem);
      fixed++;
      console.log(`✓ Fixed: "${problem.title}"`);
    }
  }
  
  console.log(`\n=== Summary ===`);
  console.log(`Fixed: ${fixed}`);
  console.log(`Skipped: ${skipped}`);
}

main().then(() => {
  console.log('\n🎉 Done!');
  process.exit(0);
}).catch(error => {
  console.error('Error:', error);
  process.exit(1);
});

