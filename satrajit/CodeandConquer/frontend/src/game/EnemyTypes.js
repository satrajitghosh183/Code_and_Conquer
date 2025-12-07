// Enemy Types - Various enemy configurations
// Integrated and expanded from dabbott/towerdefense

export const ENEMY_TYPES = {
  // Basic enemy
  spider: {
    name: 'Spider',
    model: 'spider',
    speed: 8,
    health: 50,
    lives: 1,
    goldReward: 5,
    xpReward: 2,
    color: 0x00ff00,
    scale: 1.0,
    description: 'Basic ground unit'
  },
  
  // Fast enemy
  scout: {
    name: 'Scout',
    model: 'spider',
    speed: 15,
    health: 30,
    lives: 1,
    goldReward: 8,
    xpReward: 3,
    color: 0x00ffff,
    scale: 0.8,
    description: 'Fast but fragile'
  },
  
  // Tanky enemy
  brute: {
    name: 'Brute',
    model: 'spider',
    speed: 4,
    health: 200,
    lives: 2,
    goldReward: 15,
    xpReward: 8,
    color: 0xff6600,
    scale: 1.5,
    description: 'Slow but very tough'
  },
  
  // Swarm enemy
  swarm: {
    name: 'Swarm',
    model: 'spider',
    speed: 12,
    health: 15,
    lives: 1,
    goldReward: 2,
    xpReward: 1,
    color: 0xffff00,
    scale: 0.5,
    description: 'Comes in large numbers'
  },
  
  // Armored enemy - takes less damage
  armored: {
    name: 'Armored',
    model: 'spider',
    speed: 6,
    health: 150,
    armor: 0.3, // 30% damage reduction
    lives: 2,
    goldReward: 20,
    xpReward: 10,
    color: 0x888888,
    scale: 1.2,
    description: 'Resistant to damage'
  },
  
  // Boss enemy
  boss: {
    name: 'Boss',
    model: 'spider',
    speed: 3,
    health: 1000,
    armor: 0.2,
    lives: 10,
    goldReward: 100,
    xpReward: 50,
    color: 0xff0000,
    scale: 2.5,
    description: 'Powerful boss enemy',
    isBoss: true
  },
  
  // Healer enemy - heals nearby enemies
  healer: {
    name: 'Healer',
    model: 'spider',
    speed: 7,
    health: 60,
    lives: 1,
    goldReward: 12,
    xpReward: 6,
    color: 0x00ff88,
    scale: 0.9,
    healRadius: 10,
    healAmount: 5,
    description: 'Heals nearby enemies'
  },
  
  // Splitter - splits into smaller enemies when killed
  splitter: {
    name: 'Splitter',
    model: 'spider',
    speed: 5,
    health: 80,
    lives: 1,
    goldReward: 10,
    xpReward: 5,
    color: 0xaa00ff,
    scale: 1.3,
    splitCount: 2,
    splitType: 'swarm',
    description: 'Splits when killed'
  }
}

// Wave generation templates
export const WAVE_TEMPLATES = {
  easy: [
    { type: 'spider', count: 5 },
  ],
  medium: [
    { type: 'spider', count: 3 },
    { type: 'scout', count: 2 },
  ],
  hard: [
    { type: 'spider', count: 4 },
    { type: 'brute', count: 1 },
    { type: 'scout', count: 3 },
  ],
  swarm: [
    { type: 'swarm', count: 15 },
  ],
  boss: [
    { type: 'spider', count: 3 },
    { type: 'armored', count: 2 },
    { type: 'boss', count: 1 },
  ],
  mixed: [
    { type: 'spider', count: 2 },
    { type: 'scout', count: 2 },
    { type: 'brute', count: 1 },
    { type: 'healer', count: 1 },
  ]
}

// Enemy introduction schedule - when each type first appears
const ENEMY_INTRODUCTIONS = {
  spider: 1,      // Always available
  scout: 2,       // Introduced at wave 2
  brute: 4,       // Introduced at wave 4
  swarm: 6,       // Introduced at wave 6
  armored: 8,     // Introduced at wave 8
  healer: 10,     // Introduced at wave 10
  splitter: 12,   // Introduced at wave 12
  boss: 5         // Boss waves every 5 waves
}

