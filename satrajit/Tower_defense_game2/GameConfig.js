/**
 * GameConfig.js - Space Warfare Tower Defense Configuration
 * Complete space theme with unique units and buildings
 */

export const GameConfig = {
  // ============================================
  // ECONOMY & ELIXIR SYSTEM
  // ============================================
  economy: {
    startingElixir: 5,
    maxElixir: 10,
    elixirRegenRate: 1, // Elixir per second
    
    // Quantum Credits for upgrades
    creditSystem: {
      enabled: true,
      startingCredits: 1000,
      creditMultiplier: 1.0,
      
      problemRewards: {
        easy: 100,
        medium: 250,
        hard: 500,
        expert: 1000
      },
      
      permanentUpgrades: {
        energyReactor: 500, // +10% energy regen
        plasmaAmplifier: 750, // +15% damage
        shieldBooster: 750, // +15% health
        hyperdriveCore: 1000 // Units move 20% faster
      }
    }
  },

  // ============================================
  // MATCH SETTINGS
  // ============================================
  match: {
    duration: 180, // 3 minutes
    overtimeDuration: 60,
    doubleElixirTime: 60, // Last minute = 2x elixir
    suddenDeathTime: 240
  },

  // ============================================
  // SPACE ARENA LAYOUT
  // ============================================
  arena: {
    width: 50,
    length: 70,
    theme: 'space_station',
    
    // Deployment zones (mothership docking bays)
    player1Zone: { x: [-25, 0], z: [-30, -10] },
    player2Zone: { x: [0, 25], z: [10, 30] },
    
    // Neutral space (asteroid field)
    neutralZone: { x: [-25, 25], z: [-10, 10] },
    
    // Space lanes for navigation
    lanes: {
      left: { x: -10, z: 0 },
      center: { x: 0, z: 0 },
      right: { x: 10, z: 0 }
    }
  },

  // ============================================
  // SPACE STRUCTURES (Buildings)
  // ============================================
  buildings: {
    mothership: {
      id: 'mothership',
      name: 'Mothership Core',
      cost: 0,
      health: 5000,
      damage: 150,
      attackSpeed: 1.0,
      range: 8,
      targetAir: true,
      targetGround: true,
      size: 4,
      color: 0x00ffff,
      model: 'mothership.glb',
      description: 'Main command ship. Protect at all costs!'
    },
    
    orbitalStation: {
      id: 'orbital_station',
      name: 'Orbital Defense Station',
      cost: 0,
      health: 3000,
      damage: 100,
      attackSpeed: 0.8,
      range: 8,
      targetAir: true,
      targetGround: true,
      size: 2.5,
      color: 0x00aaff,
      model: 'station.glb',
      description: 'Forward defense platform'
    },
    
    laserTurret: {
      id: 'laser_turret',
      name: 'Photon Laser Turret',
      cost: 3,
      health: 600,
      damage: 120,
      attackSpeed: 2.0, // Fast firing
      range: 6,
      targetAir: true,
      targetGround: true,
      lifetime: 35,
      size: 1.5,
      color: 0xff0000,
      model: 'laser_turret.glb',
      projectileType: 'laser',
      description: 'Rapid-fire laser defense'
    },
    
    missileSilo: {
      id: 'missile_silo',
      name: 'Quantum Missile Silo',
      cost: 4,
      health: 800,
      damage: 300,
      attackSpeed: 0.5, // Slow but powerful
      range: 10,
      targetAir: true,
      targetGround: false,
      splashRadius: 3,
      lifetime: 40,
      size: 2,
      color: 0xff6600,
      model: 'missile_silo.glb',
      projectileType: 'missile',
      description: 'Long-range missile launcher'
    },
    
    shieldGenerator: {
      id: 'shield_generator',
      name: 'Plasma Shield Generator',
      cost: 5,
      health: 1000,
      damage: 0,
      range: 8,
      lifetime: 45,
      size: 2,
      color: 0x00ff00,
      model: 'shield_gen.glb',
      special: 'shield', // Provides shield to nearby units
      shieldAmount: 500,
      description: 'Protects nearby units with energy shields'
    },
    
    ionCannon: {
      id: 'ion_cannon',
      name: 'Ion Cannon Array',
      cost: 6,
      health: 700,
      damage: 80, // Continuous beam
      attackSpeed: 0.1, // Continuous
      range: 7,
      targetAir: true,
      targetGround: true,
      lifetime: 35,
      size: 1.8,
      color: 0x9900ff,
      model: 'ion_cannon.glb',
      projectileType: 'beam',
      special: 'slow', // Slows enemies
      description: 'Continuous beam that slows enemies'
    },
    
    warpGate: {
      id: 'warp_gate',
      name: 'Warp Gate',
      cost: 4,
      health: 500,
      lifetime: 60,
      size: 2,
      color: 0xffff00,
      model: 'warp_gate.glb',
      special: 'spawn', // Spawns reinforcements
      spawnUnit: 'drone',
      spawnRate: 3, // Every 3 seconds
      description: 'Teleports in drone reinforcements'
    }
  },

  // ============================================
  // SPACE UNITS (Ships & Mechs)
  // ============================================
  units: {
    // Fighter Class
    interceptor: {
      id: 'interceptor',
      name: 'Viper Interceptor',
      cost: 2,
      health: 800,
      damage: 80,
      attackSpeed: 2.0,
      moveSpeed: 4.0, // Fast
      range: 4,
      targetAir: true,
      targetGround: false,
      size: 0.8,
      count: 2,
      type: 'air',
      flying: true,
      color: 0x00ccff,
      model: 'interceptor.glb',
      description: 'Fast anti-air fighter squadron'
    },
    
    bomber: {
      id: 'bomber',
      name: 'Nova Bomber',
      cost: 5,
      health: 1500,
      damage: 500,
      attackSpeed: 0.3, // Slow attack
      moveSpeed: 2.0,
      range: 1.5,
      targetAir: false,
      targetGround: true,
      targetBuildings: true,
      splashRadius: 3,
      size: 1.5,
      count: 1,
      type: 'air',
      flying: true,
      color: 0xff9900,
      model: 'bomber.glb',
      description: 'Heavy bomber, targets structures'
    },
    
    // Mech Class
    sentinel: {
      id: 'sentinel',
      name: 'Sentinel Mech',
      cost: 3,
      health: 1200,
      damage: 100,
      attackSpeed: 1.2,
      moveSpeed: 2.5,
      range: 1.5, // Melee
      targetAir: false,
      targetGround: true,
      size: 1.2,
      count: 1,
      type: 'ground',
      color: 0x666666,
      model: 'sentinel_mech.glb',
      description: 'Armored combat mech'
    },
    
    ranger: {
      id: 'ranger',
      name: 'Ranger Unit',
      cost: 4,
      health: 700,
      damage: 150,
      attackSpeed: 1.0,
      moveSpeed: 3.0,
      range: 6,
      targetAir: true,
      targetGround: true,
      size: 1,
      count: 2,
      type: 'ground',
      color: 0x00ff00,
      model: 'ranger.glb',
      description: 'Long-range plasma rifle unit'
    },
    
    // Tank Class
    titan: {
      id: 'titan',
      name: 'Titan Assault Walker',
      cost: 7,
      health: 4000,
      damage: 300,
      attackSpeed: 0.7,
      moveSpeed: 1.5, // Slow
      range: 2,
      targetAir: false,
      targetGround: true,
      targetBuildings: true,
      size: 2,
      count: 1,
      type: 'ground',
      color: 0xff0000,
      model: 'titan_walker.glb',
      description: 'Massive siege walker'
    },
    
    // Swarm Class
    drones: {
      id: 'drones',
      name: 'Drone Swarm',
      cost: 3,
      health: 100,
      damage: 50,
      attackSpeed: 2.0,
      moveSpeed: 4.5,
      range: 3,
      targetAir: true,
      targetGround: true,
      size: 0.4,
      count: 8, // Swarm!
      type: 'air',
      flying: true,
      color: 0xffff00,
      model: 'drone.glb',
      description: 'Fast attack drone swarm'
    },
    
    // Special Units
    cloaker: {
      id: 'cloaker',
      name: 'Stealth Infiltrator',
      cost: 4,
      health: 600,
      damage: 200,
      attackSpeed: 0.8,
      moveSpeed: 3.5,
      range: 1.5,
      targetAir: false,
      targetGround: true,
      size: 0.9,
      count: 1,
      type: 'ground',
      special: 'stealth', // Invisible until attacks
      color: 0x9900ff,
      model: 'cloaker.glb',
      description: 'Cloaked assassination unit'
    },
    
    healer: {
      id: 'healer',
      name: 'Repair Drone',
      cost: 3,
      health: 400,
      damage: 0,
      healAmount: 50,
      healRate: 1.0,
      moveSpeed: 3.0,
      range: 5,
      size: 0.8,
      count: 1,
      type: 'air',
      flying: true,
      special: 'heal',
      color: 0x00ff00,
      model: 'repair_drone.glb',
      description: 'Repairs friendly units'
    },
    
    carrier: {
      id: 'carrier',
      name: 'Assault Carrier',
      cost: 8,
      health: 3000,
      damage: 100,
      attackSpeed: 1.0,
      moveSpeed: 1.8,
      range: 7,
      targetAir: true,
      targetGround: true,
      size: 2.5,
      count: 1,
      type: 'air',
      flying: true,
      special: 'spawn_fighters',
      color: 0x0066cc,
      model: 'carrier.glb',
      description: 'Launches fighter squadrons'
    }
  },

  // ============================================
  // ABILITIES (Future implementation)
  // ============================================
  abilities: {
    orbitalStrike: {
      id: 'orbital_strike',
      name: 'Orbital Bombardment',
      cost: 6,
      damage: 1000,
      radius: 5,
      delay: 2, // 2 second warning
      description: 'Devastating strike from orbit'
    },
    
    energyShield: {
      id: 'energy_shield',
      name: 'Emergency Shield',
      cost: 4,
      shieldAmount: 1000,
      duration: 5,
      radius: 6,
      description: 'Temporary shield bubble'
    },
    
    warpJump: {
      id: 'warp_jump',
      name: 'Tactical Warp',
      cost: 3,
      description: 'Instantly teleport units'
    },
    
    emp: {
      id: 'emp',
      name: 'EMP Blast',
      cost: 5,
      radius: 8,
      stunDuration: 3,
      description: 'Disables all electronics'
    }
  },

  // ============================================
  // VISUAL EFFECTS
  // ============================================
  effects: {
    particles: {
      explosion: { 
        count: 40, 
        colors: [0xff6600, 0xffaa00, 0xffff00],
        type: 'sphere'
      },
      laserHit: { 
        count: 10, 
        colors: [0xff0000, 0xff00ff],
        type: 'spark'
      },
      plasmaHit: { 
        count: 15, 
        colors: [0x00ffff, 0x0099ff],
        type: 'plasma'
      },
      shieldHit: { 
        count: 20, 
        colors: [0x00ff00, 0x00ffff],
        type: 'ripple'
      }
    },
    
    projectiles: {
      laser: {
        color: 0xff0000,
        speed: 40,
        trail: true,
        glow: true
      },
      plasma: {
        color: 0x00ffff,
        speed: 25,
        trail: true,
        size: 0.3
      },
      missile: {
        color: 0xff6600,
        speed: 15,
        trail: true,
        arc: true,
        smoke: true
      }
    },
    
    lighting: {
      bloom: {
        strength: 1.8,
        radius: 0.5,
        threshold: 0.8
      },
      ambientSpace: 0x0a0a1a,
      starfield: true,
      nebula: true
    }
  },

  // ============================================
  // 3D MODELS CONFIGURATION
  // ============================================
  models: {
    // Model loading paths (you'll need to add these)
    basePath: '/models/',
    
    // Fallback if model not found
    usePrimitives: true, // Use geometric shapes if no model
    
    // Model scales
    scales: {
      interceptor: 0.5,
      bomber: 0.8,
      sentinel: 1.0,
      ranger: 0.9,
      titan: 1.5,
      drone: 0.3,
      carrier: 2.0
    },
    
    // Available free model sources:
    // - Sketchfab (free models)
    // - Poly Pizza
    // - Quaternius models
    // - Kenny.nl (space kit)
    sources: {
      recommended: [
        'https://quaternius.com/assets/modular-spaceships/',
        'https://kenney.nl/assets/space-kit',
        'https://poly.pizza/bundle/Space-Kit-bJhR3jogME'
      ]
    }
  },

  // ============================================
  // AI CONFIGURATION
  // ============================================
  ai: {
    targetPriority: {
      default: ['nearest_enemy'],
      building_targeter: ['nearest_building', 'nearest_enemy'],
      anti_air: ['nearest_air', 'nearest_ground'],
      healer: ['lowest_health_ally', 'nearest_ally']
    },
    
    formations: {
      enabled: true,
      types: ['line', 'wedge', 'circle', 'scatter']
    }
  }
};

export default GameConfig;
