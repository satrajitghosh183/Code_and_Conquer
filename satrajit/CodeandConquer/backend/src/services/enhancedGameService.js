// Enhanced Game Service with Hero Abilities, Units, and In-Match Progression
import matchmakingService from './matchmakingService.js'
import progressionService from './progressionService.js'
import { HEROES, UNIT_TYPES } from '../models/Hero.js'

class EnhancedGameService {
  constructor() {
    this.activeAbilities = new Map() // Track active hero abilities
  }

  // Initialize match with player loadouts
  async initializeMatch(matchId, player1Id, player2Id) {
    try {
      // Get both players' loadouts
      const [loadout1, loadout2] = await Promise.all([
        progressionService.getMatchLoadout(player1Id),
        progressionService.getMatchLoadout(player2Id)
      ])

      const match = matchmakingService.getMatch(matchId)
      if (!match) throw new Error('Match not found')

      // Initialize enhanced game state
      match.gameState = {
        player1: {
          id: player1Id,
          hero: loadout1.hero,
          gold: loadout1.bonuses.startingGold,
          energy: 50,
          maxEnergy: 100,
          goldPerSecond: loadout1.bonuses.goldPerSecond || 0.5,
          energyPerSecond: 0.2, // Base passive energy
          problemsSolvedThisGame: 0,
          tasksCompletedThisGame: 0,
          baseHp: 1000 * loadout1.bonuses.baseHpMultiplier,
          maxBaseHp: 1000 * loadout1.bonuses.baseHpMultiplier,
          towers: [],
          units: [],
          activeAbilities: [],
          bonuses: loadout1.bonuses,
          availableUnits: loadout1.availableUnits,
          availableTowers: loadout1.availableTowers,
          problemsSolved: 0,
          codingScore: 0,
          consecutivePassCount: 0,
          unitKills: 0,
          towerKills: 0,
          nextWaveTime: Date.now() + 30000,
          waveInterval: 30000
        },
        player2: {
          id: player2Id,
          hero: loadout2.hero,
          gold: loadout2.bonuses.startingGold,
          energy: 50,
          maxEnergy: 100,
          goldPerSecond: loadout2.bonuses.goldPerSecond || 0.5,
          energyPerSecond: 0.2, // Base passive energy
          problemsSolvedThisGame: 0,
          tasksCompletedThisGame: 0,
          baseHp: 1000 * loadout2.bonuses.baseHpMultiplier,
          maxBaseHp: 1000 * loadout2.bonuses.baseHpMultiplier,
          towers: [],
          units: [],
          activeAbilities: [],
          bonuses: loadout2.bonuses,
          availableUnits: loadout2.availableUnits,
          availableTowers: loadout2.availableTowers,
          problemsSolved: 0,
          codingScore: 0,
          consecutivePassCount: 0,
          unitKills: 0,
          towerKills: 0,
          nextWaveTime: Date.now() + 30000,
          waveInterval: 30000
        },
        projectiles: [],
        effects: [],
        wave: 0,
        elapsedTime: 0,
        lastGoldTick: Date.now(),
        nextWaveTime: Date.now() + 30000, // Shared wave timer for both players
        waveInterval: 30000
      }

      await matchmakingService.updateMatch(matchId, match)
      return match
    } catch (error) {
      console.error('Error initializing match:', error)
      throw error
    }
  }