// Calculate wave difficulty tier
function getWaveTier(waveNumber) {
  if (waveNumber <= 5) return 'early'
  if (waveNumber <= 15) return 'mid'
  if (waveNumber <= 30) return 'late'
  return 'endgame'
}

// Get available enemy types for a wave
function getAvailableEnemyTypes(waveNumber) {
  const available = []
  for (const [type, introWave] of Object.entries(ENEMY_INTRODUCTIONS)) {
    if (type === 'boss') continue // Boss handled separately
    if (waveNumber >= introWave) {
      available.push(type)
    }
  }
  return available.length > 0 ? available : ['spider'] // Fallback
}

// Calculate enemy count for a wave
function calculateEnemyCount(waveNumber, tier) {
  // Base count with exponential scaling that plateaus
  let baseCount
  switch (tier) {
    case 'early':
      baseCount = 5 + waveNumber * 1.5
      break
    case 'mid':
      baseCount = 12 + (waveNumber - 5) * 2
      break
    case 'late':
      baseCount = 32 + (waveNumber - 15) * 1.5
      break
    case 'endgame':
      baseCount = 55 + (waveNumber - 30) * 1.2
      break
    default:
      baseCount = 5 + waveNumber * 1.5
  }
  return Math.floor(baseCount)
}

// Generate a wave based on wave number
export function generateWave(waveNumber) {
  const enemies = []
  const tier = getWaveTier(waveNumber)
  const availableTypes = getAvailableEnemyTypes(waveNumber)
  const totalEnemyCount = calculateEnemyCount(waveNumber, tier)
  
  // Special wave types
  const isBossWave = waveNumber % 5 === 0 && waveNumber >= 5
  const isSwarmWave = waveNumber % 4 === 0 && waveNumber >= 4
  const isEliteWave = waveNumber % 7 === 0 && waveNumber >= 7
  const isMixedWave = waveNumber % 3 === 0 && waveNumber >= 3
  
  if (isBossWave) {
    // Boss wave - mix of strong enemies with boss
    const bossCount = Math.min(1 + Math.floor(waveNumber / 15), 3) // Cap at 3 bosses
    const supportCount = Math.floor(totalEnemyCount * 0.3)
    
    enemies.push({ type: 'boss', count: bossCount })
    
    // Mix of armored, brute, and healer
    if (availableTypes.includes('armored')) {
      enemies.push({ type: 'armored', count: Math.floor(supportCount * 0.4) })
    }
    if (availableTypes.includes('brute')) {
      enemies.push({ type: 'brute', count: Math.floor(supportCount * 0.3) })
    }
    if (availableTypes.includes('healer')) {
      enemies.push({ type: 'healer', count: Math.floor(supportCount * 0.2) })
    }
    if (availableTypes.includes('splitter')) {
      enemies.push({ type: 'splitter', count: Math.floor(supportCount * 0.1) })
    }
    
    // Fill remaining with mixed basic enemies
    const remaining = totalEnemyCount - bossCount - supportCount
    distributeEnemies(enemies, availableTypes, remaining, ['boss'])
    
  } else if (isSwarmWave) {
    // Swarm wave - lots of fast, weak enemies
    const swarmRatio = 0.5 // 50% swarm type enemies
    const fastRatio = 0.3  // 30% fast enemies
    
    if (availableTypes.includes('swarm')) {
      enemies.push({ type: 'swarm', count: Math.floor(totalEnemyCount * swarmRatio) })
    }
    if (availableTypes.includes('scout')) {
      enemies.push({ type: 'scout', count: Math.floor(totalEnemyCount * fastRatio) })
    }
    
    // Fill with spiders and other fast types
    const remaining = totalEnemyCount - 
      (enemies.find(e => e.type === 'swarm')?.count || 0) -
      (enemies.find(e => e.type === 'scout')?.count || 0)
    distributeEnemies(enemies, availableTypes, remaining, ['swarm', 'scout'])
    
  } else if (isEliteWave) {
    // Elite wave - strong, tanky enemies
    const eliteTypes = ['armored', 'brute', 'healer'].filter(t => availableTypes.includes(t))
    
    if (eliteTypes.length > 0) {
      const eliteCount = Math.floor(totalEnemyCount * 0.7)
      const perType = Math.floor(eliteCount / eliteTypes.length)
      
      eliteTypes.forEach(type => {
        enemies.push({ type, count: perType })
      })
    }
    
    // Fill with other types
    const remaining = totalEnemyCount - 
      enemies.reduce((sum, e) => sum + e.count, 0)
    distributeEnemies(enemies, availableTypes, remaining, eliteTypes)
    
  } else if (isMixedWave) {
    // Mixed wave - balanced variety
    const typeCount = Math.min(availableTypes.length, 4) // Use up to 4 different types
    const typesToUse = availableTypes.slice(0, typeCount)
    
    distributeEnemies(enemies, typesToUse, totalEnemyCount, [])
    
  } else {
    // Normal wave - progressive mixing
    // Always include some spiders
    const spiderCount = Math.floor(totalEnemyCount * 0.4)
    enemies.push({ type: 'spider', count: spiderCount })
    
    // Add other types based on availability and wave number
    const remaining = totalEnemyCount - spiderCount
    const otherTypes = availableTypes.filter(t => t !== 'spider')
    
    if (otherTypes.length > 0) {
      distributeEnemies(enemies, otherTypes, remaining, ['spider'])
    }
  }
  
  // Remove zero-count entries
  const filteredEnemies = enemies.filter(e => e.count > 0)
  
  // Improved difficulty scaling with diminishing returns
  const healthMultiplier = calculateHealthMultiplier(waveNumber)
  const speedMultiplier = calculateSpeedMultiplier(waveNumber)
  const armorMultiplier = calculateArmorMultiplier(waveNumber)
  
  return {
    enemies: filteredEnemies,
    healthMultiplier,
    speedMultiplier,
    armorMultiplier,
    waveNumber,
    tier
  }
}

