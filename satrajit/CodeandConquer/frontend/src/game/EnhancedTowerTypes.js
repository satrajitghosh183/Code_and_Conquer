// Enhanced Tower Types - Multiple tower varieties with upgrades
// Integrated from dabbott/towerdefense with expansions

export const ENHANCED_TOWER_TYPES = {
  // Gatling Tower - Fast fire rate
  gattling: {
    name: 'Gatling Tower',
    levels: [
      {
        level: 1,
        damage: 6,
        range: 18,
        cooldown: 1000, // milliseconds
        cost: 50,
        upgradeCost: 30,
        sellValue: 25,
        description: 'Fast-firing basic tower',
        color: 0xaa4400
      },
      {
        level: 2,
        damage: 8,
        range: 20,
        cooldown: 900,
        upgradeCost: 50,
        sellValue: 40,
        description: 'Improved fire rate and range',
        color: 0xcc5500
      },
      {
        level: 3,
        damage: 12,
        range: 22,
        cooldown: 800,
        sellValue: 60,
        description: 'Maximum gatling power',
        color: 0xff6600
      }
    ],
    attackType: 'gattling',
    soundEffect: 'gattling.ogg',
    modelKey: 'gattling'
  },
  
  // Missile Tower - Slow but powerful, splash damage
  missile: {
    name: 'Missile Tower',
    levels: [
      {
        level: 1,
        damage: 70,
        range: 30,
        cooldown: 4000,
        cost: 150,
        upgradeCost: 100,
        sellValue: 75,
        splashRadius: 5,
        description: 'Slow missile launcher with splash',
        color: 0x666600
      },
      {
        level: 2,
        damage: 100,
        range: 32,
        cooldown: 3500,
        splashRadius: 7,
        sellValue: 125,
        description: 'Larger splash radius',
        color: 0x888800
      },
      {
        level: 3,
        damage: 150,
        range: 35,
        cooldown: 3000,
        splashRadius: 10,
        sellValue: 175,
        description: 'Devastating explosions',
        color: 0xaaaa00
      }
    ],
    attackType: 'missile',
    soundEffect: 'missile.ogg',
    modelKey: 'missile'
  },
  
  // Laser Tower - Continuous beam damage
  laser: {
    name: 'Laser Tower',
    levels: [
      {
        level: 1,
        damage: 200, // Total damage over beam duration
        range: 25,
        cooldown: 3000,
        beamDuration: 500, // milliseconds
        cost: 200,
        upgradeCost: 150,
        sellValue: 100,
        description: 'Sustained laser beam',
        color: 0x0066ff
      },
      {
        level: 2,
        damage: 300,
        range: 28,
        cooldown: 2500,
        beamDuration: 600,
        sellValue: 175,
        description: 'Extended beam duration',
        color: 0x0088ff
      },
      {
        level: 3,
        damage: 450,
        range: 30,
        cooldown: 2000,
        beamDuration: 800,
        sellValue: 250,
        description: 'Devastating laser',
        color: 0x00aaff
      }
    ],
    attackType: 'laser',
    soundEffect: 'laser.ogg',
    modelKey: 'laser'
  },
  
  // Sniper Tower - Very long range, high single-target damage
  sniper: {
    name: 'Sniper Tower',
    levels: [
      {
        level: 1,
        damage: 100,
        range: 50,
        cooldown: 3000,
        cost: 120,
        upgradeCost: 80,
        sellValue: 60,
        description: 'Long range precision',
        color: 0x880088
      },
      {
        level: 2,
        damage: 150,
        range: 55,
        cooldown: 2700,
        sellValue: 100,
        armorPiercing: 0.2, // Ignores 20% armor
        description: 'Armor piercing rounds',
        color: 0xaa00aa
      },
      {
        level: 3,
        damage: 220,
        range: 60,
        cooldown: 2400,
        armorPiercing: 0.5,
        sellValue: 140,
        description: 'Devastating precision',
        color: 0xcc00cc
      }
    ],
    attackType: 'sniper',
    soundEffect: 'gattling.ogg',
    modelKey: 'kickelhahn'
  },
  
  // Frost Tower - Slows enemies
  frost: {
    name: 'Frost Tower',
    levels: [
      {
        level: 1,
        damage: 10,
        range: 20,
        cooldown: 1500,
        slowAmount: 0.3, // 30% slow
        slowDuration: 2000,
        cost: 100,
        upgradeCost: 75,
        sellValue: 50,
        description: 'Slows enemies',
        color: 0x66ccff
      },
      {
        level: 2,
        damage: 15,
        range: 22,
        cooldown: 1300,
        slowAmount: 0.4,
        slowDuration: 2500,
        aoeRadius: 5,
        sellValue: 85,
        description: 'Area slow effect',
        color: 0x88ddff
      },
      {
        level: 3,
        damage: 25,
        range: 25,
        cooldown: 1000,
        slowAmount: 0.5,
        slowDuration: 3000,
        aoeRadius: 8,
        freezeChance: 0.1,
        sellValue: 125,
        description: 'Chance to freeze',
        color: 0xaaeeff
      }
    ],
    attackType: 'frost',
    soundEffect: 'laser.ogg',
    modelKey: 'watch_tower'
  },
  
  // Fire Tower - Damage over time
  fire: {
    name: 'Fire Tower',
    levels: [
      {
        level: 1,
        damage: 20,
        range: 18,
        cooldown: 2000,
        burnDamage: 5, // per tick
        burnDuration: 3000,
        burnTicks: 6,
        cost: 100,
        upgradeCost: 70,
        sellValue: 50,
        description: 'Ignites enemies',
        color: 0xff3300
      },
      {
        level: 2,
        damage: 30,
        range: 20,
        cooldown: 1800,
        burnDamage: 8,
        burnDuration: 4000,
        burnTicks: 8,
        sellValue: 85,
        description: 'Hotter flames',
        color: 0xff6600
      },
      {
        level: 3,
        damage: 45,
        range: 22,
        cooldown: 1500,
        burnDamage: 12,
        burnDuration: 5000,
        burnTicks: 10,
        spreadChance: 0.2,
        sellValue: 120,
        description: 'Spreading fire',
        color: 0xff9900
      }
    ],
    attackType: 'fire',
    soundEffect: 'explosion.ogg',
    modelKey: 'heavy_cannon'
  },
  
  // Tesla Tower - Chain lightning
  tesla: {
    name: 'Tesla Tower',
    levels: [
      {
        level: 1,
        damage: 40,
        range: 20,
        cooldown: 2500,
        chainCount: 2,
        chainDamageReduction: 0.2,
        cost: 180,
        upgradeCost: 120,
        sellValue: 90,
        description: 'Chain lightning',
        color: 0xffff00
      },
      {
        level: 2,
        damage: 60,
        range: 22,
        cooldown: 2200,
        chainCount: 3,
        chainDamageReduction: 0.15,
        sellValue: 150,
        description: 'More chain targets',
        color: 0xffff66
      },
      {
        level: 3,
        damage: 85,
        range: 25,
        cooldown: 1800,
        chainCount: 5,
        chainDamageReduction: 0.1,
        stunChance: 0.15,
        sellValue: 210,
        description: 'Stunning chains',
        color: 0xffffaa
      }
    ],
    attackType: 'tesla',
    soundEffect: 'laser.ogg',
    modelKey: 'medieval_towers'
  }
}

// Get tower stats at a specific level
export function getTowerStats(towerType, level = 1) {
  const tower = ENHANCED_TOWER_TYPES[towerType]
  if (!tower) return null
  
  const levelIndex = Math.min(level - 1, tower.levels.length - 1)
  return {
    ...tower.levels[levelIndex],
    attackType: tower.attackType,
    soundEffect: tower.soundEffect,
    modelKey: tower.modelKey,
    maxLevel: tower.levels.length
  }
}

// Get upgrade cost
export function getUpgradeCost(towerType, currentLevel) {
  const tower = ENHANCED_TOWER_TYPES[towerType]
  if (!tower) return null
  
  const levelIndex = Math.min(currentLevel - 1, tower.levels.length - 1)
  return tower.levels[levelIndex].upgradeCost
}

// Check if tower can be upgraded
export function canUpgrade(towerType, currentLevel) {
  const tower = ENHANCED_TOWER_TYPES[towerType]
  if (!tower) return false
  
  return currentLevel < tower.levels.length
}

