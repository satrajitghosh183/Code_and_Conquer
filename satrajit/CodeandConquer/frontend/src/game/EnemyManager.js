// =============================================================================
// PROFESSIONAL ENEMY MANAGER - Studio-Quality Wave & Spawn System
// =============================================================================
// Handles sophisticated enemy spawning, wave progression, difficulty scaling,
// and spawn point management for both single-player and multiplayer modes.
// =============================================================================

import * as THREE from 'three'
import { Enemy } from './Enemy.js'
import { ENEMY_TYPES } from './EnemyTypes.js'

// Wave difficulty presets
const DIFFICULTY_SCALING = {
  easy: { healthMult: 0.7, speedMult: 0.85, countMult: 0.7, goldMult: 1.3 },
  normal: { healthMult: 1.0, speedMult: 1.0, countMult: 1.0, goldMult: 1.0 },
  hard: { healthMult: 1.4, speedMult: 1.15, countMult: 1.3, goldMult: 0.85 },
  nightmare: { healthMult: 2.0, speedMult: 1.3, countMult: 1.6, goldMult: 0.7 }
}

// Spawn formation patterns
const SPAWN_FORMATIONS = {
  single: (center, count, spacing) => {
    return Array(count).fill().map(() => center.clone())
  },
  line: (center, count, spacing) => {
    const positions = []
    const offset = -(count - 1) * spacing / 2
    for (let i = 0; i < count; i++) {
      const pos = center.clone()
      pos.x += offset + i * spacing
      positions.push(pos)
    }
    return positions
  },
  vFormation: (center, count, spacing) => {
    const positions = []
    const mid = Math.floor(count / 2)
    for (let i = 0; i < count; i++) {
      const pos = center.clone()
      const row = Math.abs(i - mid)
      pos.z -= row * spacing * 0.8
      pos.x += (i - mid) * spacing
      positions.push(pos)
    }
    return positions
  },
  circle: (center, count, spacing) => {
    const positions = []
    const radius = spacing * count / (2 * Math.PI)
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2
      const pos = center.clone()
      pos.x += Math.cos(angle) * radius
      pos.z += Math.sin(angle) * radius
      positions.push(pos)
    }
    return positions
  },
  swarm: (center, count, spacing) => {
    const positions = []
    for (let i = 0; i < count; i++) {
      const pos = center.clone()
      pos.x += (Math.random() - 0.5) * spacing * 4
      pos.z += (Math.random() - 0.5) * spacing * 2
      positions.push(pos)
    }
    return positions
  },
  pincer: (center, count, spacing) => {
    // Split into two flanking groups
    const positions = []
    const half = Math.floor(count / 2)
    for (let i = 0; i < half; i++) {
      const pos = center.clone()
      pos.x -= spacing * 3 + i * spacing * 0.5
      pos.z -= i * spacing
      positions.push(pos)
    }
    for (let i = 0; i < count - half; i++) {
      const pos = center.clone()
      pos.x += spacing * 3 + i * spacing * 0.5
      pos.z -= i * spacing
      positions.push(pos)
    }
    return positions
  }
}