  // Process coding submission with enhanced rewards
  async processCodingSubmission(matchId, playerId, submission) {
    const match = matchmakingService.getMatch(matchId)
    if (!match) return null

    const playerIndex = match.players.findIndex(p => p.id === playerId)
    const playerState = match.gameState[`player${playerIndex + 1}`]
    const opponentState = match.gameState[`player${playerIndex === 0 ? 2 : 1}`]

    if (!playerState) return null

    // Calculate base score
    const baseScore = submission.status === 'PASS' ? 100 : 
                     submission.status === 'PARTIAL' ? 40 : 0
    
    // Speed bonus
    let speedBonus = 0
    if (submission.executionTimeMs <= 50) speedBonus = 30
    else if (submission.executionTimeMs <= 200) speedBonus = 15

    // Difficulty multiplier
    const difficultyMultiplier = submission.difficulty === 'easy' ? 1.0 :
                                 submission.difficulty === 'medium' ? 1.5 :
                                 submission.difficulty === 'hard' ? 2.0 : 1.0

    // Apply hero passive bonus
    let codingScore = (baseScore + speedBonus) * difficultyMultiplier
    if (playerState.hero.passive?.effect?.codingScoreMultiplier) {
      codingScore *= playerState.hero.passive.effect.codingScoreMultiplier
    }

    playerState.codingScore += codingScore

    // Award gold based on coding score
    const goldReward = Math.floor(codingScore * 2)
    playerState.gold += goldReward

    // Award energy based on difficulty and status
    const energyReward = submission.status === 'PASS'
      ? (submission.difficulty === 'hard' ? 20 : submission.difficulty === 'medium' ? 15 : 10)
      : (submission.status === 'PARTIAL' ? 5 : 0)
    playerState.energy = Math.min(playerState.maxEnergy, playerState.energy + energyReward)
    
    // Increase passive energy generation (NO gold - coins only from problem rewards)
    if (submission.status === 'PASS') {
      playerState.problemsSolvedThisGame++
      // Each problem solved increases passive energy income
      playerState.energyPerSecond += 0.05 // +0.05 energy/sec
    }

    // Time bonus for wave timer
    const timeBonus = submission.status === 'PASS'
      ? (submission.difficulty === 'hard' ? 7.5 : submission.difficulty === 'medium' ? 5 : 2.5)
      : 0
    
    // Add time bonus to next wave (shared timer)
    if (timeBonus > 0 && match.gameState.nextWaveTime) {
      match.gameState.nextWaveTime += timeBonus * 1000
    }

    // Award XP (tracked for post-match)
    const xpReward = Math.floor(codingScore * 1.5)

    const effects = {
      goldReward,
      energyReward,
      timeBonus,
      xpReward,
      specialAbility: null,
      debuff: null
    }

    // Successful solve - apply benefits
    if (submission.status === 'PASS') {
      playerState.problemsSolved++
      playerState.consecutivePassCount++

      // Spawn bonus units for successful solve
      const bonusUnitCount = submission.difficulty === 'hard' ? 3 : 
                           submission.difficulty === 'medium' ? 2 : 1
      
      effects.bonusUnits = bonusUnitCount

      // Apply opponent debuff
      if (Math.random() < 0.3) { // 30% chance
        const debuffDuration = 15 // seconds
        effects.debuff = {
          type: 'slow',
          target: 'opponent',
          duration: debuffDuration,
          strength: 0.2 // 20% slow
        }
        
        this.applyDebuff(match, opponentState, effects.debuff)
      }

      // Check for special ability trigger (3 consecutive passes)
      if (playerState.consecutivePassCount >= 3) {
        effects.specialAbility = {
          type: 'problem_surge',
          effect: 'spawn_elite_unit',
          unitType: 'knight'
        }
        playerState.consecutivePassCount = 0

        // Spawn elite unit
        this.spawnUnit(match, playerIndex, 'knight', { 
          isFree: true,
          bonus: true 
        })
      }
    } else {
      playerState.consecutivePassCount = 0
    }

    // Store submission
    match.submissions = match.submissions || []
    match.submissions.push({
      playerId,
      problemId: submission.problemId,
      status: submission.status,
      codingScore,
      effects,
      timestamp: new Date().toISOString()
    })

    matchmakingService.updateMatch(matchId, match)

    return {
      codingScore,
      effects,
      playerState: {
        gold: playerState.gold,
        baseHp: playerState.baseHp,
        problemsSolved: playerState.problemsSolved
      }
    }
  }

