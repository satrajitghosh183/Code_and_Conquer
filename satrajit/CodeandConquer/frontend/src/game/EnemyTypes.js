// =============================================================================
// PROFESSIONAL ENEMY TYPES - Studio-Quality Enemy Configurations
// =============================================================================
// Comprehensive enemy type definitions with behaviors, visuals, abilities,
// and progression systems for a AAA tower defense experience.
// =============================================================================

import * as THREE from 'three'

// =============================================================================
// ENEMY TYPE DEFINITIONS
// =============================================================================

export const ENEMY_TYPES = {
  // =========================================================================
  // TIER 1 - BASIC ENEMIES (Waves 1-5)
  // =========================================================================
  
  spider: {
    name: 'Spider Drone',
    tier: 1,
    model: 'spider',
    speed: 7,
    health: 60,
    armor: 0,
    lives: 1,
    goldReward: 8,
    xpReward: 3,
    color: 0x00ff44,
    glowColor: 0x00ff00,
    scale: 0.9,
    description: 'Basic ground unit. Fast and numerous.',
    behavior: 'standard',
    deathEffect: 'spark',
    // Visual customization
    bodyStyle: 'insect',
    eyeCount: 4,
    legCount: 6,
    hasWings: false,
    trailColor: null
  },

  scout: {
    name: 'Scout Interceptor',
    tier: 1,
    model: 'spider',
    speed: 14,
    health: 35,
    armor: 0,
    lives: 1,
    goldReward: 12,
    xpReward: 4,
    color: 0x00ffff,
    glowColor: 0x00ddff,
    scale: 0.7,
    description: 'Lightning fast reconnaissance unit.',
    behavior: 'zigzag',
    deathEffect: 'spark',
    bodyStyle: 'sleek',
    eyeCount: 2,
    hasAfterimage: true,
    trailColor: 0x00ffff
  },

  swarm: {
    name: 'Swarmling',
    tier: 1,
    model: 'spider',
    speed: 11,
    health: 18,
    armor: 0,
    lives: 1,
    goldReward: 3,
    xpReward: 1,
    color: 0xffff00,
    glowColor: 0xffdd00,
    scale: 0.4,
    description: 'Tiny but comes in overwhelming numbers.',
    behavior: 'swarm',
    deathEffect: 'pop',
    bodyStyle: 'ball',
    eyeCount: 2,
    clusterSize: 5 // Tends to group together
  },

  // =========================================================================
  // TIER 2 - ADVANCED ENEMIES (Waves 6-15)
  // =========================================================================

  brute: {
    name: 'Heavy Brute',
    tier: 2,
    model: 'spider',
    speed: 4,
    health: 280,
    armor: 0.1,
    lives: 2,
    goldReward: 25,
    xpReward: 12,
    color: 0xff6600,
    glowColor: 0xff4400,
    scale: 1.6,
    description: 'Slow but extremely durable.',
    behavior: 'steady',
    deathEffect: 'explosion',
    bodyStyle: 'heavy',
    eyeCount: 1,
    hasShield: false,
    impactDamage: 10, // Damages towers on death
    groundShake: true
  },

  armored: {
    name: 'Armored Sentinel',
    tier: 2,
    model: 'spider',
    speed: 5.5,
    health: 180,
    armor: 0.35, // 35% damage reduction
    lives: 2,
    goldReward: 30,
    xpReward: 15,
    color: 0x888888,
    glowColor: 0xaaaaaa,
    scale: 1.3,
    description: 'Heavy plating reduces incoming damage.',
    behavior: 'standard',
    deathEffect: 'shatter',
    bodyStyle: 'armored',
    eyeCount: 2,
    hasShieldEffect: true,
    armorBreakThreshold: 0.3 // Armor weakens below 30% health
  },

  healer: {
    name: 'Bio-Medic',
    tier: 2,
    model: 'spider',
    speed: 6,
    health: 80,
    armor: 0,
    lives: 1,
    goldReward: 20,
    xpReward: 10,
    color: 0x00ff88,
    glowColor: 0x00ffaa,
    scale: 1.0,
    description: 'Regenerates nearby allies over time.',
    behavior: 'support',
    deathEffect: 'heal_burst',
    bodyStyle: 'organic',
    eyeCount: 3,
    healRadius: 12,
    healAmount: 8,
    healInterval: 1.0,
    hasAura: true,
    auraColor: 0x00ff88
  },

  splitter: {
    name: 'Replicator',
    tier: 2,
    model: 'spider',
    speed: 5,
    health: 120,
    armor: 0,
    lives: 1,
    goldReward: 18,
    xpReward: 8,
    color: 0xaa00ff,
    glowColor: 0xcc44ff,
    scale: 1.4,
    description: 'Splits into smaller units when destroyed.',
    behavior: 'careful',
    deathEffect: 'split',
    bodyStyle: 'segmented',
    eyeCount: 4,
    splitCount: 3,
    splitType: 'swarm',
    splitDelay: 200
  },

  // =========================================================================
  // TIER 3 - ELITE ENEMIES (Waves 16-30)
  // =========================================================================

  assassin: {
    name: 'Shadow Assassin',
    tier: 3,
    model: 'spider',
    speed: 16,
    health: 70,
    armor: 0,
    lives: 1,
    goldReward: 35,
    xpReward: 18,
    color: 0x440044,
    glowColor: 0x8800ff,
    scale: 0.85,
    description: 'Phases through attacks periodically.',
    behavior: 'evasive',
    deathEffect: 'vanish',
    bodyStyle: 'ethereal',
    eyeCount: 2,
    phaseInterval: 3.0, // Seconds between phases
    phaseDuration: 1.0,
    hasInvisibility: true
  },

  tank: {
    name: 'Siege Tank',
    tier: 3,
    model: 'spider',
    speed: 2.5,
    health: 600,
    armor: 0.4,
    lives: 3,
    goldReward: 50,
    xpReward: 30,
    color: 0x663300,
    glowColor: 0x884400,
    scale: 2.2,
    description: 'Massive siege unit with heavy armor.',
    behavior: 'siege',
    deathEffect: 'massive_explosion',
    bodyStyle: 'tank',
    eyeCount: 1,
    hasShieldGenerator: true,
    shieldRegenRate: 5,
    crushDamage: 20 // Crushes towers it passes
  },

  disruptor: {
    name: 'EMP Disruptor',
    tier: 3,
    model: 'spider',
    speed: 6,
    health: 100,
    armor: 0.15,
    lives: 1,
    goldReward: 40,
    xpReward: 20,
    color: 0x0088ff,
    glowColor: 0x00aaff,
    scale: 1.1,
    description: 'Disables nearby towers temporarily.',
    behavior: 'disruptor',
    deathEffect: 'emp_burst',
    bodyStyle: 'tech',
    eyeCount: 1,
    disableRadius: 8,
    disableDuration: 2.0,
    disableInterval: 5.0,
    hasEMPField: true
  },

  berserker: {
    name: 'Berserker',
    tier: 3,
    model: 'spider',
    speed: 8,
    health: 150,
    armor: 0,
    lives: 1,
    goldReward: 35,
    xpReward: 16,
    color: 0xff0000,
    glowColor: 0xff2200,
    scale: 1.2,
    description: 'Gets faster and stronger as health drops.',
    behavior: 'berserker',
    deathEffect: 'blood_explosion',
    bodyStyle: 'feral',
    eyeCount: 2,
    rageThreshold: 0.5, // Activates below 50% health
    rageSpeedMult: 1.8,
    rageDamageMult: 0.5 // Takes 50% more damage when enraged
  },

  // =========================================================================
  // TIER 4 - BOSS ENEMIES
  // =========================================================================

  boss: {
    name: 'Hive Queen',
    tier: 4,
    model: 'spider',
    speed: 3,
    health: 2000,
    armor: 0.25,
    lives: 10,
    goldReward: 200,
    xpReward: 100,
    color: 0xff0000,
    glowColor: 0xff0044,
    scale: 3.0,
    description: 'Devastating boss unit. Spawns minions.',
    behavior: 'boss',
    deathEffect: 'epic_explosion',
    isBoss: true,
    bodyStyle: 'queen',
    eyeCount: 6,
    hasCrown: true,
    crownColor: 0xffd700,
    // Boss abilities
    spawnMinions: true,
    minionType: 'swarm',
    minionCount: 3,
    minionInterval: 8.0,
    hasShield: true,
    shieldHealth: 500,
    shieldRegen: 10,
    enrageThreshold: 0.25, // Enrages below 25% health
    enrageSpeedMult: 1.5
  },

  megaBoss: {
    name: 'Overlord',
    tier: 4,
    model: 'spider',
    speed: 2,
    health: 5000,
    armor: 0.3,
    lives: 20,
    goldReward: 500,
    xpReward: 250,
    color: 0x880000,
    glowColor: 0xaa0000,
    scale: 4.5,
    description: 'Ultimate boss. Requires full team effort.',
    behavior: 'overlord',
    deathEffect: 'catastrophic',
    isBoss: true,
    bodyStyle: 'overlord',
    eyeCount: 8,
    hasCrown: true,
    crownColor: 0xff0000,
    // Overlord abilities
    phaseCount: 3,
    currentPhase: 1,
    spawnMinions: true,
    minionType: 'brute',
    minionCount: 2,
    minionInterval: 10.0,
    hasShield: true,
    shieldHealth: 1000,
    shieldRegen: 20,
    aoeAttack: true,
    aoeDamage: 50,
    aoeRadius: 15,
    aoeInterval: 5.0
  },

  // =========================================================================
  // SPECIAL ENEMIES
  // =========================================================================

  carrier: {
    name: 'Spawn Carrier',
    tier: 3,
    model: 'spider',
    speed: 4,
    health: 250,
    armor: 0.2,
    lives: 1,
    goldReward: 45,
    xpReward: 25,
    color: 0x996633,
    glowColor: 0xaa8844,
    scale: 1.8,
    description: 'Periodically releases smaller enemies.',
    behavior: 'carrier',
    deathEffect: 'spawn_burst',
    bodyStyle: 'carrier',
    eyeCount: 2,
    carryCapacity: 8,
    carryType: 'swarm',
    releaseInterval: 4.0,
    releaseCount: 2
  },

  phantom: {
    name: 'Phase Phantom',
    tier: 3,
    model: 'spider',
    speed: 10,
    health: 60,
    armor: 0,
    lives: 1,
    goldReward: 30,
    xpReward: 15,
    color: 0x4400aa,
    glowColor: 0x6600ff,
    scale: 0.9,
    description: 'Teleports short distances to avoid damage.',
    behavior: 'teleporter',
    deathEffect: 'fade',
    bodyStyle: 'ghost',
    eyeCount: 2,
    teleportRange: 8,
    teleportCooldown: 3.0,
    hasTransparency: true,
    baseOpacity: 0.7
  },

  juggernaut: {
    name: 'Juggernaut',
    tier: 3,
    model: 'spider',
    speed: 3,
    health: 450,
    armor: 0.5, // 50% damage reduction
    lives: 4,
    goldReward: 60,
    xpReward: 35,
    color: 0x444444,
    glowColor: 0x666666,
    scale: 2.0,
    description: 'Nearly impervious to damage. Slow but unstoppable.',
    behavior: 'unstoppable',
    deathEffect: 'crumble',
    bodyStyle: 'fortress',
    eyeCount: 1,
    slowImmune: true, // Immune to slow effects
    knockbackImmune: true
  }
}

