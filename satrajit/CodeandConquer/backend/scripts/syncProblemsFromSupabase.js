/**
 * Sync Problems from Supabase to Local Files
 * 
 * This script downloads ALL problems from Supabase and saves them locally
 * with test cases generated from their descriptions.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROBLEMS_DIR = path.join(__dirname, '../../data/problems');

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Parsing functions
function parseValueForAllLanguages(valueStr) {
  if (!valueStr || typeof valueStr !== 'string') return valueStr;
  valueStr = valueStr.trim().replace(/\\\[/g, '[').replace(/\\\]/g, ']');
  try { return JSON.parse(valueStr); } catch {}
  if (valueStr.startsWith('[') && valueStr.endsWith(']')) {
    try { return JSON.parse(valueStr); } catch {}
  }
  if (/^-?\d+$/.test(valueStr)) return parseInt(valueStr, 10);
  if (/^-?\d*\.\d+/.test(valueStr)) return parseFloat(valueStr);
  if (valueStr.toLowerCase() === 'true') return true;
  if (valueStr.toLowerCase() === 'false') return false;
  return valueStr;
}

function parseInputFromExample(inputStr) {
  if (!inputStr) return [];
  inputStr = inputStr.trim().replace(/\\\[/g, '[').replace(/\\\]/g, ']');
  const values = [];
  let currentValue = '';
  let inAssignment = false;
  let bracketDepth = 0;
  let inString = false;
  
  for (let i = 0; i < inputStr.length; i++) {
    const char = inputStr[i];
    const prevChar = i > 0 ? inputStr[i - 1] : '';
    
    if ((char === '"' || char === "'") && prevChar !== '\\') {
      inString = !inString;
    }
    
    if (!inString) {
      if (char === '[') bracketDepth++;
      if (char === ']') bracketDepth--;
    }
    
    if (char === '=' && bracketDepth === 0 && !inString) {
      inAssignment = true;
      continue;
    }
    
    if (char === ',' && bracketDepth === 0 && !inString && inAssignment) {
      const parsed = parseValueForAllLanguages(currentValue.trim());
      if (parsed !== null) values.push(parsed);
      currentValue = '';
      inAssignment = false;
      continue;
    }
    
    if (inAssignment) currentValue += char;
  }
  
  if (inAssignment && currentValue.trim()) {
    const parsed = parseValueForAllLanguages(currentValue.trim());
    if (parsed !== null) values.push(parsed);
  }
  
  if (values.length === 0) {
    const single = parseValueForAllLanguages(inputStr);
    return single !== null ? (Array.isArray(single) ? single : [single]) : [];
  }
  
  return values;
}

function extractExamplesFromDescription(description) {
  const examples = [];
  if (!description) return examples;
  
  const exampleRegex = /\*\*Example\s+(\d+):\*\*([\s\S]*?)(?=\*\*Example\s+\d+:\*\*|$)/gi;
  let match;
  
  while ((match = exampleRegex.exec(description)) !== null) {
    const block = match[2];
    const inputMatch = block.match(/\*\*Input:\*\*\s*([\s\S]*?)(?:\*\*Output:|\*\*Explanation:|$)/i);
    const outputMatch = block.match(/\*\*Output:\*\*\s*([\s\S]*?)(?:\*\*Explanation:|\*\*Example|$)/i);
    
    if (inputMatch && outputMatch) {
      examples.push({
        input: inputMatch[1].trim(),
        output: outputMatch[1].trim()
      });
    }
  }
  
  return examples;
}

function generateTestCases(problem) {
  const examples = extractExamplesFromDescription(problem.description || '');
  
  if (examples.length === 0) {
    return { testCases: [], hiddenTestCases: [] };
  }
  
  const allTestCases = [];
  for (const example of examples) {
    try {
      const input = parseInputFromExample(example.input);
      const output = parseValueForAllLanguages(example.output);
      
      if (input && input.length > 0 && output !== null) {
        allTestCases.push({
          input: Array.isArray(input) ? input : [input],
          expectedOutput: output
        });
      }
    } catch {}
  }
  
  if (allTestCases.length === 0) {
    return { testCases: [], hiddenTestCases: [] };
  }
  
  const visibleCount = Math.min(3, allTestCases.length);
  
  // Make sure we have at least 2 hidden test cases
  let hidden = allTestCases.slice(visibleCount);
  const visible = allTestCases.slice(0, visibleCount);
  
  // If not enough hidden, duplicate some visible as hidden
  if (visible.length > 0 && hidden.length < 2) {
    visible.forEach(tc => {
      if (hidden.length < 2 && !hidden.some(h => JSON.stringify(h) === JSON.stringify(tc))) {
        hidden.push(tc);
      }
    });
  }
  
  return {
    testCases: visible,
    hiddenTestCases: hidden
  };
}

function mapSupabaseProblem(data) {
  const parseJsonField = (field) => {
    if (!field) return [];
    if (Array.isArray(field)) return field;
    if (typeof field === 'string') {
      try {
        return JSON.parse(field);
      } catch {
        return [];
      }
    }
    return [];
  };

  return {
    id: data.id,
    title: data.title,
    slug: data.slug,
    description: data.description,
    difficulty: data.difficulty,
    category: data.category,
    xpReward: data.xp_reward || 0,
    timeLimitMs: data.time_limit_ms || 5000,
    memoryLimitMb: data.memory_limit_mb || 256,
    starterCode: parseJsonField(data.starter_code),
    solutionCode: data.solution_code || '',
    hints: parseJsonField(data.hints),
    isPremium: data.is_premium || false,
    createdBy: data.created_by,
    testCases: parseJsonField(data.test_cases),
    hiddenTestCases: parseJsonField(data.hidden_test_cases),
    tags: parseJsonField(data.tags),
    constraints: parseJsonField(data.constraints),
    examples: parseJsonField(data.examples),
    problemNumber: data.problem_number,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
}

async function main() {
  console.log('=== Syncing Problems from Supabase to Local Files ===\n');
  
  await fs.ensureDir(PROBLEMS_DIR);
  
  try {
    // Fetch all problems from Supabase
    console.log('Fetching problems from Supabase...');
    const { data, error } = await supabase
      .from('problems')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching from Supabase:', error);
      return;
    }
    
    console.log(`Found ${data.length} problems in Supabase.\n`);
    
    let synced = 0;
    let updated = 0;
    let skipped = 0;
    
    for (const row of data) {
      const problem = mapSupabaseProblem(row);
      const filePath = path.join(PROBLEMS_DIR, `${problem.id}.json`);
      
      // Check if local file exists and has test cases
      let existingProblem = null;
      if (await fs.pathExists(filePath)) {
        existingProblem = await fs.readJson(filePath);
      }
      
      // Check if we need to generate test cases
      const hasTestCases = (problem.testCases && Array.isArray(problem.testCases) && problem.testCases.length > 0) ||
                          (existingProblem?.testCases && Array.isArray(existingProblem.testCases) && existingProblem.testCases.length > 0);
      
      // Use existing test cases if available
      if (existingProblem?.testCases && existingProblem.testCases.length > 0) {
        problem.testCases = existingProblem.testCases;
        problem.hiddenTestCases = existingProblem.hiddenTestCases || [];
      }
      
      // Generate test cases if missing
      if (!hasTestCases || !problem.testCases || problem.testCases.length === 0) {
        const generated = generateTestCases(problem);
        if (generated.testCases.length > 0) {
          problem.testCases = generated.testCases;
          problem.hiddenTestCases = generated.hiddenTestCases;
        }
      }
      
      // Ensure we have hidden test cases
      if (problem.testCases && problem.testCases.length > 0 && (!problem.hiddenTestCases || problem.hiddenTestCases.length < 2)) {
        // Add visible as hidden too
        problem.hiddenTestCases = [...(problem.hiddenTestCases || [])];
        problem.testCases.forEach(tc => {
          if (problem.hiddenTestCases.length < 2 && !problem.hiddenTestCases.some(h => JSON.stringify(h) === JSON.stringify(tc))) {
            problem.hiddenTestCases.push(tc);
          }
        });
      }
      
      problem.updatedAt = new Date().toISOString();
      
      // Save to local file
      await fs.writeJson(filePath, problem, { spaces: 2 });
      
      if (existingProblem) {
        updated++;
      } else {
        synced++;
      }
      
      const tcCount = (problem.testCases?.length || 0) + (problem.hiddenTestCases?.length || 0);
      if (synced + updated <= 50 || (synced + updated) % 100 === 0) {
        console.log(`[${synced + updated + skipped}/${data.length}] ${existingProblem ? 'Updated' : 'Created'}: "${problem.title}" (${tcCount} test cases)`);
      }
    }
    
    console.log('\n=== Summary ===');
    console.log(`✅ New files created: ${synced}`);
    console.log(`✅ Files updated: ${updated}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`📁 Total problems: ${data.length}`);
    
  } catch (error) {
    console.error('Fatal error:', error);
  }
}

main().then(() => {
  console.log('\n🎉 Sync completed! All problems are now available locally.');
  process.exit(0);
}).catch(error => {
  console.error('❌ Failed:', error);
  process.exit(1);
});

