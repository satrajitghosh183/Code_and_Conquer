// Progression Service - Handles XP, levels, tech tree, and heroes
import database from '../config/database.js'
import { HEROES, TECH_TREE, UNIT_TYPES, TOWER_TYPES } from '../models/Hero.js'

class ProgressionService {
  constructor() {
    this.supabase = database.getSupabaseClient()
    // In-memory storage for extended data not in Supabase
    this.localProgressionData = new Map()
    // Cache for known Supabase columns (detected at runtime)
    this.supabaseColumns = null
    // Core columns that exist in standard user_progress table
    this.coreColumns = [
      'id', 'user_id', 'coding_level', 'total_xp', 'current_rank', 'rank_level',
      'badges', 'current_streak', 'longest_streak', 'last_activity_date',
      'created_at', 'updated_at'
    ]
    // Extended columns that may not exist in Supabase
    this.extendedColumns = [
      'selected_hero', 'unlocked_heroes', 'tech_tree', 'available_tech_points'
    ]
  }

  // Detect which columns exist in Supabase (cached)
  async detectSupabaseColumns() {
    if (this.supabaseColumns !== null) return this.supabaseColumns
    if (!this.supabase) {
      this.supabaseColumns = []
      return this.supabaseColumns
    }
    
    try {
      // Try to select all columns - Supabase will return only existing ones
      const { data, error } = await this.supabase
        .from('user_progress')
        .select('*')
        .limit(1)
      
      if (data && data.length > 0) {
        this.supabaseColumns = Object.keys(data[0])
      } else if (!error) {
        // Table exists but is empty - assume core columns only
        this.supabaseColumns = [...this.coreColumns]
      } else {
        this.supabaseColumns = []
      }
    } catch (e) {
      console.warn('Could not detect Supabase columns:', e.message)
      this.supabaseColumns = []
    }
    
    return this.supabaseColumns
  }

  // Filter object to only include columns that exist in Supabase
  async filterForSupabase(data) {
    const columns = await this.detectSupabaseColumns()
    if (columns.length === 0) return data
    
    const filtered = {}
    for (const [key, value] of Object.entries(data)) {
      // Convert camelCase to snake_case for comparison
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase()
      if (columns.includes(key) || columns.includes(snakeKey)) {
        filtered[snakeKey] = value
      }
    }
    return filtered
  }

  // Get default extended data (stored locally)
  getDefaultExtendedData() {
    return {
      selected_hero: 'python',
      unlocked_heroes: ['python', 'javascript'],
      tech_tree: {
        passiveGold: 0,
        startingGold: 0,
        troopHealth: 0,
        troopDamage: 0,
        towerRange: 0,
        towerFireRate: 0,
        abilityCooldown: 0,
        unlockBasicTroops: 1,
        unlockAdvancedTroops: 0,
        unlockEliteTroops: 0,
        baseDefense: 0
      },
      available_tech_points: 10
    }
  }

  // Get or create local extended data
  getLocalExtendedData(userId) {
    const key = `extended_${userId}`
    if (!this.localProgressionData.has(key)) {
      this.localProgressionData.set(key, this.getDefaultExtendedData())
    }
    return this.localProgressionData.get(key)
  }

  updateLocalExtendedData(userId, updates) {
    const key = `extended_${userId}`
    const current = this.getLocalExtendedData(userId)
    const updated = { ...current, ...updates }
    this.localProgressionData.set(key, updated)
    return updated
  }

  // Get or create local progression data (full, when no Supabase)
  getLocalProgression(userId) {
    if (!this.localProgressionData.has(userId)) {
      const initialProgression = {
        user_id: userId,
        total_xp: 0,
        coding_level: 'Beginner',
        current_rank: 'Bronze',
        rank_level: 1,
        badges: [],
        current_streak: 0,
        longest_streak: 0,
        last_activity_date: new Date().toISOString(),
        ...this.getDefaultExtendedData()
      }
      this.localProgressionData.set(userId, initialProgression)
    }
    return this.localProgressionData.get(userId)
  }

  updateLocalProgression(userId, updates) {
    const current = this.getLocalProgression(userId)
    const updated = { ...current, ...updates }
    this.localProgressionData.set(userId, updated)
    return updated
  }

