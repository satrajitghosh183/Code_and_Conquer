// Hero definitions based on programming languages
const HEROES = {
  python: {
    id: 'python',
    name: 'Snake',
    language: 'Python',
    description: 'A cunning serpent that constricts enemy vision',
    unlockLevel: 1,
    rarity: 'common',
    stats: {
      baseHealth: 100,
      baseDamage: 10,
      baseSpeed: 1.0
    },
    ability: {
      name: 'Vision Constrict',
      description: 'When solving problems, obscures opponent\'s output for 30 seconds',
      type: 'debuff',
      cooldown: 60,
      duration: 30,
      effect: {
        type: 'vision_obscure',
        target: 'opponent',
        strength: 1.0
      }
    },
    passive: {
      name: 'Pythonic Efficiency',
      description: '+10% coding score from all submissions',
      type: 'stat_boost',
      effect: {
        codingScoreMultiplier: 1.1
      }
    }
  },
  
  cpp: {
    id: 'cpp',
    name: 'Sea Dragon',
    language: 'C/C++',
    description: 'A fierce dragon that commands the waters with incredible speed',
    unlockLevel: 5,
    rarity: 'rare',
    stats: {
      baseHealth: 120,
      baseDamage: 15,
      baseSpeed: 1.2
    },
    ability: {
      name: 'Tidal Rush',
      description: 'All water-type troops gain +30% speed',
      type: 'buff',
      cooldown: 90,
      duration: 45,
      effect: {
        type: 'speed_boost',
        target: 'water_troops',
        strength: 0.3
      }
    },
    passive: {
      name: 'Water Mastery',
      description: 'All water troops have permanent +15% speed',
      type: 'stat_boost',
      effect: {
        waterTroopSpeedBonus: 0.15
      }
    }
  },
  
  java: {
    id: 'java',
    name: 'Jaguar',
    language: 'Java',
    description: 'Stealthy predator that keeps troops hidden from enemies',
    unlockLevel: 3,
    rarity: 'uncommon',
    stats: {
      baseHealth: 110,
      baseDamage: 12,
      baseSpeed: 1.15
    },
    ability: {
      name: 'Stealth Strike',
      description: 'Troops invisible to opponent for first 10 tiles of movement',
      type: 'buff',
      cooldown: 75,
      duration: 60,
      effect: {
        type: 'invisibility',
        target: 'own_troops',
        distance: 10
      }
    },
    passive: {
      name: 'Silent Hunter',
      description: 'New troops are invisible for the first 5 tiles',
      type: 'stealth',
      effect: {
        invisibilityDistance: 5
      }
    }
  },
  
  javascript: {
    id: 'javascript',
    name: 'Rhino',
    language: 'JavaScript',
    description: 'A powerful beast whose troops deal devastating piercing damage',
    unlockLevel: 1,
    rarity: 'common',
    stats: {
      baseHealth: 130,
      baseDamage: 8,
      baseSpeed: 0.9
    },
    ability: {
      name: 'Rampage',
      description: 'All troops deal 50% more damage for 20 seconds',
      type: 'buff',
      cooldown: 80,
      duration: 20,
      effect: {
        type: 'damage_boost',
        target: 'all_troops',
        strength: 0.5
      }
    },
    passive: {
      name: 'Piercing Charge',
      description: 'All troops deal piercing damage (10% more damage to towers)',
      type: 'damage_type',
      effect: {
        piercingDamage: true,
        towerDamageBonus: 0.1
      }
    }
  },
  
  rust: {
    id: 'rust',
    name: 'Phoenix',
    language: 'Rust',
    description: 'A legendary bird that brings resilience and regeneration',
    unlockLevel: 10,
    rarity: 'epic',
    stats: {
      baseHealth: 150,
      baseDamage: 14,
      baseSpeed: 1.1
    },
    ability: {
      name: 'Rebirth',
      description: 'Restore 25% of base HP and revive one destroyed tower',
      type: 'heal',
      cooldown: 120,
      duration: 0,
      effect: {
        type: 'heal_and_revive',
        target: 'self',
        healPercent: 0.25,
        reviveTower: true
      }
    },
    passive: {
      name: 'Memory Safety',
      description: 'Towers have 20% more HP and regenerate 1% HP per second',
      type: 'stat_boost',
      effect: {
        towerHpBonus: 0.2,
        towerRegeneration: 0.01
      }
    }
  },
  
  go: {
    id: 'go',
    name: 'Gopher',
    language: 'Go',
    description: 'Swift and efficient, excels at deploying troops rapidly',
    unlockLevel: 7,
    rarity: 'rare',
    stats: {
      baseHealth: 105,
      baseDamage: 11,
      baseSpeed: 1.3
    },
    ability: {
      name: 'Goroutine Rush',
      description: 'Deploy troops 50% faster for 30 seconds',
      type: 'buff',
      cooldown: 70,
      duration: 30,
      effect: {
        type: 'deploy_speed',
        target: 'self',
        strength: 0.5
      }
    },
    passive: {
      name: 'Concurrency',
      description: 'Reduce all deployment cooldowns by 15%',
      type: 'cooldown_reduction',
      effect: {
        cooldownReduction: 0.15
      }
    }
  }
}

