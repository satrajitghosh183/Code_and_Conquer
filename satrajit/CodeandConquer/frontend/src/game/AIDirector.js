// =============================================================================
// ADVANCED AI DIRECTOR - Intelligent Wave Composition & Difficulty Scaling
// =============================================================================
// Dynamically adjusts difficulty based on player performance
// Creates varied and challenging wave compositions
// =============================================================================

import * as THREE from 'three'

export class AIDirector {
  constructor(game, pathManager) {
    this.game = game
    this.pathManager = pathManager
    
    // Difficulty modifiers
    this.difficultyFactor = 1.0
    this.aggressiveness = 0.5 // How aggressively AI escalates
    this.adaptationSpeed = 0.1 // How fast AI adapts to player skill
    
    // Player performance tracking
    this.playerMomentum = 0 // Positive = doing well, negative = struggling
    this.recentDamage = []
    this.recentWaveTimes = []
    this.towersBuilt = 0
    this.lastTowerCount = 0
    
    // Wave history
    this.waveHistory = []
    this.lastWaveType = null
    
    // Special event tracking
    this.wavesSinceBoss = 0
    this.wavesSinceSwarm = 0
    this.wavesSinceElite = 0
    
    // Enemy composition weights
    this.enemyWeights = {
      spider: 1.0,
      scout: 0.8,
      swarm: 0.6,
      brute: 0.5,
      armored: 0.4,
      healer: 0.3,
      splitter: 0.3,
      assassin: 0.2,
      tank: 0.2,
      disruptor: 0.15,
      berserker: 0.2,
      boss: 0.1,
      carrier: 0.15,
      phantom: 0.15,
      juggernaut: 0.1
    }
    
    console.log('🧠 AI Director initialized')
  }
  
  // Record the outcome of a completed wave
  recordWaveOutcome({ livesLost = 0, completionTime = 0, damageDealt = 0, towersLost = 0 }) {
    // Track performance
    this.recentDamage.push(livesLost)
    if (this.recentDamage.length > 5) this.recentDamage.shift()
    
    this.recentWaveTimes.push(completionTime)
    if (this.recentWaveTimes.length > 5) this.recentWaveTimes.shift()
    
    // Update player momentum
    if (livesLost === 0) {
      this.playerMomentum += 0.2
      this.difficultyFactor = Math.min(1.8, this.difficultyFactor + 0.05)
    } else if (livesLost >= 3) {
      this.playerMomentum -= 0.3
      this.difficultyFactor = Math.max(0.7, this.difficultyFactor - 0.08)
    } else {
      this.playerMomentum *= 0.9 // Slight decay towards neutral
    }
    
    // Clamp momentum
    this.playerMomentum = Math.max(-1, Math.min(1, this.playerMomentum))
    
    // Track tower building
    const currentTowers = this.game.towers?.length || 0
    this.towersBuilt += Math.max(0, currentTowers - this.lastTowerCount)
    this.lastTowerCount = currentTowers
    
    // Adjust aggressiveness based on player skill
    if (this.playerMomentum > 0.5) {
      this.aggressiveness = Math.min(0.9, this.aggressiveness + 0.1)
    } else if (this.playerMomentum < -0.3) {
      this.aggressiveness = Math.max(0.2, this.aggressiveness - 0.1)
    }
    
    console.log(`📊 AI Analysis: Momentum=${this.playerMomentum.toFixed(2)}, Difficulty=${this.difficultyFactor.toFixed(2)}, Aggression=${this.aggressiveness.toFixed(2)}`)
  }
  
  // Analyze current game state
  analyzeGameState() {
    const towers = this.game.towers || []
    const gold = this.game.gold || 0
    const health = this.game.health || this.game.mainBase?.health || 1000
    const maxHealth = this.game.maxHealth || this.game.mainBase?.maxHealth || 1000
    
    // Calculate tower coverage
    const towerDPS = towers.reduce((sum, t) => sum + (t.damage || 20) * (t.fireRate || 1), 0)
    const towerCoverage = this._calculatePathCoverage(towers)
    
    // Player strength assessment
    const healthRatio = health / maxHealth
    const economicStrength = gold / 500 // Relative to a decent gold amount
    const defensiveStrength = towerDPS / 100 // Relative to expected DPS
    
    return {
      towerCount: towers.length,
      towerDPS,
      towerCoverage,
      healthRatio,
      economicStrength,
      defensiveStrength,
      overallStrength: (healthRatio * 0.3 + economicStrength * 0.2 + defensiveStrength * 0.5)
    }
  }
  