// =============================================================================
// WAVE GENERATION TEMPLATES
// =============================================================================

export const WAVE_TEMPLATES = {
  // Starter waves
  easy: [
    { type: 'spider', count: 5 }
  ],
  
  // Standard progression
  medium: [
    { type: 'spider', count: 4 },
    { type: 'scout', count: 2 }
  ],
  
  hard: [
    { type: 'spider', count: 5 },
    { type: 'brute', count: 1 },
    { type: 'scout', count: 3 }
  ],
  
  // Themed waves
  swarm: [
    { type: 'swarm', count: 20 }
  ],
  
  elite: [
    { type: 'armored', count: 3 },
    { type: 'healer', count: 1 },
    { type: 'brute', count: 2 }
  ],
  
  boss: [
    { type: 'spider', count: 4 },
    { type: 'armored', count: 2 },
    { type: 'boss', count: 1 }
  ],
  
  nightmare: [
    { type: 'assassin', count: 3 },
    { type: 'berserker', count: 2 },
    { type: 'tank', count: 1 },
    { type: 'disruptor', count: 2 }
  ],
  
  megaBoss: [
    { type: 'healer', count: 3 },
    { type: 'tank', count: 2 },
    { type: 'megaBoss', count: 1 }
  ]
}

// =============================================================================
// ENEMY BEHAVIOR DEFINITIONS
// =============================================================================