// Advanced wave composition templates
const WAVE_COMPOSITIONS = {
  // Early game waves (1-5)
  tutorial: {
    waves: [
      { enemies: [{ type: 'spider', count: 3 }], formation: 'line', delay: 1200 },
      { enemies: [{ type: 'spider', count: 5 }], formation: 'line', delay: 1000 },
      { enemies: [{ type: 'spider', count: 4 }, { type: 'scout', count: 2 }], formation: 'vFormation', delay: 900 },
      { enemies: [{ type: 'spider', count: 6 }, { type: 'scout', count: 3 }], formation: 'line', delay: 800 },
      { enemies: [{ type: 'brute', count: 1 }, { type: 'spider', count: 4 }], formation: 'vFormation', delay: 1000 }
    ]
  },
  // Mid game waves (6-15)
  standard: {
    waves: [
      { enemies: [{ type: 'spider', count: 8 }, { type: 'scout', count: 4 }], formation: 'swarm', delay: 700 },
      { enemies: [{ type: 'brute', count: 2 }, { type: 'armored', count: 2 }, { type: 'spider', count: 4 }], formation: 'vFormation', delay: 800 },
      { enemies: [{ type: 'swarm', count: 15 }], formation: 'swarm', delay: 300 },
      { enemies: [{ type: 'healer', count: 1 }, { type: 'brute', count: 3 }, { type: 'armored', count: 3 }], formation: 'vFormation', delay: 900 },
      { enemies: [{ type: 'splitter', count: 4 }, { type: 'scout', count: 6 }], formation: 'circle', delay: 600 }
    ]
  },
  // Boss waves (every 5th wave)
  boss: {
    waves: [
      { enemies: [{ type: 'boss', count: 1 }, { type: 'healer', count: 2 }, { type: 'armored', count: 4 }], formation: 'vFormation', delay: 1500 }
    ]
  },
  // Special event waves
  swarmRush: {
    waves: [
      { enemies: [{ type: 'swarm', count: 30 }, { type: 'scout', count: 10 }], formation: 'swarm', delay: 200 }
    ]
  },
  eliteSquad: {
    waves: [
      { enemies: [{ type: 'armored', count: 5 }, { type: 'brute', count: 3 }, { type: 'healer', count: 2 }], formation: 'vFormation', delay: 1200 }
    ]
  },
  pincer: {
    waves: [
      { enemies: [{ type: 'scout', count: 8 }, { type: 'spider', count: 8 }], formation: 'pincer', delay: 500 }
    ]
  }
}

export class EnemyManager {
  constructor(game, options = {}) {
    this.game = game
    this.scene = game.scene
    this.difficulty = options.difficulty || 'normal'
    this.difficultyScale = DIFFICULTY_SCALING[this.difficulty]
    
    // Spawn configuration
    this.spawnPoints = options.spawnPoints || [new THREE.Vector3(0, 0.5, 40)]
    this.targetPoint = options.targetPoint || new THREE.Vector3(0, 0, -20)
    
    // Enemy management
    this.enemies = []
    this.pendingSpawns = []
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
    this.nextSpawnTime = 0
    this.waveStartTime = 0
    
    // Progressive difficulty
    this.difficultyRamp = 1.0
    this.difficultyRampRate = options.difficultyRampRate || 0.08 // 8% harder per wave
    
    // Callbacks
    this.onEnemySpawned = options.onEnemySpawned || null
    this.onEnemyKilled = options.onEnemyKilled || null
    this.onWaveComplete = options.onWaveComplete || null
    this.onWaveStart = options.onWaveStart || null
    
    // Object pool for performance
    this.enemyPool = new Map()
    this.preloadEnemyPool()
  }
  
  // Preload enemy pool for instant spawning
  preloadEnemyPool() {
    Object.keys(ENEMY_TYPES).forEach(type => {
      this.enemyPool.set(type, [])
    })
  }
  
  // Get enemy from pool or create new one
  getEnemy(type, config = {}) {
    const pool = this.enemyPool.get(type)
    
    if (pool && pool.length > 0) {
      const enemy = pool.pop()
      enemy.reset(config)
      return enemy
    }
    
    // Create new enemy with enhanced config
    return new Enemy(type, {
      ...config,
      healthMultiplier: (config.healthMultiplier || 1) * this.difficultyScale.healthMult * this.difficultyRamp,
      speedMultiplier: (config.speedMultiplier || 1) * this.difficultyScale.speedMult,
      visualEffects: this.game.visualEffects
    })
  }
  
  // Return enemy to pool
  returnToPool(enemy) {
    const pool = this.enemyPool.get(enemy.type)
    if (pool && pool.length < 20) {
      pool.push(enemy)
    } else {
      enemy.destroy()
    }
  }
  
