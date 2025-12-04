/**
 * Upload Test Cases to Supabase
 * 
 * This script reads all local problem files and uploads their test cases
 * to the Supabase test_cases table.
 * 
 * test_cases table schema:
 * - id: uuid
 * - problem_id: uuid (foreign key to problems)
 * - input: jsonb (the input data)
 * - expected_output: jsonb (expected result)
 * - is_hidden: boolean
 * - explanation: text (optional)
 * - weight: integer (for scoring)
 * - created_at: timestamp
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROBLEMS_DIR = path.join(__dirname, '../data/problems');
console.log('Problems directory:', PROBLEMS_DIR);

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log('=== Uploading Test Cases to Supabase ===\n');
  
  // Get all local problem files
  const files = await fs.readdir(PROBLEMS_DIR);
  const jsonFiles = files.filter(f => f.endsWith('.json'));
  
  console.log(`Found ${jsonFiles.length} problem files.\n`);
  
  // First, get all existing problem IDs from Supabase (paginated)
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
  
  // Clear existing test cases (optional - comment out if you want to append)
  console.log('Clearing existing test cases...');
  const { error: deleteError } = await supabase
    .from('test_cases')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
  
  if (deleteError) {
    console.error('Error clearing test cases:', deleteError);
    // Continue anyway
  } else {
    console.log('Existing test cases cleared.\n');
  }
  
  let totalUploaded = 0;
  let totalProblems = 0;
  let skipped = 0;
  let errors = 0;
  
  // Debug: show first few IDs from each set
  const localIds = jsonFiles.slice(0, 5).map(f => f.replace('.json', ''));
  const supabaseIds = Array.from(existingProblemIds).slice(0, 5);
  console.log('First 5 local IDs:', localIds);
  console.log('First 5 Supabase IDs:', supabaseIds);
  console.log('First local ID in Supabase?', existingProblemIds.has(localIds[0]));
  
  // Process each problem file
  for (let i = 0; i < jsonFiles.length; i++) {
    const file = jsonFiles[i];
    const problemId = file.replace('.json', '');
    
    // Skip if problem doesn't exist in Supabase
    if (!existingProblemIds.has(problemId)) {
      if (skipped < 5) console.log('Skipping (not in Supabase):', problemId);
      skipped++;
      continue;
    }
    
    try {
      const filePath = path.join(PROBLEMS_DIR, file);
      const problem = await fs.readJson(filePath);
      
      const testCasesToUpload = [];
      
      // Track unique inputs to avoid duplicates
      const seenInputs = new Set();
      
      const processTestCase = (tc, isHidden) => {
        const input = tc.input || tc;
        const expectedOutput = tc.expectedOutput ?? tc.expected_output ?? tc.output;
        
        // Skip if no expected output (null constraint)
        if (expectedOutput === null || expectedOutput === undefined) {
          return null;
        }
        
        // Create unique key for deduplication
        const inputKey = JSON.stringify(input);
        if (seenInputs.has(inputKey)) {
          return null; // Skip duplicate
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
      
      // Process visible test cases
      if (problem.testCases && Array.isArray(problem.testCases)) {
        for (const tc of problem.testCases) {
          const processed = processTestCase(tc, false);
          if (processed) testCasesToUpload.push(processed);
        }
      }
      
      // Process hidden test cases
      if (problem.hiddenTestCases && Array.isArray(problem.hiddenTestCases)) {
        for (const tc of problem.hiddenTestCases) {
          const processed = processTestCase(tc, true);
          if (processed) testCasesToUpload.push(processed);
        }
      }
      
      if (testCasesToUpload.length > 0) {
        // Upload in batches of 100
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
  console.log(`⏭️  Skipped (no test cases or not in Supabase): ${skipped}`);
  console.log(`❌ Errors: ${errors}`);
  
  // Verify upload
  console.log('\nVerifying upload...');
  const { count, error: countError } = await supabase
    .from('test_cases')
    .select('*', { count: 'exact', head: true });
  
  if (!countError) {
    console.log(`✅ Total test cases in Supabase: ${count}`);
  }
}

main().then(() => {
  console.log('\n🎉 Upload completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

