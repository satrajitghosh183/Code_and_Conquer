// =============================================================================
// ENHANCED GAME - Immersive Tower Defense Engine
// =============================================================================
// Features: 3D models, visual effects, coding rewards, AI player, 
// advanced combat system, optimized for web deployment
// =============================================================================

import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GraphicsEngine } from './GraphicsEngine.js'
import { EnemyManager } from './EnemyManager.js'
import { VisualEffects } from './VisualEffects.js'
import { Tower } from './structures/Tower.js'
import { TOWER_TYPES, WALL_TYPES } from './structures/TowerTypes.js'
import { MainBase } from './MainBase.js'
import { modelLoader } from './ModelLoader.js'
import { TowerCombatSystem } from './TowerCombatSystem.js'
import { CodingRewardSystem } from './CodingRewardSystem.js'
import { AIPlayer } from './AIPlayer.js'

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
    this.xp = 0
    
    this.isPaused = false
    this.gameOver = false
    this.modelsReady = false
    
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
    
    // Create path visual
    this.createPathVisual()
    
    // Enemy Manager
    this.enemyManager = new EnemyManager(this, {
      difficulty: 'normal',
      spawnPoints: [new THREE.Vector3(0, 0.5, 45)],
      targetPoint: this.basePosition,
      maxActiveEnemies: 50,
      
      onWaveComplete: (waveNum, waveTime, bonus) => {
        this.addGold(bonus || 50)
        if (this.callbacks.onWaveComplete) {
          this.callbacks.onWaveComplete(waveNum, bonus)
        }
      },
      
      onWaveStart: (waveNum) => {
        this.wave = waveNum
        if (this.callbacks.onWaveChange) {
          this.callbacks.onWaveChange(waveNum)
        }
      },
      
      onEnemyDeath: (enemy) => {
        this.addGold(enemy.goldReward || 10)
        this.addXP(enemy.xpReward || 5)
        this.score += (enemy.goldReward || 10) * 10
        
        // Death effect
        if (enemy.position) {
          this.visualEffects.createExplosion(enemy.position.clone(), {
            numParticles: enemy.isBoss ? 40 : 20,
            color: enemy.color || 0xff6600,
            duration: 600
          })
        }
        
        if (this.callbacks.onScoreChange) {
          this.callbacks.onScoreChange(this.score)
        }
      },
      
      onEnemyReachEnd: (enemy) => {
        const damage = enemy.lives || 1
        this.mainBase.takeDamage(damage * 50)
        
        // Screen shake for damage
        this.visualEffects.triggerScreenShake(0.3, 200)
        this.visualEffects.triggerDamageVignette(0.3)
      }
    })
    
    this.enemies = this.enemyManager.enemies
    
    // Structures
    this.structures = []
    this.towers = []
    
    // Combat System
    this.combatSystem = new TowerCombatSystem(this)
    
    // Coding Reward System
    this.codingRewardSystem = new CodingRewardSystem(this)
    this.codingRewardSystem.initialize(userProfile.totalProblemsSolved || 0)
    
    // AI Player (for single player challenge mode)
    this.aiPlayer = null
    if (gameMode === 'vs_ai' || gameMode === 'challenge') {
      this.aiPlayer = new AIPlayer(this, userProfile.aiDifficulty || 'medium')
    }
    
    // Build system
    this.selectedStructureType = null
    this.ghostPreview = null
    this.availableTowers = Object.keys(TOWER_TYPES)
    
    // Wave timer
    this.waveCountdown = 30
    this.waveInterval = 30000
    this.lastWaveTime = Date.now()
    this.passiveEnergyPerSecond = 0.2
    this.waveTimerActive = false
    
    // Input
    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()
    
    this.setupEventListeners()
    
    // Start game loop
    this.clock = new THREE.Clock()
    
    // Load models, then start game
    this.initializeModels()
    
    this.animate()
  }
  
  async initializeModels() {
    console.log('🔄 Loading game models...')
    
    try {
      // Preload essential models
      await modelLoader.preloadEssentialModels()
      
      this.modelsReady = true
      console.log('✅ Models loaded successfully')
      
      // Notify UI
      if (this.callbacks.onModelsReady) {
        this.callbacks.onModelsReady()
      }
      
      // Start game after short delay
      setTimeout(() => {
        this.startWaveTimer()
        console.log('🎮 Game started!')
      }, 2000)
      
    } catch (error) {
      console.warn('⚠️ Some models failed to load, using fallbacks:', error)
      this.modelsReady = true
      
      if (this.callbacks.onModelsReady) {
        this.callbacks.onModelsReady()
      }
      
      setTimeout(() => {
        this.startWaveTimer()
      }, 2000)
    }
  }
  
  createPathVisual() {
    // Draw path line
    const points = this.enemyPath.map(p => new THREE.Vector3(p.x, 0.15, p.z))
    const geometry = new THREE.BufferGeometry().setFromPoints(points)
    const material = new THREE.LineBasicMaterial({ 
      color: 0x444466,
      linewidth: 2,
      transparent: true,
      opacity: 0.6
    })
    const pathLine = new THREE.Line(geometry, material)
    this.scene.add(pathLine)
    
    // Path waypoint markers
    this.enemyPath.forEach((point, index) => {
      const markerGeom = new THREE.SphereGeometry(0.4, 8, 8)
      const markerMat = new THREE.MeshBasicMaterial({ 
        color: index === 0 ? 0x00ff00 : (index === this.enemyPath.length - 1 ? 0xff0000 : 0x4466ff),
        transparent: true,
        opacity: 0.5
      })
      const marker = new THREE.Mesh(markerGeom, markerMat)
      marker.position.set(point.x, 0.2, point.z)
      this.scene.add(marker)
    })
    
    // Spawn area indicator
    const spawnGeom = new THREE.RingGeometry(3, 4, 24)
    const spawnMat = new THREE.MeshBasicMaterial({ 
      color: 0x00ff44,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    })
    const spawnRing = new THREE.Mesh(spawnGeom, spawnMat)
    spawnRing.rotation.x = -Math.PI / 2
    spawnRing.position.set(0, 0.1, 45)
    this.scene.add(spawnRing)
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
    
    // Initial UI update
    if (this.callbacks.onEnergyChange) {
      this.callbacks.onEnergyChange(Math.floor(this.energy), this.maxEnergy)
    }
    if (this.callbacks.onGoldChange) {
      this.callbacks.onGoldChange(this.gold)
    }
  }
  
  startNextWave() {
    this.enemyManager.startWave()
    this.waveCountdown = 30
    this.lastWaveTime = Date.now()
  }
  
  setupEventListeners() {
    this.renderer.domElement.addEventListener('click', (e) => this.onClick(e))
    this.renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e))
    this.renderer.domElement.addEventListener('contextmenu', (e) => {
      e.preventDefault()
      this.cancelPlacement()
    })
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
      } else {
        // Check for tower selection
        this.selectTowerAt(point)
      }
    }
  }
  
  selectTowerAt(point) {
    for (const tower of this.towers) {
      if (tower.position.distanceTo(point) < 2) {
        // Show tower info
        if (this.callbacks.onTowerSelected) {
          this.callbacks.onTowerSelected(tower.getStats())
        }
        tower.showRange()
        
        // Hide other ranges
        this.towers.forEach(t => {
          if (t !== tower) t.hideRange()
        })
        return
      }
    }
    
    // Clicked empty space - deselect
    this.towers.forEach(t => t.hideRange())
    if (this.callbacks.onTowerSelected) {
      this.callbacks.onTowerSelected(null)
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
      'basic_tower': { type: 'tower', towerType: 'gattling' },
      'wall': { type: 'wall', wallType: 'maze' },
      'blocking_wall': { type: 'wall', wallType: 'blocking' }
    }
    
    const config = mapping[structureId]
    if (config) {
      this.selectedStructureType = config
      console.log('🔨 Selected:', structureId)
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
      const geom = new THREE.CylinderGeometry(1.2, 1.4, 3.5, 10)
      const mat = new THREE.MeshBasicMaterial({
        color: isValid ? 0x00ff00 : 0xff0000,
        transparent: true,
        opacity: 0.4
      })
      this.ghostPreview = new THREE.Mesh(geom, mat)
      this.ghostPreview.position.y = 1.75
      this.scene.add(this.ghostPreview)
      
      // Range indicator
      const rangeConfig = this.selectedStructureType.towerType 
        ? TOWER_TYPES[this.selectedStructureType.towerType]
        : null
      
      if (rangeConfig && rangeConfig.range) {
        const rangeGeom = new THREE.RingGeometry(rangeConfig.range - 0.5, rangeConfig.range, 32)
        const rangeMat = new THREE.MeshBasicMaterial({
          color: isValid ? 0x00ff00 : 0xff0000,
          transparent: true,
          opacity: 0.15,
          side: THREE.DoubleSide
        })
        const rangeRing = new THREE.Mesh(rangeGeom, rangeMat)
        rangeRing.rotation.x = -Math.PI / 2
        rangeRing.position.y = -1.7
        this.ghostPreview.add(rangeRing)
      }
    }
    
    this.ghostPreview.position.x = position.x
    this.ghostPreview.position.z = position.z
    this.ghostPreview.material.color.setHex(isValid ? 0x00ff00 : 0xff0000)
    
    // Update range ring color
    if (this.ghostPreview.children.length > 0) {
      this.ghostPreview.children[0].material.color.setHex(isValid ? 0x00ff00 : 0xff0000)
    }
  }
  
  isValidPlacement(position) {
    // Not too close to base
    if (position.distanceTo(this.basePosition) < 12) return false
    
    // Not on path
    for (let i = 0; i < this.enemyPath.length - 1; i++) {
      const dist = this.distanceToLineSegment(position, this.enemyPath[i], this.enemyPath[i + 1])
      if (dist < 4) return false
    }
    
    // Not too close to other structures
    for (const structure of this.structures) {
      if (structure.position && structure.position.distanceTo(position) < 4) return false
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
      console.log('❌ Not enough gold!')
      if (this.callbacks.onNotification) {
        this.callbacks.onNotification('Not enough gold!', 'error')
      }
      return false
    }
    
    if (!this.isValidPlacement(position)) {
      console.log('❌ Invalid placement!')
      if (this.callbacks.onNotification) {
        this.callbacks.onNotification('Invalid placement location!', 'error')
      }
      return false
    }
    
    if (structureConfig.type === 'tower') {
      const tower = new Tower(structureConfig.towerType, position)
      await tower.load()
      this.scene.add(tower.mesh)
      this.structures.push(tower)
      this.towers.push(tower)
      
      // Build effect
      this.visualEffects.createBuildEffect(position, {
        glowColor: tower.getTowerColor()
      })
      
      // Deduct gold
      this.gold -= cost
      if (this.callbacks.onGoldChange) {
        this.callbacks.onGoldChange(this.gold)
      }
      
      this.cancelPlacement()
      console.log(`✅ Built ${structureConfig.towerType} tower (${tower.modelLoaded ? '3D model' : 'fallback'})`)
      return true
    }
    
    if (structureConfig.type === 'wall') {
      // Create wall structure
      const wallConfig = WALL_TYPES[structureConfig.wallType] || WALL_TYPES.maze
      const wall = this.createWall(structureConfig.wallType, position)
      
      if (wall) {
        this.scene.add(wall.mesh)
        this.structures.push(wall)
        
        this.visualEffects.createBuildEffect(position, { glowColor: 0x666666 })
        
        this.gold -= cost
        if (this.callbacks.onGoldChange) {
          this.callbacks.onGoldChange(this.gold)
        }
        
        this.cancelPlacement()
        console.log(`✅ Built ${structureConfig.wallType} wall`)
        return true
      }
    }
    
    return false
  }
  
  createWall(wallType, position) {
    const config = WALL_TYPES[wallType] || WALL_TYPES.maze
    
    const group = new THREE.Group()
    
    // Wall geometry
    const geometry = new THREE.BoxGeometry(3, 2.5, 3)
    const material = new THREE.MeshStandardMaterial({
      color: 0x555566,
      metalness: 0.4,
      roughness: 0.6
    })
    const wall = new THREE.Mesh(geometry, material)
    wall.position.y = 1.25
    wall.castShadow = true
    wall.receiveShadow = true
    group.add(wall)
    
    // Add top detail
    const topGeom = new THREE.BoxGeometry(3.2, 0.3, 3.2)
    const topMat = new THREE.MeshStandardMaterial({ color: 0x444455 })
    const top = new THREE.Mesh(topGeom, topMat)
    top.position.y = 2.65
    group.add(top)
    
    group.position.copy(position)
    
    return {
      type: 'wall',
      wallType,
      position: position.clone(),
      mesh: group,
      health: config.health,
      maxHealth: config.health,
      destroy: () => {
        group.traverse(child => {
          if (child.geometry) child.geometry.dispose()
          if (child.material) child.material.dispose()
        })
      }
    }
  }
  
  getStructureCost(structureConfig) {
    if (structureConfig.type === 'tower') {
      return TOWER_TYPES[structureConfig.towerType]?.cost || 100
    }
    if (structureConfig.type === 'wall') {
      return WALL_TYPES[structureConfig.wallType]?.cost || 50
    }
    return 100
  }
  
  update(deltaTime) {
    if (this.gameOver || this.isPaused) return
    
    deltaTime = Math.min(deltaTime, 0.033) // Cap at ~30 FPS minimum
    const currentTime = Date.now() / 1000
    
    // Update controls
    this.controls.update()
    
    // Update graphics engine
    this.graphicsEngine.update(deltaTime)
    
    // Update visual effects
    this.visualEffects.update(deltaTime)
    
    // Wave timer
    if (this.waveTimerActive) {
      const elapsed = Date.now() - this.lastWaveTime
      this.waveCountdown = Math.max(0, 30 - elapsed / 1000)
      
      if (this.callbacks.onWaveCountdown) {
        this.callbacks.onWaveCountdown(Math.ceil(this.waveCountdown), 30)
      }
      
      if (this.waveCountdown <= 0) {
        this.startNextWave()
      }
      
      // Passive energy regeneration
      this.energy = Math.min(this.maxEnergy, this.energy + this.passiveEnergyPerSecond * deltaTime)
      if (this.callbacks.onEnergyChange) {
        // FIX: Use Math.floor to prevent floating point display issues
        this.callbacks.onEnergyChange(Math.floor(this.energy), this.maxEnergy)
      }
    }
    
    // Update enemies
    this.enemyManager.update(deltaTime)
    
    // Update towers and find targets
    this.updateTowers(deltaTime, currentTime)
    
    // Update combat system (projectiles, lasers, etc.)
    this.combatSystem.update(deltaTime)
    
    // Update main base
    if (this.mainBase) {
      this.mainBase.update(deltaTime, this.enemies, this.visualEffects)
      this.health = this.mainBase.health
    }
    
    // Update AI player if active
    if (this.aiPlayer) {
      this.aiPlayer.update(deltaTime, currentTime)
    }
    
    // Sync gold display
    if (this.callbacks.onGoldChange) {
      this.callbacks.onGoldChange(this.gold)
    }
    
    // Win condition
    if (this.wave >= 20 && this.enemies.length === 0 && !this.enemyManager.isWaveActive()) {
      this.endGame(true)
    }
  }
  
  updateTowers(deltaTime, currentTime) {
    this.towers.forEach(tower => {
      const target = tower.findTarget(this.enemies)
      
      if (target) {
        tower.aimAtTarget()
        
        // Use combat system for firing
        if (tower.canFire(currentTime)) {
          this.combatSystem.fireTower(tower, target, currentTime)
        }
      }
    })
  }
  
  // Gold management
  addGold(amount) {
    this.gold += amount
    if (this.callbacks.onGoldChange) {
      this.callbacks.onGoldChange(this.gold)
    }
  }
  
  // Energy management
  addEnergy(amount) {
    this.energy = Math.min(this.maxEnergy, this.energy + amount)
    if (this.callbacks.onEnergyChange) {
      this.callbacks.onEnergyChange(Math.floor(this.energy), this.maxEnergy)
    }
  }
  
  // XP management
  addXP(amount) {
    this.xp += amount
    if (this.callbacks.onXPChange) {
      this.callbacks.onXPChange(this.xp)
    }
  }
  
  // Coding problem solved - reward system
  onProblemSolved(problemData) {
    const rewards = this.codingRewardSystem.onProblemSolved(
      problemData.difficulty || 'medium',
      problemData.timeSpent || 300,
      problemData.testsPassedRatio || 1.0
    )
    
    // Add extra wave countdown time
    this.waveCountdown = Math.min(60, this.waveCountdown + 15)
    this.lastWaveTime = Date.now() - (30 - this.waveCountdown) * 1000
    
    // Notification
    if (this.callbacks.onNotification) {
      this.callbacks.onNotification(
        `Problem solved! +${rewards.gold} gold, +${rewards.xp} XP`,
        'success'
      )
    }
    
    return rewards
  }
  
  // Task completed - reward system
  onTaskCompleted(taskType = 'daily') {
    const rewards = {
      energy: taskType === 'weekly' ? 25 : 15,
      gold: taskType === 'weekly' ? 100 : 50,
      timeBonus: taskType === 'weekly' ? 15 : 10
    }
    
    this.addEnergy(rewards.energy)
    this.addGold(rewards.gold)
    this.waveCountdown = Math.min(60, this.waveCountdown + rewards.timeBonus)
    this.lastWaveTime = Date.now() - (30 - this.waveCountdown) * 1000
    
    if (this.callbacks.onNotification) {
      this.callbacks.onNotification(
        `Task completed! +${rewards.gold} gold, +${rewards.energy} energy`,
        'success'
      )
    }
    
    return rewards
  }
  
  // Upgrade tower
  upgradeTower(towerId) {
    const tower = this.towers.find(t => t.id === towerId)
    if (!tower) return false
    
    const cost = tower.getUpgradeCost()
    if (this.gold < cost) {
      if (this.callbacks.onNotification) {
        this.callbacks.onNotification('Not enough gold for upgrade!', 'error')
      }
      return false
    }
    
    if (tower.upgrade()) {
      this.gold -= cost
      this.visualEffects.createUpgradeEffect(tower.position, { color: 0xffdd00 })
      
      if (this.callbacks.onGoldChange) {
        this.callbacks.onGoldChange(this.gold)
      }
      if (this.callbacks.onTowerSelected) {
        this.callbacks.onTowerSelected(tower.getStats())
      }
      
      console.log(`⬆️ Upgraded ${tower.towerType} to level ${tower.level}`)
      return true
    }
    
    return false
  }
  
  // Sell tower
  sellTower(towerId) {
    const towerIndex = this.towers.findIndex(t => t.id === towerId)
    if (towerIndex === -1) return false
    
    const tower = this.towers[towerIndex]
    const sellValue = tower.getSellValue()
    
    // Remove from scene
    this.scene.remove(tower.mesh)
    tower.destroy()
    
    // Remove from arrays
    this.towers.splice(towerIndex, 1)
    const structIndex = this.structures.indexOf(tower)
    if (structIndex !== -1) {
      this.structures.splice(structIndex, 1)
    }
    
    // Add gold
    this.addGold(sellValue)
    
    // Effect
    this.visualEffects.createExplosion(tower.position, {
      numParticles: 15,
      color: 0xffd700,
      duration: 400
    })
    
    if (this.callbacks.onTowerSelected) {
      this.callbacks.onTowerSelected(null)
    }
    
    console.log(`💰 Sold tower for ${sellValue} gold`)
    return true
  }
  
  endGame(won) {
    this.gameOver = true
    this.waveTimerActive = false
    
    console.log(won ? '🏆 Victory!' : '💀 Game Over')
    
    // Get AI stats if applicable
    const aiStats = this.aiPlayer ? this.aiPlayer.getStats() : null
    
    if (this.callbacks.onGameEnd) {
      this.callbacks.onGameEnd(won, {
        wave: this.wave,
        score: this.score,
        gold: this.gold,
        towersBuilt: this.towers.length,
        xp: this.xp,
        problemsSolved: this.codingRewardSystem.getProblemsSolvedThisMatch(),
        combatStats: this.combatSystem.getStats(),
        aiStats
      })
    }
  }
  
  // Pause/Resume
  pause() {
    this.isPaused = true
    console.log('⏸️ Game paused')
  }
  
  resume() {
    this.isPaused = false
    console.log('▶️ Game resumed')
  }
  
  animate() {
    if (!this.container.parentElement) return
    
    requestAnimationFrame(() => this.animate())
    
    const deltaTime = this.clock.getDelta()
    this.update(deltaTime)
    this.graphicsEngine.render()
  }
  
  // Get game stats
  getStats() {
    return {
      gold: this.gold,
      energy: Math.floor(this.energy),
      health: this.health,
      maxHealth: this.maxHealth,
      wave: this.wave,
      score: this.score,
      towers: this.towers.length,
      enemies: this.enemies.length,
      modelsReady: this.modelsReady,
      combatStats: this.combatSystem.getStats()
    }
  }
  
  destroy() {
    this.waveTimerActive = false
    this.gameOver = true
    
    // Clear combat system
    if (this.combatSystem) {
      this.combatSystem.destroy()
    }
    
    // Clear enemies
    if (this.enemyManager) {
      this.enemyManager.destroy()
    }
    
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
    
    // Clear ghost preview
    if (this.ghostPreview) {
      this.scene.remove(this.ghostPreview)
    }
    
    // Dispose graphics
    this.graphicsEngine.dispose()
    
    console.log('🧹 Game destroyed')
  }
}