  // Generate wave based on wave number
  generateWave(waveNumber) {
    const wave = {
      number: waveNumber,
      groups: [],
      totalEnemies: 0
    }
    
    // Determine wave type
    let composition
    if (waveNumber % 10 === 0) {
      // Every 10th wave: double boss
      composition = {
        waves: [{
          enemies: [
            { type: 'boss', count: 2 },
            { type: 'healer', count: 3 },
            { type: 'armored', count: 6 }
          ],
          formation: 'vFormation',
          delay: 2000
        }]
      }
    } else if (waveNumber % 5 === 0) {
      // Every 5th wave: boss
      composition = WAVE_COMPOSITIONS.boss
    } else if (waveNumber % 7 === 0) {
      // Swarm waves
      composition = WAVE_COMPOSITIONS.swarmRush
    } else if (waveNumber % 4 === 0) {
      // Pincer attack
      composition = WAVE_COMPOSITIONS.pincer
    } else if (waveNumber <= 5) {
      // Tutorial waves
      composition = WAVE_COMPOSITIONS.tutorial
    } else {
      // Standard waves with scaling
      composition = this.generateScaledComposition(waveNumber)
    }
    
    // Get specific wave from composition
    const waveIndex = (waveNumber - 1) % composition.waves.length
    const waveConfig = composition.waves[waveIndex]
    
    // Scale enemy counts based on wave number
    const countMultiplier = Math.floor(1 + (waveNumber - 1) * 0.15) * this.difficultyScale.countMult
    
    // Create spawn groups
    waveConfig.enemies.forEach((enemyGroup, groupIndex) => {
      const scaledCount = Math.ceil(enemyGroup.count * countMultiplier)
      
      wave.groups.push({
        type: enemyGroup.type,
        count: scaledCount,
        formation: waveConfig.formation,
        delay: waveConfig.delay,
        groupDelay: groupIndex * 2000, // Stagger groups
        spawned: 0
      })
      
      wave.totalEnemies += scaledCount
    })
    
    return wave
  }
  
  // Generate scaled composition for higher waves
  generateScaledComposition(waveNumber) {
    const baseEnemies = []
    const tier = Math.floor(waveNumber / 5)
    
    // Always have base enemies
    baseEnemies.push({ type: 'spider', count: 4 + tier * 2 })
    
    // Add scouts from wave 2
    if (waveNumber >= 2) {
      baseEnemies.push({ type: 'scout', count: 2 + tier })
    }
    
    // Add brutes from wave 4
    if (waveNumber >= 4) {
      baseEnemies.push({ type: 'brute', count: Math.max(1, Math.floor(tier * 0.8)) })
    }
    
    // Add armored from wave 6
    if (waveNumber >= 6) {
      baseEnemies.push({ type: 'armored', count: Math.max(1, Math.floor(tier * 0.6)) })
    }
    
    // Add healers from wave 8
    if (waveNumber >= 8) {
      baseEnemies.push({ type: 'healer', count: Math.max(1, Math.floor(tier * 0.4)) })
    }
    
    // Add splitters from wave 10
    if (waveNumber >= 10) {
      baseEnemies.push({ type: 'splitter', count: Math.max(1, Math.floor(tier * 0.5)) })
    }
    
    // Random formation
    const formations = ['line', 'vFormation', 'swarm', 'circle']
    const formation = formations[waveNumber % formations.length]
    
    // Faster spawns at higher waves
    const delay = Math.max(300, 1000 - tier * 100)
    
    return {
      waves: [{ enemies: baseEnemies, formation, delay }]
    }
  }
  
  // Start a new wave
  startWave(waveNumber = null) {
    if (this.waveInProgress && this.pendingSpawns.length > 0) {
      console.warn('Wave already in progress')
      return false
    }
    
    this.currentWave = waveNumber || this.currentWave + 1
    this.waveInProgress = true
    this.waveStartTime = Date.now()
    
    // Generate wave configuration
    const wave = this.generateWave(this.currentWave)
    
    // Schedule all spawns
    this.scheduleWaveSpawns(wave)
    
    // Increase difficulty ramp
    this.difficultyRamp = 1 + (this.currentWave - 1) * this.difficultyRampRate
    
    // Callback
    if (this.onWaveStart) {
      this.onWaveStart(this.currentWave, wave.totalEnemies)
    }
    
    console.log(`🌊 Wave ${this.currentWave} started - ${wave.totalEnemies} enemies`)
    return true
  }
  