// Tech Tree System
const TECH_TREE = {
  // Starting Economy
  passiveGold: {
    id: 'passiveGold',
    name: 'Passive Gold Generation',
    description: 'Generate gold over time',
    category: 'economy',
    maxLevel: 5,
    costs: [100, 200, 400, 800, 1600],
    effects: [
      { goldPerSecond: 1 },
      { goldPerSecond: 2 },
      { goldPerSecond: 3 },
      { goldPerSecond: 5 },
      { goldPerSecond: 8 }
    ],
    requirements: []
  },
  
  startingGold: {
    id: 'startingGold',
    name: 'Starting Gold',
    description: 'Start matches with more gold',
    category: 'economy',
    maxLevel: 5,
    costs: [150, 300, 600, 1200, 2400],
    effects: [
      { startingGold: 100 },
      { startingGold: 150 },
      { startingGold: 200 },
      { startingGold: 300 },
      { startingGold: 500 }
    ],
    requirements: []
  },
  
  // Troop Upgrades
  troopHealth: {
    id: 'troopHealth',
    name: 'Troop Vitality',
    description: 'Increase troop HP',
    category: 'troops',
    maxLevel: 5,
    costs: [200, 400, 800, 1600, 3200],
    effects: [
      { troopHpBonus: 0.1 },
      { troopHpBonus: 0.15 },
      { troopHpBonus: 0.2 },
      { troopHpBonus: 0.3 },
      { troopHpBonus: 0.5 }
    ],
    requirements: []
  },
  
  troopDamage: {
    id: 'troopDamage',
    name: 'Troop Power',
    description: 'Increase troop damage',
    category: 'troops',
    maxLevel: 5,
    costs: [200, 400, 800, 1600, 3200],
    effects: [
      { troopDamageBonus: 0.1 },
      { troopDamageBonus: 0.15 },
      { troopDamageBonus: 0.2 },
      { troopDamageBonus: 0.3 },
      { troopDamageBonus: 0.5 }
    ],
    requirements: []
  },
  
  // Tower Upgrades
  towerRange: {
    id: 'towerRange',
    name: 'Tower Range',
    description: 'Increase tower attack range',
    category: 'towers',
    maxLevel: 3,
    costs: [250, 500, 1000],
    effects: [
      { towerRangeBonus: 0.15 },
      { towerRangeBonus: 0.25 },
      { towerRangeBonus: 0.4 }
    ],
    requirements: []
  },
  
  towerFireRate: {
    id: 'towerFireRate',
    name: 'Tower Fire Rate',
    description: 'Increase tower attack speed',
    category: 'towers',
    maxLevel: 3,
    costs: [250, 500, 1000],
    effects: [
      { towerFireRateBonus: 0.15 },
      { towerFireRateBonus: 0.25 },
      { towerFireRateBonus: 0.4 }
    ],
    requirements: []
  },
  
  // Abilities
  abilityCooldown: {
    id: 'abilityCooldown',
    name: 'Ability Cooldown',
    description: 'Reduce hero ability cooldowns',
    category: 'abilities',
    maxLevel: 3,
    costs: [300, 600, 1200],
    effects: [
      { abilityCooldownReduction: 0.1 },
      { abilityCooldownReduction: 0.2 },
      { abilityCooldownReduction: 0.3 }
    ],
    requirements: []
  },
  
  // Unit Unlocks
  unlockBasicTroops: {
    id: 'unlockBasicTroops',
    name: 'Basic Troops',
    description: 'Unlock Soldier and Archer units',
    category: 'unlocks',
    maxLevel: 1,
    costs: [0],
    effects: [{ unlockedUnits: ['soldier', 'archer'] }],
    requirements: []
  },
  
  unlockAdvancedTroops: {
    id: 'unlockAdvancedTroops',
    name: 'Advanced Troops',
    description: 'Unlock Knight and Mage units',
    category: 'unlocks',
    maxLevel: 1,
    costs: [500],
    effects: [{ unlockedUnits: ['knight', 'mage'] }],
    requirements: ['unlockBasicTroops']
  },
  
  unlockEliteTroops: {
    id: 'unlockEliteTroops',
    name: 'Elite Troops',
    description: 'Unlock Dragon and Golem units',
    category: 'unlocks',
    maxLevel: 1,
    costs: [2000],
    effects: [{ unlockedUnits: ['dragon', 'golem'] }],
    requirements: ['unlockAdvancedTroops']
  },
  
  // Base Upgrades
  baseDefense: {
    id: 'baseDefense',
    name: 'Base Fortification',
    description: 'Increase base HP',
    category: 'base',
    maxLevel: 5,
    costs: [300, 600, 1200, 2400, 4800],
    effects: [
      { baseHpBonus: 0.1 },
      { baseHpBonus: 0.2 },
      { baseHpBonus: 0.3 },
      { baseHpBonus: 0.5 },
      { baseHpBonus: 0.75 }
    ],
    requirements: []
  }
}