  // Merge Supabase data with local extended data
  mergeWithExtendedData(userId, supabaseData) {
    const extended = this.getLocalExtendedData(userId)
    
    // If Supabase has tech_tree data, update local storage to match
    if (supabaseData.tech_tree && typeof supabaseData.tech_tree === 'object') {
      this.updateLocalExtendedData(userId, {
        tech_tree: supabaseData.tech_tree
      })
    }
    
    // If Supabase has available_tech_points, update local storage
    if (supabaseData.available_tech_points !== undefined && supabaseData.available_tech_points !== null) {
      this.updateLocalExtendedData(userId, {
        available_tech_points: supabaseData.available_tech_points
      })
    }
    
    return {
      ...supabaseData,
      // Use Supabase data if available, otherwise fall back to local storage
      selected_hero: supabaseData.selected_hero || extended.selected_hero,
      unlocked_heroes: supabaseData.unlocked_heroes || extended.unlocked_heroes,
      tech_tree: supabaseData.tech_tree || extended.tech_tree,
      available_tech_points: supabaseData.available_tech_points ?? extended.available_tech_points
    }
  }
  // Get user progression data
  async getUserProgression(userId) {
    try {
      // If Supabase is not available, use local storage
      if (!this.supabase) {
        console.log('Using local progression data (no Supabase)')
        return this.getLocalProgression(userId)
      }
      
      const { data, error } = await this.supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      
      if (!data) {
        // Create initial progression
        return await this.createUserProgression(userId)
      }

      // Merge with extended data from local storage
      return this.mergeWithExtendedData(userId, data)
    } catch (error) {
      console.error('Error getting user progression, using local:', error)
      // Fallback to local storage
      return this.getLocalProgression(userId)
    }
  }

  // Create initial progression for new user
  async createUserProgression(userId) {
    try {
      // If Supabase is not available, use local storage
      if (!this.supabase) {
        console.log('Creating local progression data (no Supabase)')
        return this.getLocalProgression(userId)
      }
      
      // Core data that goes to Supabase (only columns that exist)
      const coreProgression = {
        user_id: userId,
        total_xp: 0,
        coding_level: 'Beginner',
        current_rank: 'Bronze',
        rank_level: 1,
        badges: [],
        current_streak: 0,
        longest_streak: 0,
        last_activity_date: new Date().toISOString()
      }

      // Filter to only include columns that exist in Supabase
      const filteredData = await this.filterForSupabase(coreProgression)

      const { data, error } = await this.supabase
        .from('user_progress')
        .insert(filteredData)
        .select()
        .single()

      if (error) {
        // If insert fails due to missing columns, try with minimal data
        if (error.code === 'PGRST204') {
          console.warn('Some columns missing in user_progress table, using minimal insert')
          const minimalData = {
            user_id: userId,
            total_xp: 0,
            current_streak: 0,
            longest_streak: 0
          }
          const { data: d2, error: e2 } = await this.supabase
            .from('user_progress')
            .insert(minimalData)
            .select()
            .single()
          
          if (e2) throw e2
          // Initialize extended data locally
          this.getLocalExtendedData(userId)
          return this.mergeWithExtendedData(userId, d2)
        }
        throw error
      }
      
      // Initialize extended data locally
      this.getLocalExtendedData(userId)
      return this.mergeWithExtendedData(userId, data)
    } catch (error) {
      console.error('Error creating user progression, using local:', error)
      // Fallback to local storage
      return this.getLocalProgression(userId)
    }
  }