  // Deploy unit
  deployUnit(matchId, playerId, unitType, position = null) {
    const match = matchmakingService.getMatch(matchId)
    if (!match) return null

    const playerIndex = match.players.findIndex(p => p.id === playerId)
    const playerState = match.gameState[`player${playerIndex + 1}`]

    if (!playerState) return null

    // Check if unit is available
    const unitTemplate = UNIT_TYPES[unitType]
    if (!unitTemplate) {
      return { error: 'Invalid unit type' }
    }

    // Check if player has unlocked this unit
    const isUnlocked = playerState.availableUnits.some(u => u.id === unitType)
    if (!isUnlocked) {
      return { error: 'Unit not unlocked' }
    }

    // Check gold cost
    if (playerState.gold < unitTemplate.cost) {
      return { error: 'Insufficient gold' }
    }

    // Deduct gold
    playerState.gold -= unitTemplate.cost

    // Create unit with bonuses
    const unit = {
      id: `unit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: unitType,
      playerId,
      hp: unitTemplate.hp * playerState.bonuses.troopHpMultiplier,
      maxHp: unitTemplate.hp * playerState.bonuses.troopHpMultiplier,
      damage: unitTemplate.damage * playerState.bonuses.troopDamageMultiplier,
      speed: unitTemplate.speed,
      attackSpeed: unitTemplate.attackSpeed,
      range: unitTemplate.range,
      armor: unitTemplate.armor || 0,
      element: unitTemplate.element,
      position: position || this.getSpawnPosition(playerIndex),
      targetPosition: this.getOpponentBasePosition(playerIndex),
      isAlive: true,
      lastAttackTime: 0,
      // Hero passive effects
      invisible: false,
      invisibilityDistance: 0
    }

    // Apply hero-specific bonuses
    const hero = playerState.hero
    
    // Jaguar passive - invisibility
    if (hero.id === 'java' && hero.passive?.effect?.invisibilityDistance) {
      unit.invisible = true
      unit.invisibilityDistance = hero.passive.effect.invisibilityDistance
      unit.traveledDistance = 0
    }

    // Sea Dragon passive - water troop bonus
    if (hero.id === 'cpp' && unit.element === 'water' && hero.passive?.effect?.waterTroopSpeedBonus) {
      unit.speed *= (1 + hero.passive.effect.waterTroopSpeedBonus)
    }

    // Rhino passive - piercing damage
    if (hero.id === 'javascript' && hero.passive?.effect?.piercingDamage) {
      unit.piercingDamage = true
      unit.towerDamageBonus = hero.passive.effect.towerDamageBonus || 0
    }

    playerState.units.push(unit)
    matchmakingService.updateMatch(matchId, match)

    return { 
      success: true, 
      unit,
      gold: playerState.gold 
    }
  }

  // Spawn unit (helper for bonus units)
  spawnUnit(match, playerIndex, unitType, options = {}) {
    const playerState = match.gameState[`player${playerIndex + 1}`]
    const unitTemplate = UNIT_TYPES[unitType]
    
    if (!unitTemplate) return null

    const unit = {
      id: `unit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: unitType,
      playerId: playerState.id,
      hp: unitTemplate.hp * playerState.bonuses.troopHpMultiplier,
      maxHp: unitTemplate.hp * playerState.bonuses.troopHpMultiplier,
      damage: unitTemplate.damage * playerState.bonuses.troopDamageMultiplier,
      speed: unitTemplate.speed,
      attackSpeed: unitTemplate.attackSpeed,
      range: unitTemplate.range,
      armor: unitTemplate.armor || 0,
      element: unitTemplate.element,
      position: this.getSpawnPosition(playerIndex),
      targetPosition: this.getOpponentBasePosition(playerIndex),
      isAlive: true,
      lastAttackTime: 0,
      bonus: options.bonus || false
    }

    playerState.units.push(unit)
    return unit
  }

