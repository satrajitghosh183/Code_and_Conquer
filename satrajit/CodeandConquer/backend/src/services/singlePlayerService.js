// Single Player Game Service with AI
import progressionService from './progressionService.js'
import { UNIT_TYPES } from '../models/Hero.js'

class SinglePlayerService {
  constructor() {
    this.activeSessions = new Map()
  }

  // Initialize single player session
  async initializeSession(userId, difficulty = 'normal') {
    try {
      const loadout = await progressionService.getMatchLoadout(userId)
      
      const sessionId = `sp_${Date.now()}_${userId}`
      
      const session = {
        id: sessionId,
        userId,
        difficulty,
        state: 'playing',
        startTime: Date.now(),
        playerState: {
          id: userId,
          hero: loadout.hero,
          gold: loadout.bonuses.startingGold,
          goldPerSecond: loadout.bonuses.goldPerSecond,
          baseHp: 1000 * loadout.bonuses.baseHpMultiplier,
          maxBaseHp: 1000 * loadout.bonuses.baseHpMultiplier,
          towers: [],
          units: [],
          activeAbilities: [],
          bonuses: loadout.bonuses,
          availableUnits: loadout.availableUnits,
          availableTowers: loadout.availableTowers,
          problemsSolved: 0,
          codingScore: 0,
          wave: 0,
          score: 0,
          enemiesKilled: 0
        },
        aiState: {
          phase: 'early', // early, mid, late
          aggression: this.getAggressionLevel(difficulty),
          nextSpawnTime: Date.now() + 5000, // First spawn after 5 seconds
          spawnDelay: this.getSpawnDelay(difficulty),
          enemyUnits: []
        },
        projectiles: [],
        effects: [],
        elapsedTime: 0,
        lastGoldTick: Date.now(),
        lastUpdate: Date.now()
      }

      this.activeSessions.set(sessionId, session)
      return session
    } catch (error) {
      console.error('Error initializing single player session:', error)
      throw error
    }
  }

  // Get session
  getSession(sessionId) {
    return this.activeSessions.get(sessionId)
  }

  // Process coding submission in single player
  processCodingSubmission(sessionId, submission) {
    const session = this.getSession(sessionId)
    if (!session) return null

    const playerState = session.playerState

    // Calculate score
    const baseScore = submission.status === 'PASS' ? 100 : 
                     submission.status === 'PARTIAL' ? 40 : 0
    
    let speedBonus = 0
    if (submission.executionTimeMs <= 50) speedBonus = 30
    else if (submission.executionTimeMs <= 200) speedBonus = 15

    const difficultyMultiplier = submission.difficulty === 'easy' ? 1.0 :
                                 submission.difficulty === 'medium' ? 1.5 :
                                 submission.difficulty === 'hard' ? 2.0 : 1.0

    let codingScore = (baseScore + speedBonus) * difficultyMultiplier

    // Apply hero passive
    if (playerState.hero.passive?.effect?.codingScoreMultiplier) {
      codingScore *= playerState.hero.passive.effect.codingScoreMultiplier
    }

    playerState.codingScore += codingScore

    // Award gold and score
    const goldReward = Math.floor(codingScore * 3) // More generous in single player
    const scoreReward = Math.floor(codingScore * 2)
    
    playerState.gold += goldReward
    playerState.score += scoreReward

    const effects = {
      goldReward,
      scoreReward,
      xpReward: Math.floor(codingScore * 1.5)
    }

    // On successful solve, spawn bonus units
    if (submission.status === 'PASS') {
      playerState.problemsSolved++
      
      const bonusUnitCount = submission.difficulty === 'hard' ? 3 : 
                           submission.difficulty === 'medium' ? 2 : 1
      
      effects.bonusUnits = bonusUnitCount

      // Spawn bonus units automatically
      for (let i = 0; i < bonusUnitCount; i++) {
        this.spawnPlayerUnit(session, 'soldier', true)
      }

      // Small heal bonus
      playerState.baseHp = Math.min(
        playerState.maxBaseHp,
        playerState.baseHp + 50
      )
    }

    return {
      codingScore,
      effects,
      playerState: {
        gold: playerState.gold,
        baseHp: playerState.baseHp,
        score: playerState.score,
        problemsSolved: playerState.problemsSolved
      }
    }
  }

