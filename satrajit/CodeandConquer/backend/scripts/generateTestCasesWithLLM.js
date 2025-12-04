/**
 * Script to generate test cases using LLM API or manual analysis
 * This script can use OpenAI API or other LLM services to generate test cases
 */

import database from '../src/config/database.js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROBLEMS_DIR = path.join(__dirname, '../../data/problems');

/**
 * Call LLM API to generate test cases
 * This is a template - you need to configure with your LLM API
 */
async function generateTestCasesWithLLM(problem) {
  // Option 1: Use OpenAI API (requires OPENAI_API_KEY)
  if (process.env.OPENAI_API_KEY) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are a coding problem expert. Generate test cases in JSON format with "testCases" and "hiddenTestCases" arrays. Each test case should have "input" (array) and "expectedOutput" fields.'
            },
            {
              role: 'user',
              content: `Generate test cases for this problem:\n\nTitle: ${problem.title}\nDescription: ${problem.description}\nConstraints: ${JSON.stringify(problem.constraints || [])}\nStarter Code: ${JSON.stringify(problem.starterCode?.javascript || '')}\n\nReturn only valid JSON with testCases and hiddenTestCases arrays.`
            }
          ],
          temperature: 0.7
        })
      });
      
      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      // Parse JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.warn(`LLM API error: ${error.message}`);
    }
  }
  
  // Option 2: Manual generation based on problem analysis
  return generateTestCasesManually(problem);
}

/**
 * Generate test cases manually using intelligent analysis
 * This function uses pattern matching and problem understanding
 */
function generateTestCasesManually(problem) {
  const title = (problem.title || '').toLowerCase();
  const description = (problem.description || '').toLowerCase();
  const testCases = [];
  const hiddenTestCases = [];
  
  // Analyze problem type from title and description
  // This is a simplified pattern matcher - you can expand this
  
  // Two Sum pattern
  if (title.includes('two sum')) {
    testCases.push(
      { input: [[2, 7, 11, 15], 9], expectedOutput: [0, 1] },
      { input: [[3, 2, 4], 6], expectedOutput: [1, 2] }
    );
    hiddenTestCases.push(
      { input: [[3, 3], 6], expectedOutput: [0, 1] },
      { input: [[-1, -2, -3, -4, -5], -8], expectedOutput: [2, 4] }
    );
    return { testCases, hiddenTestCases };
  }
  
  // Valid Parentheses pattern
  if (title.includes('parentheses') || title.includes('valid')) {
    testCases.push(
      { input: ["()"], expectedOutput: true },
      { input: ["()[]{}"], expectedOutput: true },
      { input: ["(]"], expectedOutput: false }
    );
    hiddenTestCases.push(
      { input: ["([)]"], expectedOutput: false },
      { input: ["{[]}"], expectedOutput: true }
    );
    return { testCases, hiddenTestCases };
  }
  
  // Array/List problems
  if (title.includes('array') || title.includes('list')) {
    // Try to extract from constraints what the array contains
    const constraints = problem.constraints || [];
    const isNumberArray = constraints.some(c => c.includes('integer') || c.includes('number'));
    
    if (isNumberArray) {
      testCases.push(
        { input: [[1, 2, 3]], expectedOutput: 6 },
        { input: [[-1, 0, 1]], expectedOutput: 0 }
      );
    }
  }
  
  // If we can't determine, return empty
  return { testCases: [], hiddenTestCases: [] };
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
    
    const updated = await database.updateProblem(problem.id, updates);
    
    // Also update local file
    await fs.ensureDir(PROBLEMS_DIR);
    const filePath = path.join(PROBLEMS_DIR, `${problem.id}.json`);
    await fs.writeJson(filePath, problem, { spaces: 2 });
    
    return updated !== null;
  } catch (error) {
    console.error(`Error updating problem ${problem.id}:`, error.message);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('=== Test Case Generation Script ===\n');
  console.log('This script can:');
  console.log('1. Use OpenAI API (if OPENAI_API_KEY is set)');
  console.log('2. Use manual pattern matching for common problems');
  console.log('3. Export problems for manual review\n');
  
  try {
    const allProblems = await database.getAllProblems({});
    const problemsToProcess = allProblems.slice(0, 300);
    
    console.log(`Found ${allProblems.length} total problems. Processing first ${problemsToProcess.length}...\n`);
    
    let processed = 0;
    let updated = 0;
    let skipped = 0;
    let generated = 0;
    let failed = 0;
    
    // Process problems
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
      const { testCases, hiddenTestCases } = await generateTestCasesWithLLM(problem);
      
      if (testCases.length === 0 && hiddenTestCases.length === 0) {
        failed++;
        if (processed % 50 === 0) {
          console.log(`[${processed}/${problemsToProcess.length}] Processed... (generated: ${generated}, failed: ${failed})`);
        }
        continue;
      }
      
      // Update problem
      problem.testCases = testCases;
      problem.hiddenTestCases = hiddenTestCases;
      
      const success = await updateProblem(problem);
      
      if (success) {
        generated++;
        if (generated % 10 === 0) {
          console.log(`[${processed}/${problemsToProcess.length}] Generated test cases for "${problem.title}"`);
        }
        updated++;
      } else {
        failed++;
      }
    }
    
    console.log('\n=== Summary ===');
    console.log(`Total processed: ${processed}`);
    console.log(`Updated: ${updated}`);
    console.log(`Skipped (already had test cases): ${skipped}`);
    console.log(`Generated: ${generated}`);
    console.log(`Failed: ${failed}`);
    
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

