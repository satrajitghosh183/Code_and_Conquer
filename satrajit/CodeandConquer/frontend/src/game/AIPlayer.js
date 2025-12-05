// AI Player System for Single Player Mode
// Features adaptive learning based on game outcomes
import * as THREE from 'three'

// Q-learning parameters storage key
const AI_LEARNING_KEY = 'ai_player_learning_data'

export class AIPlayer {
  constructor(game, difficulty = 'medium') {
    this.game = game
    this.difficulty = difficulty
    
    // AI behavior parameters per difficulty
    this.difficultySettings = {
      easy: {
        buildDelay: 3000,
        upgradeThreshold: 0.5,
        defensiveRatio: 0.7,
        reactionTime: 2000,
        learningRate: 0.05,
        explorationRate: 0.3
      },
      medium: {
        buildDelay: 2000,
        upgradeThreshold: 0.6,
        defensiveRatio: 0.6,
        reactionTime: 1000,
        learningRate: 0.1,
        explorationRate: 0.2
      },
      hard: {
        buildDelay: 1000,
        upgradeThreshold: 0.7,
        defensiveRatio: 0.5,
        reactionTime: 500,
        learningRate: 0.15,
        explorationRate: 0.1
      },
      adaptive: {
        buildDelay: 1500,
        upgradeThreshold: 0.65,
        defensiveRatio: 0.55,
        reactionTime: 750,
        learningRate: 0.2,
        explorationRate: 0.15
      }
    }
    
    this.settings = this.difficultySettings[difficulty] || this.difficultySettings.medium
    
    // State
    this.lastBuildTime = 0
    this.buildQueue = []
    this.strategy = 'balanced'
    this.targetPositions = []
    
    // Learning state (Q-learning inspired)
    this.qTable = this.loadLearningData()
    this.currentState = null
    this.lastAction = null
    this.episodeRewards = []
    this.gameStartHealth = 1000
    this.gameStartGold = 500
    this.towersBuilt = []
    this.wavesSurvived = 0
    
    // Performance tracking
    this.actionHistory = []
    this.performanceMetrics = {
      successfulDefenses: 0,
      failedDefenses: 0,
      averageWaveSurvival: 0,
      bestWave: 0
    }
    
    // Analyze map for strategic positions
    this.analyzeMap()
    
    // Subscribe to game events
    this.setupEventListeners()
  }
  
  setupEventListeners() {
    // Track wave completions
    if (this.game.callbacks) {
      const originalWaveChange = this.game.callbacks.onWaveChange
      this.game.callbacks.onWaveChange = (wave) => {
        this.wavesSurvived = wave
        this.onWaveComplete(wave)
        if (originalWaveChange) originalWaveChange(wave)
      }
    }
  }
  
  loadLearningData() {
    try {
      const saved = localStorage.getItem(AI_LEARNING_KEY)
      if (saved) {
        const data = JSON.parse(saved)
        console.log('🧠 AI loaded learning data:', Object.keys(data).length, 'states')
        return data
      }
    } catch (e) {
      console.warn('Failed to load AI learning data:', e)
    }
    return {}
  }
  
  saveLearningData() {
    try {
      localStorage.setItem(AI_LEARNING_KEY, JSON.stringify(this.qTable))
    } catch (e) {
      console.warn('Failed to save AI learning data:', e)
    }
  }
  
  // Get state representation for Q-learning
  getState() {
    const healthPercent = Math.floor((this.game.health / this.game.maxHealth) * 10) / 10
    const goldBucket = Math.floor(this.game.gold / 100)
    const towerCount = this.game.towers?.length || 0
    const enemyCount = Math.min(this.game.enemies?.length || 0, 20)
    const wave = this.game.wave || 0
    
    return `h${healthPercent}_g${goldBucket}_t${towerCount}_e${enemyCount}_w${wave}`
  }
  
  // Get Q-value for state-action pair
  getQValue(state, action) {
    const key = `${state}:${action}`
    return this.qTable[key] || 0
  }
  
  // Update Q-value using Q-learning formula
  updateQValue(state, action, reward, nextState) {
    const key = `${state}:${action}`
    const currentQ = this.getQValue(state, action)
    
    // Get max Q-value for next state
    const nextActions = this.getAvailableActions()
    const maxNextQ = Math.max(...nextActions.map(a => this.getQValue(nextState, a)), 0)
    
    // Q-learning update
    const newQ = currentQ + this.settings.learningRate * (reward + 0.9 * maxNextQ - currentQ)
    this.qTable[key] = newQ
    
    // Periodically save
    if (Math.random() < 0.1) {
      this.saveLearningData()
    }
  }
  