  // Deploy player unit
  deployUnit(sessionId, unitType) {
    const session = this.getSession(sessionId)
    if (!session) return null

    const playerState = session.playerState
    const unitTemplate = UNIT_TYPES[unitType]
    
    if (!unitTemplate) return { error: 'Invalid unit type' }

    const isUnlocked = playerState.availableUnits.some(u => u.id === unitType)
    if (!isUnlocked) return { error: 'Unit not unlocked' }

    if (playerState.gold < unitTemplate.cost) {
      return { error: 'Insufficient gold' }
    }

    playerState.gold -= unitTemplate.cost
    this.spawnPlayerUnit(session, unitType, false)

    return { 
      success: true, 
      gold: playerState.gold 
    }
  }

  // Spawn player unit (helper)
  spawnPlayerUnit(session, unitType, isBonus = false) {
    const playerState = session.playerState
    const unitTemplate = UNIT_TYPES[unitType]
    
    if (!unitTemplate) return null

    const unit = {
      id: `unit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: unitType,
      side: 'player',
      hp: unitTemplate.hp * playerState.bonuses.troopHpMultiplier,
      maxHp: unitTemplate.hp * playerState.bonuses.troopHpMultiplier,
      damage: unitTemplate.damage * playerState.bonuses.troopDamageMultiplier,
      speed: unitTemplate.speed,
      attackSpeed: unitTemplate.attackSpeed,
      range: unitTemplate.range,
      armor: unitTemplate.armor || 0,
      element: unitTemplate.element,
      position: { x: (Math.random() - 0.5) * 10, y: 0, z: -25 },
      targetPosition: { x: 0, y: 0, z: 25 },
      isAlive: true,
      lastAttackTime: 0,
      bonus: isBonus
    }

    // Apply hero bonuses
    const hero = playerState.hero
    if (hero.id === 'cpp' && unit.element === 'water') {
      unit.speed *= (1 + (hero.passive?.effect?.waterTroopSpeedBonus || 0))
    }

    playerState.units.push(unit)
    return unit
  }

  // Place tower
  placeTower(sessionId, position, towerType = 'basic') {
    const session = this.getSession(sessionId)
    if (!session) return null

    const playerState = session.playerState
    const towerTemplate = playerState.availableTowers.find(t => t.id === towerType)
    
    if (!towerTemplate) return { error: 'Tower not available' }

    const towerCost = towerTemplate.cost
    if (playerState.gold < towerCost) {
      return { error: 'Insufficient gold' }
    }

    const tower = {
      id: `tower_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: towerType,
      side: 'player',
      position,
      hp: towerTemplate.hp * (1 + (playerState.bonuses.towerHpBonus || 0)),
      maxHp: towerTemplate.hp * (1 + (playerState.bonuses.towerHpBonus || 0)),
      damage: towerTemplate.damage,
      range: towerTemplate.range * playerState.bonuses.towerRangeMultiplier,
      fireRate: towerTemplate.fireRate * playerState.bonuses.towerFireRateMultiplier,
      lastShotTime: 0,
      isAlive: true,
      ...towerTemplate
    }

    playerState.gold -= towerCost
    playerState.towers.push(tower)

    return { 
      success: true, 
      tower,
      gold: playerState.gold 
    }
  }

  // Update session (called every frame)
  updateSession(sessionId, deltaTime) {
    const session = this.getSession(sessionId)
    if (!session || session.state !== 'playing') return null

    session.elapsedTime += deltaTime
    const now = Date.now()

    // Passive gold generation
    if (now - session.lastGoldTick >= 1000) {
      session.playerState.gold += session.playerState.goldPerSecond
      session.lastGoldTick = now
    }

    // AI spawning
    this.updateAI(session)

    // Update player towers
    this.updateTowers(session, session.playerState.towers, session.aiState.enemyUnits)

    // Update player units
    this.updateUnits(session, session.playerState.units, session.aiState.enemyUnits, session.playerState)

    // Update enemy units
    this.updateUnits(session, session.aiState.enemyUnits, session.playerState.units, null, true)

    // Update projectiles
    this.updateProjectiles(session)

    // Check game over
    if (session.playerState.baseHp <= 0) {
      session.state = 'game_over'
      session.endTime = Date.now()
      session.won = false
    }

    session.lastUpdate = now
    return session
  }