// Distribute enemy count across available types
function distributeEnemies(enemies, availableTypes, totalCount, excludeTypes = []) {
  if (totalCount <= 0 || availableTypes.length === 0) return
  
  const typesToUse = availableTypes.filter(t => !excludeTypes.includes(t))
  if (typesToUse.length === 0) return
  
  // Weight distribution - earlier types get more, later types get less
  const weights = typesToUse.map((type, index) => {
    const introWave = ENEMY_INTRODUCTIONS[type] || 1
    return Math.max(1, 10 - introWave) // Higher weight for earlier types
  })
  const totalWeight = weights.reduce((sum, w) => sum + w, 0)
  
  let remaining = totalCount
  typesToUse.forEach((type, index) => {
    if (remaining <= 0) return
    
    const weight = weights[index]
    const count = Math.floor((weight / totalWeight) * totalCount)
    const actualCount = Math.min(count, remaining)
    
    if (actualCount > 0) {
      const existing = enemies.find(e => e.type === type)
      if (existing) {
        existing.count += actualCount
      } else {
        enemies.push({ type, count: actualCount })
      }
      remaining -= actualCount
    }
  })
  
  // Distribute any remaining count
  if (remaining > 0 && typesToUse.length > 0) {
    const perType = Math.floor(remaining / typesToUse.length)
    typesToUse.forEach(type => {
      const existing = enemies.find(e => e.type === type)
      if (existing) {
        existing.count += perType
      } else {
        enemies.push({ type, count: perType })
      }
    })
  }
}

// Improved health multiplier with diminishing returns
function calculateHealthMultiplier(waveNumber) {
  // Exponential growth that plateaus: 1 + (wave-1)^1.3 * 0.15
  // This gives: Wave 1=1.0x, Wave 5=1.8x, Wave 10=2.9x, Wave 20=4.8x, Wave 30=6.5x
  const base = Math.pow(waveNumber - 1, 1.3) * 0.15
  return 1 + base
}

// Improved speed multiplier - slower growth
function calculateSpeedMultiplier(waveNumber) {
  // Logarithmic growth: 1 + log(wave) * 0.1
  // This gives: Wave 1=1.0x, Wave 5=1.16x, Wave 10=1.23x, Wave 20=1.30x, Wave 30=1.35x
  const base = Math.log(waveNumber) * 0.1
  return 1 + base
}

// New armor multiplier for later waves
function calculateArmorMultiplier(waveNumber) {
  // Armor increases slightly for enemies that already have armor
  // Only applies to armored and boss types
  if (waveNumber < 10) return 1.0
  // After wave 10, armor effectiveness increases slightly
  return 1 + (waveNumber - 10) * 0.02 // +2% per wave after 10, capped in enemy creation
}

