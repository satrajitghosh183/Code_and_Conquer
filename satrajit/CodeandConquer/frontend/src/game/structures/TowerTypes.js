export const TOWER_TYPES = {
  // Gatling Tower - Fast-firing basic tower
  gattling: {
    name: 'Gatling Tower',
    modelKey: 'gatling_tower',  // → gun_tower.glb
    cost: 50,
    damage: 6,
    range: 18,
    cooldown: 1000,
    fireRate: 1.0,
    health: 250,
    description: 'Fast-firing basic tower',
    projectileSpeed: 25,
    attackType: 'bullet',
    upgrades: [
      { damage: 8, range: 20, cooldown: 900, cost: 30 },
      { damage: 12, range: 22, cooldown: 800, cost: 50 }
    ]
  },
  
  // Missile Tower - Splash damage
  missile: {
    name: 'Missile Tower',
    modelKey: 'missile_tower',  // → aa_turret.glb
    cost: 150,
    damage: 70,
    range: 30,
    cooldown: 4000,
    fireRate: 0.25,
    health: 400,
    description: 'Slow missile launcher with splash',
    projectileSpeed: 12,
    splashRadius: 5,
    attackType: 'missile',
    upgrades: [
      { damage: 100, range: 32, cooldown: 3500, splashRadius: 7, cost: 100 },
      { damage: 150, range: 35, cooldown: 3000, splashRadius: 10, cost: 150 }
    ]
  },
  
  // Laser Tower - Sustained beam attack
  laser: {
    name: 'Laser Tower',
    modelKey: 'laser_tower',  // → hoth_defense_turret.glb
    cost: 200,
    damage: 200,
    range: 25,
    cooldown: 3000,
    beamDuration: 500,
    fireRate: 0.33,
    health: 300,
    description: 'Sustained laser beam',
    attackType: 'laser',
    upgrades: [
      { damage: 300, range: 28, cooldown: 2500, beamDuration: 600, cost: 150 },
      { damage: 450, range: 30, cooldown: 2000, beamDuration: 800, cost: 200 }
    ]
  },
  
  // Sniper Tower - Long range precision
  sniper: {
    name: 'Sniper Tower',
    modelKey: 'sniper_tower',  // → combat_turret.glb
    cost: 120,
    damage: 100,
    range: 50,
    cooldown: 3000,
    fireRate: 0.33,
    health: 200,
    description: 'Long range precision',
    projectileSpeed: 40,
    attackType: 'sniper',
    upgrades: [
      { damage: 150, range: 55, cooldown: 2700, armorPiercing: 0.2, cost: 80 },
      { damage: 220, range: 60, cooldown: 2400, armorPiercing: 0.5, cost: 120 }
    ]
  },
  
  // Frost Tower - Slows enemies with frost aura
  frost: {
    name: 'Frost Tower',
    modelKey: 'frost_tower',  // → gun_tower.glb variant
    cost: 100,
    damage: 10,
    range: 20,
    cooldown: 1500,
    fireRate: 0.66,
    health: 250,
    slowAmount: 0.3,
    slowDuration: 2000,
    description: 'Slows enemies with icy blast',
    attackType: 'frost',
    upgrades: [
      { damage: 15, range: 22, cooldown: 1300, slowAmount: 0.4, aoeRadius: 5, cost: 75 },
      { damage: 25, range: 25, cooldown: 1000, slowAmount: 0.5, aoeRadius: 8, cost: 100 }
    ]
  },
  
  // Fire Tower - DOT with fire ring aura
  fire: {
    name: 'Fire Tower',
    modelKey: 'fire_tower',  // → aa_turret.glb variant
    cost: 100,
    damage: 20,
    range: 18,
    cooldown: 2000,
    fireRate: 0.5,
    health: 300,
    burnDamage: 5,
    burnDuration: 3000,
    hasFireRing: true,  // Enables fire ring visual effect
    description: 'Ignites enemies with ring of fire',
    attackType: 'fire',
    upgrades: [
      { damage: 30, range: 20, cooldown: 1800, burnDamage: 8, cost: 70 },
      { damage: 45, range: 22, cooldown: 1500, burnDamage: 12, cost: 100 }
    ]
  },
  
  // Tesla Tower - Chain lightning
  tesla: {
    name: 'Tesla Tower',
    modelKey: 'tesla_tower',  // → spaceship_clst_500.glb
    cost: 180,
    damage: 40,
    range: 20,
    cooldown: 2500,
    fireRate: 0.4,
    health: 350,
    chainCount: 2,
    description: 'Chain lightning attack',
    attackType: 'tesla',
    upgrades: [
      { damage: 60, range: 22, cooldown: 2200, chainCount: 3, cost: 120 },
      { damage: 85, range: 25, cooldown: 1800, chainCount: 5, cost: 180 }
    ]
  },
  
  // Legacy basic tower
  basic: {
    name: 'Watch Tower',
    modelKey: 'gatling_tower',
    cost: 100,
    damage: 25,
    range: 12,
    fireRate: 1.0,
    health: 300,
    description: 'Basic defense tower',
    projectileSpeed: 20,
    attackType: 'bullet'
  },
  
  // Legacy cannon
  cannon: {
    name: 'Heavy Cannon',
    modelKey: 'missile_tower',
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
  
  // Legacy splash
  splash: {
    name: 'Medieval Tower',
    modelKey: 'laser_tower',
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
    modelKey: 'wall',  // → modular_wall.glb
    cost: 50,
    health: Infinity,
    description: 'Guides enemy paths'
  },
  blocking: {
    name: 'Blocking Wall',
    modelKey: 'wall',  // → modular_wall.glb
    cost: 100,
    health: 500,
    description: 'Blocks enemies, can be destroyed'
  }
}

export const SPAWNER_TYPES = {
  barracks: {
    name: 'Barracks',
    modelKey: 'barracks',  // → future_architectural.glb
    cost: 250,
    health: 600,
    spawnRate: 10,
    maxUnits: 3,
    unitType: 'troop',
    description: 'Spawns defensive units'
  }
}

