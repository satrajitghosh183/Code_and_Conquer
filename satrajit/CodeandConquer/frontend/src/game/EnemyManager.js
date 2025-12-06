// =============================================================================
// ENHANCED ENEMY MANAGER - Robust Wave & Spawn System
// =============================================================================

import * as THREE from 'three'
import { Enemy } from './Enemy.js'
import { ENEMY_TYPES } from './EnemyTypes.js'

// Difficulty scaling presets
const DIFFICULTY_SCALING = {
  easy: { healthMult: 0.7, speedMult: 0.85, countMult: 0.7, goldMult: 1.3 },
  normal: { healthMult: 1.0, speedMult: 1.0, countMult: 1.0, goldMult: 1.0 },
  hard: { healthMult: 1.4, speedMult: 1.15, countMult: 1.3, goldMult: 0.85 },
  nightmare: { healthMult: 2.0, speedMult: 1.3, countMult: 1.6, goldMult: 0.7 }
}

export class EnemyManager {
  constructor(game, options = {}) {
    this.game = game
    this.scene = game.scene
    this.difficulty = options.difficulty || 'normal'
    this.difficultyScale = DIFFICULTY_SCALING[this.difficulty]
    this.pathManager = options.pathManager || null
    
    // Target (base) position
    this.targetPoint = options.targetPoint || new THREE.Vector3(0, 0, -25)
    
    // Enemy management
    this.enemies = []
    this.pendingSpawns = []
    this.spawnQueue = []
    this.activeEnemyCount = 0
    this.maxActiveEnemies = options.maxActiveEnemies || 100
    
    // Wave state
    this.currentWave = 0
    this.waveInProgress = false
    this.wavesCleared = 0
    this.totalEnemiesKilled = 0
    this.totalDamageDealt = 0
    
    // Spawn timing
    this.spawnTimer = 0
    this.waveStartTime = 0
    this.spawnInterval = 0.5 // Seconds between spawns
    this.lastSpawnTime = 0
    
    // Progressive difficulty
    this.difficultyRamp = 1.0
    this.difficultyRampRate = options.difficultyRampRate || 0.08
    
    // Callbacks
    this.onWaveComplete = options.onWaveComplete || null
    this.onWaveStart = options.onWaveStart || null
    this.onEnemySpawned = options.onEnemySpawned || null
    this.onEnemyKilled = options.onEnemyKilled || null
    
    // Get path info
    this.mainPath = this._getMainPath()
    this.spawnPoint = this._getSpawnPoint()
    
    console.log('🎮 EnemyManager initialized', {
      spawnPoint: this.spawnPoint,
      targetPoint: this.targetPoint,
      mainPath: this.mainPath?.length || 0
    })
  }
  
  _getMainPath() {
    if (this.pathManager) {
      const path = this.pathManager.getPath('main')
      if (path && path.waypoints) {
        return path.waypoints.map(p => new THREE.Vector3(p.x, p.y || 0.5, p.z))
      }
    }
    
    // Default fallback path - space enemies flying in from portal
    return [
      new THREE.Vector3(0, 1.5, 50),
      new THREE.Vector3(20, 1.5, 38),
      new THREE.Vector3(25, 1.5, 25),
      new THREE.Vector3(-5, 1.5, 15),
      new THREE.Vector3(-20, 1.5, 5),
      new THREE.Vector3(-15, 1.5, -8),
      new THREE.Vector3(10, 1.5, -12),
      new THREE.Vector3(5, 1.5, -18),
      new THREE.Vector3(0, 1.5, this.targetPoint.z)
    ]
  }
  
  _getSpawnPoint() {
    if (this.pathManager) {
      const path = this.pathManager.getPath('main')
      if (path && path.spawn) {
        return path.spawn.clone()
      }
    }
    return new THREE.Vector3(0, 1.5, 50)
  }
  
  // Start a new wave
  startWave(waveInput = null) {
    if (this.waveInProgress && this.spawnQueue.length > 0) {
      console.warn('⚠️ Wave already in progress')
      return false
    }
    
    // Determine wave configuration
    let waveConfig
    if (waveInput && typeof waveInput === 'object' && waveInput.groups) {
      waveConfig = waveInput
      this.currentWave = waveInput.number || this.currentWave + 1
    } else {
      const waveNumber = typeof waveInput === 'number' ? waveInput : this.currentWave + 1
      this.currentWave = waveNumber
      waveConfig = this.generateWave(waveNumber)
    }
    
    this.waveInProgress = true
    this.waveStartTime = Date.now()
    this.spawnTimer = 0
    this.lastSpawnTime = 0
    
    // Queue all enemies for spawning
    this.queueWaveSpawns(waveConfig)
    
    // Increase difficulty
    this.difficultyRamp = 1 + (this.currentWave - 1) * this.difficultyRampRate
    
    // Callback
    if (this.onWaveStart) {
      this.onWaveStart(this.currentWave, waveConfig.totalEnemies || this.spawnQueue.length)
    }
    
    console.log(`🌊 Wave ${this.currentWave} started - ${this.spawnQueue.length} enemies queued`)
    return true
  }
  
