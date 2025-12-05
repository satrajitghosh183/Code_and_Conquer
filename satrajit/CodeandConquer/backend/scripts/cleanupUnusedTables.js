/**
 * Cleanup Unused Tables Script
 * 
 * This script identifies and optionally removes unused tables from the database.
 * It provides a safe way to clean up tables that are not referenced in the codebase.
 * 
 * WARNING: This script can delete data. Always backup your database before running.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import readline from 'readline';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from backend directory
dotenv.config({ path: path.join(__dirname, '../backend.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config(); // Also try default .env

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Tables that are NOT used in the codebase
const UNUSED_TABLES = [
  'ab_tests',
  'ads', // Code uses video_ads instead
  'auth_providers',
  'career_recommendations',
  'companies',
  'jobs',
  'job_skills',
  'media_files',
  'performance_metrics',
  'problem_stats',
  'problem_tags',
];

// Tables that are used but might be empty (keep these)
const USED_BUT_EMPTY_TABLES = [
  'submissions',
  'user_progress',
  'matches',
  'match_results',
  'game_actions',
  'leaderboards',
  'achievements',
  'user_achievements',
  'user_activity',
  'user_settings',
  'customers',
  'subscriptions',
  'transactions',
  'entitlements',
  'event_logs',
  'towers',
  'player_inventory',
  'tasks',
  'task_integrations',
];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

/**
 * Check if a table exists
 */
async function tableExists(tableName) {
  try {
    const { error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    // 42P01 = relation does not exist
    if (error && error.code === '42P01') {
      return false;
    }
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get row count for a table
 */
async function getRowCount(tableName) {
  try {
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      if (error.code === '42P01') return null; // Table doesn't exist
      throw error;
    }
    
    return count;
  } catch (error) {
    return null;
  }
}

/**
 * Drop a table
 */
async function dropTable(tableName) {
  try {
    // Use RPC to drop table (Supabase client doesn't support DROP TABLE directly)
    // We'll need to use raw SQL via a function or direct connection
    console.log(`⚠️  Cannot drop table via Supabase client. Please run manually:`);
    console.log(`   DROP TABLE IF EXISTS ${tableName} CASCADE;`);
    return false;
  } catch (error) {
    console.error(`❌ Error dropping table ${tableName}:`, error.message);
    return false;
  }
}

/**
 * Main cleanup function
 */
async function cleanup() {
  console.log('📊 Database Cleanup Tool\n');
  console.log('🔍 Analyzing unused tables...\n');
  
  const results = [];
  
  // Check unused tables
  for (const tableName of UNUSED_TABLES) {
    const exists = await tableExists(tableName);
    if (!exists) {
      console.log(`⏭️  ${tableName}: Does not exist (already removed)`);
      continue;
    }
    
    const rowCount = await getRowCount(tableName);
    results.push({
      name: tableName,
      exists: true,
      rowCount: rowCount,
      unused: true,
    });
    
    console.log(`📋 ${tableName}: ${rowCount !== null ? `${rowCount} rows` : 'Unable to count'}`);
  }
  
  console.log('\n📊 Summary:\n');
  
  const existingUnused = results.filter(r => r.exists && r.unused);
  const emptyUnused = existingUnused.filter(r => r.rowCount === 0);
  const populatedUnused = existingUnused.filter(r => r.rowCount > 0);
  
  console.log(`   ✅ Unused tables found: ${existingUnused.length}`);
  console.log(`   📭 Empty unused tables: ${emptyUnused.length}`);
  console.log(`   📦 Populated unused tables: ${populatedUnused.length}\n`);
  
  if (existingUnused.length === 0) {
    console.log('✅ No unused tables to clean up!\n');
    rl.close();
    return;
  }
  
  // Show details
  if (emptyUnused.length > 0) {
    console.log('📭 Empty unused tables (safe to remove):');
    emptyUnused.forEach(t => {
      console.log(`   - ${t.name}`);
    });
    console.log('');
  }
  
  if (populatedUnused.length > 0) {
    console.log('⚠️  Populated unused tables (contains data):');
    populatedUnused.forEach(t => {
      console.log(`   - ${t.name} (${t.rowCount} rows)`);
    });
    console.log('');
  }
  
  // Ask for confirmation
  console.log('⚠️  WARNING: This will generate SQL commands to drop tables.');
  console.log('   You must run these commands manually in your database.\n');
  
  const answer = await question('Do you want to generate DROP TABLE commands? (yes/no): ');
  
  if (answer.toLowerCase() !== 'yes') {
    console.log('\n❌ Cancelled.\n');
    rl.close();
    return;
  }
  
  // Generate SQL commands
  console.log('\n📝 SQL Commands to run:\n');
  console.log('-- Backup first!');
  console.log('-- Run these commands in your Supabase SQL editor:\n');
  
  existingUnused.forEach(t => {
    if (t.rowCount === 0) {
      console.log(`-- ${t.name} (empty, safe to remove)`);
    } else {
      console.log(`-- ${t.name} (${t.rowCount} rows - WARNING: contains data!)`);
    }
    console.log(`DROP TABLE IF EXISTS ${t.name} CASCADE;`);
    console.log('');
  });
  
  console.log('\n✅ SQL commands generated above.');
  console.log('   Copy and run them in your Supabase SQL editor.\n');
  
  rl.close();
}

// Run cleanup
cleanup().catch(error => {
  console.error('❌ Fatal error:', error);
  rl.close();
  process.exit(1);
});

