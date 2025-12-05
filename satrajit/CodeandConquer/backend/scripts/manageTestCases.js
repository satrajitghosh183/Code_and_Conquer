/**
 * Manage Test Cases Script
 * 
 * Consolidated script for managing test cases:
 * - Upload test cases to Supabase
 * - Fix test case formats
 * - Fix design problem test cases
 * 
 * Usage:
 *   node scripts/manageTestCases.js upload
 *   node scripts/manageTestCases.js fix-format
 *   node scripts/manageTestCases.js fix-design
 */

import { createClient } from '@supabase/supabase-js';
import database from '../src/config/database.js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROBLEMS_DIR = path.join(__dirname, '../../data/problems');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ============================================================================
// UPLOAD TEST CASES
// ============================================================================

async function uploadTestCases() {
  console.log('=== Uploading Test Cases to Supabase ===\n');
  
  const files = await fs.readdir(PROBLEMS_DIR);
  const jsonFiles = files.filter(f => f.endsWith('.json'));
  
  console.log(`Found ${jsonFiles.length} problem files.\n`);
  
  console.log('Fetching existing problems from Supabase...');
  let existingProblemIds = new Set();
  let page = 0;
  const pageSize = 1000;
  
  while (true) {
    const { data: supabaseProblems, error: fetchError } = await supabase
      .from('problems')
      .select('id')
      .range(page * pageSize, (page + 1) * pageSize - 1);
    
    if (fetchError) {
      console.error('Error fetching problems:', fetchError);
      return;
    }
    
    if (!supabaseProblems || supabaseProblems.length === 0) break;
    
    supabaseProblems.forEach(p => existingProblemIds.add(p.id));
    page++;
    
    if (supabaseProblems.length < pageSize) break;
  }
  
  console.log(`Found ${existingProblemIds.size} problems in Supabase.\n`);
  
  console.log('Clearing existing test cases...');
  const { error: deleteError } = await supabase
    .from('test_cases')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  
  if (!deleteError) {
    console.log('Existing test cases cleared.\n');
  }
  
  let totalUploaded = 0;
  let totalProblems = 0;
  let skipped = 0;
  let errors = 0;
  
  for (let i = 0; i < jsonFiles.length; i++) {
    const file = jsonFiles[i];
    const problemId = file.replace('.json', '');
    
    if (!existingProblemIds.has(problemId)) {
      skipped++;
      continue;
    }
    
    try {
      const filePath = path.join(PROBLEMS_DIR, file);
      const problem = await fs.readJson(filePath);
      
      const testCasesToUpload = [];
      const seenInputs = new Set();
      
      const processTestCase = (tc, isHidden) => {
        const input = tc.input || tc;
        const expectedOutput = tc.expectedOutput ?? tc.expected_output ?? tc.output;
        
        if (expectedOutput === null || expectedOutput === undefined) {
          return null;
        }
        
        const inputKey = JSON.stringify(input);
        if (seenInputs.has(inputKey)) {
          return null;
        }
        seenInputs.add(inputKey);
        
        return {
          id: uuidv4(),
          problem_id: problemId,
          input: input,
          expected_output: expectedOutput,
          is_hidden: isHidden,
          explanation: tc.explanation || null,
          weight: 1,
          created_at: new Date().toISOString()
        };
      };
      
      if (problem.testCases && Array.isArray(problem.testCases)) {
        for (const tc of problem.testCases) {
          const processed = processTestCase(tc, false);
          if (processed) testCasesToUpload.push(processed);
        }
      }
      
      if (problem.hiddenTestCases && Array.isArray(problem.hiddenTestCases)) {
        for (const tc of problem.hiddenTestCases) {
          const processed = processTestCase(tc, true);
          if (processed) testCasesToUpload.push(processed);
        }
      }
      
      if (testCasesToUpload.length > 0) {
        const batchSize = 100;
        for (let j = 0; j < testCasesToUpload.length; j += batchSize) {
          const batch = testCasesToUpload.slice(j, j + batchSize);
          const { error } = await supabase
            .from('test_cases')
            .insert(batch);
          
          if (error) {
            console.error(`Error uploading test cases for ${problem.title}:`, error.message);
            errors++;
          } else {
            totalUploaded += batch.length;
          }
        }
        
        totalProblems++;
        
        if (totalProblems <= 20 || totalProblems % 100 === 0) {
          console.log(`[${i + 1}/${jsonFiles.length}] Uploaded ${testCasesToUpload.length} test cases for "${problem.title}"`);
        }
      } else {
        skipped++;
      }
    } catch (error) {
      console.error(`Error processing ${file}:`, error.message);
      errors++;
    }
  }
  
  console.log('\n=== Summary ===');
  console.log(`✅ Problems processed: ${totalProblems}`);
  console.log(`✅ Test cases uploaded: ${totalUploaded}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log(`❌ Errors: ${errors}`);
  
  const { count } = await supabase
    .from('test_cases')
    .select('*', { count: 'exact', head: true });
  
  if (count !== null) {
    console.log(`✅ Total test cases in Supabase: ${count}`);
  }
}

// ============================================================================
// FIX TEST CASE FORMAT
// ============================================================================

function parseValue(valueStr) {
  if (!valueStr || typeof valueStr !== 'string') return valueStr;
  
  valueStr = valueStr.trim().replace(/\\\[/g, '[').replace(/\\\]/g, ']');
  
  try {
    return JSON.parse(valueStr);
  } catch {}
  
  if (/^-?\d+$/.test(valueStr)) return parseInt(valueStr, 10);
  if (/^-?\d*\.\d+/.test(valueStr)) return parseFloat(valueStr);
  if (valueStr.toLowerCase() === 'true') return true;
  if (valueStr.toLowerCase() === 'false') return false;
  
  return valueStr;
}

function parseInputString(inputStr) {
  if (!inputStr || typeof inputStr !== 'string') return [];
  
  inputStr = inputStr.replace(/\\\[/g, '[').replace(/\\\]/g, ']');
  
  const values = [];
  let currentValue = '';
  let inAssignment = false;
  let bracketDepth = 0;
  
  for (let i = 0; i < inputStr.length; i++) {
    const char = inputStr[i];
    
    if (char === '=' && bracketDepth === 0) {
      inAssignment = true;
      continue;
    }
    
    if (char === '[') bracketDepth++;
    if (char === ']') bracketDepth--;
    
    if (char === ',' && bracketDepth === 0 && inAssignment) {
      const parsed = parseValue(currentValue.trim());
      if (parsed !== null) values.push(parsed);
      currentValue = '';
      inAssignment = false;
      continue;
    }
    
    if (inAssignment) currentValue += char;
  }
  
  if (inAssignment && currentValue.trim()) {
    const parsed = parseValue(currentValue.trim());
    if (parsed !== null) values.push(parsed);
  }
  
  return values.length > 0 ? values : [parseValue(inputStr)];
}

function fixTestCase(testCase) {
  if (!testCase || typeof testCase !== 'object') {
    return null;
  }
  
  let { input, expectedOutput } = testCase;
  
  if (Array.isArray(input) && input.length > 0) {
    if (typeof input[0] === 'string' && (input[0].includes('=') || input[0].includes('\\['))) {
      const cleaned = input[0].replace(/\\\[/g, '[').replace(/\\\]/g, ']');
      try {
        const parsed = JSON.parse(cleaned);
        input = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        const parsed = parseInputString(cleaned);
        if (parsed && parsed.length > 0) {
          input = parsed;
        }
      }
    }
  }
  
  if (typeof expectedOutput === 'string') {
    let cleaned = expectedOutput.replace(/\\\[/g, '[').replace(/\\\]/g, ']');
    try {
      expectedOutput = JSON.parse(cleaned);
    } catch {
      expectedOutput = parseValue(cleaned);
    }
  }
  
  return {
    input: input,
    expectedOutput: expectedOutput
  };
}

async function fixFormat() {
  console.log('=== Fixing Test Case Formats ===\n');
  
  const files = await fs.readdir(PROBLEMS_DIR);
  const jsonFiles = files.filter(f => f.endsWith('.json'));
  
  console.log(`Found ${jsonFiles.length} problem files.\n`);
  
  let fixed = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const file of jsonFiles) {
    try {
      const filePath = path.join(PROBLEMS_DIR, file);
      const problem = await fs.readJson(filePath);
      
      let needsUpdate = false;
      
      if (problem.testCases && Array.isArray(problem.testCases)) {
        problem.testCases = problem.testCases.map(tc => {
          const fixed = fixTestCase(tc);
          if (fixed && JSON.stringify(fixed) !== JSON.stringify(tc)) {
            needsUpdate = true;
            return fixed;
          }
          return tc;
        });
      }
      
      if (problem.hiddenTestCases && Array.isArray(problem.hiddenTestCases)) {
        problem.hiddenTestCases = problem.hiddenTestCases.map(tc => {
          const fixed = fixTestCase(tc);
          if (fixed && JSON.stringify(fixed) !== JSON.stringify(tc)) {
            needsUpdate = true;
            return fixed;
          }
          return tc;
        });
      }
      
      if (needsUpdate) {
        problem.updatedAt = new Date().toISOString();
        await fs.writeJson(filePath, problem, { spaces: 2 });
        fixed++;
        
        if (fixed <= 20 || fixed % 50 === 0) {
          console.log(`[${fixed}] Fixed: "${problem.title}"`);
        }
      } else {
        skipped++;
      }
    } catch (error) {
      console.error(`Error processing ${file}:`, error.message);
      errors++;
    }
  }
  
  console.log('\n=== Summary ===');
  console.log(`✅ Fixed: ${fixed}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log(`❌ Errors: ${errors}`);
}

// ============================================================================
// FIX DESIGN PROBLEM TEST CASES
// ============================================================================

function parseDesignExample(description) {
  if (!description) return null;
  
  const inputMatch = description.match(/\*\*Input\*\*\s*([\s\S]*?)\*\*Output\*\*/i);
  const outputMatch = description.match(/\*\*Output\*\*\s*([\s\S]*?)(?:\*\*Explanation|$)/i);
  
  if (!inputMatch || !outputMatch) return null;
  
  const inputText = inputMatch[1].trim().replace(/\\\[/g, '[').replace(/\\\]/g, ']');
  const outputText = outputMatch[1].trim().replace(/\\\[/g, '[').replace(/\\\]/g, ']');
  
  try {
    const methodsMatch = inputText.match(/\[(.*?)\]/s);
    
    if (methodsMatch) {
      const methodsStr = methodsMatch[0];
      const methods = JSON.parse(methodsStr);
      
      const argsArrayMatch = inputText.match(/\]\s*\n?\s*(\[[\s\S]*\])\s*$/);
      let args = [];
      if (argsArrayMatch) {
        args = JSON.parse(argsArrayMatch[1]);
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

function isDesignProblem(problem) {
  const title = (problem.title || '').toLowerCase();
  const description = (problem.description || '').toLowerCase();
  
  return title.includes('design') || 
         description.includes('design') ||
         description.includes('constructor') ||
         description.includes('method call');
}

async function fixDesign() {
  console.log('=== Fixing Design Problem Test Cases ===\n');
  
  const files = await fs.readdir(PROBLEMS_DIR);
  const jsonFiles = files.filter(f => f.endsWith('.json'));
  
  console.log(`Found ${jsonFiles.length} problem files.\n`);
  
  let fixed = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const file of jsonFiles) {
    try {
      const filePath = path.join(PROBLEMS_DIR, file);
      const problem = await fs.readJson(filePath);
      
      if (!isDesignProblem(problem)) {
        skipped++;
        continue;
      }
      
      const parsed = parseDesignExample(problem.description || '');
      
      if (parsed) {
        problem.testCases = [parsed];
        problem.hiddenTestCases = [parsed];
        problem.updatedAt = new Date().toISOString();
        
        await fs.writeJson(filePath, problem, { spaces: 2 });
        fixed++;
        
        console.log(`[${fixed}] Fixed design problem: "${problem.title}"`);
      } else {
        skipped++;
      }
    } catch (error) {
      console.error(`Error processing ${file}:`, error.message);
      errors++;
    }
  }
  
  console.log('\n=== Summary ===');
  console.log(`✅ Fixed: ${fixed}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log(`❌ Errors: ${errors}`);
}

// ============================================================================
// MAIN
// ============================================================================

const command = process.argv[2];

if (command === 'upload') {
  uploadTestCases().then(() => {
    console.log('\n🎉 Upload completed!');
    process.exit(0);
  });
} else if (command === 'fix-format') {
  fixFormat().then(() => {
    console.log('\n🎉 Format fixing completed!');
    process.exit(0);
  });
} else if (command === 'fix-design') {
  fixDesign().then(() => {
    console.log('\n🎉 Design problem fixing completed!');
    process.exit(0);
  });
} else {
  console.log('Usage:');
  console.log('  node scripts/manageTestCases.js upload');
  console.log('  node scripts/manageTestCases.js fix-format');
  console.log('  node scripts/manageTestCases.js fix-design');
  process.exit(1);
}

