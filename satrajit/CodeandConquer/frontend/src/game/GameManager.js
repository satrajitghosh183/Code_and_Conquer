// GameManager - Central game state management
// Integrates features from chriscourses/tower-defense and hwisoo/phaser-tower-defense

export class GameManager {
  constructor(callbacks = {}) {
    // Game state
    this.state = 'menu' // menu, playing, paused, gameover, victory
    this.gold = 500
    this.lives = 100
    this.kills = 0
    this.score = 0
    this.wave = 0
    this.level = 1
    this.time = 0
    this.upgradeLevel = 1
    
    // Upgrades and unlocks
    this.upgrades = {
      damage: 1.0,
      range: 1.0,
      fireRate: 1.0,
      goldMultiplier: 1.0
    }
    
    // Stats tracking
    this.stats = {
      totalGoldEarned: 0,
      totalDamageDealt: 0,
      towersBuilt: 0,
      enemiesKilled: 0,
      wavesCompleted: 0,
      problemsSolved: 0,
      longestStreak: 0
    }
    
    // Callbacks
    this.callbacks = callbacks
    
    // Selected structure for building
    this.selectedStructure = null
    
    // Hotkey mappings (from Phaser TD)
    this.hotkeyMappings = {
      '1': 'gattling',
      '2': 'missile',
      '3': 'laser',
      '4': 'sniper',
      '5': 'frost',
      '6': 'fire',
      '7': 'tesla',
      '8': 'wall',
      '9': 'spawner',
      'q': 'gattling',
      'w': 'missile',
      'e': 'laser',
      'r': 'sniper',
      't': 'frost',
      'y': 'fire',
      'u': 'tesla'
    }
    
    // Auto-wave settings
    this.autoWave = false
    this.waveInterval = 30000 // 30 seconds between waves
    this.lastWaveTime = 0
    
    // Difficulty scaling (from Phaser TD)
    this.difficultyScale = {
      enemyHealth: 1.0,
      enemySpeed: 1.0,
      spawnRate: 1.0
    }
  }
  
  // Initialize game
  init() {
    this.state = 'playing'
    this.gold = 500
    this.lives = 100
    this.kills = 0
    this.score = 0
    this.wave = 0
    this.level = 1
    this.time = 0
    this.lastWaveTime = 0
    
    this.notifyUI()
    
    if (this.callbacks.onGameStart) {
      this.callbacks.onGameStart()
    }
  }
  
  // Update game time and level
  update(deltaTime) {
    if (this.state !== 'playing') return
    
    this.time += deltaTime
    
    // Level increases every 40 seconds (from Phaser TD)
    const newLevel = Math.floor(this.time / 40) + 1
    if (newLevel !== this.level) {
      this.level = newLevel
      this.updateDifficulty()
      this.notifyUI()
      
      if (this.callbacks.onLevelUp) {
        this.callbacks.onLevelUp(this.level)
      }
    }
    
    // Auto-wave spawning
    if (this.autoWave && this.time - this.lastWaveTime >= this.waveInterval / 1000) {
      this.startWave()
    }
  }
  
  // Update difficulty based on level and kills
  updateDifficulty() {
    this.difficultyScale.enemyHealth = 1.0 + (this.kills * 0.06) + (this.level * 0.1)
    this.difficultyScale.enemySpeed = 1.0 + (this.level * 0.05)
    this.difficultyScale.spawnRate = 1.0 + (this.level * 0.1)
  }
  
  // Start a new wave
  startWave() {
    if (this.state !== 'playing') return
    
    this.wave++
    this.lastWaveTime = this.time
    
    if (this.callbacks.onWaveStart) {
      this.callbacks.onWaveStart(this.wave, this.difficultyScale)
    }
    
    this.notifyUI()
  }
  
  // Add gold with multiplier
  addGold(amount, source = 'enemy') {
    const bonus = this.upgrades.goldMultiplier
    const finalAmount = Math.floor(amount * bonus)
    
    this.gold += finalAmount
    this.stats.totalGoldEarned += finalAmount
    
    if (this.callbacks.onGoldChange) {
      this.callbacks.onGoldChange(this.gold, finalAmount, source)
    }
    
    return finalAmount
  }
  
  // Spend gold
  spendGold(amount) {
    if (this.gold < amount) return false
    
    this.gold -= amount
    this.notifyUI()
    return true
  }
  
  // Check if can afford
  canAfford(amount) {
    return this.gold >= amount
  }
  
  // Register a kill
  registerKill(enemyType, goldReward, xpReward) {
    this.kills++
    this.stats.enemiesKilled++
    this.score += xpReward
    
    // Add gold with multiplier
    this.addGold(goldReward, 'kill')
    
    // Update difficulty
    this.updateDifficulty()
    
    if (this.callbacks.onEnemyKilled) {
      this.callbacks.onEnemyKilled(enemyType, goldReward, xpReward)
    }
    
    this.notifyUI()
  }
  
  // Enemy reached base
  enemyReachedBase(livesLost = 1) {
    this.lives -= livesLost
    
    if (this.callbacks.onLivesChange) {
      this.callbacks.onLivesChange(this.lives, livesLost)
    }
    
    if (this.lives <= 0) {
      this.endGame(false)
    }
    
    this.notifyUI()
  }
  
