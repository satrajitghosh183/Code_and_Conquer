// =============================================================================
// ENHANCED GAME - Professional Tower Defense Game Engine
// =============================================================================
// Studio-quality game engine integrating all professional systems:
// - GraphicsEngine for AAA visuals
// - EnemyManager for sophisticated spawning
// - TowerCombatSystem for advanced combat AI
// - Full single-player and multiplayer support
// =============================================================================

import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GraphicsEngine } from './GraphicsEngine.js'
import { EnemyManager } from './EnemyManager.js'
import { TowerCombatSystem, TARGETING_MODES } from './TowerCombatSystem.js'
import { VisualEffects } from './VisualEffects.js'
import { SoundManager } from './SoundManager.js'
import { modelLoader } from './ModelLoader.js'
import { Tower } from './structures/Tower.js'
import { Wall } from './structures/Wall.js'
import { UnitSpawner } from './structures/UnitSpawner.js'
import { DefensiveUnit } from './units/DefensiveUnit.js'
import { TOWER_TYPES, WALL_TYPES, SPAWNER_TYPES } from './structures/TowerTypes.js'
import { Arena } from './Arena.js'
import { SpatialHashGrid } from './SpatialHashGrid.js'
import { AIPlayer } from './AIPlayer.js'
import { WaveTimer } from './WaveTimer.js'
import { CodingRewardSystem } from './CodingRewardSystem.js'
import { TaskBuffSystem } from './TaskBuffSystem.js'
import { MainBase, BASE_LEVELS } from './MainBase.js'
import { MainBossShip } from './EnemyShip.js'