  // Get all available actions
  getAvailableActions() {
    const actions = ['wait']
    const gold = this.game.gold
    
    if (gold >= 50) actions.push('build_gattling')
    if (gold >= 100) actions.push('build_frost')
    if (gold >= 120) actions.push('build_sniper')
    if (gold >= 150) actions.push('build_missile')
    if (gold >= 180) actions.push('build_tesla')
    if (gold >= 200) actions.push('build_laser')
    if (gold >= 50) actions.push('build_wall')
    
    return actions
  }
  
  // Choose action using epsilon-greedy strategy
  chooseAction(state) {
    const actions = this.getAvailableActions()
    
    // Exploration: random action
    if (Math.random() < this.settings.explorationRate) {
      return actions[Math.floor(Math.random() * actions.length)]
    }
    
    // Exploitation: best known action
    let bestAction = 'wait'
    let bestValue = -Infinity
    
    for (const action of actions) {
      const value = this.getQValue(state, action)
      if (value > bestValue) {
        bestValue = value
        bestAction = action
      }
    }
    
    return bestAction
  }
  
  analyzeMap() {
    // Find strategic positions - chokepoints near the path
    // These positions cover multiple path segments
    this.targetPositions = [
      { x: 10, z: 20, priority: 5, role: 'entrance' },
      { x: -15, z: 20, priority: 4, role: 'entrance' },
      { x: 15, z: 10, priority: 4, role: 'mid' },
      { x: -10, z: 5, priority: 5, role: 'chokepoint' },
      { x: 10, z: 0, priority: 3, role: 'mid' },
      { x: -10, z: -10, priority: 5, role: 'chokepoint' },
      { x: 5, z: -15, priority: 4, role: 'base_defense' },
      { x: -5, z: -15, priority: 4, role: 'base_defense' },
      { x: 15, z: -10, priority: 3, role: 'flank' },
      { x: -20, z: 0, priority: 3, role: 'flank' },
      { x: 20, z: 10, priority: 2, role: 'outer' },
      { x: -20, z: 15, priority: 2, role: 'outer' }
    ]
    
    // Sort by priority
    this.targetPositions.sort((a, b) => b.priority - a.priority)
  }
  
  update(deltaTime, currentTime) {
    if (this.game.isPaused || this.game.gameOver) {
      // Game over - learn from outcome
      if (this.game.gameOver && this.lastAction) {
        this.onGameEnd(this.game.health > 0)
      }
      return
    }
    
    // Check if it's time to make a decision
    if (currentTime - this.lastBuildTime < this.settings.buildDelay) return
    
    // Get current state
    const state = this.getState()
    
    // Update strategy based on game state
    this.updateStrategy()
    
    // Choose action using Q-learning
    const action = this.chooseAction(state)
    
    // Execute action
    const success = this.executeAction(action)
    
    // Calculate immediate reward
    const reward = this.calculateReward(success, action)
    
    // Update Q-value if we had a previous action
    if (this.lastAction && this.currentState) {
      this.updateQValue(this.currentState, this.lastAction, reward, state)
    }
    
    // Track for next update
    this.currentState = state
    this.lastAction = action
    this.lastBuildTime = currentTime
    
    // Track action history
    this.actionHistory.push({
      time: currentTime,
      state,
      action,
      success,
      reward
    })
  }
  
  updateStrategy() {
    const healthPercent = this.game.health / this.game.maxHealth
    const goldPercent = this.game.gold / 1000
    const enemyPressure = (this.game.enemies?.length || 0) / 10
    
    // Adaptive strategy selection
    if (healthPercent < 0.3) {
      this.strategy = 'desperate'
    } else if (healthPercent < 0.5 && enemyPressure > 0.5) {
      this.strategy = 'defensive'
    } else if (goldPercent > 0.8 && healthPercent > 0.7) {
      this.strategy = 'aggressive'
    } else if (enemyPressure > 0.8) {
      this.strategy = 'reactive'
    } else {
      this.strategy = 'balanced'
    }
  }
  
  calculateReward(success, action) {
    let reward = 0
    
    // Reward for successful builds
    if (success && action !== 'wait') {
      reward += 5
      
      // Extra reward based on strategy alignment
      if (this.strategy === 'defensive' && action.includes('gattling')) {
        reward += 3
      }
      if (this.strategy === 'aggressive' && action.includes('missile')) {
        reward += 3
      }
    }
    
    // Reward/penalty based on health
    const healthPercent = this.game.health / this.game.maxHealth
    if (healthPercent < 0.3) {
      reward -= 2 // Penalty for low health
    } else if (healthPercent > 0.8) {
      reward += 1 // Reward for maintaining health
    }
    
    // Reward for killing enemies (check if enemy count decreased)
    if (this.game.enemies && this.lastEnemyCount !== undefined) {
      const enemiesKilled = Math.max(0, this.lastEnemyCount - this.game.enemies.length)
      reward += enemiesKilled * 2
    }
    this.lastEnemyCount = this.game.enemies?.length || 0
    
    return reward
  }
  
