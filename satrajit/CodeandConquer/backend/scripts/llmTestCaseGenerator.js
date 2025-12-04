/**
 * LLM-Powered Test Case Generator
 * 
 * This script is designed to work with an LLM (like me) to generate test cases.
 * It can:
 * 1. Export problems that need test cases to a JSON file
 * 2. Process a JSON file with LLM-generated test cases
 * 3. Work interactively with an LLM to generate test cases
 */

import database from '../src/config/database.js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROBLEMS_DIR = path.join(__dirname, '../../data/problems');
const EXPORT_DIR = path.join(__dirname, '../../data/exports');

await fs.ensureDir(EXPORT_DIR);

/**
 * Export problems that need test cases
 */
async function exportProblemsForLLM(maxProblems = 300) {
  console.log('Exporting problems that need test cases...\n');
  
  const allProblems = await database.getAllProblems({});
  const problemsNeedingTestCases = [];
  
  for (const problem of allProblems.slice(0, maxProblems)) {
    const hasTestCases = (problem.testCases && Array.isArray(problem.testCases) && problem.testCases.length > 0) ||
                        (problem.hiddenTestCases && Array.isArray(problem.hiddenTestCases) && problem.hiddenTestCases.length > 0);
    
    if (!hasTestCases) {
      problemsNeedingTestCases.push({
        id: problem.id,
        title: problem.title,
        difficulty: problem.difficulty,
        description: problem.description,
        examples: problem.examples || [],
        constraints: problem.constraints || [],
        starterCode: problem.starterCode || {},
        tags: problem.tags || []
      });
    }
  }
  
  const exportFile = path.join(EXPORT_DIR, `problems_needing_testcases_${Date.now()}.json`);
  await fs.writeJson(exportFile, {
    exportedAt: new Date().toISOString(),
    totalProblems: problemsNeedingTestCases.length,
    problems: problemsNeedingTestCases
  }, { spaces: 2 });
  
  console.log(`✓ Exported ${problemsNeedingTestCases.length} problems to: ${exportFile}`);
  console.log(`\nYou can now:\n`);
  console.log(`1. Share this file with an LLM to generate test cases`);
  console.log(`2. Or process it with: node scripts/llmTestCaseGenerator.js process <export-file>`);
  
  return exportFile;
}

/**
 * Process LLM-generated test cases from a file
 */
async function processLLMGeneratedTestCases(inputFile) {
  console.log(`Processing test cases from: ${inputFile}\n`);
  
  const data = await fs.readJson(inputFile);
  const { problems } = data;
  
  let processed = 0;
  let updated = 0;
  let errors = 0;
  
  for (const problemData of problems) {
    processed++;
    
    if (!problemData.testCases && !problemData.hiddenTestCases) {
      console.log(`[${processed}/${problems.length}] Skipping "${problemData.title}" - no test cases provided`);
      continue;
    }
    
    try {
      // Get full problem from database
      const fullProblem = await database.getProblemById(problemData.id);
      if (!fullProblem) {
        console.log(`[${processed}/${problems.length}] Problem ${problemData.id} not found in database`);
        errors++;
        continue;
      }
      
      // Update with test cases
      fullProblem.testCases = problemData.testCases || [];
      fullProblem.hiddenTestCases = problemData.hiddenTestCases || [];
      
      // Update in database
      await database.updateProblem(problemData.id, {
        testCases: fullProblem.testCases,
        hiddenTestCases: fullProblem.hiddenTestCases
      });
      
      // Update local file
      const filePath = path.join(PROBLEMS_DIR, `${problemData.id}.json`);
      await fs.writeJson(filePath, fullProblem, { spaces: 2 });
      
      updated++;
      console.log(`[${processed}/${problems.length}] ✓ Updated "${problemData.title}"`);
      
    } catch (error) {
      console.error(`[${processed}/${problems.length}] ✗ Error updating "${problemData.title}":`, error.message);
      errors++;
    }
  }
  
  console.log(`\n=== Summary ===`);
  console.log(`Processed: ${processed}`);
  console.log(`Updated: ${updated}`);
  console.log(`Errors: ${errors}`);
}

/**
 * Generate test cases for a single problem (for LLM to use)
 */
async function generateTestCasesForProblem(problemId) {
  const problem = await database.getProblemById(problemId);
  
  if (!problem) {
    console.error(`Problem ${problemId} not found`);
    return null;
  }
  
  // Return problem data for LLM analysis
  return {
    id: problem.id,
    title: problem.title,
    difficulty: problem.difficulty,
    description: problem.description,
    examples: problem.examples || [],
    constraints: problem.constraints || [],
    starterCode: problem.starterCode || {},
    tags: problem.tags || [],
    hints: problem.hints || [],
    currentTestCases: problem.testCases || [],
    currentHiddenTestCases: problem.hiddenTestCases || []
  };
}

/**
 * Save test cases for a problem
 */
async function saveTestCasesForProblem(problemId, testCases, hiddenTestCases) {
  const problem = await database.getProblemById(problemId);
  
  if (!problem) {
    throw new Error(`Problem ${problemId} not found`);
  }
  
  problem.testCases = testCases || [];
  problem.hiddenTestCases = hiddenTestCases || [];
  
  // Update in database
  await database.updateProblem(problemId, {
    testCases: problem.testCases,
    hiddenTestCases: problem.hiddenTestCases
  });
  
  // Update local file
  const filePath = path.join(PROBLEMS_DIR, `${problemId}.json`);
  await fs.writeJson(filePath, problem, { spaces: 2 });
  
  return true;
}

// CLI interface
const command = process.argv[2];
const arg = process.argv[3];

async function main() {
  if (command === 'export') {
    const max = parseInt(arg) || 300;
    await exportProblemsForLLM(max);
  } else if (command === 'process') {
    if (!arg) {
      console.error('Please provide export file path');
      process.exit(1);
    }
    await processLLMGeneratedTestCases(arg);
  } else if (command === 'get') {
    if (!arg) {
      console.error('Please provide problem ID');
      process.exit(1);
    }
    const problemData = await generateTestCasesForProblem(arg);
    console.log(JSON.stringify(problemData, null, 2));
  } else if (command === 'save') {
    // Format: node script.js save <problemId> <testCasesJson>
    const problemId = arg;
    const testCasesJson = process.argv[4];
    
    if (!problemId || !testCasesJson) {
      console.error('Usage: node script.js save <problemId> <testCasesJson>');
      process.exit(1);
    }
    
    try {
      const testCasesData = JSON.parse(testCasesJson);
      await saveTestCasesForProblem(
        problemId,
        testCasesData.testCases,
        testCasesData.hiddenTestCases
      );
      console.log(`✓ Saved test cases for problem ${problemId}`);
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  } else {
    console.log('Usage:');
    console.log('  Export problems:     node scripts/llmTestCaseGenerator.js export [max]');
    console.log('  Process test cases:  node scripts/llmTestCaseGenerator.js process <export-file>');
    console.log('  Get problem:         node scripts/llmTestCaseGenerator.js get <problemId>');
    console.log('  Save test cases:     node scripts/llmTestCaseGenerator.js save <problemId> <json>');
  }
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});