  // Schedule spawns for a wave
  scheduleWaveSpawns(wave) {
    this.pendingSpawns = []
    let totalDelay = 0
    
    wave.groups.forEach(group => {
      // Get spawn positions based on formation
      const spawnCenter = this.getRandomSpawnPoint()
      const positions = SPAWN_FORMATIONS[group.formation](
        spawnCenter, 
        group.count, 
        2 // spacing
      )
      
      // Schedule each enemy spawn
      positions.forEach((pos, index) => {
        const spawnTime = totalDelay + group.groupDelay + index * group.delay
        
        this.pendingSpawns.push({
          type: group.type,
          position: pos,
          spawnTime,
          healthMultiplier: this.difficultyRamp * this.difficultyScale.healthMult,
          speedMultiplier: this.difficultyScale.speedMult
        })
      })
      
      totalDelay += group.count * group.delay + 1000 // Gap between groups
    })
    
    // Sort by spawn time
    this.pendingSpawns.sort((a, b) => a.spawnTime - b.spawnTime)
    this.spawnTimer = 0
  }
  
  // Get random spawn point
  getRandomSpawnPoint() {
    if (this.spawnPoints.length === 0) {
      return new THREE.Vector3(0, 0.5, 40)
    }
    
    const index = Math.floor(Math.random() * this.spawnPoints.length)
    return this.spawnPoints[index].clone()
  }
  
  // Spawn a single enemy
  spawnEnemy(config) {
    if (this.activeEnemyCount >= this.maxActiveEnemies) {
      // Queue for later
      this.pendingSpawns.unshift(config)
      return null
    }
    
    const enemy = this.getEnemy(config.type, {
      healthMultiplier: config.healthMultiplier,
      speedMultiplier: config.speedMultiplier,
      visualEffects: this.game.visualEffects
    })
    
    // Create mesh if not exists
    const mesh = enemy.createMesh()
    if (!mesh) {
      console.error('Failed to create enemy mesh')
      return null
    }
    
    // Position at spawn point
    mesh.position.copy(config.position)
    enemy.position = config.position.clone()
    
    // Set up path to target
    this.setupEnemyPath(enemy)
    
    // Add to scene and tracking
    this.scene.add(mesh)
    this.enemies.push(enemy)
    this.activeEnemyCount++
    
    // Add to spatial grid if available
    if (this.game.spatialGrid) {
      this.game.spatialGrid.insert(enemy)
    }
    
    // Spawn effects
    this.createSpawnEffect(config.position)
    
    // Callback
    if (this.onEnemySpawned) {
      this.onEnemySpawned(enemy)
    }
    
    return enemy
  }
  
  // Set up enemy pathfinding
  setupEnemyPath(enemy) {
    // Use A* pathfinding if available
    if (this.game.arena) {
      const startGrid = this.game.arena.worldToGrid(enemy.position)
      const endGrid = this.game.arena.worldToGrid(this.targetPoint)
      
      const gridPath = this.game.arena.findPath(startGrid, endGrid)
      
      if (gridPath && gridPath.length > 0) {
        const worldPath = this.game.arena.getWorldPath(gridPath)
        enemy.setPath(worldPath)
        return
      }
    }
    
    // Fallback: direct path with waypoints
    if (this.game.enemyPath) {
      enemy.setPath(this.game.enemyPath.map(p => ({
        x: p.x,
        y: p.y || 0.5,
        z: p.z
      })))
    } else {
      // Simple direct path
      enemy.setPath([
        { x: enemy.position.x, y: 0.5, z: enemy.position.z },
        { x: this.targetPoint.x, y: 0.5, z: this.targetPoint.z }
      ])
    }
  }
  
  // Create spawn visual effect
  createSpawnEffect(position) {
    if (this.game.visualEffects) {
      // Portal/teleport effect
      this.game.visualEffects.createExplosion(position, {
        numParticles: 20,
        color: 0x00ff88,
        maxDist: 3,
        size: 0.3,
        duration: 500
      })
      
      // Ground ring
      this.game.visualEffects.createShockwave(position, {
        maxRadius: 3,
        color: 0x00ff88,
        duration: 400
      })
    }
  }
  
