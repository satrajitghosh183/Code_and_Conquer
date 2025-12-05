/**
 * Import Ads from CSV
 * 
 * This script imports video ads from videos.csv into the video_ads table.
 * It maps CSV columns (id, link) to database columns (youtube_url, sponsor, title).
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Default sponsor names (cycling through for variety)
const DEFAULT_SPONSORS = [
  'Code & Conquer',
  'Tech Academy',
  'DevTools Pro',
  'CodeCamp',
  'TechLearn'
];

// Default titles (cycling through for variety)
const DEFAULT_TITLES = [
  'Learn to Code',
  'Master Programming',
  'Developer Tools',
  'Coding Bootcamp',
  'Online Learning'
];

/**
 * Parse CSV file
 */
function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    data.push(row);
  }
  
  return data;
}

/**
 * Extract YouTube video ID from URL
 */
function extractVideoId(url) {
  if (!url) return null;
  
  // Handle various YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}

/**
 * Import ads from CSV
 */
async function importAds() {
  console.log('📊 Importing Ads from CSV\n');
  
  // Find videos.csv file (in project root)
  const csvPath = path.join(__dirname, '../../videos.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ videos.csv not found at: ${csvPath}`);
    process.exit(1);
  }
  
  console.log(`📁 Reading CSV from: ${csvPath}\n`);
  
  // Parse CSV
  const csvData = parseCSV(csvPath);
  console.log(`✅ Found ${csvData.length} ads in CSV\n`);
  
  // Check if video_ads table exists
  const { error: tableError } = await supabase
    .from('video_ads')
    .select('id')
    .limit(1);
  
  if (tableError && tableError.code === '42P01') {
    console.error('❌ video_ads table does not exist. Please run the migration first:');
    console.error('   backend/migrations/create_ad_tables.sql\n');
    process.exit(1);
  }
  
  // Check existing ads
  const { data: existingAds, error: fetchError } = await supabase
    .from('video_ads')
    .select('youtube_url');
  
  if (fetchError) {
    console.error('❌ Error fetching existing ads:', fetchError.message);
    process.exit(1);
  }
  
  const existingUrls = new Set(existingAds?.map(ad => ad.youtube_url) || []);
  console.log(`📋 Found ${existingUrls.size} existing ads in database\n`);
  
  // Prepare ads for insertion
  const adsToInsert = [];
  let skipped = 0;
  
  for (let i = 0; i < csvData.length; i++) {
    const row = csvData[i];
    const link = row.link || row.Link || '';
    const id = row.id || row.ID || '';
    
    if (!link) {
      console.warn(`⚠️  Skipping row ${i + 1}: No link provided`);
      skipped++;
      continue;
    }
    
    // Skip if already exists
    if (existingUrls.has(link)) {
      console.log(`⏭️  Skipping row ${i + 1}: Ad already exists (${link})`);
      skipped++;
      continue;
    }
    
    // Extract video ID for title if possible
    const videoId = extractVideoId(link);
    
    // Use defaults with cycling
    const sponsorIndex = i % DEFAULT_SPONSORS.length;
    const titleIndex = i % DEFAULT_TITLES.length;
    
    const ad = {
      youtube_url: link,
      sponsor: DEFAULT_SPONSORS[sponsorIndex],
      title: videoId ? `${DEFAULT_TITLES[titleIndex]} - ${videoId}` : DEFAULT_TITLES[titleIndex],
      description: `Educational video from ${DEFAULT_SPONSORS[sponsorIndex]}`,
      active: true,
      priority: parseInt(id) || (i + 1),
    };
    
    adsToInsert.push(ad);
  }
  
  if (adsToInsert.length === 0) {
    console.log('✅ No new ads to import. All ads from CSV already exist in database.\n');
    return;
  }
  
  console.log(`📤 Inserting ${adsToInsert.length} new ads...\n`);
  
  // Insert ads in batches
  const BATCH_SIZE = 10;
  let inserted = 0;
  let errors = 0;
  
  for (let i = 0; i < adsToInsert.length; i += BATCH_SIZE) {
    const batch = adsToInsert.slice(i, i + BATCH_SIZE);
    
    const { data, error } = await supabase
      .from('video_ads')
      .insert(batch)
      .select();
    
    if (error) {
      console.error(`❌ Error inserting batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error.message);
      errors++;
    } else {
      inserted += data.length;
      console.log(`✅ Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}: ${data.length} ads`);
    }
  }
  
  console.log('\n📊 Import Summary:');
  console.log(`   ✅ Inserted: ${inserted}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`   📋 Total in CSV: ${csvData.length}\n`);
  
  if (inserted > 0) {
    console.log('✅ Ads successfully imported!\n');
  }
}

// Run import
importAds().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

