// Game logic service for 1v1 tower defense
import matchmakingService from './matchmakingService.js'

class GameService {
  // Process coding submission and calculate game effects
  processCodingSubmission(matchId, playerId, submission) {
    const match = matchmakingService.getMatch(matchId)
    if (!match) return null

    const playerState = match.gameState[`player${match.players.findIndex(p => p.id === playerId) + 1}`]
    if (!playerState) return null

    // Calculate coding score
    const baseScore = submission.status === 'PASS' ? 100 : 
                     submission.status === 'PARTIAL' ? 40 : 0
    
    let speedBonus = 0
    if (submission.executionTimeMs <= 50) speedBonus = 20
    else if (submission.executionTimeMs <= 200) speedBonus = 10

    const difficultyMultiplier = submission.difficulty === 'EASY' ? 1.0 :
                                 submission.difficulty === 'MEDIUM' ? 1.5 : 2.0

    const codingScore = (baseScore + speedBonus) * difficultyMultiplier

    // Update player state
    playerState.codingScore += codingScore

    // Apply game effects
    const effects = {
      energyBoost: 0,
      enemyDebuff: null,
      specialAbility: null
    }

    // Energy Boost
    if (codingScore >= 50) {
      effects.energyBoost = Math.ceil(codingScore / 20)
      playerState.energy += effects.energyBoost
    }

    // Enemy Debuff (for opponent)
    if (submission.status === 'PASS') {
      const opponentIndex = playerIndex === 0 ? 1 : 0
      const opponentState = match.gameState[`player${opponentIndex + 1}`]
      if (opponentState) {
        effects.enemyDebuff = {
          speedMultiplier: 0.9,
          hpMultiplier: 0.95,
          duration: 1 // 1 wave
        }
        // Apply to next wave
        match.gameState.nextWaveDebuff = effects.enemyDebuff
      }
    }

    // Special Ability: Code Surge
    if (submission.status === 'PASS' || submission.status === 'PARTIAL') {
      playerState.consecutivePassCount++
      if (playerState.consecutivePassCount >= 2) {
        effects.specialAbility = {
          type: 'code_surge',
          effect: 'repair_base', // or 'spawn_tower'
          value: 0.1 // 10% base HP repair
        }
        playerState.consecutivePassCount = 0 // Reset counter
      }
    } else {
      playerState.consecutivePassCount = 0
    }

    // Store submission
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
        energy: playerState.energy,
        baseHp: playerState.baseHp,
        consecutivePassCount: playerState.consecutivePassCount
      }
    }
  }

  // Place tower
  placeTower(matchId, playerId, position, towerType = 'basic') {
    const match = matchmakingService.getMatch(matchId)
    if (!match) return null

    const playerState = match.gameState[`player${match.players.findIndex(p => p.id === playerId) + 1}`]
    if (!playerState) return null

    const towerCost = 100 // Base cost

    if (playerState.energy < towerCost) {
      return { error: 'Insufficient energy' }
    }

    playerState.energy -= towerCost
    playerState.towers.push({
      id: `tower_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: towerType,
      position,
      damage: 30,
      range: 10,
      fireRate: 1.5,
      lastShotTime: 0
    })

    matchmakingService.updateMatch(matchId, match)

    return { success: true, energy: playerState.energy }
  }

  // Spawn wave of enemies
  spawnWave(matchId, waveNumber) {
    const match = matchmakingService.getMatch(matchId)
    if (!match) return null

    const enemyCount = 5 + waveNumber * 2
    const enemies = []

    for (let i = 0; i < enemyCount; i++) {
      const enemy = {
        id: `enemy_${Date.now()}_${i}`,
        hp: 100 + waveNumber * 20,
        maxHp: 100 + waveNumber * 20,
        speed: 2,
        position: { x: (Math.random() - 0.5) * 40, y: 0, z: 25 },
        targetPlayer: i % 2 === 0 ? match.players[0].id : match.players[1].id,
        reachedEnd: false
      }

      // Apply debuff if active
      if (match.gameState.nextWaveDebuff) {
        enemy.speed *= match.gameState.nextWaveDebuff.speedMultiplier
        enemy.hp *= match.gameState.nextWaveDebuff.hpMultiplier
        enemy.maxHp = enemy.hp
      }

      enemies.push(enemy)
    }

    match.gameState.enemies.push(...enemies)
    match.gameState.wave = waveNumber
    match.gameState.nextWaveDebuff = null // Clear debuff after applying

    matchmakingService.updateMatch(matchId, match)

    return { enemies, wave: waveNumber }
  }

  // Update game state (called on game loop)
  updateGameState(matchId, deltaTime) {
    const match = matchmakingService.getMatch(matchId)
    if (!match || match.state !== 'running') return null

    // Update towers (shoot at enemies)
    match.gameState.player1.towers.forEach(tower => {
      this.updateTower(tower, match.gameState.enemies, match.gameState.projectiles, deltaTime)
    })
    match.gameState.player2.towers.forEach(tower => {
      this.updateTower(tower, match.gameState.enemies, match.gameState.projectiles, deltaTime)
    })

    // Update projectiles
    match.gameState.projectiles = match.gameState.projectiles.filter(proj => {
      proj.position.x += proj.velocity.x * deltaTime
      proj.position.z += proj.velocity.z * deltaTime
      
      // Check collision with enemies
      const enemy = match.gameState.enemies.find(e => 
        Math.abs(e.position.x - proj.position.x) < 1 &&
        Math.abs(e.position.z - proj.position.z) < 1
      )

      if (enemy) {
        enemy.hp -= proj.damage
        if (enemy.hp <= 0) {
          match.gameState.enemies = match.gameState.enemies.filter(e => e.id !== enemy.id)
        }
        return false // Remove projectile
      }

      // Remove if out of bounds
      return Math.abs(proj.position.x) < 50 && Math.abs(proj.position.z) < 50
    })

    // Update enemies (move toward bases)
    match.gameState.enemies.forEach(enemy => {
      const targetPlayer = match.players.find(p => p.id === enemy.targetPlayer)
      const playerIndex = match.players.findIndex(p => p.id === enemy.targetPlayer)
      const playerState = match.gameState[`player${playerIndex + 1}`]

      // Simple movement toward base (at z = -30 for player1, z = 30 for player2)
      const targetZ = playerIndex === 0 ? -30 : 30
      const direction = targetZ - enemy.position.z
      enemy.position.z += Math.sign(direction) * enemy.speed * deltaTime

      // Check if reached base
      if (Math.abs(enemy.position.z - targetZ) < 2) {
        playerState.baseHp -= 50
        enemy.reachedEnd = true
        match.gameState.enemies = match.gameState.enemies.filter(e => e.id !== enemy.id)
      }
    })

    // Check win condition
    if (match.gameState.player1.baseHp <= 0) {
      match.state = 'finished'
      match.winner = match.players[1].id
    } else if (match.gameState.player2.baseHp <= 0) {
      match.state = 'finished'
      match.winner = match.players[0].id
    }

    matchmakingService.updateMatch(matchId, match)

    return match.gameState
  }

  // Update tower (shoot at nearest enemy)
  updateTower(tower, enemies, projectiles, deltaTime) {
    const currentTime = Date.now() / 1000

    if (currentTime - tower.lastShotTime < 1 / tower.fireRate) return

    // Find nearest enemy in range
    const enemiesInRange = enemies.filter(e => {
      const dist = Math.sqrt(
        Math.pow(e.position.x - tower.position.x, 2) +
        Math.pow(e.position.z - tower.position.z, 2)
      )
      return dist <= tower.range && !e.reachedEnd
    })

    if (enemiesInRange.length === 0) return

    const nearest = enemiesInRange.reduce((closest, enemy) => {
      const distClosest = Math.sqrt(
        Math.pow(closest.position.x - tower.position.x, 2) +
        Math.pow(closest.position.z - tower.position.z, 2)
      )
      const distEnemy = Math.sqrt(
        Math.pow(enemy.position.x - tower.position.x, 2) +
        Math.pow(enemy.position.z - tower.position.z, 2)
      )
      return distEnemy < distClosest ? enemy : closest
    })

    // Shoot projectile
    const direction = {
      x: nearest.position.x - tower.position.x,
      z: nearest.position.z - tower.position.z
    }
    const length = Math.sqrt(direction.x * direction.x + direction.z * direction.z)
    direction.x /= length
    direction.z /= length

    projectiles.push({
      id: `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      position: { ...tower.position, y: 2 },
      velocity: { x: direction.x * 20, y: 0, z: direction.z * 20 },
      damage: tower.damage,
      targetEnemyId: nearest.id
    })

    tower.lastShotTime = currentTime
  }
}

export default new GameService()