  // Generate wave based on wave number
  generateWave(waveNumber) {
    const groups = []
    const tier = Math.floor(waveNumber / 5)
    const baseCount = Math.floor(5 + waveNumber * 1.5)
    
    // Wave composition based on wave number
    if (waveNumber % 10 === 0 && waveNumber > 0) {
      // Double boss wave
      groups.push({ type: 'boss', count: 2 })
      groups.push({ type: 'healer', count: 3 + tier })
      groups.push({ type: 'armored', count: 4 + tier })
    } else if (waveNumber % 5 === 0 && waveNumber > 0) {
      // Boss wave
      groups.push({ type: 'boss', count: 1 })
      groups.push({ type: 'armored', count: 2 + Math.floor(tier / 2) })
      groups.push({ type: 'brute', count: 1 + Math.floor(tier / 2) })
      groups.push({ type: 'healer', count: 1 })
    } else if (waveNumber % 4 === 0) {
      // Swarm wave
      groups.push({ type: 'swarm', count: Math.floor(baseCount * 3) })
      groups.push({ type: 'scout', count: Math.floor(baseCount * 0.5) })
    } else if (waveNumber % 3 === 0) {
      // Tank wave
      groups.push({ type: 'brute', count: Math.ceil(baseCount * 0.4) })
      groups.push({ type: 'armored', count: Math.ceil(baseCount * 0.3) })
      groups.push({ type: 'spider', count: Math.ceil(baseCount * 0.4) })
    } else {
      // Standard mixed wave
      groups.push({ type: 'spider', count: baseCount })
      
      if (waveNumber >= 2) {
        groups.push({ type: 'scout', count: Math.ceil(baseCount * 0.3) })
      }
      if (waveNumber >= 4) {
        groups.push({ type: 'brute', count: Math.max(1, Math.floor(tier * 0.5)) })
      }
      if (waveNumber >= 6) {
        groups.push({ type: 'armored', count: Math.max(1, Math.floor(tier * 0.4)) })
      }
      if (waveNumber >= 8) {
        groups.push({ type: 'healer', count: Math.max(1, Math.floor(tier * 0.3)) })
      }
    }
    
    const totalEnemies = groups.reduce((sum, g) => sum + g.count, 0)
    
    return {
      number: waveNumber,
      groups,
      totalEnemies
    }
  }
  
  // Queue all spawns for a wave
  queueWaveSpawns(waveConfig) {
    this.spawnQueue = []
    
    waveConfig.groups.forEach((group, groupIndex) => {
      const enemyType = group.type
      const count = Math.ceil(group.count * this.difficultyScale.countMult)
      
      for (let i = 0; i < count; i++) {
        // Stagger spawn times within and between groups
        const spawnDelay = groupIndex * 2 + i * 0.4
        
        this.spawnQueue.push({
          type: enemyType,
          spawnDelay,
          healthMultiplier: this.difficultyRamp * this.difficultyScale.healthMult,
          speedMultiplier: this.difficultyScale.speedMult
        })
      }
    })
    
    // Sort by spawn delay
    this.spawnQueue.sort((a, b) => a.spawnDelay - b.spawnDelay)
  }
  
  // Spawn a single enemy
  spawnEnemy(config) {
    if (this.activeEnemyCount >= this.maxActiveEnemies) {
      console.warn('Max enemies reached, delaying spawn')
      return null
    }
    
    // Create enemy instance
    const enemy = new Enemy(config.type, {
      healthMultiplier: config.healthMultiplier || 1,
      speedMultiplier: config.speedMultiplier || 1,
      position: this.spawnPoint.clone()
    })
    
    // Create mesh
    const mesh = enemy.createMesh()
    if (!mesh) {
      console.error('Failed to create enemy mesh for', config.type)
      return null
    }
    
    // Position at spawn
    mesh.position.copy(this.spawnPoint)
    enemy.position = this.spawnPoint.clone()
    
    // Set path - clone waypoints so each enemy has its own
    const pathWaypoints = this.mainPath.map(p => ({
      x: p.x + (Math.random() - 0.5) * 2, // Slight random offset
      y: p.y,
      z: p.z + (Math.random() - 0.5) * 2
    }))
    enemy.setPath(pathWaypoints)
    
    // Add to scene
    this.scene.add(mesh)
    this.enemies.push(enemy)
    this.activeEnemyCount++
    
    // Spawn effect
    if (this.game.visualEffects) {
      this.game.visualEffects.createExplosion(this.spawnPoint, {
        numParticles: 15,
        color: enemy.glowColor || 0x00ff88,
        maxDist: 2,
        duration: 400,
        gravity: false
      })
    }
    
    // Callback
    if (this.onEnemySpawned) {
      this.onEnemySpawned(enemy)
    }
    
    return enemy
  }
  