  _calculatePathCoverage(towers) {
    if (!this.pathManager) return 0.5
    
    const mainPath = this.pathManager.getPath('main')
    if (!mainPath || !mainPath.waypoints) return 0.5
    
    let coveredPoints = 0
    const checkPoints = mainPath.waypoints
    
    checkPoints.forEach(waypoint => {
      const waypointPos = new THREE.Vector3(waypoint.x, waypoint.y || 0.5, waypoint.z)
      const inRange = towers.some(tower => {
        if (!tower.position) return false
        return tower.position.distanceTo(waypointPos) <= (tower.range || 12)
      })
      if (inRange) coveredPoints++
    })
    
    return checkPoints.length > 0 ? coveredPoints / checkPoints.length : 0.5
  }
  
  // Get weak points in player defense
  getWeakPoints() {
    if (!this.pathManager) return []
    
    const mainPath = this.pathManager.getPath('main')
    if (!mainPath || !mainPath.waypoints) return []
    
    const towers = this.game.towers || []
    const weakPoints = []
    
    mainPath.waypoints.forEach((waypoint, index) => {
      const waypointPos = { x: waypoint.x, y: waypoint.y || 0.5, z: waypoint.z }
      
      // Calculate total tower firepower covering this point
      let coverageStrength = 0
      towers.forEach(tower => {
        if (!tower.position) return
        const dist = Math.sqrt(
          Math.pow(tower.position.x - waypointPos.x, 2) +
          Math.pow(tower.position.z - waypointPos.z, 2)
        )
        
        if (dist <= (tower.range || 12)) {
          const effectiveness = 1 - (dist / (tower.range || 12))
          coverageStrength += (tower.damage || 20) * effectiveness
        }
      })
      
      if (coverageStrength < 30) { // Weak coverage threshold
        weakPoints.push({
          position: waypointPos,
          index,
          coverage: coverageStrength
        })
      }
    })
    
    return weakPoints
  }
  
  // Determine wave type based on history and game state
  determineWaveType(waveNumber) {
    this.wavesSinceBoss++
    this.wavesSinceSwarm++
    this.wavesSinceElite++
    
    // Mandatory boss waves
    if (waveNumber % 10 === 0 && waveNumber > 0) {
      this.wavesSinceBoss = 0
      return 'megaBoss'
    }
    if (waveNumber % 5 === 0 && waveNumber > 0) {
      this.wavesSinceBoss = 0
      return 'boss'
    }
    
    // Dynamic wave type selection
    const gameState = this.analyzeGameState()
    const rand = Math.random()
    
    // If player is strong, throw harder waves
    if (gameState.overallStrength > 0.7 && this.playerMomentum > 0.3) {
      if (rand < 0.3) return 'elite'
      if (rand < 0.5) return 'tank'
      if (rand < 0.7) return 'rush'
    }
    
    // If player is weak, give breathing room
    if (gameState.overallStrength < 0.3 || this.playerMomentum < -0.3) {
      return 'standard'
    }
    
    // Variety-based selection
    if (this.wavesSinceSwarm > 4 && rand < 0.25) {
      this.wavesSinceSwarm = 0
      return 'swarm'
    }
    
    if (this.wavesSinceElite > 3 && rand < 0.3) {
      this.wavesSinceElite = 0
      return 'elite'
    }
    
    // Default to weighted random
    const types = ['standard', 'mixed', 'rush', 'tank', 'swarm']
    const weights = [0.3, 0.25, 0.2, 0.15, 0.1]
    
    let cumulative = 0
    for (let i = 0; i < types.length; i++) {
      cumulative += weights[i]
      if (rand < cumulative) {
        if (types[i] === 'swarm') this.wavesSinceSwarm = 0
        return types[i]
      }
    }
    
    return 'standard'
  }
  
