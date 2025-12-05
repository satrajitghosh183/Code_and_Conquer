// Automatic Wave Timer System
// Handles timed wave spawning with countdown and problem-solving integration

export class WaveTimer {
  constructor(game, options = {}) {
    this.game = game
    this.waveInterval = options.waveInterval || 30000 // 30 seconds default
    this.countdownTime = this.waveInterval / 1000 // Convert to seconds
    this.currentCountdown = this.countdownTime
    this.isActive = false
    this.paused = false
    this.onWaveStart = options.onWaveStart || null
    this.onCountdownUpdate = options.onCountdownUpdate || null
    this.onProblemSolved = options.onProblemSolved || null
    this.onTaskCompleted = options.onTaskCompleted || null
    
    // Problem-solving bonuses
    this.problemSolvedBonus = options.problemSolvedBonus || 5 // +5 seconds per problem
    this.taskCompletedBonus = options.taskCompletedBonus || 10 // +10 seconds per task
    
    // Energy generation
    this.energyPerProblem = options.energyPerProblem || 10
    this.energyPerTask = options.energyPerTask || 15
    this.energyPerSecond = options.energyPerSecond || 0.5 // Passive energy generation
    
    this.lastUpdate = Date.now()
    this.accumulatedEnergy = 0
  }
  
  start() {
    this.isActive = true
    this.paused = false
    this.currentCountdown = this.countdownTime
    this.lastUpdate = Date.now()
  }
  
  stop() {
    this.isActive = false
  }
  
  pause() {
    this.paused = true
  }
  
  resume() {
    this.paused = false
    this.lastUpdate = Date.now()
  }
  
  update(deltaTime) {
    if (!this.isActive || this.paused || this.game.isPaused || this.game.gameOver) {
      return
    }
    
    const now = Date.now()
    const delta = (now - this.lastUpdate) / 1000 // Convert to seconds
    this.lastUpdate = now
    
    // Update countdown
    this.currentCountdown -= delta
    
    // Generate passive energy
    if (this.game.addEnergy) {
      const energyGain = this.energyPerSecond * delta
      this.accumulatedEnergy += energyGain
      
      // Add energy in chunks to avoid too frequent updates
      if (this.accumulatedEnergy >= 1) {
        this.game.addEnergy(Math.floor(this.accumulatedEnergy))
        this.accumulatedEnergy = 0
      }
    }
    
    // Trigger wave when countdown reaches 0
    if (this.currentCountdown <= 0) {
      this.triggerWave()
    }
    
    // Notify UI of countdown update
    if (this.onCountdownUpdate) {
      this.onCountdownUpdate(this.currentCountdown, this.countdownTime)
    }
  }
  
  triggerWave() {
    if (this.game.gameOver || this.game.isPaused) return
    
    // Start the wave
    if (this.game.startWave) {
      this.game.startWave()
    }
    
    // Reset countdown
    this.currentCountdown = this.countdownTime
    
    // Notify callback
    if (this.onWaveStart) {
      this.onWaveStart(this.game.wave || 0)
    }
    
    // Play warning sound
    if (window.SoundManager) {
      window.SoundManager.play('wave_start.ogg')
    }
  }
  
  // Called when player solves a problem
  onProblemSolved(difficulty = 'medium') {
    if (!this.isActive) return
    
    // Add time bonus based on difficulty
    const timeBonus = this.problemSolvedBonus * (difficulty === 'hard' ? 1.5 : difficulty === 'medium' ? 1.0 : 0.5)
    this.addTimeBonus(timeBonus)
    
    // Add energy reward
    const energyReward = this.energyPerProblem * (difficulty === 'hard' ? 2 : difficulty === 'medium' ? 1.5 : 1)
    if (this.game.addEnergy) {
      this.game.addEnergy(Math.floor(energyReward))
    }
    
    // Notify callback
    if (this.onProblemSolved) {
      this.onProblemSolved({
        timeBonus,
        energyReward: Math.floor(energyReward)
      })
    }
  }
  
  // Called when player completes a task
  onTaskCompleted(taskType = 'daily') {
    if (!this.isActive) return
    
    // Add time bonus
    this.addTimeBonus(this.taskCompletedBonus)
    
    // Add energy reward
    const energyReward = this.energyPerTask * (taskType === 'weekly' ? 1.5 : 1)
    if (this.game.addEnergy) {
      this.game.addEnergy(Math.floor(energyReward))
    }
    
    // Notify callback
    if (this.onTaskCompleted) {
      this.onTaskCompleted({
        timeBonus: this.taskCompletedBonus,
        energyReward: Math.floor(energyReward)
      })
    }
  }
  
  addTimeBonus(seconds) {
    this.currentCountdown += seconds
    // Cap at 2x the base interval
    const maxCountdown = this.countdownTime * 2
    if (this.currentCountdown > maxCountdown) {
      this.currentCountdown = maxCountdown
    }
  }
  
  getCountdown() {
    return Math.max(0, Math.ceil(this.currentCountdown))
  }
  
  getCountdownPercent() {
    return Math.max(0, Math.min(1, this.currentCountdown / this.countdownTime))
  }
  
  // Adjust wave interval (for difficulty scaling)
  setWaveInterval(seconds) {
    const ratio = this.currentCountdown / this.countdownTime
    this.waveInterval = seconds * 1000
    this.countdownTime = seconds
    this.currentCountdown = this.countdownTime * ratio
  }
  
  // Get time until next wave (formatted)
  getTimeUntilWave() {
    const seconds = this.getCountdown()
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }
}