  executeAction(action) {
    if (action === 'wait') return true
    
    const [_, towerType] = action.split('_')
    
    // Find best position for this tower type
    const position = this.findBestPosition(towerType)
    if (!position) return false
    
    // Build structure
    const structureConfig = this.getStructureConfig(towerType)
    if (!structureConfig) return false
    
    const success = this.game.placeStructure(structureConfig, position)
    
    if (success) {
      this.towersBuilt.push({
        type: towerType,
        position: position.clone(),
        wave: this.game.wave
      })
    }
    
    return success
  }
  
  findBestPosition(structureType) {
    // Different placement strategies for different tower types
    let priorityFilter = () => true
    
    switch (structureType) {
      case 'gattling':
      case 'frost':
        // Place near chokepoints
        priorityFilter = pos => pos.role === 'chokepoint' || pos.role === 'entrance'
        break
      case 'missile':
      case 'tesla':
        // Place in middle for splash coverage
        priorityFilter = pos => pos.role === 'mid' || pos.role === 'chokepoint'
        break
      case 'sniper':
      case 'laser':
        // Place with good line of sight
        priorityFilter = pos => pos.role === 'flank' || pos.role === 'outer'
        break
      case 'wall':
        // Place to create chokepoints
        priorityFilter = pos => pos.role !== 'base_defense'
        break
    }
    
    // Filter and try positions
    const filteredPositions = this.targetPositions.filter(priorityFilter)
    const positions = [...filteredPositions, ...this.targetPositions]
    
    for (const pos of positions) {
      const worldPos = new THREE.Vector3(pos.x, 0, pos.z)
      
      if (this.game.isValidPlacement(worldPos)) {
        // Check if not too close to existing structures
        let tooClose = false
        for (const structure of this.game.structures || []) {
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
    for (let i = 0; i < 30; i++) {
      const x = (Math.random() - 0.5) * 60
      const z = (Math.random() - 0.5) * 60
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
  
  onWaveComplete(wave) {
    // Reward for surviving wave
    if (this.currentState && this.lastAction) {
      const waveBonus = 10 + wave * 2
      this.updateQValue(this.currentState, this.lastAction, waveBonus, this.getState())
    }
    
    // Track performance
    this.performanceMetrics.successfulDefenses++
    if (wave > this.performanceMetrics.bestWave) {
      this.performanceMetrics.bestWave = wave
    }
    
    // Decrease exploration rate over time (exploit more as we learn)
    this.settings.explorationRate = Math.max(0.05, this.settings.explorationRate * 0.95)
  }
  
  onGameEnd(won) {
    // Large reward/penalty for game outcome
    const finalReward = won ? 100 : -50
    
    if (this.currentState && this.lastAction) {
      this.updateQValue(this.currentState, this.lastAction, finalReward, 'terminal')
    }
    
    // Update performance metrics
    if (won) {
      this.performanceMetrics.successfulDefenses++
    } else {
      this.performanceMetrics.failedDefenses++
    }
    
    // Calculate average wave survival
    const totalGames = this.performanceMetrics.successfulDefenses + this.performanceMetrics.failedDefenses
    this.performanceMetrics.averageWaveSurvival = 
      (this.performanceMetrics.averageWaveSurvival * (totalGames - 1) + this.wavesSurvived) / totalGames
    
    // Save all learning data
    this.saveLearningData()
    
    console.log('🧠 AI Game End Stats:', {
      won,
      wavesSurvived: this.wavesSurvived,
      towersBuilt: this.towersBuilt.length,
      totalStates: Object.keys(this.qTable).length,
      explorationRate: this.settings.explorationRate
    })
  }
  
  // Get AI performance stats
  getStats() {
    return {
      ...this.performanceMetrics,
      learnedStates: Object.keys(this.qTable).length,
      explorationRate: this.settings.explorationRate,
      currentStrategy: this.strategy
    }
  }
  
  // Reset learning data
  resetLearning() {
    this.qTable = {}
    this.performanceMetrics = {
      successfulDefenses: 0,
      failedDefenses: 0,
      averageWaveSurvival: 0,
      bestWave: 0
    }
    this.settings.explorationRate = this.difficultySettings[this.difficulty].explorationRate
    this.saveLearningData()
    console.log('🧠 AI learning data reset')
  }
}

export default AIPlayer
