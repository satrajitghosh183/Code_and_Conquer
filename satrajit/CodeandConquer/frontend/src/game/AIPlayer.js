// AI Player System for Single Player Mode
// Inspired by tower-of-time-game and dabbott/towerdefense

export class AIPlayer {
  constructor(game, difficulty = 'medium') {
    this.game = game
    this.difficulty = difficulty
    
    // AI behavior parameters
    this.difficultySettings = {
      easy: {
        buildDelay: 3000,      // 3 seconds between builds
        upgradeThreshold: 0.5,  // Upgrade at 50% gold
        defensiveRatio: 0.7,    // 70% defensive towers
        reactionTime: 2000      // 2 second reaction time
      },
      medium: {
        buildDelay: 2000,
        upgradeThreshold: 0.6,
        defensiveRatio: 0.6,
        reactionTime: 1000
      },
      hard: {
        buildDelay: 1000,
        upgradeThreshold: 0.7,
        defensiveRatio: 0.5,
        reactionTime: 500
      }
    }
    
    this.settings = this.difficultySettings[difficulty]
    
    // State
    this.lastBuildTime = 0
    this.buildQueue = []
    this.strategy = 'balanced' // balanced, aggressive, defensive
    this.targetPositions = []
    
    // Analyze map for strategic positions
    this.analyzeMap()
  }
  
  analyzeMap() {
    // Find chokepoints and strategic positions
    // For now, use predefined positions near path
    this.targetPositions = [
      { x: -20, z: 0, priority: 3 },
      { x: -10, z: -10, priority: 2 },
      { x: 10, z: -10, priority: 2 },
      { x: 20, z: 0, priority: 3 },
      { x: 0, z: 10, priority: 1 },
      { x: -15, z: 15, priority: 1 }
    ]
  }
  
  update(deltaTime, currentTime) {
    if (this.game.isPaused || this.game.gameOver) return
    
    // Check if it's time to make a decision
    if (currentTime - this.lastBuildTime < this.settings.buildDelay) return
    
    // Update strategy based on game state
    this.updateStrategy()
    
    // Make decision
    const decision = this.makeDecision()
    
    if (decision) {
      this.executeDecision(decision)
      this.lastBuildTime = currentTime
    }
  }
  
  updateStrategy() {
    const healthPercent = this.game.health / this.game.maxHealth
    const goldPercent = this.game.gold / 1000 // Normalized
    
    if (healthPercent < 0.3) {
      this.strategy = 'defensive'
    } else if (goldPercent > 0.8) {
      this.strategy = 'aggressive'
    } else {
      this.strategy = 'balanced'
    }
  }
  
  makeDecision() {
    // Priority order:
    // 1. Build defensive towers if health is low
    // 2. Build offensive towers if gold is high
    // 3. Build walls to create chokepoints
    // 4. Upgrade existing towers
    
    const healthPercent = this.game.health / this.game.maxHealth
    const gold = this.game.gold
    
    // Emergency: Build defensive towers
    if (healthPercent < 0.4 && gold >= 50) {
      return {
        type: 'build',
        structure: 'gattling',
        priority: 10
      }
    }
    
    // Build walls to create chokepoints
    if (this.strategy === 'defensive' && gold >= 50 && Math.random() < 0.3) {
      return {
        type: 'build',
        structure: 'wall',
        priority: 5
      }
    }
    
    // Build towers based on strategy
    if (gold >= 150) {
      const towerTypes = ['gattling', 'missile', 'sniper', 'frost']
      const weights = {
        balanced: [0.3, 0.3, 0.2, 0.2],
        aggressive: [0.2, 0.4, 0.3, 0.1],
        defensive: [0.4, 0.2, 0.2, 0.2]
      }
      
      const weightArray = weights[this.strategy]
      const random = Math.random()
      let cumulative = 0
      
      for (let i = 0; i < towerTypes.length; i++) {
        cumulative += weightArray[i]
        if (random < cumulative) {
          const towerType = towerTypes[i]
          const cost = this.getTowerCost(towerType)
          if (gold >= cost) {
            return {
              type: 'build',
              structure: towerType,
              priority: 3
            }
          }
        }
      }
    }
    
    // Build cheap towers if low on gold
    if (gold >= 50 && gold < 150) {
      return {
        type: 'build',
        structure: 'gattling',
        priority: 2
      }
    }
    
    return null
  }
  
  getTowerCost(towerType) {
    const costs = {
      gattling: 50,
      missile: 150,
      sniper: 120,
      frost: 100,
      fire: 100,
      tesla: 180,
      laser: 200,
      wall: 50,
      spawner: 250
    }
    return costs[towerType] || 100
  }
  
  executeDecision(decision) {
    if (decision.type === 'build') {
      // Find best position
      const position = this.findBestPosition(decision.structure)
      
      if (position) {
        // Build structure
        const structureConfig = this.getStructureConfig(decision.structure)
        if (structureConfig) {
          this.game.placeStructure(structureConfig, position)
        }
      }
    }
  }
  
  findBestPosition(structureType) {
    // Try strategic positions first
    const positions = [...this.targetPositions].sort((a, b) => b.priority - a.priority)
    
    for (const pos of positions) {
      const worldPos = new THREE.Vector3(pos.x, 0, pos.z)
      
      // Check if position is valid
      if (this.game.isValidPlacement(worldPos)) {
        // Check if not too close to existing structures
        let tooClose = false
        for (const structure of this.game.structures) {
          if (structure.position && structure.position.distanceTo(worldPos) < 5) {
            tooClose = true
            break
          }
        }
        
        if (!tooClose) {
          return worldPos
        }
      }
    }
    
    // Fallback: random valid position
    for (let i = 0; i < 20; i++) {
      const x = (Math.random() - 0.5) * 40
      const z = (Math.random() - 0.5) * 40
      const pos = new THREE.Vector3(x, 0, z)
      
      if (this.game.isValidPlacement(pos)) {
        return pos
      }
    }
    
    return null
  }
  
  getStructureConfig(structureId) {
    const mapping = {
      'gattling': { type: 'tower', towerType: 'gattling' },
      'missile': { type: 'tower', towerType: 'missile' },
      'sniper': { type: 'tower', towerType: 'sniper' },
      'frost': { type: 'tower', towerType: 'frost' },
      'fire': { type: 'tower', towerType: 'fire' },
      'tesla': { type: 'tower', towerType: 'tesla' },
      'laser': { type: 'tower', towerType: 'laser' },
      'wall': { type: 'wall', wallType: 'maze' },
      'spawner': { type: 'spawner', spawnerType: 'barracks' }
    }
    
    return mapping[structureId] || null
  }
}

export default AIPlayer