  // Tower built
  towerBuilt(cost, towerType) {
    this.stats.towersBuilt++
    
    if (this.callbacks.onTowerBuilt) {
      this.callbacks.onTowerBuilt(towerType, cost)
    }
  }
  
  // Problem solved (from coding integration)
  problemSolved(difficulty, goldReward, xpReward) {
    this.stats.problemsSolved++
    this.addGold(goldReward, 'problem')
    this.score += xpReward
    
    // Problem-based upgrades
    if (this.stats.problemsSolved % 5 === 0) {
      // Every 5 problems: 5% damage boost
      this.upgrades.damage += 0.05
      
      if (this.callbacks.onUpgrade) {
        this.callbacks.onUpgrade('damage', this.upgrades.damage)
      }
    }
    
    if (this.callbacks.onProblemSolved) {
      this.callbacks.onProblemSolved(difficulty, goldReward, xpReward)
    }
    
    this.notifyUI()
  }
  
  // Purchase upgrade
  purchaseUpgrade(upgradeType, cost) {
    if (!this.canAfford(cost)) return false
    
    this.spendGold(cost)
    
    switch(upgradeType) {
      case 'damage':
        this.upgrades.damage += 0.25
        break
      case 'range':
        this.upgrades.range += 0.15
        break
      case 'fireRate':
        this.upgrades.fireRate += 0.1
        break
      case 'goldMultiplier':
        this.upgrades.goldMultiplier += 0.1
        break
      default:
        return false
    }
    
    this.upgradeLevel++
    
    if (this.callbacks.onUpgrade) {
      this.callbacks.onUpgrade(upgradeType, this.upgrades[upgradeType])
    }
    
    return true
  }
  
  // Get upgrade cost
  getUpgradeCost() {
    return 500 * Math.pow(2, this.upgradeLevel - 1)
  }
  
  // Select structure for building
  selectStructure(structureId) {
    this.selectedStructure = structureId
    
    if (this.callbacks.onStructureSelected) {
      this.callbacks.onStructureSelected(structureId)
    }
  }
  
  // Handle hotkey
  handleHotkey(key) {
    const structureId = this.hotkeyMappings[key.toLowerCase()]
    if (structureId) {
      this.selectStructure(structureId)
      return true
    }
    
    // Other hotkeys
    if (key === ' ') {
      this.startWave()
      return true
    }
    if (key === 'Escape') {
      this.selectStructure(null)
      return true
    }
    if (key === 'p' || key === 'P') {
      this.togglePause()
      return true
    }
    
    return false
  }
  
  // Toggle pause
  togglePause() {
    if (this.state === 'playing') {
      this.state = 'paused'
    } else if (this.state === 'paused') {
      this.state = 'playing'
    }
    
    if (this.callbacks.onPauseChange) {
      this.callbacks.onPauseChange(this.state === 'paused')
    }
  }
  
  // End game
  endGame(won) {
    this.state = won ? 'victory' : 'gameover'
    
    // Calculate final score
    const bonusScore = this.kills * 10 + this.stats.towersBuilt * 50 + this.stats.problemsSolved * 100
    this.score += bonusScore
    
    if (this.callbacks.onGameEnd) {
      this.callbacks.onGameEnd(won, {
        score: this.score,
        kills: this.kills,
        wave: this.wave,
        level: this.level,
        gold: this.gold,
        stats: this.stats
      })
    }
  }
  
  // Restart game
  restart() {
    this.state = 'menu'
    this.gold = 500
    this.lives = 100
    this.kills = 0
    this.score = 0
    this.wave = 0
    this.level = 1
    this.time = 0
    this.upgradeLevel = 1
    
    this.upgrades = {
      damage: 1.0,
      range: 1.0,
      fireRate: 1.0,
      goldMultiplier: 1.0
    }
    
    this.stats = {
      totalGoldEarned: 0,
      totalDamageDealt: 0,
      towersBuilt: 0,
      enemiesKilled: 0,
      wavesCompleted: 0,
      problemsSolved: 0,
      longestStreak: 0
    }
    
    this.difficultyScale = {
      enemyHealth: 1.0,
      enemySpeed: 1.0,
      spawnRate: 1.0
    }
    
    if (this.callbacks.onRestart) {
      this.callbacks.onRestart()
    }
  }
  
  // Notify UI of state changes
  notifyUI() {
    if (this.callbacks.onStateChange) {
      this.callbacks.onStateChange({
        gold: this.gold,
        lives: this.lives,
        kills: this.kills,
        score: this.score,
        wave: this.wave,
        level: this.level,
        upgrades: this.upgrades,
        selectedStructure: this.selectedStructure,
        state: this.state
      })
    }
  }
  
  // Get game state for saving
  getGameState() {
    return {
      gold: this.gold,
      lives: this.lives,
      kills: this.kills,
      score: this.score,
      wave: this.wave,
      level: this.level,
      time: this.time,
      upgradeLevel: this.upgradeLevel,
      upgrades: { ...this.upgrades },
      stats: { ...this.stats },
      difficultyScale: { ...this.difficultyScale }
    }
  }
  
  // Load game state
  loadGameState(state) {
    Object.assign(this, state)
    this.notifyUI()
  }
}

export default GameManager