  // Add XP and calculate level ups
  async addXP(userId, xp, source = 'problem') {
    try {
      const progression = await this.getUserProgression(userId)
      
      // If no Supabase, use local storage
      if (!this.supabase) {
        return this.addXPLocal(userId, xp, source, progression)
      }
      const newTotalXp = (progression.total_xp || 0) + xp

      // Calculate level (100 XP per level, with increasing requirements)
      const oldLevel = this.calculateLevel(progression.total_xp || 0)
      const newLevel = this.calculateLevel(newTotalXp)
      const leveledUp = newLevel > oldLevel
      
      // Tech points awarded on level up
      const techPointsGained = leveledUp ? (newLevel - oldLevel) : 0

      // Core updates for Supabase (only columns that exist)
      const coreUpdates = {
        total_xp: newTotalXp,
        last_activity_date: new Date().toISOString()
      }
      
      // Extended updates stored locally
      if (techPointsGained > 0) {
        const currentTechPoints = progression.available_tech_points || 0
        this.updateLocalExtendedData(userId, {
          available_tech_points: currentTechPoints + techPointsGained
        })
      }
      
      const updates = coreUpdates

      // Update rank based on level
      if (newLevel >= 50) {
        updates.current_rank = 'Legend'
        updates.rank_level = Math.floor((newLevel - 50) / 10) + 1
      } else if (newLevel >= 30) {
        updates.current_rank = 'Diamond'
        updates.rank_level = Math.floor((newLevel - 30) / 5) + 1
      } else if (newLevel >= 20) {
        updates.current_rank = 'Platinum'
        updates.rank_level = Math.floor((newLevel - 20) / 5) + 1
      } else if (newLevel >= 10) {
        updates.current_rank = 'Gold'
        updates.rank_level = Math.floor((newLevel - 10) / 5) + 1
      } else if (newLevel >= 5) {
        updates.current_rank = 'Silver'
        updates.rank_level = Math.floor((newLevel - 5) / 2) + 1
      } else {
        updates.current_rank = 'Bronze'
        updates.rank_level = newLevel
      }

      // Update coding level
      if (newLevel >= 40) {
        updates.coding_level = 'Master'
      } else if (newLevel >= 25) {
        updates.coding_level = 'Expert'
      } else if (newLevel >= 15) {
        updates.coding_level = 'Advanced'
      } else if (newLevel >= 8) {
        updates.coding_level = 'Intermediate'
      } else {
        updates.coding_level = 'Beginner'
      }

      // Filter updates to only columns that exist in Supabase
      const filteredUpdates = await this.filterForSupabase(updates)

      const { data, error } = await this.supabase
        .from('user_progress')
        .update(filteredUpdates)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) {
        // If update fails due to missing columns, try with minimal data
        if (error.code === 'PGRST204') {
          console.warn('Some columns missing in user_progress, updating minimal fields')
          const minimalUpdates = { total_xp: newTotalXp }
          const { data: d2, error: e2 } = await this.supabase
            .from('user_progress')
            .update(minimalUpdates)
            .eq('user_id', userId)
            .select()
            .single()
          
          if (e2) throw e2
          return {
            ...this.mergeWithExtendedData(userId, d2),
            leveledUp,
            oldLevel,
            newLevel,
            techPointsGained,
            xpGained: xp
          }
        }
        throw error
      }

      return {
        ...this.mergeWithExtendedData(userId, data),
        leveledUp,
        oldLevel,
        newLevel,
        techPointsGained,
        xpGained: xp
      }
    } catch (error) {
      console.error('Error adding XP, using local:', error)
      const progression = await this.getUserProgression(userId)
      return this.addXPLocal(userId, xp, source, progression)
    }
  }

  // Local version of addXP
  addXPLocal(userId, xp, source, progression) {
    const newTotalXp = (progression.total_xp || 0) + xp
    const oldLevel = this.calculateLevel(progression.total_xp || 0)
    const newLevel = this.calculateLevel(newTotalXp)
    const leveledUp = newLevel > oldLevel
    const techPointsGained = leveledUp ? (newLevel - oldLevel) : 0

    const updates = {
      total_xp: newTotalXp,
      available_tech_points: (progression.available_tech_points || 0) + techPointsGained,
      last_activity_date: new Date().toISOString()
    }

    // Update rank based on level
    if (newLevel >= 50) {
      updates.current_rank = 'Legend'
      updates.rank_level = Math.floor((newLevel - 50) / 10) + 1
    } else if (newLevel >= 30) {
      updates.current_rank = 'Diamond'
      updates.rank_level = Math.floor((newLevel - 30) / 5) + 1
    } else if (newLevel >= 20) {
      updates.current_rank = 'Platinum'
      updates.rank_level = Math.floor((newLevel - 20) / 5) + 1
    } else if (newLevel >= 10) {
      updates.current_rank = 'Gold'
      updates.rank_level = Math.floor((newLevel - 10) / 5) + 1
    } else if (newLevel >= 5) {
      updates.current_rank = 'Silver'
      updates.rank_level = Math.floor((newLevel - 5) / 2) + 1
    } else {
      updates.current_rank = 'Bronze'
      updates.rank_level = newLevel
    }

    // Update coding level
    if (newLevel >= 40) {
      updates.coding_level = 'Master'
    } else if (newLevel >= 25) {
      updates.coding_level = 'Expert'
    } else if (newLevel >= 15) {
      updates.coding_level = 'Advanced'
    } else if (newLevel >= 8) {
      updates.coding_level = 'Intermediate'
    } else {
      updates.coding_level = 'Beginner'
    }

    const data = this.updateLocalProgression(userId, updates)

    return {
      ...data,
      leveledUp,
      oldLevel,
      newLevel,
      techPointsGained,
      xpGained: xp
    }
  }

  // Calculate level from total XP (exponential curve)
  calculateLevel(totalXp) {
    // Level 1: 0 XP
    // Level 2: 100 XP
    // Level 3: 250 XP
    // Level 4: 450 XP
    // Each level requires 50 + (level * 50) more XP
    let level = 1
    let xpNeeded = 0
    
    while (totalXp >= xpNeeded) {
      level++
      xpNeeded += 50 + (level * 50)
    }
    
    return level - 1
  }

  // Unlock hero
  async unlockHero(userId, heroId) {
    try {
      const hero = HEROES[heroId]
      if (!hero) throw new Error('Hero not found')

      const progression = await this.getUserProgression(userId)
      const currentLevel = this.calculateLevel(progression.total_xp)

      if (currentLevel < hero.unlockLevel) {
        throw new Error(`Hero requires level ${hero.unlockLevel}`)
      }

      if (progression.unlocked_heroes.includes(heroId)) {
        throw new Error('Hero already unlocked')
      }

      // If no Supabase, use local storage
      if (!this.supabase) {
        const data = this.updateLocalProgression(userId, {
          unlocked_heroes: [...progression.unlocked_heroes, heroId]
        })
        return data
      }

      const { data, error } = await this.supabase
        .from('user_progress')
        .update({
          unlocked_heroes: [...progression.unlocked_heroes, heroId]
        })
        .eq('user_id', userId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error unlocking hero, using local:', error)
      const progression = await this.getUserProgression(userId)
      const data = this.updateLocalProgression(userId, {
        unlocked_heroes: [...progression.unlocked_heroes, heroId]
      })
      return data
    }
  }

  // Select hero
  async selectHero(userId, heroId) {
    try {
      const progression = await this.getUserProgression(userId)

      if (!progression.unlocked_heroes.includes(heroId)) {
        throw new Error('Hero not unlocked')
      }

      // If no Supabase, use local storage
      if (!this.supabase) {
        const data = this.updateLocalProgression(userId, { selected_hero: heroId })
        return data
      }

      const { data, error } = await this.supabase
        .from('user_progress')
        .update({ selected_hero: heroId })
        .eq('user_id', userId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error selecting hero, using local:', error)
      const data = this.updateLocalProgression(userId, { selected_hero: heroId })
      return data
    }
  }

  // Upgrade tech tree node (now uses gold instead of tech points)
  async upgradeTech(userId, techId) {
    try {
      const tech = TECH_TREE[techId]
      if (!tech) throw new Error('Tech not found')

      const progression = await this.getUserProgression(userId)
      const currentLevel = progression.tech_tree[techId] || 0

      if (currentLevel >= tech.maxLevel) {
        throw new Error('Tech already at max level')
      }

      // Check requirements
      for (const reqId of tech.requirements || []) {
        if (!progression.tech_tree[reqId] || progression.tech_tree[reqId] < 1) {
          throw new Error(`Requires ${TECH_TREE[reqId].name}`)
        }
      }

      const cost = tech.costs[currentLevel] || 0
      
      // Get user's gold from user_stats table
      let userGold = 0
      if (this.supabase) {
        try {
          const { data: statsData, error: statsError } = await this.supabase
            .from('user_stats')
            .select('coins')
            .eq('id', userId)
            .single()
          
          if (!statsError && statsData) {
            userGold = parseInt(statsData.coins) || 0
          }
        } catch (err) {
          console.warn('Could not fetch user gold, defaulting to 0:', err.message)
        }
      }
      
      if (userGold < cost) {
        throw new Error(`Not enough gold. Need ${cost}, have ${userGold}`)
      }

      // Apply upgrade
      const newTechTree = { ...(progression.tech_tree || {}), [techId]: currentLevel + 1 }
      const newGold = userGold - cost

      // Always update local extended data (tech_tree)
      this.updateLocalExtendedData(userId, {
        tech_tree: newTechTree
      })

      // Update gold in user_stats table
      if (this.supabase) {
        try {
          const { error: goldUpdateError } = await this.supabase
            .from('user_stats')
            .update({ coins: newGold })
            .eq('id', userId)
          
          if (goldUpdateError) {
            console.warn('Could not update user gold:', goldUpdateError.message)
          } else {
            console.log(`Tech upgrade: Deducted ${cost} gold, new balance: ${newGold}`)
          }
        } catch (err) {
          console.warn('Error updating user gold:', err.message)
        }
      }

      // If no Supabase, just return local data
      if (!this.supabase) {
        const data = this.updateLocalProgression(userId, {
          tech_tree: newTechTree
        })
        return { ...data, coins: newGold }
      }

      // Try to save tech_tree to Supabase
      try {
        const { data: updatedData, error: updateError } = await this.supabase
          .from('user_progress')
          .update({
            tech_tree: newTechTree
          })
          .eq('user_id', userId)
          .select()
          .single()

        if (!updateError && updatedData) {
          console.log(`Tech tree saved to Supabase for user ${userId}`)
          return {
            ...this.mergeWithExtendedData(userId, updatedData),
            tech_tree: newTechTree,
            coins: newGold
          }
        }

        console.warn('Could not save tech tree to Supabase, using local storage:', updateError?.message)
      } catch (saveError) {
        console.warn('Error saving tech tree to Supabase, using local storage:', saveError.message)
      }

      // Fallback: return merged data with local updates
      const currentData = await this.getUserProgression(userId)
      return {
        ...currentData,
        tech_tree: newTechTree,
        coins: newGold
      }
    } catch (error) {
      console.error('Error upgrading tech, using local:', error)
      // Recalculate with local data
      const tech = TECH_TREE[techId]
      const progression = this.getLocalProgression(userId)
      const currentLevel = (progression.tech_tree || {})[techId] || 0
      const cost = tech.costs[currentLevel]
      const newTechTree = { ...(progression.tech_tree || {}), [techId]: currentLevel + 1 }
      const newTechPoints = (progression.available_tech_points || 0) - cost
      
      const data = this.updateLocalProgression(userId, {
        tech_tree: newTechTree,
        available_tech_points: newTechPoints
      })
      return data
    }
  }

  // Get match loadout based on progression
  async getMatchLoadout(userId) {
    try {
      const progression = await this.getUserProgression(userId)
      const hero = HEROES[progression.selected_hero]
      const techTree = progression.tech_tree

      // Calculate bonuses from tech tree
      const bonuses = {
        startingGold: 500, // Base starting gold
        goldPerSecond: 0,
        troopHpMultiplier: 1.0,
        troopDamageMultiplier: 1.0,
        towerRangeMultiplier: 1.0,
        towerFireRateMultiplier: 1.0,
        baseHpMultiplier: 1.0,
        abilityCooldownReduction: 0
      }

      // Apply tech tree effects
      Object.keys(techTree).forEach(techId => {
        const level = techTree[techId]
        if (level > 0 && TECH_TREE[techId]) {
          const effect = TECH_TREE[techId].effects[level - 1]
          
          if (effect.startingGold) bonuses.startingGold += effect.startingGold
          if (effect.goldPerSecond) bonuses.goldPerSecond += effect.goldPerSecond
          if (effect.troopHpBonus) bonuses.troopHpMultiplier += effect.troopHpBonus
          if (effect.troopDamageBonus) bonuses.troopDamageMultiplier += effect.troopDamageBonus
          if (effect.towerRangeBonus) bonuses.towerRangeMultiplier += effect.towerRangeBonus
          if (effect.towerFireRateBonus) bonuses.towerFireRateMultiplier += effect.towerFireRateBonus
          if (effect.baseHpBonus) bonuses.baseHpMultiplier += effect.baseHpBonus
          if (effect.abilityCooldownReduction) bonuses.abilityCooldownReduction += effect.abilityCooldownReduction
        }
      })

      // Get unlocked units
      const unlockedUnits = []
      Object.keys(techTree).forEach(techId => {
        const level = techTree[techId]
        if (level > 0 && TECH_TREE[techId]) {
          const effect = TECH_TREE[techId].effects[level - 1]
          if (effect.unlockedUnits) {
            unlockedUnits.push(...effect.unlockedUnits)
          }
        }
      })

      // Get available units and towers
      const availableUnits = Object.values(UNIT_TYPES).filter(unit => 
        unlockedUnits.includes(unit.id)
      )

      const currentLevel = this.calculateLevel(progression.total_xp)
      const availableTowers = Object.values(TOWER_TYPES).filter(tower =>
        currentLevel >= tower.unlockLevel
      )

      return {
        hero,
        bonuses,
        availableUnits,
        availableTowers,
        level: currentLevel,
        rank: progression.current_rank,
        rankLevel: progression.rank_level
      }
    } catch (error) {
      console.error('Error getting match loadout:', error)
      throw error
    }
  }

  // Update streak
  async updateStreak(userId) {
    try {
      const progression = await this.getUserProgression(userId)
      const lastActivity = new Date(progression.last_activity_date)
      const today = new Date()
      
      // Check if last activity was yesterday
      const diffTime = Math.abs(today - lastActivity)
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

      let newStreak = progression.current_streak
      if (diffDays === 0) {
        // Same day, no change
        return progression
      } else if (diffDays === 1) {
        // Consecutive day, increment
        newStreak++
      } else {
        // Streak broken
        newStreak = 1
      }

      const longestStreak = Math.max(progression.longest_streak, newStreak)

      // If no Supabase, use local storage
      if (!this.supabase) {
        const data = this.updateLocalProgression(userId, {
          current_streak: newStreak,
          longest_streak: longestStreak,
          last_activity_date: today.toISOString()
        })
        return data
      }

      const { data, error } = await this.supabase
        .from('user_progress')
        .update({
          current_streak: newStreak,
          longest_streak: longestStreak,
          last_activity_date: today.toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating streak, using local:', error)
      const progression = await this.getUserProgression(userId)
      const data = this.updateLocalProgression(userId, {
        current_streak: progression.current_streak + 1,
        longest_streak: Math.max(progression.longest_streak, progression.current_streak + 1),
        last_activity_date: new Date().toISOString()
      })
      return data
    }
  }

  // Get all heroes with unlock status
  async getHeroesWithStatus(userId) {
    try {
      const progression = await this.getUserProgression(userId)
      const currentLevel = this.calculateLevel(progression.total_xp || 0)
      const unlockedHeroes = progression.unlocked_heroes || ['python', 'javascript']
      const selectedHero = progression.selected_hero || 'python'

      return Object.values(HEROES).map(hero => ({
        ...hero,
        unlocked: unlockedHeroes.includes(hero.id),
        selected: selectedHero === hero.id,
        canUnlock: currentLevel >= hero.unlockLevel && !unlockedHeroes.includes(hero.id)
      }))
    } catch (error) {
      console.error('Error getting heroes with status:', error)
      throw error
    }
  }

  // Get tech tree with status (now uses gold instead of tech points)
  async getTechTreeWithStatus(userId) {
    try {
      const progression = await this.getUserProgression(userId)
      const techTree = progression.tech_tree || {}
      
      // Get user's gold from user_stats table
      let userGold = 0
      if (this.supabase) {
        try {
          const { data: statsData, error: statsError } = await this.supabase
            .from('user_stats')
            .select('coins')
            .eq('id', userId)
            .single()
          
          if (!statsError && statsData) {
            userGold = parseInt(statsData.coins) || 0
          }
        } catch (err) {
          console.warn('Could not fetch user gold for tech tree:', err.message)
        }
      }

      return Object.values(TECH_TREE).map(tech => {
        const currentLevel = techTree[tech.id] || 0
        const cost = tech.costs[currentLevel] || 0
        const canUpgrade = currentLevel < tech.maxLevel && userGold >= cost

        // Check requirements
        let requirementsMet = true
        for (const reqId of tech.requirements || []) {
          if (!techTree[reqId] || techTree[reqId] < 1) {
            requirementsMet = false
            break
          }
        }

        return {
          ...tech,
          currentLevel,
          canUpgrade: canUpgrade && requirementsMet,
          requirementsMet,
          nextCost: tech.costs[currentLevel] || null,
          nextEffect: tech.effects[currentLevel] || null,
          userGold: userGold // Include user's gold in response
        }
      })
    } catch (error) {
      console.error('Error getting tech tree with status:', error)
      throw error
    }
  }
}

export default new ProgressionService()