  // Update AI behavior
  updateAI(session) {
    const { aiState, elapsedTime, difficulty } = session
    const now = Date.now()

    // Determine game phase
    if (elapsedTime > 300) aiState.phase = 'late'
    else if (elapsedTime > 120) aiState.phase = 'mid'
    else aiState.phase = 'early'

    // Check if it's time to spawn
    if (now >= aiState.nextSpawnTime) {
      this.spawnAIWave(session)
      
      // Schedule next spawn (gets faster over time)
      const baseDelay = aiState.spawnDelay
      const phaseMultiplier = aiState.phase === 'late' ? 0.6 : aiState.phase === 'mid' ? 0.8 : 1.0
      const nextDelay = baseDelay * phaseMultiplier * (0.9 + Math.random() * 0.2)
      
      aiState.nextSpawnTime = now + nextDelay
      session.playerState.wave++
    }
  }

  // Spawn AI wave
  spawnAIWave(session) {
    const { aiState, playerState, difficulty } = session
    const wave = playerState.wave

    // Determine unit count and types based on phase and difficulty
    let unitCount = 3
    const unitTypes = ['soldier']

    if (aiState.phase === 'early') {
      unitCount = difficulty === 'easy' ? 2 : difficulty === 'hard' ? 4 : 3
    } else if (aiState.phase === 'mid') {
      unitCount = difficulty === 'easy' ? 3 : difficulty === 'hard' ? 6 : 4
      unitTypes.push('archer')
    } else { // late
      unitCount = difficulty === 'easy' ? 4 : difficulty === 'hard' ? 8 : 6
      unitTypes.push('archer', 'knight')
    }

    // Spawn units
    for (let i = 0; i < unitCount; i++) {
      const unitType = unitTypes[Math.floor(Math.random() * unitTypes.length)]
      this.spawnAIUnit(session, unitType, wave)
    }
  }

  // Spawn AI unit
  spawnAIUnit(session, unitType, wave) {
    const unitTemplate = UNIT_TYPES[unitType]
    if (!unitTemplate) return null

    // Scale with wave number
    const waveMultiplier = 1 + (wave * 0.1)
    const difficultyMultiplier = session.difficulty === 'easy' ? 0.8 : 
                                 session.difficulty === 'hard' ? 1.3 : 1.0

    const unit = {
      id: `enemy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: unitType,
      side: 'ai',
      hp: unitTemplate.hp * waveMultiplier * difficultyMultiplier,
      maxHp: unitTemplate.hp * waveMultiplier * difficultyMultiplier,
      damage: unitTemplate.damage * waveMultiplier * difficultyMultiplier,
      speed: unitTemplate.speed,
      attackSpeed: unitTemplate.attackSpeed,
      range: unitTemplate.range,
      armor: unitTemplate.armor || 0,
      element: unitTemplate.element,
      position: { x: (Math.random() - 0.5) * 15, y: 0, z: 25 },
      targetPosition: { x: 0, y: 0, z: -25 },
      isAlive: true,
      lastAttackTime: 0
    }

    session.aiState.enemyUnits.push(unit)
    return unit
  }

  // Update towers (same logic as enhanced game service)
  updateTowers(session, towers, enemyUnits) {
    towers.forEach(tower => {
      if (!tower.isAlive) return

      const currentTime = Date.now() / 1000
      if (currentTime - tower.lastShotTime < 1 / tower.fireRate) return

      const enemiesInRange = enemyUnits.filter(enemy => {
        if (!enemy.isAlive) return false
        const dist = this.distance(enemy.position, tower.position)
        return dist <= tower.range
      })

      if (enemiesInRange.length === 0) return

      const target = enemiesInRange.reduce((closest, enemy) => {
        const distClosest = this.distance(closest.position, tower.position)
        const distEnemy = this.distance(enemy.position, tower.position)
        return distEnemy < distClosest ? enemy : closest
      })

      const direction = this.normalize({
        x: target.position.x - tower.position.x,
        y: 0,
        z: target.position.z - tower.position.z
      })

      session.projectiles.push({
        id: `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        position: { ...tower.position, y: 2 },
        velocity: { x: direction.x * 20, y: 0, z: direction.z * 20 },
        damage: tower.damage,
        targetId: target.id,
        side: tower.side
      })