  // Update loop
  update(deltaTime) {
    this.spawnTimer += deltaTime * 1000 // Convert to milliseconds
    
    // Process pending spawns
    while (this.pendingSpawns.length > 0 && 
           this.pendingSpawns[0].spawnTime <= this.spawnTimer) {
      const spawn = this.pendingSpawns.shift()
      this.spawnEnemy(spawn)
    }
    
    // Update all enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i]
      
      // Update enemy movement and animation
      this.updateEnemy(enemy, deltaTime)
      
      // Check if enemy reached target
      if (enemy.finished || enemy.reachedEnd) {
        this.handleEnemyReachedEnd(enemy, i)
        continue
      }
      
      // Check if enemy died
      if (enemy.isDead) {
        this.handleEnemyDeath(enemy, i)
        continue
      }
      
      // Update spatial grid
      if (this.game.spatialGrid && enemy.position) {
        this.game.spatialGrid.update(enemy)
      }
    }
    
    // Check wave completion
    if (this.waveInProgress && 
        this.pendingSpawns.length === 0 && 
        this.enemies.length === 0) {
      this.completeWave()
    }
  }
  
  // Update individual enemy
  updateEnemy(enemy, deltaTime) {
    if (enemy.isDead || enemy.finished) return
    
    // Path following
    if (enemy.path && enemy.path.length > 0 && enemy.next) {
      const targetPos = new THREE.Vector3(
        enemy.next.x, 
        enemy.next.y || 0.5, 
        enemy.next.z || 0
      )
      
      const currentPos = enemy.position || enemy.mesh.position
      const direction = new THREE.Vector3().subVectors(targetPos, currentPos)
      const distance = direction.length()
      
      if (distance > 0.3) {
        direction.normalize()
        const moveSpeed = enemy.speed * deltaTime
        
        // Update position
        if (enemy.position) {
          enemy.position.add(direction.multiplyScalar(moveSpeed))
          if (enemy.mesh) {
            enemy.mesh.position.copy(enemy.position)
          }
        }
        
        // Rotate to face direction
        if (enemy.mesh) {
          enemy.mesh.lookAt(targetPos)
        }
      } else {
        // Reached waypoint
        enemy.advance()
        
        if (enemy.finished) {
          enemy.reachedEnd = true
        }
      }
    }
    
    // Animation
    if (enemy.updateAnimation) {
      enemy.updateAnimation(deltaTime)
    }
    
    // Health bar always faces camera
    if (enemy.healthBar && this.game.camera) {
      enemy.mesh.children.forEach(child => {
        if (child.name === 'healthBarBg' || child.name === 'healthBarFill') {
          child.lookAt(this.game.camera.position)
        }
      })
    }
    
    // Healer aura effect
    if (enemy.healRadius && !enemy.isDead) {
      this.processHealerAura(enemy, deltaTime)
    }
  }
  
  // Process healer enemy's aura
  processHealerAura(healer, deltaTime) {
    if (!healer.lastHealTime) healer.lastHealTime = 0
    healer.lastHealTime += deltaTime
    
    if (healer.lastHealTime >= 1) { // Heal every second
      healer.lastHealTime = 0
      
      this.enemies.forEach(enemy => {
        if (enemy === healer || enemy.isDead) return
        
        const dist = enemy.position.distanceTo(healer.position)
        if (dist <= healer.healRadius) {
          enemy.health = Math.min(enemy.maxHealth, enemy.health + healer.healAmount)
          enemy.updateHealthBar()
          
          // Heal visual
          if (this.game.visualEffects) {
            this.game.visualEffects.createDamageNumber(
              enemy.mesh.position.clone(),
              `+${healer.healAmount}`,
              { color: 0x00ff88, size: 0.8, duration: 800 }
            )
          }
        }
      })
    }
  }
  
  // Handle enemy reaching the end
  handleEnemyReachedEnd(enemy, index) {
    const damage = (enemy.lives || 1) * 50
    
    if (this.game.health !== undefined) {
      this.game.health -= damage
    }
    
    // Remove from scene
    if (enemy.mesh) {
      this.scene.remove(enemy.mesh)
    }
    
    // Cleanup
    this.enemies.splice(index, 1)
    this.activeEnemyCount--
    this.returnToPool(enemy)
    
    // Check game over
    if (this.game.health <= 0 && this.game.endGame) {
      this.game.endGame(false)
    }
    
    // Callback for UI update
    if (this.game.callbacks && this.game.callbacks.onHealthChange) {
      this.game.callbacks.onHealthChange(this.game.health, this.game.maxHealth)
    }
  }
  
  // Handle enemy death
  handleEnemyDeath(enemy, index) {
    // Calculate rewards
    const goldReward = Math.floor(enemy.goldReward * this.difficultyScale.goldMult)
    const xpReward = enemy.xpReward
    
    // Award gold
    if (this.game.gold !== undefined) {
      this.game.gold += goldReward
      if (this.game.callbacks && this.game.callbacks.onGoldChange) {
        this.game.callbacks.onGoldChange(this.game.gold)
      }
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
      const spawnPos = enemy.mesh ? enemy.mesh.position.clone() : enemy.position.clone()
      for (let i = 0; i < enemy.splitCount; i++) {
        setTimeout(() => {
          const offset = new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            0,
            (Math.random() - 0.5) * 2
          )
          this.spawnEnemy({
            type: enemy.splitType,
            position: spawnPos.clone().add(offset),
            healthMultiplier: 0.5,
            speedMultiplier: 1.2
          })
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
    this.returnToPool(enemy)
    
    // Callback
    if (this.onEnemyKilled) {
      this.onEnemyKilled(enemy, goldReward, xpReward)
    }
  }
  
  // Complete current wave
  completeWave() {
    this.waveInProgress = false
    this.wavesCleared++
    
    const waveTime = Date.now() - this.waveStartTime
    
    // Wave completion bonus
    const bonus = Math.floor(50 + this.currentWave * 20)
    if (this.game.gold !== undefined) {
      this.game.gold += bonus
      if (this.game.callbacks && this.game.callbacks.onGoldChange) {
        this.game.callbacks.onGoldChange(this.game.gold)
      }
    }
    
    console.log(`✅ Wave ${this.currentWave} complete! Time: ${(waveTime/1000).toFixed(1)}s, Bonus: ${bonus}g`)
    
    // Callback
    if (this.onWaveComplete) {
      this.onWaveComplete(this.currentWave, waveTime, bonus)
    }
  }
  
  // Damage enemy from tower/projectile
  damageEnemy(enemy, damage, source = null) {
    if (!enemy || enemy.isDead) return false
    
    // Apply damage (enemy handles armor)
    const killed = enemy.damage(damage)
    
    return killed
  }
  
  // Get enemies in range of a position
  getEnemiesInRange(position, range) {
    return this.enemies.filter(enemy => {
      if (enemy.isDead || !enemy.position) return false
      return enemy.position.distanceTo(position) <= range
    })
  }
  
  // Get closest enemy to a position
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
  
  // Get stats
  getStats() {
    return {
      currentWave: this.currentWave,
      wavesCleared: this.wavesCleared,
      activeEnemies: this.activeEnemyCount,
      totalKilled: this.totalEnemiesKilled,
      totalDamage: this.totalDamageDealt,
      difficulty: this.difficulty,
      difficultyRamp: this.difficultyRamp
    }
  }
  
  // Add spawn point
  addSpawnPoint(position) {
    this.spawnPoints.push(position.clone())
  }
  
  // Set target (base) position
  setTarget(position) {
    this.targetPoint = position.clone()
  }
  
  // Clear all enemies
  clearAllEnemies() {
    this.enemies.forEach(enemy => {
      if (enemy.mesh) {
        this.scene.remove(enemy.mesh)
      }
      enemy.destroy()
    })
    
    this.enemies = []
    this.pendingSpawns = []
    this.activeEnemyCount = 0
    this.waveInProgress = false
  }
  
  // Cleanup
  destroy() {
    this.clearAllEnemies()
    this.enemyPool.clear()
  }
}

export { SPAWN_FORMATIONS, WAVE_COMPOSITIONS, DIFFICULTY_SCALING }

