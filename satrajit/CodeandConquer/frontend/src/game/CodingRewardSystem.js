export class CodingRewardSystem {
  constructor(game) {
    this.game = game
    this.problemsSolvedThisMatch = 0
    this.totalProblemsSolved = 0 // Will be loaded from user profile
    this.abilityCharges = { ultimate: 0, special: 0 }
  }
  
  initialize(totalProblemsSolved = 0) {
    this.totalProblemsSolved = totalProblemsSolved
    this.problemsSolvedThisMatch = 0
  }
  
  onProblemSolved(difficulty, timeSpent, testsPassedRatio = 1.0) {
    // Calculate rewards based on difficulty and performance
    const goldReward = this.calculateGoldReward(difficulty, testsPassedRatio)
    const xpReward = this.calculateXPReward(difficulty, timeSpent)
    const abilityCharge = this.calculateAbilityCharge(difficulty)
    
    // Apply rewards
    if (this.game.addGold) {
      this.game.addGold(goldReward)
    }
    
    if (this.game.addXP) {
      this.game.addXP(xpReward)
    }
    
    if (this.game.addAbilityCharge) {
      this.game.addAbilityCharge(abilityCharge)
    }
    
    // Visual feedback
    this.showRewardAnimation(goldReward, xpReward, abilityCharge)
    
    // Track for learning module
    this.problemsSolvedThisMatch++
    this.totalProblemsSolved++
    
    // Trigger learning module every 5 problems
    if (this.totalProblemsSolved % 5 === 0) {
      if (this.game.showLearningModule) {
        this.game.showLearningModule(this.totalProblemsSolved)
      }
    }
    
    return { gold: goldReward, xp: xpReward, ability: abilityCharge }
  }
  
  calculateGoldReward(difficulty, testsPassedRatio) {
    const baseRewards = { easy: 150, medium: 300, hard: 500 }
    const base = baseRewards[difficulty] || baseRewards.medium
    return Math.floor(base * testsPassedRatio)
  }
  
  calculateXPReward(difficulty, timeSpent) {
    const baseXP = { easy: 25, medium: 50, hard: 100 }
    const base = baseXP[difficulty] || baseXP.medium
    
    // Bonus for fast completion (< 5 minutes)
    const speedBonus = timeSpent < 300 ? 1.5 : 1.0
    
    // Additional bonus for very fast (< 2 minutes)
    const veryFastBonus = timeSpent < 120 ? 1.2 : 1.0
    
    return Math.floor(base * speedBonus * veryFastBonus)
  }
  
  calculateAbilityCharge(difficulty) {
    // Easy: 10%, Medium: 20%, Hard: 35%
    const charges = { easy: 0.10, medium: 0.20, hard: 0.35 }
    return charges[difficulty] || charges.medium
  }
  
  showRewardAnimation(gold, xp, ability) {
    // Create floating text animations
    if (this.game.showFloatingText) {
      // Gold reward
      this.game.showFloatingText(
        `+${gold} Gold!`,
        { x: 0, y: 0, z: 0 },
        { color: 0xffd700, size: 0.5 }
      )
      
      // XP reward
      this.game.showFloatingText(
        `+${xp} XP!`,
        { x: 0, y: 0, z: 0 },
        { color: 0xff0000, size: 0.4 }
      )
      
      // Ability charge
      if (ability > 0) {
        this.game.showFloatingText(
          `+${Math.round(ability * 100)}% Ultimate!`,
          { x: 0, y: 0, z: 0 },
          { color: 0xff00ff, size: 0.4 }
        )
      }
    }
    
    // Also trigger callback if available
    if (this.game.callbacks && this.game.callbacks.onRewardEarned) {
      this.game.callbacks.onRewardEarned({ gold, xp, ability })
    }
  }
  
  getProblemsSolvedThisMatch() {
    return this.problemsSolvedThisMatch
  }
  
  getTotalProblemsSolved() {
    return this.totalProblemsSolved
  }
  
  getAbilityCharges() {
    return { ...this.abilityCharges }
  }
}