      tower.lastShotTime = currentTime
    })
  }

  // Update units
  updateUnits(session, units, enemyUnits, playerState = null, isAI = false) {
    for (let i = units.length - 1; i >= 0; i--) {
      const unit = units[i]
      
      if (!unit.isAlive) {
        units.splice(i, 1)
        continue
      }

      const direction = this.normalize({
        x: unit.targetPosition.x - unit.position.x,
        y: 0,
        z: unit.targetPosition.z - unit.position.z
      })

      const moveDistance = unit.speed * 0.016 // Assuming 60fps
      unit.position.x += direction.x * moveDistance
      unit.position.z += direction.z * moveDistance

      // Check if reached base
      const distToBase = this.distance(unit.position, unit.targetPosition)
      if (distToBase < 2) {
        if (isAI) {
          session.playerState.baseHp -= unit.damage
        }
        unit.isAlive = false
        continue
      }

      // Attack enemies in range
      const targetsInRange = enemyUnits.filter(enemy =>
        enemy.isAlive && this.distance(unit.position, enemy.position) <= unit.range
      )

      if (targetsInRange.length > 0) {
        const currentTime = Date.now() / 1000
        if (currentTime - unit.lastAttackTime >= 1 / unit.attackSpeed) {
          const target = targetsInRange[0]
          target.hp -= Math.max(1, unit.damage - (target.armor || 0))

          if (target.hp <= 0) {
            target.isAlive = false
            if (!isAI && playerState) {
              playerState.enemiesKilled++
              playerState.score += 10
            }
          }

          unit.lastAttackTime = currentTime
        }
      }
    }
  }

  // Update projectiles
  updateProjectiles(session) {
    const allUnits = [...session.playerState.units, ...session.aiState.enemyUnits]
    
    for (let i = session.projectiles.length - 1; i >= 0; i--) {
      const proj = session.projectiles[i]
      
      proj.position.x += proj.velocity.x * 0.016
      proj.position.z += proj.velocity.z * 0.016

      const target = allUnits.find(u => u.id === proj.targetId && u.isAlive)

      if (target) {
        const dist = this.distance(proj.position, target.position)
        if (dist < 1) {
          target.hp -= proj.damage
          if (target.hp <= 0) {
            target.isAlive = false
            if (target.side === 'ai') {
              session.playerState.enemiesKilled++
              session.playerState.score += 10
            }
          }
          session.projectiles.splice(i, 1)
          continue
        }
      }

      if (Math.abs(proj.position.x) > 50 || Math.abs(proj.position.z) > 50) {
        session.projectiles.splice(i, 1)
      }
    }
  }

  // Helper functions
  getAggressionLevel(difficulty) {
    return {
      easy: 0.6,
      normal: 1.0,
      hard: 1.4
    }[difficulty] || 1.0
  }

  getSpawnDelay(difficulty) {
    return {
      easy: 15000,  // 15 seconds
      normal: 10000, // 10 seconds
      hard: 7000     // 7 seconds
    }[difficulty] || 10000
  }

  distance(pos1, pos2) {
    const dx = pos1.x - pos2.x
    const dz = pos1.z - pos2.z
    return Math.sqrt(dx * dx + dz * dz)
  }

  normalize(vec) {
    const length = Math.sqrt(vec.x * vec.x + vec.z * vec.z)
    return {
      x: vec.x / length || 0,
      y: 0,
      z: vec.z / length || 0
    }
  }

  // End session and calculate rewards
  endSession(sessionId) {
    const session = this.getSession(sessionId)
    if (!session) return null

    const duration = (Date.now() - session.startTime) / 1000
    const survivalBonus = Math.floor(duration * 5)
    const killBonus = session.playerState.enemiesKilled * 10
    const waveBonus = session.playerState.wave * 50
    const problemBonus = session.playerState.problemsSolved * 100

    const totalScore = session.playerState.score + survivalBonus + killBonus + waveBonus + problemBonus
    const totalXP = Math.floor(totalScore * 0.5)
    const totalGold = Math.floor(totalScore * 0.3)

    const rewards = {
      score: totalScore,
      xp: totalXP,
      gold: totalGold,
      duration,
      waves: session.playerState.wave,
      enemiesKilled: session.playerState.enemiesKilled,
      problemsSolved: session.playerState.problemsSolved
    }

    this.activeSessions.delete(sessionId)
    return rewards
  }
}

export default new SinglePlayerService()

