/**
 * Script to give all users 10,000 gold
 * Run this script from the backend or via Supabase SQL
 * 
 * Usage:
 * 1. Via Supabase SQL Editor:
 *    UPDATE user_stats SET coins = coins + 10000;
 * 
 * 2. Via Node.js (if you have backend access):
 *    node scripts/giveAllUsersGold.js
 */

// SQL query to update all users
const SQL_QUERY = `
  UPDATE user_stats 
  SET coins = coins + 10000
  WHERE id IN (SELECT id FROM user_stats);
`;

// Alternative: Update via Supabase client (if running in Node.js)
async function giveAllUsersGold() {
  const { createClient } = require('@supabase/supabase-js');
  
  // Get from environment variables
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // Get all user stats
    const { data: userStats, error: fetchError } = await supabase
      .from('user_stats')
      .select('id, coins');
    
    if (fetchError) {
      console.error('Error fetching user stats:', fetchError);
      return;
    }
    
    console.log(`Found ${userStats.length} users to update`);
    
    // Update each user
    for (const userStat of userStats) {
      const { error: updateError } = await supabase
        .from('user_stats')
        .update({ coins: (userStat.coins || 0) + 10000 })
        .eq('id', userStat.id);
      
      if (updateError) {
        console.error(`Error updating user ${userStat.id}:`, updateError);
      } else {
        console.log(`Updated user ${userStat.id}: ${userStat.coins || 0} -> ${(userStat.coins || 0) + 10000} coins`);
      }
    }
    
    console.log('All users updated successfully!');
  } catch (error) {
    console.error('Error:', error);
  }
}

// If running as script
if (require.main === module) {
  giveAllUsersGold();
}

module.exports = { giveAllUsersGold, SQL_QUERY };

