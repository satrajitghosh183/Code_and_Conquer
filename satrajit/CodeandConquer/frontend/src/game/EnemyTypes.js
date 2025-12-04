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

// Generate a wave based on wave number
export function generateWave(waveNumber) {
  const enemies = []
  
  // Base enemy count scales with wave
  const baseCount = Math.floor(3 + waveNumber * 1.5)
  
  // Every 5 waves is a boss wave
  if (waveNumber % 5 === 0 && waveNumber > 0) {
    // Boss wave
    enemies.push({ type: 'boss', count: 1 })
    enemies.push({ type: 'armored', count: Math.floor(waveNumber / 5) })
  } else if (waveNumber % 3 === 0) {
    // Swarm wave
    enemies.push({ type: 'swarm', count: baseCount * 3 })
    enemies.push({ type: 'scout', count: Math.floor(baseCount / 2) })
  } else {
    // Normal wave with variety
    enemies.push({ type: 'spider', count: baseCount })
    
    if (waveNumber >= 3) {
      enemies.push({ type: 'scout', count: Math.floor(baseCount / 2) })
    }
    if (waveNumber >= 5) {
      enemies.push({ type: 'brute', count: Math.floor(waveNumber / 5) })
    }
    if (waveNumber >= 7) {
      enemies.push({ type: 'armored', count: Math.floor(waveNumber / 7) })
    }
    if (waveNumber >= 10) {
      enemies.push({ type: 'healer', count: Math.floor(waveNumber / 10) })
    }
  }
  
  // Scale health with wave number
  const healthMultiplier = 1 + (waveNumber - 1) * 0.15
  
  return {
    enemies,
    healthMultiplier,
    waveNumber
  }
}