  // Place tower
  placeTower(matchId, playerId, position, towerType = 'basic') {
    const match = matchmakingService.getMatch(matchId)
    if (!match) return null

    const playerIndex = match.players.findIndex(p => p.id === playerId)
    const playerState = match.gameState[`player${playerIndex + 1}`]

    if (!playerState) return null

    // Get tower template
    const towerTemplate = playerState.availableTowers.find(t => t.id === towerType)
    if (!towerTemplate) {
      return { error: 'Tower not available' }
    }

    const towerCost = towerTemplate.cost

    if (playerState.gold < towerCost) {
      return { error: 'Insufficient gold' }
    }

    // Apply bonuses
    const tower = {
      id: `tower_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: towerType,
      playerId,
      position,
      hp: towerTemplate.hp * (1 + (playerState.bonuses.towerHpBonus || 0)),
      maxHp: towerTemplate.hp * (1 + (playerState.bonuses.towerHpBonus || 0)),
      damage: towerTemplate.damage,
      range: towerTemplate.range * playerState.bonuses.towerRangeMultiplier,
      fireRate: towerTemplate.fireRate * playerState.bonuses.towerFireRateMultiplier,
      lastShotTime: 0,
      isAlive: true,
      ...(towerTemplate.splashRadius && { splashRadius: towerTemplate.splashRadius }),
      ...(towerTemplate.chainCount && { chainCount: towerTemplate.chainCount }),
      ...(towerTemplate.slowPercent && { 
        slowPercent: towerTemplate.slowPercent,
        slowDuration: towerTemplate.slowDuration 
      }),
      ...(towerTemplate.continuous && { continuous: towerTemplate.continuous })
    }

    // Phoenix passive - tower HP bonus and regen
    const hero = playerState.hero
    if (hero.id === 'rust' && hero.passive?.effect) {
      if (hero.passive.effect.towerHpBonus) {
        tower.hp *= (1 + hero.passive.effect.towerHpBonus)
        tower.maxHp = tower.hp
      }
      if (hero.passive.effect.towerRegeneration) {
        tower.regeneration = hero.passive.effect.towerRegeneration
      }
    }

    playerState.gold -= towerCost
    playerState.towers.push(tower)

    matchmakingService.updateMatch(matchId, match)

    return { 
      success: true, 
      tower,
      gold: playerState.gold 
    }
  }

  // Use hero ability
  useHeroAbility(matchId, playerId) {
    const match = matchmakingService.getMatch(matchId)
    if (!match) return null

    const playerIndex = match.players.findIndex(p => p.id === playerId)
    const playerState = match.gameState[`player${playerIndex + 1}`]
    const opponentState = match.gameState[`player${playerIndex === 0 ? 2 : 1}`]

    if (!playerState) return null

    const hero = playerState.hero
    const ability = hero.ability

    // Check cooldown
    const now = Date.now()
    const abilityKey = `${matchId}_${playerId}_ability`
    const lastUsed = this.activeAbilities.get(abilityKey) || 0
    const cooldownMs = ability.cooldown * 1000 * (1 - (playerState.bonuses.abilityCooldownReduction || 0))

    if (now - lastUsed < cooldownMs) {
      return { error: 'Ability on cooldown', remainingCooldown: cooldownMs - (now - lastUsed) }
    }

    // Apply ability effect
    const effect = {
      type: ability.effect.type,
      duration: ability.duration,
      startTime: now,
      ...ability.effect
    }

    playerState.activeAbilities.push(effect)
    this.activeAbilities.set(abilityKey, now)

    // Specific ability effects
    switch (hero.id) {
      case 'python': // Vision Constrict
        opponentState.visionObscured = true
        setTimeout(() => {
          opponentState.visionObscured = false
        }, ability.duration * 1000)
        break

      case 'cpp': // Tidal Rush
        // Water troops get speed boost (applied in update loop)
        break

      case 'java': // Stealth Strike
        // Troops get invisibility (applied in deployUnit)
        break

      case 'javascript': // Rampage
        // Damage boost (applied in update loop)
        break

      case 'rust': // Rebirth
        // Heal base
        playerState.baseHp = Math.min(
          playerState.maxBaseHp,
          playerState.baseHp + playerState.maxBaseHp * ability.effect.healPercent
        )
        // Revive one tower if possible
        if (ability.effect.reviveTower && playerState.towers.length > 0) {
          const deadTower = playerState.towers.find(t => !t.isAlive)
          if (deadTower) {
            deadTower.isAlive = true
            deadTower.hp = deadTower.maxHp * 0.5
          }
        }
        break

      case 'go': // Goroutine Rush
        // Deploy speed increase (applied in deployUnit)
        break
    }

    matchmakingService.updateMatch(matchId, match)

    return {
      success: true,
      ability: ability.name,
      effect,
      cooldown: ability.cooldown
    }
  }

  // Apply debuff to opponent
  applyDebuff(match, targetState, debuff) {
    targetState.activeDebuffs = targetState.activeDebuffs || []
    targetState.activeDebuffs.push({
      ...debuff,
      appliedAt: Date.now()
    })
  }

  // Get spawn position based on player index
  getSpawnPosition(playerIndex) {
    return {
      x: (Math.random() - 0.5) * 10,
      y: 0,
      z: playerIndex === 0 ? -25 : 25
    }
  }

  // Get opponent base position
  getOpponentBasePosition(playerIndex) {
    return {
      x: 0,
      y: 0,
      z: playerIndex === 0 ? 25 : -25
    }
  }

  // Spawn automatic wave for both players
  spawnWave(matchId) {
    const match = matchmakingService.getMatch(matchId)
    if (!match) return null

    const { player1, player2, wave } = match.gameState
    const waveNumber = wave + 1
    const enemyCount = 5 + waveNumber * 2

    // Spawn enemies for player 1 (attacking player 2)
    const enemies1 = []
    for (let i = 0; i < enemyCount; i++) {
      enemies1.push({
        id: `enemy_${Date.now()}_p1_${i}`,
        hp: 100 + waveNumber * 20,
        maxHp: 100 + waveNumber * 20,
        speed: 2,
        position: this.getSpawnPosition(0),
        targetPlayer: player2.id,
        targetBase: this.getOpponentBasePosition(0),
        reachedEnd: false
      })
    }

    // Spawn enemies for player 2 (attacking player 1)
    const enemies2 = []
    for (let i = 0; i < enemyCount; i++) {
      enemies2.push({
        id: `enemy_${Date.now()}_p2_${i}`,
        hp: 100 + waveNumber * 20,
        maxHp: 100 + waveNumber * 20,
        speed: 2,
        position: this.getSpawnPosition(1),
        targetPlayer: player1.id,
        targetBase: this.getOpponentBasePosition(1),
        reachedEnd: false
      })
    }

    match.gameState.enemies = match.gameState.enemies || []
    match.gameState.enemies.push(...enemies1, ...enemies2)
    match.gameState.wave = waveNumber

    matchmakingService.updateMatch(matchId, match)

    return { 
      wave: waveNumber, 
      enemies: [...enemies1, ...enemies2],
      player1Enemies: enemies1.length,
      player2Enemies: enemies2.length
    }
  }

  // Update game state (called every frame)
  updateGameState(matchId, deltaTime) {
    const match = matchmakingService.getMatch(matchId)
    if (!match || match.state !== 'running') return null

    const { player1, player2, projectiles, elapsedTime, lastGoldTick, nextWaveTime, waveInterval } = match.gameState

    // Update elapsed time
    match.gameState.elapsedTime += deltaTime

    // Passive energy generation only (NO passive gold - coins only from coding problems)
    const now = Date.now()
    if (now - lastGoldTick >= 1000) {
      // Generate passive energy
      player1.energy = Math.min(player1.maxEnergy, player1.energy + player1.energyPerSecond)
      player2.energy = Math.min(player2.maxEnergy, player2.energy + player2.energyPerSecond)
      match.gameState.lastGoldTick = now
    }

    // Automatic wave spawning
    if (nextWaveTime && now >= nextWaveTime) {
      this.spawnWave(matchId)
      match.gameState.nextWaveTime = now + waveInterval
      match.gameState.wave++
    }

    // Update towers
    this.updateTowers(match, player1, [player2], deltaTime)
    this.updateTowers(match, player2, [player1], deltaTime)

    // Update units
    this.updateUnits(match, player1, player2, deltaTime)
    this.updateUnits(match, player2, player1, deltaTime)

    // Update projectiles
    this.updateProjectiles(match, deltaTime)

    // Clean up expired abilities
    this.cleanupAbilities(player1)
    this.cleanupAbilities(player2)

    // Check win condition
    if (player1.baseHp <= 0) {
      match.state = 'finished'
      match.winner = player2.id
      match.endTime = new Date().toISOString()
    } else if (player2.baseHp <= 0) {
      match.state = 'finished'
      match.winner = player1.id
      match.endTime = new Date().toISOString()
    }

    matchmakingService.updateMatch(matchId, match)
    return match.gameState
  }

  // Update towers
  updateTowers(match, playerState, opponentStates, deltaTime) {
    playerState.towers.forEach(tower => {
      if (!tower.isAlive) return

      // Tower regeneration (Phoenix passive)
      if (tower.regeneration) {
        tower.hp = Math.min(tower.maxHp, tower.hp + tower.maxHp * tower.regeneration * deltaTime)
      }

      const currentTime = Date.now() / 1000

      if (currentTime - tower.lastShotTime < 1 / tower.fireRate) return

      // Find enemies in range
      const enemiesInRange = []
      opponentStates.forEach(opponentState => {
        opponentState.units.forEach(unit => {
          if (!unit.isAlive) return
          
          const dist = this.distance(unit.position, tower.position)
          if (dist <= tower.range) {
            enemiesInRange.push(unit)
          }
        })
      })

      if (enemiesInRange.length === 0) return

      // Target nearest enemy
      const target = enemiesInRange.reduce((closest, unit) => {
        const distClosest = this.distance(closest.position, tower.position)
        const distUnit = this.distance(unit.position, tower.position)
        return distUnit < distClosest ? unit : closest
      })

      // Shoot projectile
      const direction = this.normalize({
        x: target.position.x - tower.position.x,
        y: 0,
        z: target.position.z - tower.position.z
      })

      match.gameState.projectiles.push({
        id: `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        position: { ...tower.position, y: 2 },
        velocity: { x: direction.x * 20, y: 0, z: direction.z * 20 },
        damage: tower.damage,
        ownerId: playerState.id,
        targetId: target.id,
        splashRadius: tower.splashRadius,
        chainCount: tower.chainCount,
        slowPercent: tower.slowPercent,
        slowDuration: tower.slowDuration
      })