export class EnhancedGame {
  constructor(container, callbacks = {}, userProfile = {}, gameMode = 'single') {
    this.container = container
    this.callbacks = callbacks
    this.userProfile = userProfile
    this.gameMode = gameMode
    
    // ==========================================================================
    // GAME STATE
    // ==========================================================================
    
    this.gold = callbacks.initialGold || 600
    this.energy = callbacks.initialEnergy || 50
    this.maxEnergy = 100
    this.health = 1000
    this.maxHealth = 1000
    this.wave = 0
    this.score = 0
    this.xp = 0
    
    // Flags
    this.isPaused = false
    this.gameOver = false
    this.modelsReady = false
    this.isSpectator = false
    
    // ==========================================================================
    // INITIALIZE GRAPHICS ENGINE
    // ==========================================================================
    
    this.graphicsEngine = new GraphicsEngine(container, {
      quality: userProfile.graphicsQuality || 'high',
      theme: userProfile.gameTheme || 'hellfire',
      enablePostProcessing: true,
      enableShadows: true,
      enableParticles: true
    })
    
    const { scene, camera, renderer, composer } = this.graphicsEngine.initialize()
    this.scene = scene
    this.camera = camera
    this.renderer = renderer
    this.composer = composer
    
    // ==========================================================================
    // INITIALIZE CONTROLS
    // ==========================================================================
    
    this.initControls()
    
    // ==========================================================================
    // INITIALIZE GAME SYSTEMS
    // ==========================================================================
    
    // Visual effects
    this.visualEffects = new VisualEffects(this.scene, this.camera)
    
    // Arena for pathfinding
    this.arena = new Arena()
    
    // Spatial grid for collision
    this.spatialGrid = new SpatialHashGrid(8)
    
    // Player base position
    this.basePosition = new THREE.Vector3(0, 0, -25)
    
    // Create upgradeable main base
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
      },
      onUpgrade: (level, config) => {
        if (this.callbacks.onBaseUpgrade) {
          this.callbacks.onBaseUpgrade(level, config)
        }
        // Upgrade effect
        if (this.visualEffects) {
          this.visualEffects.createUpgradeEffect(this.basePosition, {
            color: 0xff4400,
            particleCount: 60
          })
        }
        SoundManager.play3D('upgrade.ogg', this.basePosition, { volume: 0.8 })
      }
    })
    this.mainBase.create(this.scene)
    this.base = this.mainBase
    this.health = this.mainBase.health
    this.maxHealth = this.mainBase.maxHealth
    
    // Enemy path (fallback for pathfinding)
    this.enemyPath = this.createEnemyPath()
    
    // ==========================================================================
    // INITIALIZE ENEMY MANAGER (must be before boss ship)
    // ==========================================================================
    
    this.enemyManager = new EnemyManager(this, {
      difficulty: userProfile.difficulty || 'normal',
      spawnPoints: [new THREE.Vector3(0, 0.5, 45)],
      targetPoint: this.basePosition,
      maxActiveEnemies: 150,
      
      onEnemySpawned: (enemy) => {
        if (this.callbacks.onEnemySpawned) {
          this.callbacks.onEnemySpawned(enemy)
        }
      },
      
      onEnemyKilled: (enemy, goldReward, xpReward) => {
        // Gold already handled in EnemyManager
        this.score += xpReward
        
        if (this.callbacks.onScoreChange) {
          this.callbacks.onScoreChange(this.score)
        }
      },
      
      onWaveComplete: (waveNum, waveTime, bonus) => {
        console.log(`✅ Wave ${waveNum} complete! Bonus: ${bonus}g`)
        
        if (this.callbacks.onWaveComplete) {
          this.callbacks.onWaveComplete(waveNum, bonus)
        }
      },
      
      onWaveStart: (waveNum, totalEnemies) => {
        this.wave = waveNum
        
        if (this.callbacks.onWaveChange) {
          this.callbacks.onWaveChange(waveNum)
        }
      }
    })
    
    // Point to enemyManager's enemies array
    this.enemies = this.enemyManager.enemies
    
    // ==========================================================================
    // INITIALIZE TOWER COMBAT SYSTEM
    // ==========================================================================
    
    this.towerCombat = new TowerCombatSystem(this)
    
    // ==========================================================================
    // STRUCTURE MANAGEMENT
    // ==========================================================================
    
    this.structures = []
    this.towers = []
    this.walls = []
    this.spawners = []
    this.defensiveUnits = []
    this.projectiles = [] // Legacy compatibility
    
    // Build system
    this.selectedStructureType = null
    this.ghostPreview = null
    this.placementRotation = 0
    
    // ==========================================================================
    // BUFF SYSTEMS
    // ==========================================================================
    
    this.codingRewards = new CodingRewardSystem(this)
    this.taskBuffs = new TaskBuffSystem()
    
    // Apply pre-game buffs
    const preGameBuffs = this.taskBuffs.calculatePreGameBuffs(userProfile.tasks || {})
    this.gold = preGameBuffs.startingGold || this.gold
    this.maxHealth = 1000 * (preGameBuffs.baseHealthMultiplier || 1)
    this.health = this.maxHealth
    this.availableTowers = preGameBuffs.availableTowerTypes || Object.keys(TOWER_TYPES)
    this.passiveBuffs = this.taskBuffs.calculateInGamePassiveBuffs(userProfile.tasks || {})
    
    // Initialize coding rewards
    this.codingRewards.initialize(userProfile.totalProblemsSolved || 0)
    
    // ==========================================================================
    // WAVE TIMER
    // ==========================================================================
    
    // Calculate passive rates
    const lifetimeProblems = userProfile.totalProblemsSolved || 0
    const lifetimeTasks = (userProfile.tasks?.allTimeCompleted || 0) +
                          (userProfile.tasks?.dailyCompleted || 0) * 0.1 +
                          (userProfile.tasks?.weeklyCompleted || 0) * 0.2
    
    this.passiveGoldPerSecond = 0 // Only from coding
    this.passiveEnergyPerSecond = 0.2 + (lifetimeProblems * 0.05) + (lifetimeTasks * 0.08)
    this.lastPassiveTick = Date.now()
    
    this.waveTimer = new WaveTimer(this, {
      waveInterval: 35000,
      problemSolvedBonus: 5,
      taskCompletedBonus: 10,
      energyPerProblem: 10,
      energyPerTask: 15,
      energyPerSecond: this.passiveEnergyPerSecond,
      onWaveStart: (waveNum) => this.enemyManager.startWave(waveNum),
      onCountdownUpdate: (countdown, total) => {
        if (this.callbacks.onWaveCountdown) {
          this.callbacks.onWaveCountdown(countdown, total)
        }
      }
    })
    
    // ==========================================================================
    // AI PLAYER (Single Player Mode)
    // ==========================================================================
    
    if (this.gameMode === 'single') {
      const aiDifficulty = userProfile.aiDifficulty || 'medium'
      this.aiPlayer = new AIPlayer(this, aiDifficulty)
      console.log(`🤖 AI Player initialized (${aiDifficulty})`)
    }
    
    // ==========================================================================
    // INPUT HANDLING
    // ==========================================================================
    
    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    
    this.setupEventListeners()
    
    // ==========================================================================
    // PRELOAD MODELS
    // ==========================================================================
    
    modelLoader.preloadEssentialModels().then(() => {
      this.modelsReady = true
      console.log('✅ Models loaded')
      
      // Create boss ship after models are loaded
      this.createBossShip()
      
      if (this.callbacks.onModelsReady) {
        this.callbacks.onModelsReady()
      }
    })
    
    // ==========================================================================
    // INITIALIZE SOUND
    // ==========================================================================
    
    this.initializeSoundSystem()
    
    // ==========================================================================
    // START GAME LOOP
    // ==========================================================================
    
    this.clock = new THREE.Clock()
    
    // Grace period before waves start
    setTimeout(() => {
      this.waveTimer.start()
      console.log('🎮 Game started - Waves incoming!')
    }, 5000)
    
    this.animate()
  }
  
  // ==========================================================================
  // INITIALIZATION METHODS
  // ==========================================================================
  
  initControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    this.controls.minDistance = 20
    this.controls.maxDistance = 100
    this.controls.maxPolarAngle = Math.PI / 2.2
    this.controls.target.set(0, 0, 0)
  }
  
  // Main base is now created via MainBase class in constructor
  // This method is kept for compatibility but does nothing
  createBase() {
    // Base is now created via MainBase class
  }
  
  // Create the main boss ship (called after models are loaded)
  createBossShip() {
    try {
      this.bossShipPosition = new THREE.Vector3(0, 15, 55)
      this.mainBossShip = new MainBossShip(this.bossShipPosition, {
        health: 50000,
        onSpawnEnemy: (type, position) => {
          if (this.enemyManager) {
            this.enemyManager.spawnEnemy(type, position)
          }
        },
        onDamage: (health, maxHealth) => {
          if (this.callbacks.onBossDamage) {
            this.callbacks.onBossDamage(health, maxHealth)
          }
        },
        onDestroyed: () => {
          console.log('🏆 Boss ship destroyed!')
          if (this.callbacks.onBossDestroyed) {
            this.callbacks.onBossDestroyed()
          }
          this.addGold(5000)
          this.score += 10000
        }
      })
      
      this.mainBossShip.create(this.scene).then(() => {
        console.log('👾 Main Boss Ship spawned!')
      }).catch(err => {
        console.warn('Boss ship creation failed:', err)
      })
    } catch (err) {
      console.warn('Could not create boss ship:', err)
    }
  }
  
  // Upgrade the main base
  upgradeBase() {
    if (!this.mainBase) return { success: false, message: 'No base to upgrade' }
    
    const cost = this.mainBase.getUpgradeCost()
    if (cost === Infinity) {
      return { success: false, message: 'Base is at maximum level' }
    }
    
    if (this.gold < cost) {
      return { success: false, message: `Not enough gold. Need ${cost}g` }
    }
    
    this.gold -= cost
    if (this.callbacks.onGoldChange) {
      this.callbacks.onGoldChange(this.gold)
    }
    
    this.mainBase.upgrade()
    
    return { success: true, message: `Base upgraded to level ${this.mainBase.level}!` }
  }
  
  // Get base stats for UI
  getBaseStats() {
    if (!this.mainBase) return null
    return this.mainBase.getStats()
  }
  
  createEnemyPath() {
    // Winding path from spawn to base
    return [
      new THREE.Vector3(0, 0.5, 45),
      new THREE.Vector3(18, 0.5, 35),
      new THREE.Vector3(18, 0.5, 15),
      new THREE.Vector3(-12, 0.5, 8),
      new THREE.Vector3(-12, 0.5, -8),
      new THREE.Vector3(8, 0.5, -15),
      new THREE.Vector3(0, 0.5, this.basePosition.z)
    ]
  }
  
  async initializeSoundSystem() {
    try {
      await SoundManager.initialize(this.camera)
      await SoundManager.preloadSounds()
      console.log('🔊 Sound system initialized')
    } catch (error) {
      console.warn('Sound initialization failed:', error)
    }
  }
  
  // ==========================================================================
  // EVENT HANDLING
  // ==========================================================================
  
  setupEventListeners() {
    this.renderer.domElement.addEventListener('click', (e) => this.onClick(e))
    this.renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e))
    this.renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault())
    window.addEventListener('resize', () => this.onResize())
    window.addEventListener('keydown', (e) => this.onKeyDown(e))
  }
  
  onClick(event) {
    if (this.gameOver || this.isPaused) return
    
    const rect = this.container.getBoundingClientRect()
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    
    this.raycaster.setFromCamera(this.mouse, this.camera)
    
    // Get ground intersection
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
  
  onKeyDown(event) {
    if (event.code === 'Space' && !this.gameOver && !this.isPaused) {
      // Manual wave start (for debugging)
      this.enemyManager.startWave()
    } else if (event.key === 'Escape') {
      this.cancelPlacement()
    } else if (event.key === 'r' || event.key === 'R') {
      this.placementRotation = (this.placementRotation + Math.PI / 4) % (Math.PI * 2)
      if (this.ghostPreview) {
        this.ghostPreview.rotation.y = this.placementRotation
      }
    } else if (event.key >= '1' && event.key <= '7') {
      // Quick tower selection
      const towerTypes = ['gattling', 'missile', 'laser', 'sniper', 'frost', 'fire', 'tesla']
      const index = parseInt(event.key) - 1
      if (index < towerTypes.length) {
        this.selectStructureType(towerTypes[index])
      }
    }
  }
  
  onResize() {
    this.graphicsEngine.handleResize()
    this.controls.update()
  }
  
  // ==========================================================================
  // STRUCTURE PLACEMENT
  // ==========================================================================
  
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
      'cannon': { type: 'tower', towerType: 'missile' },
      'wall': { type: 'wall', wallType: 'maze' },
      'blocking_wall': { type: 'wall', wallType: 'blocking' },
      'spawner': { type: 'spawner', spawnerType: 'barracks' }
    }
    
    const config = mapping[structureId]
    if (config) {
      this.selectedStructureType = config
      this.placementRotation = 0
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
  
  async updateGhostPreview(position) {
    if (!this.selectedStructureType) return
    
    const isValid = this.isValidPlacement(position)
    
    if (!this.ghostPreview) {
      const modelKey = this.getModelKeyForStructure()
      if (!modelKey) return
      
      const instance = modelLoader.createInstance(modelKey)
      if (!instance) return
      
      this.ghostPreview = instance
      this.ghostPreview.traverse((child) => {
        if (child.isMesh && child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material]
          mats.forEach(mat => {
            mat.transparent = true
            mat.opacity = 0.5
            mat.emissive = new THREE.Color(isValid ? 0x00ff00 : 0xff0000)
            mat.emissiveIntensity = 0.3
          })
        }
      })
      this.scene.add(this.ghostPreview)
    }
    
    this.ghostPreview.position.copy(position)
    this.ghostPreview.rotation.y = this.placementRotation
    
    // Update validity color
    this.ghostPreview.traverse((child) => {
      if (child.isMesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material]
        mats.forEach(mat => {
          mat.emissive.setHex(isValid ? 0x00ff00 : 0xff0000)
        })
      }
    })
  }
  
  getModelKeyForStructure() {
    if (!this.selectedStructureType) return null
    
    if (this.selectedStructureType.type === 'tower') {
      return TOWER_TYPES[this.selectedStructureType.towerType]?.modelKey
    } else if (this.selectedStructureType.type === 'wall') {
      return 'castle_walls'
    } else if (this.selectedStructureType.type === 'spawner') {
      return 'mortar'
    }
    return null
  }
  
  isValidPlacement(position) {
    // Not on path
    if (this.isOnPath(position)) return false
    
    // Not too close to structures
    for (const structure of this.structures) {
      if (structure.position.distanceTo(position) < 4) {
        return false
      }
    }
    
    // Not too close to base
    if (position.distanceTo(this.basePosition) < 12) {
      return false
    }
    
    // Within bounds
    if (Math.abs(position.x) > 50 || Math.abs(position.z) > 50) {
      return false
    }
    
    return true
  }
  
  isOnPath(position) {
    for (let i = 0; i < this.enemyPath.length - 1; i++) {
      const start = this.enemyPath[i]
      const end = this.enemyPath[i + 1]
      const dist = this.distanceToLineSegment(position, start, end)
      if (dist < 5) return true
    }
    return false
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
    
    let structure = null
    
    try {
      if (structureConfig.type === 'tower') {
        structure = new Tower(structureConfig.towerType, position)
      } else if (structureConfig.type === 'wall') {
        structure = new Wall(structureConfig.wallType, position)
      } else if (structureConfig.type === 'spawner') {
        structure = new UnitSpawner(structureConfig.spawnerType, position)
      }
      
      if (!structure) return false
      
      await structure.load()
      this.scene.add(structure.mesh)
      this.structures.push(structure)
      
      // Build effect
      if (this.visualEffects) {
        this.visualEffects.createBuildEffect(position, {
          particleCount: 30,
          glowColor: structureConfig.type === 'tower' ? 0x44ff44 : 0x4444ff
        })
        SoundManager.play3D('build.ogg', position, { volume: 0.5 })
      }
      
      // Add to specific array
      if (structureConfig.type === 'tower') {
        this.towers.push(structure)
      } else if (structureConfig.type === 'wall') {
        this.walls.push(structure)
      } else if (structureConfig.type === 'spawner') {
        this.spawners.push(structure)
      }
      
      // Update spatial grid
      this.spatialGrid.insert(structure)
      
      // Deduct gold
      this.gold -= cost
      if (this.callbacks.onGoldChange) {
        this.callbacks.onGoldChange(this.gold)
      }
      
      this.cancelPlacement()
      
      console.log(`Built ${structureConfig.type}: ${structureConfig.towerType || structureConfig.wallType || structureConfig.spawnerType}`)
      return true
    } catch (error) {
      console.error('Error placing structure:', error)
      return false
    }
  }
  
  getStructureCost(structureConfig) {
    if (structureConfig.type === 'tower') {
      return TOWER_TYPES[structureConfig.towerType]?.cost || 100
    } else if (structureConfig.type === 'wall') {
      return WALL_TYPES[structureConfig.wallType]?.cost || 50
    } else if (structureConfig.type === 'spawner') {
      return SPAWNER_TYPES[structureConfig.spawnerType]?.cost || 250
    }
    return 100
  }
  
  // ==========================================================================
  // MAIN UPDATE LOOP
  // ==========================================================================
  
  update(deltaTime) {
    if (this.gameOver || this.isPaused) return
    
    // Cap delta time
    deltaTime = Math.min(deltaTime, 0.033)
    
    // Update controls
    this.controls.update()
    
    // Update graphics engine
    this.graphicsEngine.update(deltaTime)
    
    // Update visual effects
    if (this.visualEffects) {
      this.visualEffects.update(deltaTime)
    }
    
    // Update wave timer
    if (this.waveTimer) {
      this.waveTimer.update(deltaTime)
    }
    
    // Update AI player
    if (this.aiPlayer && !this.isPaused) {
      this.aiPlayer.update(deltaTime, Date.now())
    }
    
    // Update sound manager
    SoundManager.update(deltaTime * 1000)
    
    // Update enemy manager
    this.enemyManager.update(deltaTime)
    
    // Sync health from enemy manager
    if (this.health !== this.enemyManager.game.health) {
      this.health = this.enemyManager.game.health
      
      // Damage vignette
      this.graphicsEngine.triggerDamageEffect(0.3)
      
      if (this.callbacks.onHealthChange) {
        this.callbacks.onHealthChange(this.health, this.maxHealth)
      }
      
      if (this.health <= 0) {
        this.endGame(false)
      }
    }
    
    // Sync gold
    if (this.callbacks.onGoldChange) {
      this.callbacks.onGoldChange(this.gold)
    }
    
    // Update towers and combat
    this.updateTowers(deltaTime)
    
    // Update tower combat system (projectiles)
    this.towerCombat.update(deltaTime)
    
    // Update spawners
    this.updateSpawners(deltaTime)
    
    // Update defensive units
    this.updateDefensiveUnits(deltaTime)
    
    // Animate base
    this.animateBase(deltaTime)
    
    // Update main boss ship
    if (this.mainBossShip && this.mainBossShip.isActive) {
      this.mainBossShip.update(deltaTime, Date.now() / 1000)
    }
    
    // Update elemental visual effects (frost auras, fire rings)
    this.updateElementalEffects(deltaTime)
    
    // Check win condition
    if (this.wave >= 50 && this.enemies.length === 0) {
      this.endGame(true)
    }
  }
  
  updateTowers(deltaTime) {
    const currentTime = Date.now() / 1000
    
    this.towers.forEach(tower => {
      // Find target
      const target = this.towerCombat.findTarget(
        tower,
        this.enemies,
        tower.targetingMode || TARGETING_MODES.FIRST
      )
      
      if (target) {
        tower.target = target
        
        // Aim at target
        if (tower.aimAtTarget) {
          tower.aimAtTarget()
        }
        
        // Fire
        this.towerCombat.fireTower(tower, target, currentTime)
      }
    })
  }
  
  updateSpawners(deltaTime) {
    const currentTime = Date.now() / 1000
    
    this.spawners.forEach(spawner => {
      if (spawner.canSpawn && spawner.canSpawn(currentTime)) {
        const unitData = spawner.spawnUnit(currentTime)
        if (unitData) {
          const unit = new DefensiveUnit(unitData.type, unitData.position, spawner)
          unit.load().then(() => {
            if (unit.mesh) {
              this.scene.add(unit.mesh)
              this.defensiveUnits.push(unit)
              this.spatialGrid.insert(unit)
            }
          })
        }
      }
    })
  }
  
  updateDefensiveUnits(deltaTime) {
    for (let i = this.defensiveUnits.length - 1; i >= 0; i--) {
      const unit = this.defensiveUnits[i]
      
      if (unit.isDead) {
        if (unit.mesh && unit.mesh.parent) {
          unit.mesh.parent.remove(unit.mesh)
        }
        unit.destroy()
        this.defensiveUnits.splice(i, 1)
      } else {
        unit.update(deltaTime, this.enemies, this.spatialGrid)
      }
    }
  }
  
  animateBase(deltaTime) {
    // Update main base (handles animations, regen, and defensive attacks)
    if (this.mainBase) {
      this.mainBase.update(deltaTime, this.enemies, this.visualEffects)
      
      // Face health bar to camera
      if (this.mainBase.healthBarBg && this.camera) {
        this.mainBase.healthBarBg.lookAt(this.camera.position)
        if (this.mainBase.healthBarFill) {
          this.mainBase.healthBarFill.lookAt(this.camera.position)
        }
        if (this.mainBase.levelSprite) {
          // Sprites auto-face camera
        }
      }
      
      // Sync health state
      this.health = this.mainBase.health
      this.maxHealth = this.mainBase.maxHealth
    }
  }
  
  // Update frost and fire visual effects on enemies and towers
  updateElementalEffects(deltaTime) {
    // Check enemies for slow status and add frost aura
    this.enemies.forEach(enemy => {
      if (enemy.isDead) return
      
      // Handle frost aura for slowed enemies
      if (enemy.slowAmount > 0 && !this.visualEffects.frostAuras.has(enemy.id)) {
        this.visualEffects.createFrostAura(enemy, enemy.slowAmount, 2000)
      } else if (enemy.slowAmount <= 0 && this.visualEffects.frostAuras.has(enemy.id)) {
        this.visualEffects.removeFrostAura(enemy)
      }
    })
    
    // Handle fire rings for fire towers
    this.towers.forEach(tower => {
      const towerType = tower.towerType || tower.type
      
      if (towerType === 'fire' && !this.visualEffects.fireRings.has(tower.id || tower)) {
        // Create fire ring for fire towers
        this.visualEffects.createFireRing(tower, tower.range || 18)
      }
    })
  }
  
  // ==========================================================================
  // GAME STATE
  // ==========================================================================
  
  addGold(amount) {
    const bonus = this.passiveBuffs?.enemyGoldRewardBonus || 1
    this.gold += Math.floor(amount * bonus)
    
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
  
  spendEnergy(amount) {
    if (this.energy < amount) return false
    this.energy -= amount
    
    if (this.callbacks.onEnergyChange) {
      this.callbacks.onEnergyChange(this.energy, this.maxEnergy)
    }
    return true
  }
  
  onProblemSolved(problemData) {
    const rewards = this.codingRewards.onProblemSolved(
      problemData.difficulty || 'medium',
      problemData.timeSpent || 0,
      problemData.testsPassedRatio || 1.0
    )
    
    this.passiveEnergyPerSecond += 0.05
    
    if (this.waveTimer) {
      this.waveTimer.energyPerSecond = this.passiveEnergyPerSecond
      this.waveTimer.onProblemSolved(problemData.difficulty || 'medium')
    }
    
    const energyReward = (this.waveTimer?.energyPerProblem || 10) *
      (problemData.difficulty === 'hard' ? 2 : problemData.difficulty === 'medium' ? 1.5 : 1)
    
    this.addEnergy(Math.floor(energyReward))
    
    return {
      ...rewards,
      energy: Math.floor(energyReward),
      passiveEnergyIncrease: 0.05
    }
  }
  
  onTaskCompleted(taskType = 'daily') {
    const energyIncrease = taskType === 'weekly' ? 0.12 : 0.08
    this.passiveEnergyPerSecond += energyIncrease
    
    if (this.waveTimer) {
      this.waveTimer.energyPerSecond = this.passiveEnergyPerSecond
      this.waveTimer.onTaskCompleted(taskType)
    }
    
    const energyReward = (this.waveTimer?.energyPerTask || 15) *
      (taskType === 'weekly' ? 1.5 : 1)
    
    this.addEnergy(Math.floor(energyReward))
    
    return {
      timeBonus: this.waveTimer?.taskCompletedBonus || 10,
      energy: Math.floor(energyReward),
      passiveEnergyIncrease: energyIncrease
    }
  }
  
  endGame(won) {
    this.gameOver = true
    
    console.log(won ? '🏆 Victory!' : '💀 Game Over')
    
    if (this.callbacks.onGameEnd) {
      this.callbacks.onGameEnd(won, {
        wave: this.wave,
        score: this.score,
        gold: this.gold,
        towersBuilt: this.towers.length,
        enemiesKilled: this.enemyManager.totalEnemiesKilled,
        combatStats: this.towerCombat.getStats()
      })
    }
  }
  
  // ==========================================================================
  // RENDER LOOP
  // ==========================================================================
  
  animate() {
    if (!this.container.parentElement) return
    
    requestAnimationFrame(() => this.animate())
    
    const deltaTime = this.clock.getDelta()
    this.update(deltaTime)
    
    this.graphicsEngine.render()
  }
  
  // ==========================================================================
  // CLEANUP
  // ==========================================================================
  
  destroy() {
    // Stop systems
    if (this.waveTimer) {
      this.waveTimer.stop()
    }
    
    // Clear combat
    this.towerCombat.destroy()
    
    // Clear enemies
    this.enemyManager.destroy()
    
    // Clear structures
    this.structures.forEach(s => {
      if (s.mesh) this.scene.remove(s.mesh)
      if (s.destroy) s.destroy()
    })
    
    // Clear defensive units
    this.defensiveUnits.forEach(u => {
      if (u.mesh) this.scene.remove(u.mesh)
      if (u.destroy) u.destroy()
    })
    
    // Clear main base
    if (this.mainBase) {
      this.mainBase.destroy()
    }
    
    // Clear boss ship
    if (this.mainBossShip) {
      this.mainBossShip.destroy()
    }
    
    // Clear visual effects
    if (this.visualEffects) {
      this.visualEffects.destroy()
    }
    
    // Dispose graphics
    this.graphicsEngine.dispose()
    
    console.log('🧹 Game destroyed')
  }
}
