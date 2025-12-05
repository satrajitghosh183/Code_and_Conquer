/**
 * Database Operations Script
 * 
 * Consolidated script for database operations:
 * - List all Supabase tables
 * - Sync problems from Supabase to local files
 * 
 * Usage:
 *   node scripts/databaseOperations.js list-tables
 *   node scripts/databaseOperations.js sync-problems
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Missing Supabase credentials');
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const PROBLEMS_DIR = path.join(__dirname, '../../data/problems');

// ============================================================================
// LIST TABLES FUNCTIONALITY
// ============================================================================

async function getAllTables() {
  const { PUBLIC_TABLES } = await import('../src/config/supabasePublicSchema.js');
  
  const existingTables = [];
  const tableNames = Object.values(PUBLIC_TABLES).map(name => 
    name.replace('public.', '')
  );

  const additionalTables = [
    'content_modules',
    'user_module_progress',
    'video_ads',
    'ad_impressions',
    'ad_interactions',
    'user_stats',
    'tasks',
    'user_activity',
    'leaderboards'
  ];

  const allTableNames = [...new Set([...tableNames, ...additionalTables])];

  console.log('🔍 Checking which tables exist...\n');

  for (const tableName of allTableNames) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(0);

      if (!error || error.code === 'PGRST116') {
        existingTables.push(tableName);
      }
    } catch (err) {
      // Skip silently
    }
  }

  return existingTables.sort();
}

async function getTableInfo(tableName) {
  try {
    const { count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    const rowCount = count || 0;

    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);

    let columns = [];
    if (data && data.length > 0) {
      columns = Object.keys(data[0]);
    } else if (!error) {
      columns = ['(unable to determine - table is empty)'];
    }

    return {
      name: tableName,
      rowCount,
      columns,
      exists: !error || error.code === 'PGRST116'
    };
  } catch (err) {
    return {
      name: tableName,
      rowCount: 'Error',
      columns: [],
      exists: false,
      error: err.message
    };
  }
}

async function listTables() {
  console.log('📊 Supabase Tables Listing Tool\n');
  console.log(`🔗 Connecting to: ${supabaseUrl.replace(/\/\/.*@/, '//***@')}\n`);

  try {
    const tables = await getAllTables();

    if (tables.length === 0) {
      console.log('⚠️  No tables found or unable to query tables.');
      return;
    }

    console.log(`✅ Found ${tables.length} table(s)\n`);

    const tableInfos = [];
    for (const tableName of tables) {
      console.log(`📋 Analyzing: ${tableName}...`);
      const info = await getTableInfo(tableName);
      tableInfos.push(info);
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 TABLE SUMMARY\n');
    console.log('='.repeat(80));

    for (const info of tableInfos) {
      if (!info.exists) {
        console.log(`\n❌ ${info.name} - Does not exist or access denied`);
        continue;
      }

      console.log(`\n✅ ${info.name}`);
      console.log(`   Rows: ${info.rowCount}`);
      
      if (info.columns.length > 0 && info.columns[0] !== '(unable to determine - table is empty)') {
        console.log(`   Columns (${info.columns.length}): ${info.columns.slice(0, 5).join(', ')}${info.columns.length > 5 ? '...' : ''}`);
      }
    }

    const existingTables = tableInfos.filter(t => t.exists);
    const tablesWithData = tableInfos.filter(t => t.exists && typeof t.rowCount === 'number' && t.rowCount > 0);
    const emptyTables = tableInfos.filter(t => t.exists && (t.rowCount === 0 || t.rowCount === 'N/A'));

    console.log('\n' + '='.repeat(80));
    console.log('📈 SUMMARY STATISTICS\n');
    console.log('='.repeat(80));
    console.log(`Total Tables Found: ${tableInfos.length}`);
    console.log(`Existing Tables: ${existingTables.length}`);
    console.log(`Tables with Data: ${tablesWithData.length}`);
    console.log(`Empty Tables: ${emptyTables.length}`);

    console.log('\n✨ Done!\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// ============================================================================
// SYNC PROBLEMS FUNCTIONALITY
// ============================================================================

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
  let hidden = allTestCases.slice(visibleCount);
  const visible = allTestCases.slice(0, visibleCount);
  
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

async function syncProblems() {
  console.log('=== Syncing Problems from Supabase to Local Files ===\n');
  
  await fs.ensureDir(PROBLEMS_DIR);
  
  try {
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
      
      let existingProblem = null;
      if (await fs.pathExists(filePath)) {
        existingProblem = await fs.readJson(filePath);
      }
      
      const hasTestCases = (problem.testCases && Array.isArray(problem.testCases) && problem.testCases.length > 0) ||
                          (existingProblem?.testCases && Array.isArray(existingProblem.testCases) && existingProblem.testCases.length > 0);
      
      if (existingProblem?.testCases && existingProblem.testCases.length > 0) {
        problem.testCases = existingProblem.testCases;
        problem.hiddenTestCases = existingProblem.hiddenTestCases || [];
      }
      
      if (!hasTestCases || !problem.testCases || problem.testCases.length === 0) {
        const generated = generateTestCases(problem);
        if (generated.testCases.length > 0) {
          problem.testCases = generated.testCases;
          problem.hiddenTestCases = generated.hiddenTestCases;
        }
      }
      
      if (problem.testCases && problem.testCases.length > 0 && (!problem.hiddenTestCases || problem.hiddenTestCases.length < 2)) {
        problem.hiddenTestCases = [...(problem.hiddenTestCases || [])];
        problem.testCases.forEach(tc => {
          if (problem.hiddenTestCases.length < 2 && !problem.hiddenTestCases.some(h => JSON.stringify(h) === JSON.stringify(tc))) {
            problem.hiddenTestCases.push(tc);
          }
        });
      }
      
      problem.updatedAt = new Date().toISOString();
      
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

// ============================================================================
// MAIN
// ============================================================================

const command = process.argv[2];

if (command === 'list-tables') {
  listTables().then(() => process.exit(0));
} else if (command === 'sync-problems') {
  syncProblems().then(() => {
    console.log('\n🎉 Sync completed!');
    process.exit(0);
  });
} else {
  console.log('Usage:');
  console.log('  node scripts/databaseOperations.js list-tables');
  console.log('  node scripts/databaseOperations.js sync-problems');
  process.exit(1);
}