      tower.lastShotTime = currentTime
    })
  }

  // Update units
  updateUnits(match, playerState, opponentState, deltaTime) {
    for (let i = playerState.units.length - 1; i >= 0; i--) {
      const unit = playerState.units[i]
      
      if (!unit.isAlive) {
        playerState.units.splice(i, 1)
        continue
      }

      // Move toward target
      const direction = this.normalize({
        x: unit.targetPosition.x - unit.position.x,
        y: 0,
        z: unit.targetPosition.z - unit.position.z
      })

      const moveDistance = unit.speed * deltaTime
      unit.position.x += direction.x * moveDistance
      unit.position.z += direction.z * moveDistance

      // Track distance for invisibility
      if (unit.invisibilityDistance > 0) {
        unit.traveledDistance = (unit.traveledDistance || 0) + moveDistance
        if (unit.traveledDistance >= unit.invisibilityDistance) {
          unit.invisible = false
        }
      }

      // Check if reached opponent base
      const distToBase = this.distance(unit.position, unit.targetPosition)
      if (distToBase < 2) {
        opponentState.baseHp -= unit.damage
        unit.isAlive = false
        continue
      }

      // Check for enemies to attack
      const enemiesInRange = opponentState.units.filter(enemy => 
        enemy.isAlive && this.distance(unit.position, enemy.position) <= unit.range
      )

      // Check for towers to attack
      const towersInRange = opponentState.towers.filter(tower =>
        tower.isAlive && this.distance(unit.position, tower.position) <= unit.range
      )

      const targetsInRange = [...enemiesInRange, ...towersInRange]

      if (targetsInRange.length > 0) {
        const currentTime = Date.now() / 1000
        if (currentTime - unit.lastAttackTime >= 1 / unit.attackSpeed) {
          const target = targetsInRange[0]
          let damage = unit.damage

          // Apply piercing damage bonus to towers
          if (unit.piercingDamage && target.type && target.towerDamageBonus) {
            damage *= (1 + unit.towerDamageBonus)
          }

          target.hp -= Math.max(1, damage - (target.armor || 0))

          if (target.hp <= 0) {
            target.isAlive = false
            if (target.type) { // It's a tower
              playerState.towerKills++
            } else { // It's a unit
              playerState.unitKills++
            }
          }

          unit.lastAttackTime = currentTime
        }
      }
    }
  }

  // Update projectiles
  updateProjectiles(match, deltaTime) {
    const { player1, player2, projectiles } = match.gameState

    for (let i = projectiles.length - 1; i >= 0; i--) {
      const proj = projectiles[i]
      
      proj.position.x += proj.velocity.x * deltaTime
      proj.position.z += proj.velocity.z * deltaTime

      // Find target unit
      const allUnits = [...player1.units, ...player2.units]
      const target = allUnits.find(u => u.id === proj.targetId && u.isAlive)

      if (target) {
        const dist = this.distance(proj.position, target.position)
        if (dist < 1) {
          // Hit target
          target.hp -= proj.damage
          if (target.hp <= 0) {
            target.isAlive = false
          }

          // Apply splash damage
          if (proj.splashRadius) {
            allUnits.forEach(u => {
              if (u.id !== target.id && u.isAlive) {
                const splashDist = this.distance(u.position, target.position)
                if (splashDist <= proj.splashRadius) {
                  u.hp -= proj.damage * 0.5
                  if (u.hp <= 0) u.isAlive = false
                }
              }
            })
          }

          // Apply slow
          if (proj.slowPercent) {
            target.speed *= (1 - proj.slowPercent)
            setTimeout(() => {
              target.speed /= (1 - proj.slowPercent)
            }, (proj.slowDuration || 2) * 1000)
          }

          projectiles.splice(i, 1)
          continue
        }
      }

      // Remove if out of bounds
      if (Math.abs(proj.position.x) > 50 || Math.abs(proj.position.z) > 50) {
        projectiles.splice(i, 1)
      }
    }
  }

  // Clean up expired abilities
  cleanupAbilities(playerState) {
    const now = Date.now()
    playerState.activeAbilities = playerState.activeAbilities.filter(ability => {
      return (now - ability.startTime) < (ability.duration * 1000)
    })

    if (playerState.activeDebuffs) {
      playerState.activeDebuffs = playerState.activeDebuffs.filter(debuff => {
        return (now - debuff.appliedAt) < (debuff.duration * 1000)
      })
    }
  }

  // Helper: Calculate distance
  distance(pos1, pos2) {
    const dx = pos1.x - pos2.x
    const dz = pos1.z - pos2.z
    return Math.sqrt(dx * dx + dz * dz)
  }

  // Helper: Normalize vector
  normalize(vec) {
    const length = Math.sqrt(vec.x * vec.x + vec.z * vec.z)
    return {
      x: vec.x / length,
      y: 0,
      z: vec.z / length
    }
  }
}

export default new EnhancedGameService()