  // Main update loop
  update(deltaTime) {
    this.spawnTimer += deltaTime
    
    // Process spawn queue
    while (this.spawnQueue.length > 0 && this.spawnQueue[0].spawnDelay <= this.spawnTimer) {
      const spawnConfig = this.spawnQueue.shift()
      this.spawnEnemy(spawnConfig)
    }
    
    // Update all enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i]
      
      if (!enemy) {
        this.enemies.splice(i, 1)
        continue
      }
      
      // Update enemy movement and state
      this.updateEnemy(enemy, deltaTime)
      
      // Check if enemy reached end
      if (enemy.finished || enemy.reachedEnd) {
        this.handleEnemyReachedEnd(enemy, i)
        continue
      }
      
      // Check if enemy died
      if (enemy.isDead) {
        this.handleEnemyDeath(enemy, i)
        continue
      }
    }
    
    // Check wave completion
    if (this.waveInProgress && 
        this.spawnQueue.length === 0 && 
        this.enemies.length === 0) {
      this.completeWave()
    }
  }
  
  // Update individual enemy movement and animation
  updateEnemy(enemy, deltaTime) {
    if (enemy.isDead || enemy.finished) return
    
    // Path following
    if (enemy.path && enemy.path.length >= 0 && enemy.next) {
      const targetPos = new THREE.Vector3(
        enemy.next.x,
        enemy.next.y || 0.5,
        enemy.next.z
      )
      
      const currentPos = enemy.position || (enemy.mesh ? enemy.mesh.position : new THREE.Vector3())
      const direction = new THREE.Vector3().subVectors(targetPos, currentPos)
      const distance = direction.length()
      
      if (distance > 0.5) {
        direction.normalize()
        const moveSpeed = enemy.speed * deltaTime
        
        // Update position
        enemy.position.add(direction.multiplyScalar(moveSpeed))
        if (enemy.mesh) {
          enemy.mesh.position.copy(enemy.position)
          
          // Face direction of movement
          const lookTarget = currentPos.clone().add(direction)
          enemy.mesh.lookAt(lookTarget)
        }
      } else {
        // Reached waypoint, advance to next
        const hasNext = enemy.advance()
        
        if (!hasNext || enemy.finished) {
          enemy.reachedEnd = true
        }
      }
    } else if (!enemy.next && enemy.path && enemy.path.length === 0) {
      enemy.reachedEnd = true
    }
    
    // Update animation
    if (enemy.update) {
      enemy.update(deltaTime)
    }
    
    // Health bar faces camera
    if (enemy.healthBarFill && this.game.camera && enemy.mesh) {
      enemy.mesh.traverse(child => {
        if (child.name === 'healthBar') {
          child.lookAt(this.game.camera.position)
        }
      })
    }
  }
  
  // Handle enemy reaching the base
  handleEnemyReachedEnd(enemy, index) {
    const damage = (enemy.lives || 1) * 50
    
    // Damage the base
    if (this.game.mainBase) {
      this.game.mainBase.takeDamage(damage)
    } else if (this.game.health !== undefined) {
      this.game.health -= damage
    }
    
    // Remove from scene
    if (enemy.mesh) {
      this.scene.remove(enemy.mesh)
    }
    
    // Cleanup
    this.enemies.splice(index, 1)
    this.activeEnemyCount--
    
    if (enemy.destroy) {
      enemy.destroy()
    }
    
    // Check game over
    const currentHealth = this.game.mainBase?.health ?? this.game.health
    if (currentHealth <= 0 && this.game.endGame) {
      this.game.endGame(false)
    }
    
    // UI callback
    if (this.game.callbacks && this.game.callbacks.onHealthChange) {
      this.game.callbacks.onHealthChange(currentHealth, this.game.maxHealth)
    }
  }
  
  // Handle enemy death
  handleEnemyDeath(enemy, index) {
    // Calculate rewards
    const goldReward = Math.floor((enemy.goldReward || 10) * this.difficultyScale.goldMult)
    const xpReward = enemy.xpReward || 5
    
    // Award gold
    if (this.game.addGold) {
      this.game.addGold(goldReward)
    } else if (this.game.gold !== undefined) {
      this.game.gold += goldReward
    }
    
    // Track stats
    this.totalEnemiesKilled++
    this.totalDamageDealt += enemy.maxHealth
    
    // Death effects
    if (enemy.mesh && this.game.visualEffects) {
      this.game.visualEffects.createExplosion(enemy.mesh.position, {
        numParticles: enemy.isBoss ? 60 : 25,
        color: enemy.color || 0xff6600,
        maxDist: enemy.isBoss ? 8 : 4,
        duration: 600
      })
      
      // Boss death screen shake
      if (enemy.isBoss) {
        this.game.visualEffects.triggerScreenShake(2.0, 500)
      }
    }
    
    // Handle splitter spawns
    if (enemy.splitCount && enemy.splitType) {
      const spawnPos = enemy.position.clone()
      for (let i = 0; i < enemy.splitCount; i++) {
        setTimeout(() => {
          const offset = new THREE.Vector3(
            (Math.random() - 0.5) * 3,
            0,
            (Math.random() - 0.5) * 3
          )
          const splitEnemy = this.spawnEnemy({
            type: enemy.splitType,
            healthMultiplier: 0.5,
            speedMultiplier: 1.2
          })
          if (splitEnemy && splitEnemy.mesh) {
            splitEnemy.position.copy(spawnPos.clone().add(offset))
            splitEnemy.mesh.position.copy(splitEnemy.position)
          }
        }, i * 100)
      }
    }
    
    // Remove from scene
    if (enemy.mesh) {
      this.scene.remove(enemy.mesh)
    }
    
    // Cleanup
    this.enemies.splice(index, 1)
    this.activeEnemyCount--
    
    if (enemy.destroy) {
      enemy.destroy()
    }
    
    // Callback
    if (this.onEnemyKilled) {
      this.onEnemyKilled(enemy, goldReward, xpReward)
    }
    
    // Update UI
    if (this.game.callbacks && this.game.callbacks.onGoldChange) {
      this.game.callbacks.onGoldChange(this.game.gold)
    }
  }
  
  // Complete current wave
  completeWave() {
    this.waveInProgress = false
    this.wavesCleared++
    
    const waveTime = Date.now() - this.waveStartTime
    
    // Wave completion bonus
    const bonus = Math.floor(50 + this.currentWave * 25)
    if (this.game.addGold) {
      this.game.addGold(bonus)
    } else if (this.game.gold !== undefined) {
      this.game.gold += bonus
    }
    
    console.log(`✅ Wave ${this.currentWave} complete! Time: ${(waveTime/1000).toFixed(1)}s, Bonus: ${bonus}g`)
    
    // Callback
    if (this.onWaveComplete) {
      this.onWaveComplete(this.currentWave, waveTime, bonus)
    }
  }
  
  // Get enemies in range
  getEnemiesInRange(position, range) {
    return this.enemies.filter(enemy => {
      if (enemy.isDead || !enemy.position) return false
      return enemy.position.distanceTo(position) <= range
    })
  }
  
  // Get closest enemy
  getClosestEnemy(position, maxRange = Infinity) {
    let closest = null
    let closestDist = maxRange
    
    this.enemies.forEach(enemy => {
      if (enemy.isDead || !enemy.position) return
      
      const dist = enemy.position.distanceTo(position)
      if (dist < closestDist) {
        closest = enemy
        closestDist = dist
      }
    })
    
    return closest
  }
  
  // Check if wave is active
  isWaveActive() {
    return this.waveInProgress || this.spawnQueue.length > 0 || this.enemies.length > 0
  }
  
  // Get stats
  getStats() {
    return {
      currentWave: this.currentWave,
      wavesCleared: this.wavesCleared,
      activeEnemies: this.activeEnemyCount,
      queuedEnemies: this.spawnQueue.length,
      totalKilled: this.totalEnemiesKilled,
      totalDamage: this.totalDamageDealt,
      difficulty: this.difficulty,
      difficultyRamp: this.difficultyRamp
    }
  }
  
  // Clear all enemies
  clearAllEnemies() {
    this.enemies.forEach(enemy => {
      if (enemy.mesh) {
        this.scene.remove(enemy.mesh)
      }
      if (enemy.destroy) {
        enemy.destroy()
      }
    })
    
    this.enemies = []
    this.spawnQueue = []
    this.activeEnemyCount = 0
    this.waveInProgress = false
  }
  
  // Cleanup
  destroy() {
    this.clearAllEnemies()
  }
}

export { DIFFICULTY_SCALING }
