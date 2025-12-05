// =============================================================================
// ENHANCED GAME - Lightweight Tower Defense Engine
// =============================================================================

import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GraphicsEngine } from './GraphicsEngine.js'
import { EnemyManager } from './EnemyManager.js'
import { VisualEffects } from './VisualEffects.js'
import { Tower } from './structures/Tower.js'
import { TOWER_TYPES } from './structures/TowerTypes.js'
import { MainBase } from './MainBase.js'

export class EnhancedGame {
  constructor(container, callbacks = {}, userProfile = {}, gameMode = 'single') {
    this.container = container
    this.callbacks = callbacks
    this.userProfile = userProfile
    this.gameMode = gameMode
    
    // Game State
    this.gold = callbacks.initialGold || 600
    this.energy = callbacks.initialEnergy || 50
    this.maxEnergy = 100
    this.health = 1000
    this.maxHealth = 1000
    this.wave = 0
    this.score = 0
    
    this.isPaused = false
    this.gameOver = false
    this.modelsReady = true // No async model loading needed
    
    // Initialize Graphics
    this.graphicsEngine = new GraphicsEngine(container, {
      quality: 'medium',
      enablePostProcessing: false,
      enableShadows: false
    })
    
    const { scene, camera, renderer } = this.graphicsEngine.initialize()
    this.scene = scene
    this.camera = camera
    this.renderer = renderer
    
    // Controls
    this.initControls()
    
    // Visual Effects
    this.visualEffects = new VisualEffects(this.scene, this.camera)
    
    // Player base position
    this.basePosition = new THREE.Vector3(0, 0, -25)
    
    // Create Main Base
    this.mainBase = new MainBase(this.basePosition, {
      level: 1,
      onHealthChange: (health, maxHealth) => {
        this.health = health
        this.maxHealth = maxHealth
        if (this.callbacks.onHealthChange) {
          this.callbacks.onHealthChange(health, maxHealth)
        }
      },
      onDestroyed: () => {
        this.endGame(false)
      }
    })
    this.mainBase.create(this.scene)
    this.health = this.mainBase.health
    this.maxHealth = this.mainBase.maxHealth
    
    // Enemy path
    this.enemyPath = [
      new THREE.Vector3(0, 0.5, 45),
      new THREE.Vector3(18, 0.5, 35),
      new THREE.Vector3(18, 0.5, 15),
      new THREE.Vector3(-12, 0.5, 8),
      new THREE.Vector3(-12, 0.5, -8),
      new THREE.Vector3(8, 0.5, -15),
      new THREE.Vector3(0, 0.5, this.basePosition.z)
    ]
    
    // Enemy Manager
    this.enemyManager = new EnemyManager(this, {
      difficulty: 'normal',
      spawnPoints: [new THREE.Vector3(0, 0.5, 45)],
      targetPoint: this.basePosition,
      maxActiveEnemies: 50,
      
      onWaveComplete: (waveNum, waveTime, bonus) => {
        if (this.callbacks.onWaveComplete) {
          this.callbacks.onWaveComplete(waveNum, bonus)
        }
      },
      
      onWaveStart: (waveNum) => {
        this.wave = waveNum
        if (this.callbacks.onWaveChange) {
          this.callbacks.onWaveChange(waveNum)
        }
      }
    })
    
    this.enemies = this.enemyManager.enemies
    
    // Structures
    this.structures = []
    this.towers = []
    this.projectiles = []
    
    // Build system
    this.selectedStructureType = null
    this.ghostPreview = null
    this.availableTowers = Object.keys(TOWER_TYPES)
    
    // Wave timer
    this.waveCountdown = 30
    this.waveInterval = 30000
    this.lastWaveTime = Date.now()
    this.passiveEnergyPerSecond = 0.2
    
    // Input
    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()
    
    this.setupEventListeners()
    
    // Start game loop
    this.clock = new THREE.Clock()
    
    // Grace period
    setTimeout(() => {
      this.startWaveTimer()
      console.log('🎮 Game started!')
    }, 3000)
    
    // Notify ready
    if (this.callbacks.onModelsReady) {
      this.callbacks.onModelsReady()
    }
    
    this.animate()
  }
  
  initControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    this.controls.minDistance = 25
    this.controls.maxDistance = 80
    this.controls.maxPolarAngle = Math.PI / 2.2
    this.controls.target.set(0, 0, 0)
  }
  
  startWaveTimer() {
    this.waveTimerActive = true
    this.lastWaveTime = Date.now()
    this.waveCountdown = 30
  }
  
  startNextWave() {
    this.enemyManager.startWave()
    this.waveCountdown = 30
    this.lastWaveTime = Date.now()
  }
  
  setupEventListeners() {
    this.renderer.domElement.addEventListener('click', (e) => this.onClick(e))
    this.renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e))
    this.renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault())
    window.addEventListener('resize', () => this.onResize())
  }
  
  onClick(event) {
    if (this.gameOver || this.isPaused) return
    
    const rect = this.container.getBoundingClientRect()
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    
    this.raycaster.setFromCamera(this.mouse, this.camera)
    const intersects = this.raycaster.intersectObject(this.graphicsEngine.terrain)
    
    if (intersects.length > 0) {
      const point = intersects[0].point.clone()
      point.y = 0
      
      if (this.selectedStructureType) {
        this.placeStructure(this.selectedStructureType, point)
      }
    }
  }
  
  onMouseMove(event) {
    if (!this.selectedStructureType) {
      if (this.ghostPreview) {
        this.scene.remove(this.ghostPreview)
        this.ghostPreview = null
      }
      return
    }
    
    const rect = this.container.getBoundingClientRect()
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    
    this.raycaster.setFromCamera(this.mouse, this.camera)
    const intersects = this.raycaster.intersectObject(this.graphicsEngine.terrain)
    
    if (intersects.length > 0) {
      const point = intersects[0].point.clone()
      point.y = 0
      this.updateGhostPreview(point)
    }
  }
  
  onResize() {
    this.graphicsEngine.handleResize()
    this.controls.update()
  }
  
  selectStructureType(structureId) {
    const mapping = {
      'gattling': { type: 'tower', towerType: 'gattling' },
      'missile': { type: 'tower', towerType: 'missile' },
      'laser': { type: 'tower', towerType: 'laser' },
      'sniper': { type: 'tower', towerType: 'sniper' },
      'frost': { type: 'tower', towerType: 'frost' },
      'fire': { type: 'tower', towerType: 'fire' },
      'tesla': { type: 'tower', towerType: 'tesla' },
      'basic_tower': { type: 'tower', towerType: 'gattling' }
    }
    
    const config = mapping[structureId]
    if (config) {
      this.selectedStructureType = config
      console.log('Selected:', structureId)
    } else {
      this.cancelPlacement()
    }
  }
  
  cancelPlacement() {
    this.selectedStructureType = null
    if (this.ghostPreview) {
      this.scene.remove(this.ghostPreview)
      this.ghostPreview = null
    }
  }
  
  updateGhostPreview(position) {
    if (!this.selectedStructureType) return
    
    const isValid = this.isValidPlacement(position)
    
    if (!this.ghostPreview) {
      const geom = new THREE.CylinderGeometry(1, 1.2, 3, 8)
      const mat = new THREE.MeshBasicMaterial({
        color: isValid ? 0x00ff00 : 0xff0000,
        transparent: true,
        opacity: 0.5
      })
      this.ghostPreview = new THREE.Mesh(geom, mat)
      this.ghostPreview.position.y = 1.5
      this.scene.add(this.ghostPreview)
    }
    
    this.ghostPreview.position.x = position.x
    this.ghostPreview.position.z = position.z
    this.ghostPreview.material.color.setHex(isValid ? 0x00ff00 : 0xff0000)
  }
  
  isValidPlacement(position) {
    // Not too close to base
    if (position.distanceTo(this.basePosition) < 12) return false
    
    // Not on path
    for (let i = 0; i < this.enemyPath.length - 1; i++) {
      const dist = this.distanceToLineSegment(position, this.enemyPath[i], this.enemyPath[i + 1])
      if (dist < 4) return false
    }
    
    // Not too close to other towers
    for (const tower of this.towers) {
      if (tower.position.distanceTo(position) < 4) return false
    }
    
    // Within bounds
    if (Math.abs(position.x) > 45 || Math.abs(position.z) > 50) return false
    
    return true
  }
  
  distanceToLineSegment(point, lineStart, lineEnd) {
    const line = new THREE.Vector3().subVectors(lineEnd, lineStart)
    const pointToStart = new THREE.Vector3().subVectors(point, lineStart)
    const t = Math.max(0, Math.min(1, pointToStart.dot(line) / line.lengthSq()))
    const projection = new THREE.Vector3().addVectors(lineStart, line.multiplyScalar(t))
    return point.distanceTo(projection)
  }
  
  async placeStructure(structureConfig, position) {
    if (!structureConfig) return false
    
    const cost = this.getStructureCost(structureConfig)
    if (this.gold < cost) {
      console.log('Not enough gold!')
      return false
    }
    
    if (!this.isValidPlacement(position)) {
      console.log('Invalid placement!')
      return false
    }
    
    if (structureConfig.type === 'tower') {
      const tower = new Tower(structureConfig.towerType, position)
      await tower.load()
      this.scene.add(tower.mesh)
      this.structures.push(tower)
      this.towers.push(tower)
      
      // Build effect
      this.visualEffects.createBuildEffect(position)
      
      // Deduct gold
      this.gold -= cost
      if (this.callbacks.onGoldChange) {
        this.callbacks.onGoldChange(this.gold)
      }
      
      this.cancelPlacement()
      console.log(`Built ${structureConfig.towerType} tower`)
      return true
    }
    
    return false
  }
  
  getStructureCost(structureConfig) {
    if (structureConfig.type === 'tower') {
      return TOWER_TYPES[structureConfig.towerType]?.cost || 100
    }
    return 100
  }
  
  update(deltaTime) {
    if (this.gameOver || this.isPaused) return
    
    deltaTime = Math.min(deltaTime, 0.033)
    
    this.controls.update()
    this.graphicsEngine.update(deltaTime)
    this.visualEffects.update(deltaTime)
    
    // Wave timer
    if (this.waveTimerActive) {
      const elapsed = Date.now() - this.lastWaveTime
      this.waveCountdown = Math.max(0, 30 - elapsed / 1000)
      
      if (this.callbacks.onWaveCountdown) {
        this.callbacks.onWaveCountdown(this.waveCountdown, 30)
      }
      
      if (this.waveCountdown <= 0) {
        this.startNextWave()
      }
      
      // Passive energy
      this.energy = Math.min(this.maxEnergy, this.energy + this.passiveEnergyPerSecond * deltaTime)
      if (this.callbacks.onEnergyChange) {
        this.callbacks.onEnergyChange(this.energy, this.maxEnergy)
      }
    }
    
    // Update enemies
    this.enemyManager.update(deltaTime)
    
    // Update towers and fire projectiles
    this.updateTowers(deltaTime)
    
    // Update projectiles
    this.updateProjectiles(deltaTime)
    
    // Update main base
    if (this.mainBase) {
      this.mainBase.update(deltaTime, this.enemies, this.visualEffects)
      this.health = this.mainBase.health
    }
    
    // Sync gold
    if (this.callbacks.onGoldChange) {
      this.callbacks.onGoldChange(this.gold)
    }
    
    // Win condition
    if (this.wave >= 20 && this.enemies.length === 0) {
      this.endGame(true)
    }
  }
  
  updateTowers(deltaTime) {
    const currentTime = Date.now() / 1000
    
    this.towers.forEach(tower => {
      const target = tower.findTarget(this.enemies)
      
      if (target && tower.canFire(currentTime)) {
        tower.aimAtTarget()
        this.fireTower(tower, target, currentTime)
      }
    })
  }
  
  fireTower(tower, target, currentTime) {
    tower.lastShot = currentTime
    
    // Create simple projectile
    const projectile = this.createProjectile(tower, target)
    if (projectile) {
      this.projectiles.push(projectile)
    }
  }
  
  createProjectile(tower, target) {
    const startPos = tower.position.clone()
    startPos.y = 3
    
    const targetPos = target.position.clone()
    targetPos.y = 0.5
    
    const direction = new THREE.Vector3().subVectors(targetPos, startPos).normalize()
    
    // Simple sphere projectile
    const geom = new THREE.SphereGeometry(0.15, 6, 6)
    const mat = new THREE.MeshBasicMaterial({ color: tower.getTowerColor() })
    const mesh = new THREE.Mesh(geom, mat)
    mesh.position.copy(startPos)
    
    this.scene.add(mesh)
    
    return {
      mesh,
      direction,
      speed: tower.projectileSpeed || 25,
      damage: tower.damage,
      target,
      tower,
      splashRadius: tower.splashRadius || 0,
      slowAmount: tower.slowAmount || 0,
      slowDuration: tower.slowDuration || 0,
      burnDamage: tower.burnDamage || 0,
      maxDistance: tower.range * 2,
      traveled: 0
    }
  }
  
  updateProjectiles(deltaTime) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i]
      
      const moveAmount = proj.speed * deltaTime
      proj.mesh.position.add(proj.direction.clone().multiplyScalar(moveAmount))
      proj.traveled += moveAmount
      
      // Check hit
      let hit = false
      
      for (const enemy of this.enemies) {
        if (enemy.isDead) continue
        
        const dist = proj.mesh.position.distanceTo(enemy.position)
        if (dist < 1.0) {
          // Direct hit
          enemy.damage(proj.damage)
          
          // Splash damage
          if (proj.splashRadius > 0) {
            this.enemies.forEach(e => {
              if (e !== enemy && !e.isDead) {
                const splashDist = proj.mesh.position.distanceTo(e.position)
                if (splashDist <= proj.splashRadius) {
                  e.damage(proj.damage * 0.5)
                }
              }
            })
            this.visualEffects.createExplosion(proj.mesh.position.clone(), {
              numParticles: 15,
              color: 0xff6600
            })
          }
          
          // Slow effect
          if (proj.slowAmount > 0) {
            enemy.applySlow(proj.slowAmount, proj.slowDuration || 2000)
          }
          
          hit = true
          break
        }
      }
      
      // Remove if hit or too far
      if (hit || proj.traveled > proj.maxDistance) {
        this.scene.remove(proj.mesh)
        proj.mesh.geometry.dispose()
        proj.mesh.material.dispose()
        this.projectiles.splice(i, 1)
      }
    }
  }
  
  addGold(amount) {
    this.gold += amount
    if (this.callbacks.onGoldChange) {
      this.callbacks.onGoldChange(this.gold)
    }
  }
  
  addEnergy(amount) {
    this.energy = Math.min(this.maxEnergy, this.energy + amount)
    if (this.callbacks.onEnergyChange) {
      this.callbacks.onEnergyChange(this.energy, this.maxEnergy)
    }
  }
  
  onProblemSolved(problemData) {
    const rewards = {
      gold: problemData.difficulty === 'hard' ? 150 : problemData.difficulty === 'medium' ? 100 : 50,
      energy: problemData.difficulty === 'hard' ? 20 : 10
    }
    
    this.addGold(rewards.gold)
    this.addEnergy(rewards.energy)
    
    // Add time to wave countdown
    this.waveCountdown = Math.min(60, this.waveCountdown + 10)
    
    return rewards
  }
  
  onTaskCompleted(taskType = 'daily') {
    const rewards = {
      energy: taskType === 'weekly' ? 20 : 15,
      timeBonus: taskType === 'weekly' ? 15 : 10
    }
    
    this.addEnergy(rewards.energy)
    this.waveCountdown = Math.min(60, this.waveCountdown + rewards.timeBonus)
    
    return rewards
  }
  
  endGame(won) {
    this.gameOver = true
    console.log(won ? '🏆 Victory!' : '💀 Game Over')
    
    if (this.callbacks.onGameEnd) {
      this.callbacks.onGameEnd(won, {
        wave: this.wave,
        score: this.score,
        gold: this.gold,
        towersBuilt: this.towers.length
      })
    }
  }
  
  animate() {
    if (!this.container.parentElement) return
    
    requestAnimationFrame(() => this.animate())
    
    const deltaTime = this.clock.getDelta()
    this.update(deltaTime)
    this.graphicsEngine.render()
  }
  
  destroy() {
    this.waveTimerActive = false
    
    // Clear projectiles
    this.projectiles.forEach(p => {
      this.scene.remove(p.mesh)
      p.mesh.geometry.dispose()
      p.mesh.material.dispose()
    })
    
    // Clear enemies
    this.enemyManager.destroy()
    
    // Clear structures
    this.structures.forEach(s => {
      if (s.mesh) this.scene.remove(s.mesh)
      if (s.destroy) s.destroy()
    })
    
    // Clear main base
    if (this.mainBase) {
      this.mainBase.destroy()
    }
    
    // Clear effects
    if (this.visualEffects) {
      this.visualEffects.destroy()
    }
    
    // Dispose graphics
    this.graphicsEngine.dispose()
    
    console.log('🧹 Game destroyed')
  }
}