export const ENEMY_BEHAVIORS = {
  standard: {
    movement: 'direct',
    targeting: null,
    special: null
  },
  
  zigzag: {
    movement: 'zigzag',
    zigzagAmplitude: 2,
    zigzagFrequency: 2,
    targeting: null
  },
  
  swarm: {
    movement: 'flock',
    flockRadius: 5,
    flockCohesion: 0.5,
    targeting: null
  },
  
  steady: {
    movement: 'direct',
    ignoreSlows: 0.5, // 50% slow resistance
    targeting: null
  },
  
  support: {
    movement: 'follow',
    followTarget: 'nearest_ally',
    keepDistance: 5,
    targeting: null
  },
  
  careful: {
    movement: 'avoid_towers',
    avoidRadius: 10,
    targeting: null
  },
  
  evasive: {
    movement: 'dodge',
    dodgeChance: 0.2,
    dodgeDistance: 3,
    targeting: null
  },
  
  siege: {
    movement: 'direct',
    targetStructures: true,
    structureDamage: 50,
    targeting: 'nearest_structure'
  },
  
  disruptor: {
    movement: 'approach_towers',
    targetDistance: 8,
    targeting: 'tower_cluster'
  },
  
  berserker: {
    movement: 'direct',
    rageMode: false,
    targeting: null
  },
  
  boss: {
    movement: 'direct',
    summonMinions: true,
    targeting: null
  },
  
  carrier: {
    movement: 'direct',
    releaseUnits: true,
    targeting: null
  },
  
  teleporter: {
    movement: 'teleport',
    teleportTrigger: 'damage',
    targeting: null
  },
  
  unstoppable: {
    movement: 'direct',
    ignoreSlows: 1.0, // 100% slow immunity
    ignoreStuns: true,
    targeting: null
  }
}

