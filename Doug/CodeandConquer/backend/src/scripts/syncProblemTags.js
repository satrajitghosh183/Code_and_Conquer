/**
 * Script to sync problem tags from local JSON files to Supabase database
 * 
 * This script reads all problem JSON files from the local data directory
 * and updates the tags in the Supabase database.
 * 
 * Usage: node src/scripts/syncProblemTags.js
 */

import database from '../config/database.js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROBLEMS_DIR = path.join(__dirname, '../../../data/problems');

async function syncProblemTags() {
  try {
    console.log('🔄 Starting tag sync from local files to database...');
    
    // Get all local problem files
    const files = await fs.readdir(PROBLEMS_DIR);
    const problemFiles = files.filter(f => f.endsWith('.json'));
    
    console.log(`Found ${problemFiles.length} problem files`);
    
    let synced = 0;
    let failed = 0;
    let skipped = 0;
    
    for (const file of problemFiles) {
      try {
        const filePath = path.join(PROBLEMS_DIR, file);
        const problemData = await fs.readJson(filePath);
        
        const problemId = problemData.id;
        const tags = Array.isArray(problemData.tags) ? problemData.tags : [];
        
        if (!problemId) {
          console.warn(`⚠️  Skipping ${file}: No ID found`);
          skipped++;
          continue;
        }
        
        // Check if problem exists in database
        const existingProblem = await database.getProblemById(problemId);
        
        if (!existingProblem) {
          console.warn(`⚠️  Skipping ${problemId}: Problem not found in database`);
          skipped++;
          continue;
        }
        
        // Update tags in database
        if (tags.length > 0) {
          await database.updateProblemTags(problemId, tags);
          console.log(`✅ Updated tags for problem ${problemId}: ${tags.join(', ')}`);
          synced++;
        } else {
          console.log(`ℹ️  Problem ${problemId} has no tags to sync`);
          skipped++;
        }
      } catch (error) {
        console.error(`❌ Error syncing ${file}:`, error.message);
        failed++;
      }
    }
    
    console.log('\n📊 Sync Summary:');
    console.log(`   ✅ Synced: ${synced}`);
    console.log(`   ⚠️  Skipped: ${skipped}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📦 Total: ${problemFiles.length}`);
    
    if (synced > 0) {
      console.log('\n✨ Tag sync completed successfully!');
    }
  } catch (error) {
    console.error('❌ Fatal error during tag sync:', error);
    process.exit(1);
  }
}

// Run the sync
syncProblemTags()
  .then(() => {
    console.log('✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

