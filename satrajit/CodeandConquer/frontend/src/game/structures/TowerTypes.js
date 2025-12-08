export const TOWER_TYPES = {
  // Basic fast-firing tower
  gattling: {
    name: 'Gatling Tower',
    modelKey: 'combat_turret', // Using new combat turret model
    cost: 50,
    damage: 6,
    range: 18,
    cooldown: 2000, // Increased from 1000
    fireRate: 0.5, // Decreased from 1.0
    health: 250,
    description: 'Fast-firing basic tower',
    projectileSpeed: 25,
    attackType: 'gattling',
    upgrades: [
      { damage: 8, range: 20, cooldown: 1800, cost: 30 },
      { damage: 12, range: 22, cooldown: 1600, cost: 50 }
    ]
  },
  
  // Missile tower with splash damage
  missile: {
    name: 'Missile Tower',
    modelKey: 'aa_turret', // Using new AA turret model
    cost: 150,
    damage: 70,
    range: 30,
    cooldown: 6000, // Increased from 4000
    fireRate: 0.17, // Decreased from 0.25
    health: 400,
    description: 'Slow missile launcher with splash',
    projectileSpeed: 12,
    splashRadius: 5,
    attackType: 'missile',
    upgrades: [
      { damage: 100, range: 32, cooldown: 5500, splashRadius: 7, cost: 100 },
      { damage: 150, range: 35, cooldown: 5000, splashRadius: 10, cost: 150 }
    ]
  },
  
  // Laser tower with beam attack
  laser: {
    name: 'Laser Tower',
    modelKey: 'medieval_towers',
    cost: 200,
    damage: 200,
    range: 25,
    cooldown: 5000, // Increased from 3000
    beamDuration: 500,
    fireRate: 0.2, // Decreased from 0.33
    health: 300,
    description: 'Sustained laser beam',
    attackType: 'laser',
    upgrades: [
      { damage: 300, range: 28, cooldown: 4500, beamDuration: 600, cost: 150 },
      { damage: 450, range: 30, cooldown: 4000, beamDuration: 800, cost: 200 }
    ]
  },
  
  // Sniper - long range precision
  sniper: {
    name: 'Sniper Tower',
    modelKey: 'gun_tower', // Using new gun tower model
    cost: 120,
    damage: 100,
    range: 50,
    cooldown: 5000, // Increased from 3000
    fireRate: 0.2, // Decreased from 0.33
    health: 200,
    description: 'Long range precision',
    projectileSpeed: 40,
    attackType: 'sniper',
    upgrades: [
      { damage: 150, range: 55, cooldown: 4500, armorPiercing: 0.2, cost: 80 },
      { damage: 220, range: 60, cooldown: 4000, armorPiercing: 0.5, cost: 120 }
    ]
  },
  
  // Frost tower - slows enemies
  frost: {
    name: 'Frost Tower',
    modelKey: 'watch_tower',
    cost: 100,
    damage: 10,
    range: 20,
    cooldown: 3000, // Increased from 1500
    fireRate: 0.33, // Decreased from 0.66
    health: 250,
    slowAmount: 0.3,
    slowDuration: 3000, // Increased freeze duration
    description: 'Freezes enemies',
    attackType: 'frost',
    upgrades: [
      { damage: 15, range: 22, cooldown: 2500, slowAmount: 0.4, slowDuration: 3500, aoeRadius: 5, cost: 75 },
      { damage: 25, range: 25, cooldown: 2000, slowAmount: 0.5, slowDuration: 4000, aoeRadius: 8, cost: 100 }
    ]
  },
  
  // Tesla tower - chain lightning
  tesla: {
    name: 'Tesla Tower',
    modelKey: 'medieval_towers',
    cost: 180,
    damage: 40,
    range: 20,
    cooldown: 4000, // Increased from 2500
    fireRate: 0.25, // Decreased from 0.4
    health: 350,
    chainCount: 2,
    description: 'Chain lightning',
    attackType: 'tesla',
    upgrades: [
      { damage: 60, range: 22, cooldown: 3500, chainCount: 3, cost: 120 },
      { damage: 85, range: 25, cooldown: 3000, chainCount: 5, cost: 180 }
    ]
  },
  
  // Legacy basic tower for compatibility
  basic: {
    name: 'Watch Tower',
    modelKey: 'watch_tower',
    cost: 100,
    damage: 25,
    range: 12,
    fireRate: 1.0,
    health: 300,
    description: 'Basic defense tower',
    projectileSpeed: 20,
    attackType: 'gattling'
  },
  
  // Legacy cannon for compatibility
  cannon: {
    name: 'Heavy Cannon',
    modelKey: 'heavy_cannon',
    cost: 200,
    damage: 100,
    range: 20,
    fireRate: 0.5,
    health: 400,
    description: 'Slow but powerful',
    projectileSpeed: 15,
    splashRadius: 3,
    attackType: 'missile'
  },
  
  // Legacy splash for compatibility
  splash: {
    name: 'Medieval Tower',
    modelKey: 'medieval_towers',
    cost: 180,
    damage: 40,
    range: 10,
    fireRate: 1.2,
    health: 350,
    splashRadius: 5,
    description: 'Area damage',
    projectileSpeed: 18,
    attackType: 'missile'
  }
}

export const WALL_TYPES = {
  maze: {
    name: 'Maze Wall',
    modelKey: 'castle_walls',
    cost: 50,
    health: Infinity, // Indestructible
    description: 'Guides enemy paths'
  },
  blocking: {
    name: 'Blocking Wall',
    modelKey: 'castle_walls',
    cost: 100,
    health: 500,
    description: 'Blocks enemies, can be destroyed'
  }
}

export const SPAWNER_TYPES = {
  barracks: {
    name: 'Barracks',
    modelKey: 'mortar',
    cost: 250,
    health: 600,
    spawnRate: 10, // seconds
    maxUnits: 3,
    unitType: 'troop',
    description: 'Spawns defensive units'
  }
}