// =============================================================================
// WAVE GENERATION FUNCTION
// =============================================================================

export function generateWave(waveNumber) {
  const enemies = []
  
  // Progressive scaling
  const tier = Math.floor(waveNumber / 5)
  const baseCount = Math.floor(4 + waveNumber * 1.5)
  const healthMultiplier = 1 + (waveNumber - 1) * 0.15
  const speedMultiplier = 1 + (waveNumber - 1) * 0.03
  
  // Determine wave type
  if (waveNumber % 20 === 0 && waveNumber > 0) {
    // Mega boss wave
    enemies.push({ type: 'healer', count: 2 + tier })
    enemies.push({ type: 'tank', count: tier })
    enemies.push({ type: 'megaBoss', count: 1 })
  } else if (waveNumber % 10 === 0 && waveNumber > 0) {
    // Double boss wave
    enemies.push({ type: 'boss', count: 2 })
    enemies.push({ type: 'healer', count: 3 })
    enemies.push({ type: 'armored', count: 4 + tier })
  } else if (waveNumber % 5 === 0 && waveNumber > 0) {
    // Boss wave
    enemies.push({ type: 'boss', count: 1 })
    enemies.push({ type: 'armored', count: 2 + Math.floor(tier / 2) })
    enemies.push({ type: 'brute', count: 1 + Math.floor(tier / 2) })
    enemies.push({ type: 'healer', count: 1 + Math.floor(tier / 3) })
  } else if (waveNumber % 7 === 0) {
    // Elite wave
    enemies.push({ type: 'assassin', count: Math.max(1, Math.floor(baseCount * 0.3)) })
    enemies.push({ type: 'berserker', count: Math.max(1, Math.floor(baseCount * 0.2)) })
    enemies.push({ type: 'disruptor', count: Math.max(1, Math.floor(baseCount * 0.15)) })
  } else if (waveNumber % 4 === 0) {
    // Swarm wave
    enemies.push({ type: 'swarm', count: baseCount * 4 })
    enemies.push({ type: 'scout', count: baseCount })
    enemies.push({ type: 'carrier', count: Math.max(1, Math.floor(tier / 2)) })
  } else if (waveNumber % 3 === 0) {
    // Tank wave
    enemies.push({ type: 'brute', count: Math.ceil(baseCount * 0.4) })
    enemies.push({ type: 'armored', count: Math.ceil(baseCount * 0.3) })
    enemies.push({ type: 'spider', count: Math.ceil(baseCount * 0.3) })
  } else {
    // Standard mixed wave
    enemies.push({ type: 'spider', count: baseCount })
    
    if (waveNumber >= 2) {
      enemies.push({ type: 'scout', count: Math.ceil(baseCount * 0.4) })
    }
    if (waveNumber >= 4) {
      enemies.push({ type: 'brute', count: Math.max(1, Math.floor(tier * 0.6)) })
    }
    if (waveNumber >= 6) {
      enemies.push({ type: 'armored', count: Math.max(1, Math.floor(tier * 0.5)) })
    }
    if (waveNumber >= 8) {
      enemies.push({ type: 'healer', count: Math.max(1, Math.floor(tier * 0.3)) })
    }
    if (waveNumber >= 12) {
      enemies.push({ type: 'splitter', count: Math.max(1, Math.floor(tier * 0.4)) })
    }
    if (waveNumber >= 16) {
      enemies.push({ type: 'phantom', count: Math.max(1, Math.floor(tier * 0.3)) })
    }
  }
  
  return {
    enemies,
    healthMultiplier,
    speedMultiplier,
    waveNumber,
    tier,
    isBossWave: waveNumber % 5 === 0
  }
}

