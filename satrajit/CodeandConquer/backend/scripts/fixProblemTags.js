/**
 * Script to fix problem_tags table by matching problems by title
 * 
 * The issue: problem_id values in problem_tags don't match the id values in problems table
 * Solution: Match by title and update the problem_id references
 * 
 * Run with: node backend/scripts/fixProblemTags.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixProblemTags() {
  console.log('🔧 Starting problem_tags fix...\n');

  // Step 1: Get all problems (current table)
  console.log('📥 Fetching all problems...');
  const { data: problems, error: problemsError } = await supabase
    .from('problems')
    .select('id, title, slug');

  if (problemsError) {
    console.error('Error fetching problems:', problemsError);
    return;
  }
  console.log(`   Found ${problems.length} problems\n`);

  // Create lookup maps by title and slug (lowercase for matching)
  const problemByTitle = new Map();
  const problemBySlug = new Map();
  
  for (const p of problems) {
    if (p.title) {
      problemByTitle.set(p.title.toLowerCase().trim(), p.id);
    }
    if (p.slug) {
      problemBySlug.set(p.slug.toLowerCase().trim(), p.id);
    }
  }

  // Step 2: Get all unique problem_ids from problem_tags that need fixing
  console.log('📥 Fetching problem_tags entries...');
  const { data: tags, error: tagsError } = await supabase
    .from('problem_tags')
    .select('id, problem_id, tag')
    .limit(10000);

  if (tagsError) {
    console.error('Error fetching problem_tags:', tagsError);
    return;
  }
  console.log(`   Found ${tags.length} tag entries\n`);

  // Step 3: Get the old problems to find titles for matching
  // We need to fetch the problems that the old problem_ids reference
  const oldProblemIds = [...new Set(tags.map(t => t.problem_id))];
  console.log(`📥 Found ${oldProblemIds.length} unique problem_ids in problem_tags\n`);

  // Check which old IDs already exist in current problems
  const currentIds = new Set(problems.map(p => p.id));
  const matchingIds = oldProblemIds.filter(id => currentIds.has(id));
  const nonMatchingIds = oldProblemIds.filter(id => !currentIds.has(id));
  
  console.log(`✅ ${matchingIds.length} problem_ids already match current problems`);
  console.log(`❌ ${nonMatchingIds.length} problem_ids need to be fixed\n`);

  if (nonMatchingIds.length === 0) {
    console.log('🎉 All problem_ids already match! No fixes needed.');
    return;
  }

  // Step 4: Try to fetch the old problems to get their titles
  // This assumes the old problem_ids might still exist somewhere or we can query them
  console.log('🔍 Attempting to find old problems by their IDs...');
  
  // Try fetching from problems table using the old IDs (in case they exist as separate entries)
  const { data: oldProblems, error: oldProblemsError } = await supabase
    .from('problems')
    .select('id, title, slug')
    .in('id', nonMatchingIds.slice(0, 100)); // Limit to first 100 to test

  if (oldProblemsError) {
    console.log('   Could not fetch old problems:', oldProblemsError.message);
  } else {
    console.log(`   Found ${oldProblems?.length || 0} old problems\n`);
  }

  // If we found old problems, create a mapping
  const oldToNewIdMap = new Map();
  
  if (oldProblems && oldProblems.length > 0) {
    for (const oldP of oldProblems) {
      // Try to find matching current problem by title
      const titleKey = oldP.title?.toLowerCase().trim();
      const slugKey = oldP.slug?.toLowerCase().trim();
      
      let newId = problemByTitle.get(titleKey) || problemBySlug.get(slugKey);
      
      if (newId && newId !== oldP.id) {
        oldToNewIdMap.set(oldP.id, newId);
      }
    }
  }

  console.log(`📋 Created mapping for ${oldToNewIdMap.size} problem IDs\n`);

  if (oldToNewIdMap.size === 0) {
    console.log('⚠️  Could not create ID mappings. The old problem_ids may reference a different data source.');
    console.log('\nAlternative: You can manually update problem_tags in Supabase SQL Editor:');
    console.log(`
-- Example: Update a specific tag's problem_id
UPDATE problem_tags 
SET problem_id = 'new-correct-uuid-here'
WHERE problem_id = 'old-incorrect-uuid-here';

-- Or delete orphaned tags
DELETE FROM problem_tags 
WHERE problem_id NOT IN (SELECT id FROM problems);
    `);
    return;
  }

  // Step 5: Update problem_tags with correct IDs
  console.log('🔄 Updating problem_tags with correct problem_ids...\n');
  
  let updated = 0;
  let failed = 0;

  for (const [oldId, newId] of oldToNewIdMap) {
    const { error: updateError } = await supabase
      .from('problem_tags')
      .update({ problem_id: newId })
      .eq('problem_id', oldId);

    if (updateError) {
      console.error(`   Failed to update ${oldId} -> ${newId}:`, updateError.message);
      failed++;
    } else {
      updated++;
      if (updated % 10 === 0) {
        console.log(`   Updated ${updated} mappings...`);
      }
    }
  }

  console.log(`\n✅ Done! Updated ${updated} problem_id mappings, ${failed} failed.`);
}

// Run the script
fixProblemTags().catch(console.error);