// Unit Types
const UNIT_TYPES = {
  soldier: {
    id: 'soldier',
    name: 'Soldier',
    description: 'Basic melee unit with balanced stats',
    type: 'ground',
    element: 'neutral',
    cost: 50,
    hp: 100,
    damage: 15,
    speed: 2.0,
    attackSpeed: 1.0,
    range: 1,
    unlockLevel: 1
  },
  
  archer: {
    id: 'archer',
    name: 'Archer',
    description: 'Ranged unit with high attack speed',
    type: 'ground',
    element: 'neutral',
    cost: 75,
    hp: 60,
    damage: 20,
    speed: 1.8,
    attackSpeed: 1.5,
    range: 8,
    unlockLevel: 1
  },
  
  knight: {
    id: 'knight',
    name: 'Knight',
    description: 'Heavily armored melee unit',
    type: 'ground',
    element: 'neutral',
    cost: 100,
    hp: 200,
    damage: 25,
    speed: 1.5,
    attackSpeed: 0.8,
    range: 1,
    armor: 5,
    unlockLevel: 3
  },
  
  mage: {
    id: 'mage',
    name: 'Mage',
    description: 'Magic user with area damage',
    type: 'ground',
    element: 'fire',
    cost: 125,
    hp: 80,
    damage: 30,
    speed: 1.6,
    attackSpeed: 0.6,
    range: 10,
    splashRadius: 3,
    unlockLevel: 3
  },
  
  waterElemental: {
    id: 'waterElemental',
    name: 'Water Elemental',
    description: 'Swift water creature',
    type: 'ground',
    element: 'water',
    cost: 100,
    hp: 120,
    damage: 18,
    speed: 2.5,
    attackSpeed: 1.2,
    range: 6,
    unlockLevel: 5
  },
  
  dragon: {
    id: 'dragon',
    name: 'Dragon',
    description: 'Flying unit with devastating breath attack',
    type: 'air',
    element: 'fire',
    cost: 250,
    hp: 300,
    damage: 60,
    speed: 3.0,
    attackSpeed: 0.5,
    range: 12,
    splashRadius: 5,
    unlockLevel: 8
  },
  
  golem: {
    id: 'golem',
    name: 'Golem',
    description: 'Massive tank unit with high HP',
    type: 'ground',
    element: 'earth',
    cost: 200,
    hp: 500,
    damage: 35,
    speed: 1.0,
    attackSpeed: 0.6,
    range: 1,
    armor: 10,
    unlockLevel: 8
  }
}

// Tower Types
const TOWER_TYPES = {
  basic: {
    id: 'basic',
    name: 'Arrow Tower',
    description: 'Standard defensive tower',
    cost: 100,
    hp: 300,
    damage: 25,
    range: 10,
    fireRate: 1.0,
    unlockLevel: 1
  },
  
  cannon: {
    id: 'cannon',
    name: 'Cannon Tower',
    description: 'High damage, slow fire rate',
    cost: 150,
    hp: 350,
    damage: 50,
    range: 12,
    fireRate: 0.5,
    splashRadius: 3,
    unlockLevel: 3
  },
  
  lightning: {
    id: 'lightning',
    name: 'Lightning Tower',
    description: 'Chains damage to multiple enemies',
    cost: 200,
    hp: 250,
    damage: 30,
    range: 8,
    fireRate: 0.8,
    chainCount: 3,
    unlockLevel: 5
  },
  
  frost: {
    id: 'frost',
    name: 'Frost Tower',
    description: 'Slows enemies',
    cost: 175,
    hp: 300,
    damage: 20,
    range: 9,
    fireRate: 1.2,
    slowPercent: 0.4,
    slowDuration: 2,
    unlockLevel: 5
  },
  
  laser: {
    id: 'laser',
    name: 'Laser Tower',
    description: 'Continuous beam damage',
    cost: 300,
    hp: 200,
    damage: 15, // per tick
    range: 15,
    continuous: true,
    unlockLevel: 8
  }
}

export {
  HEROES,
  TECH_TREE,
  UNIT_TYPES,
  TOWER_TYPES
}

