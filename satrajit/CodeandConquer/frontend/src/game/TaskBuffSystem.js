export class TaskBuffSystem {
  constructor() {
    this.dailyTasksCompleted = 0
    this.weeklyTasksCompleted = 0
    this.currentStreak = 0
    this.allTimeTasksCompleted = 0
  }
  
  initialize(userTasks = {}) {
    this.dailyTasksCompleted = userTasks.dailyCompleted || 0
    this.weeklyTasksCompleted = userTasks.weeklyCompleted || 0
    this.currentStreak = userTasks.currentStreak || 0
    this.allTimeTasksCompleted = userTasks.allTimeCompleted || 0
  }
  
  calculatePreGameBuffs(userTasks = {}) {
    // Initialize if needed
    if (userTasks.dailyCompleted !== undefined) {
      this.initialize(userTasks)
    }
    
    // Pre-game bonuses (applied to loadout)
    const buffs = {
      startingGold: 500, // base
      baseHealthMultiplier: 1.0,
      availableTowerTypes: ['basic'],
      techPoints: 0,
      startingUnits: 0
    }
    
    // +50 gold per daily task completed today
    buffs.startingGold += this.dailyTasksCompleted * 50
    
    // +10% base HP per weekly task completed this week
    buffs.baseHealthMultiplier += this.weeklyTasksCompleted * 0.10
    
    // Unlock tower types based on streak
    if (this.currentStreak >= 3) buffs.availableTowerTypes.push('sniper')
    if (this.currentStreak >= 7) buffs.availableTowerTypes.push('cannon')
    if (this.currentStreak >= 14) buffs.availableTowerTypes.push('splash')
    
    // Tech points for upgrades (1 per 10 tasks)
    buffs.techPoints = Math.floor(this.allTimeTasksCompleted / 10)
    
    // Starting units based on weekly tasks
    buffs.startingUnits = Math.floor(this.weeklyTasksCompleted / 2)
    
    return buffs
  }
  
  calculateInGamePassiveBuffs(userTasks = {}) {
    // Initialize if needed
    if (userTasks.dailyCompleted !== undefined) {
      this.initialize(userTasks)
    }
    
    // Passive bonuses during match
    return {
      goldRateMultiplier: 1.0 + (this.currentStreak * 0.05), // +5% per day streak
      towerDamageBonus: this.weeklyTasksCompleted * 0.02, // +2% per weekly task
      abilityRechargeSpeed: 1.0 + (this.dailyTasksCompleted * 0.10), // +10% per daily
      enemyGoldRewardBonus: 1.0 + (this.currentStreak * 0.03), // +3% gold from kills per streak
      buildSpeedBonus: 1.0 + (this.dailyTasksCompleted * 0.05) // +5% faster building per daily
    }
  }
  
  getStreakBonus() {
    // Additional bonuses for long streaks
    if (this.currentStreak >= 30) return 2.0 // 2x bonus for 30+ day streak
    if (this.currentStreak >= 14) return 1.5 // 1.5x for 2 week streak
    if (this.currentStreak >= 7) return 1.25 // 1.25x for week streak
    return 1.0
  }
  
  getTaskSummary() {
    return {
      daily: this.dailyTasksCompleted,
      weekly: this.weeklyTasksCompleted,
      streak: this.currentStreak,
      allTime: this.allTimeTasksCompleted
    }
  }
}