// =============================================================================
// ENEMY MESH GENERATOR
// =============================================================================

export function createEnemyMesh(enemyConfig, scale = 1.0) {
  const group = new THREE.Group()
  const config = ENEMY_TYPES[enemyConfig.type] || ENEMY_TYPES.spider
  const finalScale = config.scale * scale
  
  // Base body based on style
  let bodyGeom, bodyMat
  
  switch (config.bodyStyle) {
    case 'heavy':
    case 'tank':
    case 'fortress':
      bodyGeom = new THREE.DodecahedronGeometry(1 * finalScale, 0)
      break
    case 'sleek':
    case 'ethereal':
    case 'ghost':
      bodyGeom = new THREE.ConeGeometry(0.6 * finalScale, 1.4 * finalScale, 6)
      break
    case 'ball':
      bodyGeom = new THREE.SphereGeometry(0.5 * finalScale, 12, 12)
      break
    case 'segmented':
    case 'carrier':
      bodyGeom = new THREE.CapsuleGeometry(0.6 * finalScale, 0.8 * finalScale, 8, 16)
      break
    case 'armored':
      bodyGeom = new THREE.BoxGeometry(1.2 * finalScale, 0.8 * finalScale, 1.2 * finalScale)
      break
    case 'queen':
    case 'overlord':
      bodyGeom = new THREE.OctahedronGeometry(1.2 * finalScale, 1)
      break
    case 'organic':
      bodyGeom = new THREE.IcosahedronGeometry(0.8 * finalScale, 1)
      break
    default: // insect, tech, feral
      bodyGeom = new THREE.SphereGeometry(0.8 * finalScale, 16, 16)
  }
  
  // Body material with glow
  bodyMat = new THREE.MeshStandardMaterial({
    color: config.color,
    metalness: 0.3,
    roughness: 0.6,
    emissive: config.glowColor || config.color,
    emissiveIntensity: 0.4,
    transparent: config.hasTransparency || false,
    opacity: config.baseOpacity || 1.0
  })
  
  const body = new THREE.Mesh(bodyGeom, bodyMat)
  body.position.y = 1 * finalScale
  body.castShadow = true
  body.receiveShadow = true
  group.add(body)
  
  // Eyes
  const eyeCount = config.eyeCount || 2
  const eyeGeom = new THREE.SphereGeometry(0.12 * finalScale, 8, 8)
  const eyeMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.95
  })
  const pupilGeom = new THREE.SphereGeometry(0.06 * finalScale, 6, 6)
  const pupilMat = new THREE.MeshBasicMaterial({ color: 0x000000 })
  
  for (let i = 0; i < eyeCount; i++) {
    const angle = (i / eyeCount) * Math.PI - Math.PI / 2
    const radius = 0.4 * finalScale
    
    const eye = new THREE.Mesh(eyeGeom, eyeMat)
    eye.position.set(
      Math.sin(angle) * radius,
      1.1 * finalScale,
      Math.cos(angle) * radius + 0.5 * finalScale
    )
    group.add(eye)
    
    const pupil = new THREE.Mesh(pupilGeom, pupilMat)
    pupil.position.set(
      eye.position.x,
      eye.position.y,
      eye.position.z + 0.08 * finalScale
    )
    group.add(pupil)
  }
  
  // Boss crown
  if (config.hasCrown) {
    const crownGeom = new THREE.ConeGeometry(0.4 * finalScale, 0.6 * finalScale, 5)
    const crownMat = new THREE.MeshStandardMaterial({
      color: config.crownColor || 0xffd700,
      metalness: 0.9,
      roughness: 0.1,
      emissive: config.crownColor || 0xffd700,
      emissiveIntensity: 0.6
    })
    const crown = new THREE.Mesh(crownGeom, crownMat)
    crown.position.y = 1.8 * finalScale
    group.add(crown)
  }
  
  // Healer aura ring
  if (config.hasAura) {
    const auraGeom = new THREE.TorusGeometry(config.healRadius / 3, 0.1, 8, 24)
    const auraMat = new THREE.MeshBasicMaterial({
      color: config.auraColor || 0x00ff88,
      transparent: true,
      opacity: 0.25
    })
    const aura = new THREE.Mesh(auraGeom, auraMat)
    aura.rotation.x = Math.PI / 2
    aura.position.y = 0.3
    aura.name = 'healAura'
    group.add(aura)
  }
  
  // Shield effect
  if (config.hasShieldEffect || config.hasShield) {
    const shieldGeom = new THREE.SphereGeometry(1.3 * finalScale, 16, 16)
    const shieldMat = new THREE.MeshBasicMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide
    })
    const shield = new THREE.Mesh(shieldGeom, shieldMat)
    shield.position.y = 1 * finalScale
    shield.name = 'shield'
    group.add(shield)
  }
  
  // Legs for insect types
  if (config.legCount && config.legCount > 0) {
    const legGeom = new THREE.CylinderGeometry(0.04 * finalScale, 0.06 * finalScale, 0.6 * finalScale, 6)
    const legMat = new THREE.MeshStandardMaterial({
      color: config.color,
      metalness: 0.2,
      roughness: 0.8
    })
    
    for (let i = 0; i < config.legCount; i++) {
      const angle = (i / config.legCount) * Math.PI * 2
      const leg = new THREE.Mesh(legGeom, legMat)
      leg.position.set(
        Math.sin(angle) * 0.6 * finalScale,
        0.3 * finalScale,
        Math.cos(angle) * 0.6 * finalScale
      )
      leg.rotation.z = Math.sin(angle) * 0.5
      leg.rotation.x = Math.cos(angle) * 0.5
      leg.castShadow = true
      group.add(leg)
    }
  }
  
  return group
}
