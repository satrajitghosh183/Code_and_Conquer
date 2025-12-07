import { supabase } from '../config/supabaseClient'

/**
 * Base Persistence Service
 * Handles saving and loading base upgrade data from Supabase
 * 
 * Table schema (create this in Supabase):
 * CREATE TABLE base_upgrades (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
 *   base_level INTEGER DEFAULT 1 NOT NULL CHECK (base_level >= 1 AND base_level <= 10),
 *   total_upgrades INTEGER DEFAULT 0 NOT NULL,
 *   last_upgrade_at TIMESTAMPTZ,
 *   created_at TIMESTAMPTZ DEFAULT NOW(),
 *   updated_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * 
 * RLS Policy (Row Level Security):
 * - Enable RLS on the table
 * - Policy: Users can only read/update their own base_upgrades
 *   CREATE POLICY "Users can manage their own base upgrades"
 *   ON base_upgrades
 *   FOR ALL
 *   USING (auth.uid() = user_id);
 */

/**
 * Load base level for a user
 * @param {string} userId - User ID
 * @returns {Promise<number>} Base level (defaults to 1 if not found)
 */
export async function loadBaseLevel(userId) {
  if (!userId) {
    console.warn('No userId provided, returning default base level 1')
    return 1
  }

  try {
    const { data, error } = await supabase
      .from('base_upgrades')
      .select('base_level')
      .eq('user_id', userId)
      .single()

    if (error) {
      // If record doesn't exist, that's okay - return default
      if (error.code === 'PGRST116') {
        console.log('No base upgrade record found, using default level 1')
        return 1
      }
      
      // If table doesn't exist, log warning but don't crash
      if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
        console.warn('Base upgrades table not found. Using default level 1.')
        return 1
      }
      
      throw error
    }

    return data?.base_level || 1
  } catch (error) {
    console.error('Error loading base level:', error)
    return 1 // Default to level 1 on error
  }
}

/**
 * Save base level for a user
 * @param {string} userId - User ID
 * @param {number} level - Base level (1-10)
 * @returns {Promise<boolean>} Success status
 */
export async function saveBaseLevel(userId, level) {
  if (!userId) {
    console.warn('Cannot save base level: no userId provided')
    return false
  }

  if (level < 1 || level > 10) {
    console.warn(`Invalid base level: ${level}. Must be between 1 and 10.`)
    return false
  }

  try {
    // Try to update existing record
    const { data: existing, error: selectError } = await supabase
      .from('base_upgrades')
      .select('id, total_upgrades')
      .eq('user_id', userId)
      .single()

    if (selectError && selectError.code !== 'PGRST116') {
      // Error other than "not found" - check if table exists
      if (selectError.message?.includes('relation') || selectError.message?.includes('does not exist')) {
        console.warn('Base upgrades table not found. Cannot save base level.')
        return false
      }
    }

    if (existing) {
      // Update existing record
      const { error: updateError } = await supabase
        .from('base_upgrades')
        .update({
          base_level: level,
          total_upgrades: (existing.total_upgrades || 0) + 1,
          last_upgrade_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)

      if (updateError) {
        throw updateError
      }

      console.log(`Base level updated to ${level} for user ${userId}`)
      return true
    } else {
      // Insert new record
      const { error: insertError } = await supabase
        .from('base_upgrades')
        .insert({
          user_id: userId,
          base_level: level,
          total_upgrades: 1,
          last_upgrade_at: new Date().toISOString()
        })

      if (insertError) {
        // If table doesn't exist, log warning but don't crash
        if (insertError.message?.includes('relation') || insertError.message?.includes('does not exist')) {
          console.warn('Base upgrades table not found. Cannot save base level.')
          return false
        }
        throw insertError
      }

      console.log(`Base level saved as ${level} for user ${userId}`)
      return true
    }
  } catch (error) {
    console.error('Error saving base level:', error)
    return false
  }
}

/**
 * Get base upgrade stats for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} Base upgrade stats or null
 */
export async function getBaseStats(userId) {
  if (!userId) {
    return null
  }

  try {
    const { data, error } = await supabase
      .from('base_upgrades')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // No record found
      }
      if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
        console.warn('Base upgrades table not found.')
        return null
      }
      throw error
    }

    return data
  } catch (error) {
    console.error('Error getting base stats:', error)
    return null
  }
}