  // Plan the wave composition
  planWave(waveNumber) {
    const waveType = this.determineWaveType(waveNumber)
    const gameState = this.analyzeGameState()
    const weakPoints = this.getWeakPoints()
    
    // Base scaling
    const baseScale = 1 + (waveNumber - 1) * 0.12
    const difficultyMod = this.difficultyFactor
    const aggressionMod = 1 + (this.aggressiveness - 0.5) * 0.4
    const scale = baseScale * difficultyMod * aggressionMod
    
    let groups = []
    
    switch (waveType) {
      case 'megaBoss':
        groups = this._createMegaBossWave(waveNumber, scale)
        break
      case 'boss':
        groups = this._createBossWave(waveNumber, scale)
        break
      case 'elite':
        groups = this._createEliteWave(waveNumber, scale)
        break
      case 'swarm':
        groups = this._createSwarmWave(waveNumber, scale)
        break
      case 'tank':
        groups = this._createTankWave(waveNumber, scale)
        break
      case 'rush':
        groups = this._createRushWave(waveNumber, scale)
        break
      case 'mixed':
        groups = this._createMixedWave(waveNumber, scale)
        break
      default:
        groups = this._createStandardWave(waveNumber, scale)
    }
    
    // Adjust for weak points if player is doing well
    if (this.playerMomentum > 0.2 && weakPoints.length > 0) {
      // Add fast units to exploit weak coverage
      groups.push({ type: 'scout', count: Math.ceil(2 + weakPoints.length * scale) })
    }
    
    const totalEnemies = groups.reduce((sum, g) => sum + g.count, 0)
    
    // Store wave history
    this.waveHistory.push({
      wave: waveNumber,
      type: waveType,
      enemies: totalEnemies,
      playerStrength: gameState.overallStrength
    })
    
    if (this.waveHistory.length > 20) this.waveHistory.shift()
    
    console.log(`🎯 Wave ${waveNumber} planned: ${waveType} (${totalEnemies} enemies)`, groups)
    
    return {
      number: waveNumber,
      type: waveType,
      groups,
      totalEnemies
    }
  }
  
  _createStandardWave(wave, scale) {
    const groups = [
      { type: 'spider', count: Math.ceil(6 * scale) }
    ]
    
    if (wave >= 2) {
      groups.push({ type: 'scout', count: Math.ceil(3 * scale) })
    }
    if (wave >= 4) {
      groups.push({ type: 'brute', count: Math.ceil(1 * scale) })
    }
    
    return groups
  }
  
  _createMixedWave(wave, scale) {
    return [
      { type: 'spider', count: Math.ceil(4 * scale) },
      { type: 'scout', count: Math.ceil(3 * scale) },
      { type: 'brute', count: Math.ceil(2 * scale) },
      { type: 'armored', count: Math.ceil(1 * scale) }
    ]
  }
  
  _createRushWave(wave, scale) {
    return [
      { type: 'scout', count: Math.ceil(8 * scale) },
      { type: 'spider', count: Math.ceil(6 * scale) },
      { type: 'swarm', count: Math.ceil(10 * scale) }
    ]
  }
  
  _createSwarmWave(wave, scale) {
    return [
      { type: 'swarm', count: Math.ceil(25 * scale) },
      { type: 'scout', count: Math.ceil(6 * scale) }
    ]
  }
  
  _createTankWave(wave, scale) {
    return [
      { type: 'brute', count: Math.ceil(4 * scale) },
      { type: 'armored', count: Math.ceil(3 * scale) },
      { type: 'healer', count: Math.ceil(1 * scale) }
    ]
  }
  
  _createEliteWave(wave, scale) {
    const groups = [
      { type: 'armored', count: Math.ceil(3 * scale) },
      { type: 'brute', count: Math.ceil(2 * scale) }
    ]
    
    if (wave >= 10) {
      groups.push({ type: 'splitter', count: Math.ceil(2 * scale) })
    }
    if (wave >= 12) {
      groups.push({ type: 'healer', count: Math.ceil(2 * scale) })
    }
    
    return groups
  }
  
  _createBossWave(wave, scale) {
    return [
      { type: 'boss', count: 1 },
      { type: 'healer', count: Math.ceil(2 * scale) },
      { type: 'armored', count: Math.ceil(3 * scale) },
      { type: 'spider', count: Math.ceil(4 * scale) }
    ]
  }
  
  _createMegaBossWave(wave, scale) {
    return [
      { type: 'boss', count: 2 },
      { type: 'healer', count: Math.ceil(3 * scale) },
      { type: 'armored', count: Math.ceil(5 * scale) },
      { type: 'brute', count: Math.ceil(3 * scale) }
    ]
  }
  
  // Get AI statistics
  getStats() {
    return {
      difficultyFactor: this.difficultyFactor,
      aggressiveness: this.aggressiveness,
      playerMomentum: this.playerMomentum,
      wavesSinceBoss: this.wavesSinceBoss,
      waveHistory: this.waveHistory.slice(-5)
    }
  }
  
  // Reset AI state
  reset() {
    this.difficultyFactor = 1.0
    this.aggressiveness = 0.5
    this.playerMomentum = 0
    this.recentDamage = []
    this.recentWaveTimes = []
    this.waveHistory = []
    this.wavesSinceBoss = 0
    this.wavesSinceSwarm = 0
    this.wavesSinceElite = 0
  }
}

export default AIDirector
