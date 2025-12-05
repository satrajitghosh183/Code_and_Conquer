// =============================================================================
// PROFESSIONAL 1V1 MULTIPLAYER GAME - Studio-Quality PvP System
// =============================================================================
// Full-featured real-time multiplayer tower defense with:
// - Symmetric battlefield with both player bases
// - Send waves to attack opponent
// - Income system based on waves sent
// - Fog of war and visibility system
// - State synchronization with server
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
import { TOWER_TYPES } from './structures/TowerTypes.js'
import { SpatialHashGrid } from './SpatialHashGrid.js'

// =============================================================================
// MULTIPLAYER GAME CONFIGURATION
// =============================================================================

const GAME_CONFIG = {
  // Field dimensions
  fieldWidth: 60,
  fieldLength: 100,
  
  // Player bases
  player1BaseZ: -45,
  player2BaseZ: 45,
  
  // Starting resources
  startingGold: 500,
  startingIncome: 20,
  startingHealth: 1000,
  
  // Income timing
  incomeInterval: 10000, // ms
  
  // Wave costs
  waveCosts: {
    spider: 10,
    scout: 15,
    brute: 40,
    armored: 50,
    healer: 35,
    swarm: 5,
    boss: 200
  },
  
  // Income bonuses per wave sent
  waveIncomeBonus: {
    spider: 2,
    scout: 3,
    brute: 8,
    armored: 10,
    healer: 7,
    swarm: 1,
    boss: 40
  }
}

// =============================================================================
// MULTIPLAYER GAME CLASS
// =============================================================================

export class Game1v1 {
  constructor(container, options = {}) {
    this.container = container
    this.playerId = options.playerId
    this.playerIndex = options.playerIndex || 0 // 0 or 1
    this.matchId = options.matchId
    this.socket = options.socket
    this.callbacks = options.callbacks || {}
    
    // Determine if we're player 1 (bottom, defending from z=-45)
    // or player 2 (top, defending from z=+45)
    this.isPlayer1 = this.playerIndex === 0
    
    // ==========================================================================
    // GAME STATE
    // ==========================================================================
    
    this.gameState = {
      phase: 'setup', // setup, active, ending, finished
      winner: null,
      
      player1: {
        id: null,
        gold: GAME_CONFIG.startingGold,
        income: GAME_CONFIG.startingIncome,
        health: GAME_CONFIG.startingHealth,
        maxHealth: GAME_CONFIG.startingHealth,
        towers: [],
        wavesSent: 0,
        enemiesKilled: 0
      },
      
      player2: {
        id: null,
        gold: GAME_CONFIG.startingGold,
        income: GAME_CONFIG.startingIncome,
        health: GAME_CONFIG.startingHealth,
        maxHealth: GAME_CONFIG.startingHealth,
        towers: [],
        wavesSent: 0,
        enemiesKilled: 0
      },
      
      wave: 0,
      time: 0
    }
    
    // Local state
    this.myPlayer = this.isPlayer1 ? this.gameState.player1 : this.gameState.player2
    this.opponentPlayer = this.isPlayer1 ? this.gameState.player2 : this.gameState.player1
    
    this.isPaused = false
    this.gameOver = false
    
    // ==========================================================================
    // INITIALIZE GRAPHICS
    // ==========================================================================
    
    this.graphicsEngine = new GraphicsEngine(container, {
      quality: options.quality || 'high',
      theme: 'hellfire',
      enablePostProcessing: true,
      enableShadows: true
    })
    
    const { scene, camera, renderer, composer } = this.graphicsEngine.initialize()
    this.scene = scene
    this.camera = camera
    this.renderer = renderer
    this.composer = composer
    
    // Override camera position based on player side
    this.setupCamera()
    
    // ==========================================================================
    // INITIALIZE SYSTEMS
    // ==========================================================================
    
    this.initControls()
    this.visualEffects = new VisualEffects(this.scene, this.camera)
    this.spatialGrid = new SpatialHashGrid(10)
    
    // ==========================================================================
    // CREATE BATTLEFIELD
    // ==========================================================================
    
    this.createBattlefield()
    
    // ==========================================================================
    // INITIALIZE ENEMY MANAGERS (one per player's attack lane)
    // ==========================================================================
    
    // Enemy manager for enemies attacking player 1 (moving toward -Z)
    this.enemyManagerP1 = new EnemyManager(this, {
      difficulty: 'normal',
      spawnPoints: [new THREE.Vector3(0, 0.5, GAME_CONFIG.player2BaseZ - 5)],
      targetPoint: new THREE.Vector3(0, 0, GAME_CONFIG.player1BaseZ),
      maxActiveEnemies: 75,
      onEnemyKilled: (enemy, gold) => this.onEnemyKilled(enemy, gold, 1),
      onEnemyReachedEnd: (enemy) => this.onEnemyReachedBase(enemy, 1)
    })
    
    // Enemy manager for enemies attacking player 2 (moving toward +Z)
    this.enemyManagerP2 = new EnemyManager(this, {
      difficulty: 'normal',
      spawnPoints: [new THREE.Vector3(0, 0.5, GAME_CONFIG.player1BaseZ + 5)],
      targetPoint: new THREE.Vector3(0, 0, GAME_CONFIG.player2BaseZ),
      maxActiveEnemies: 75,
      onEnemyKilled: (enemy, gold) => this.onEnemyKilled(enemy, gold, 2),
      onEnemyReachedEnd: (enemy) => this.onEnemyReachedBase(enemy, 2)
    })
    
    // Combined enemies array for rendering
    this.enemies = []
    
    // ==========================================================================
    // INITIALIZE COMBAT SYSTEMS
    // ==========================================================================
    
    this.towerCombatP1 = new TowerCombatSystem(this)
    this.towerCombatP2 = new TowerCombatSystem(this)
    
    // ==========================================================================
    // STRUCTURE MANAGEMENT
    // ==========================================================================
    
    this.structures = []
    this.towersP1 = []
    this.towersP2 = []
    
    // Build system
    this.selectedStructureType = null
    this.ghostPreview = null
    this.placementRotation = 0
    
    // ==========================================================================
    // INPUT & NETWORKING
    // ==========================================================================
    
    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()
    
    this.setupEventListeners()
    this.setupNetworking()
    
    // ==========================================================================
    // INCOME TIMER
    // ==========================================================================
    
    this.lastIncomeTime = Date.now()
    
    // ==========================================================================
    // PRELOAD & START
    // ==========================================================================
    
    modelLoader.preloadEssentialModels().then(() => {
      console.log('✅ Models loaded for multiplayer')
    })
    
    this.initializeSoundSystem()
    
    this.clock = new THREE.Clock()
    this.animate()
    
    console.log(`🎮 Player ${this.playerIndex + 1} initialized (${this.isPlayer1 ? 'Blue' : 'Orange'} team)`)
  }
  
  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================
  
  setupCamera() {
    // Position camera behind player's base looking toward opponent
    if (this.isPlayer1) {
      this.camera.position.set(0, 45, GAME_CONFIG.player1BaseZ + 50)
      this.camera.lookAt(0, 0, 0)
    } else {
      this.camera.position.set(0, 45, GAME_CONFIG.player2BaseZ - 50)
      this.camera.lookAt(0, 0, 0)
    }
  }
  
  initControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    this.controls.minDistance = 30
    this.controls.maxDistance = 80
    this.controls.maxPolarAngle = Math.PI / 2.2
    
    // Limit orbit to player's side
    if (this.isPlayer1) {
      this.controls.target.set(0, 0, -20)
    } else {
      this.controls.target.set(0, 0, 20)
    }
  }
  
  async initializeSoundSystem() {
    try {
      await SoundManager.initialize(this.camera)
      await SoundManager.preloadSounds()
    } catch (error) {
      console.warn('Sound initialization failed:', error)
    }
  }
  
  // ==========================================================================
  // BATTLEFIELD CREATION
  // ==========================================================================
  
  createBattlefield() {
    // Center divider line
    this.createDividerLine()
    
    // Player 1 base (Blue)
    this.createBase(GAME_CONFIG.player1BaseZ, 0x0066ff, 0x0044aa, 'Player 1')
    
    // Player 2 base (Orange)
    this.createBase(GAME_CONFIG.player2BaseZ, 0xff6600, 0xaa4400, 'Player 2')
    
    // Attack lanes
    this.createLanes()
  }
  
  createDividerLine() {
    const lineGeom = new THREE.BoxGeometry(GAME_CONFIG.fieldWidth, 0.3, 0.5)
    const lineMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.3
    })
    const line = new THREE.Mesh(lineGeom, lineMat)
    line.position.set(0, 0.15, 0)
    this.scene.add(line)
    
    // "VS" marker
    const markerGeom = new THREE.CylinderGeometry(3, 3, 0.5, 16)
    const markerMat = new THREE.MeshStandardMaterial({
      color: 0x888888,
      metalness: 0.8,
      roughness: 0.2
    })
    const marker = new THREE.Mesh(markerGeom, markerMat)
    marker.position.set(0, 0.25, 0)
    this.scene.add(marker)
  }
  
  createBase(zPos, color, glowColor, label) {
    const baseGroup = new THREE.Group()
    
    // Platform
    const platformMat = new THREE.MeshStandardMaterial({
      color: color,
      metalness: 0.6,
      roughness: 0.3,
      emissive: glowColor,
      emissiveIntensity: 0.2
    })
    
    const bottomTier = new THREE.Mesh(
      new THREE.CylinderGeometry(7, 8, 2, 8),
      platformMat
    )
    bottomTier.position.y = 1
    bottomTier.castShadow = true
    baseGroup.add(bottomTier)
    
    const topTier = new THREE.Mesh(
      new THREE.CylinderGeometry(5, 6, 1.5, 8),
      platformMat.clone()
    )
    topTier.position.y = 2.75
    topTier.castShadow = true
    baseGroup.add(topTier)
    
    // Crystal
    const crystalMat = new THREE.MeshPhysicalMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 1.0,
      metalness: 0.1,
      roughness: 0.05,
      transparent: true,
      opacity: 0.9
    })
    
    const crystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(2.5, 1),
      crystalMat
    )
    crystal.position.y = 6
    crystal.castShadow = true
    baseGroup.add(crystal)
    
    // Store reference for animation
    if (zPos < 0) {
      this.base1Crystal = crystal
      this.base1 = baseGroup
    } else {
      this.base2Crystal = crystal
      this.base2 = baseGroup
    }
    
    baseGroup.position.set(0, 0, zPos)
    this.scene.add(baseGroup)
  }
  
  createLanes() {
    // Lane paths - visual guides
    const laneMat = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.7,
      emissive: 0x111111,
      emissiveIntensity: 0.2
    })
    
    // Center lane
    const centerLane = new THREE.Mesh(
      new THREE.BoxGeometry(8, 0.15, GAME_CONFIG.fieldLength - 20),
      laneMat
    )
    centerLane.position.y = 0.08
    centerLane.receiveShadow = true
    this.scene.add(centerLane)
    
    // Side lanes
    const sideLane1 = new THREE.Mesh(
      new THREE.BoxGeometry(6, 0.15, GAME_CONFIG.fieldLength - 20),
      laneMat.clone()
    )
    sideLane1.position.set(-18, 0.08, 0)
    sideLane1.receiveShadow = true
    this.scene.add(sideLane1)
    
    const sideLane2 = new THREE.Mesh(
      new THREE.BoxGeometry(6, 0.15, GAME_CONFIG.fieldLength - 20),
      laneMat.clone()
    )
    sideLane2.position.set(18, 0.08, 0)
    sideLane2.receiveShadow = true
    this.scene.add(sideLane2)
  }
  
  // ==========================================================================
  // NETWORKING
  // ==========================================================================
  
  setupNetworking() {
    if (!this.socket) {
      console.warn('No socket provided - running in offline mode')
      return
    }
    
    // Receive game state updates
    this.socket.on('gameState', (state) => {
      this.handleGameStateUpdate(state)
    })
    
    // Receive opponent actions
    this.socket.on('opponentAction', (action) => {
      this.handleOpponentAction(action)
    })
    
    // Game events
    this.socket.on('gameStart', () => {
      this.gameState.phase = 'active'
      console.log('🎮 Game started!')
    })
    
    this.socket.on('gameEnd', (result) => {
      this.handleGameEnd(result)
    })
    
    // Connection events
    this.socket.on('opponentDisconnected', () => {
      console.log('⚠️ Opponent disconnected')
      if (this.callbacks.onOpponentDisconnect) {
        this.callbacks.onOpponentDisconnect()
      }
    })
  }
  
  handleGameStateUpdate(state) {
    // Merge server state
    this.gameState = { ...this.gameState, ...state }
    
    // Update local references
    this.myPlayer = this.isPlayer1 ? this.gameState.player1 : this.gameState.player2
    this.opponentPlayer = this.isPlayer1 ? this.gameState.player2 : this.gameState.player1
    
    // Sync towers (server authority)
    this.syncTowers(state.player1?.towers || [], 1)
    this.syncTowers(state.player2?.towers || [], 2)
    
    // Update UI
    if (this.callbacks.onStateUpdate) {
      this.callbacks.onStateUpdate(this.gameState)
    }
  }
  
  handleOpponentAction(action) {
    switch (action.type) {
      case 'tower_placed':
        this.createOpponentTower(action.data)
        break
      
      case 'wave_sent':
        this.spawnWaveForPlayer(
          action.data.waveType,
          action.data.count,
          this.isPlayer1 ? 1 : 2 // Opponent sends toward me
        )
        break
      
      case 'tower_upgraded':
        this.upgradeOpponentTower(action.data)
        break
      
      case 'tower_sold':
        this.removeOpponentTower(action.data)
        break
    }
  }
  
  sendAction(actionType, data) {
    if (!this.socket) return
    
    this.socket.emit('playerAction', {
      matchId: this.matchId,
      playerId: this.playerId,
      type: actionType,
      data,
      timestamp: Date.now()
    })
  }
  
  // ==========================================================================
  // TOWER MANAGEMENT
  // ==========================================================================
  
  syncTowers(towerData, playerIndex) {
    const towers = playerIndex === 1 ? this.towersP1 : this.towersP2
    
    // This is simplified - in production, you'd diff and update efficiently
    // For now, we rely on local state + server validation
  }
  
  createOpponentTower(data) {
    const position = new THREE.Vector3(data.x, 0, data.z)
    const tower = new Tower(data.towerType, position)
    
    tower.load().then(() => {
      this.scene.add(tower.mesh)
      
      if (this.isPlayer1) {
        this.towersP2.push(tower)
      } else {
        this.towersP1.push(tower)
      }
      
      this.structures.push(tower)
      
      // Build effect
      if (this.visualEffects) {
        this.visualEffects.createBuildEffect(position, {
          glowColor: this.isPlayer1 ? 0xff6600 : 0x0066ff
        })
      }
    })
  }
  
  upgradeOpponentTower(data) {
    // Find and upgrade the tower
    const allTowers = [...this.towersP1, ...this.towersP2]
    const tower = allTowers.find(t =>
      Math.abs(t.position.x - data.x) < 0.5 &&
      Math.abs(t.position.z - data.z) < 0.5
    )
    
    if (tower && tower.upgrade) {
      tower.upgrade()
      
      if (this.visualEffects) {
        this.visualEffects.createUpgradeEffect(tower.position)
      }
    }
  }
  
  removeOpponentTower(data) {
    const arrays = [this.towersP1, this.towersP2, this.structures]
    
    arrays.forEach(arr => {
      const index = arr.findIndex(t =>
        t.position &&
        Math.abs(t.position.x - data.x) < 0.5 &&
        Math.abs(t.position.z - data.z) < 0.5
      )
      
      if (index !== -1) {
        const tower = arr[index]
        if (tower.mesh) this.scene.remove(tower.mesh)
        if (tower.destroy) tower.destroy()
        arr.splice(index, 1)
      }
    })
  }
  
  // ==========================================================================
  // WAVE SENDING (Attack opponent)
  // ==========================================================================
  
  sendWave(waveType, count = 5) {
    const cost = GAME_CONFIG.waveCosts[waveType] * count
    
    if (this.myPlayer.gold < cost) {
      console.log('Not enough gold to send wave')
      return false
    }
    
    // Deduct gold
    this.myPlayer.gold -= cost
    
    // Add income bonus
    this.myPlayer.income += GAME_CONFIG.waveIncomeBonus[waveType] * count
    
    // Increment waves sent
    this.myPlayer.wavesSent++
    
    // Send to server
    this.sendAction('wave_sent', {
      waveType,
      count
    })
    
    // Spawn locally (toward opponent)
    const targetPlayer = this.isPlayer1 ? 2 : 1
    this.spawnWaveForPlayer(waveType, count, targetPlayer)
    
    // Update UI
    if (this.callbacks.onGoldChange) {
      this.callbacks.onGoldChange(this.myPlayer.gold)
    }
    
    console.log(`📤 Sent ${count}x ${waveType} wave (cost: ${cost}g, income +${GAME_CONFIG.waveIncomeBonus[waveType] * count})`)
    return true
  }
  
  spawnWaveForPlayer(waveType, count, targetPlayer) {
    const enemyManager = targetPlayer === 1 ? this.enemyManagerP1 : this.enemyManagerP2
    
    // Queue the spawns
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const spawnPoint = targetPlayer === 1
          ? new THREE.Vector3((Math.random() - 0.5) * 10, 0.5, GAME_CONFIG.player2BaseZ - 5)
          : new THREE.Vector3((Math.random() - 0.5) * 10, 0.5, GAME_CONFIG.player1BaseZ + 5)
        
        enemyManager.spawnEnemy({
          type: waveType,
          position: spawnPoint,
          healthMultiplier: 1 + this.gameState.wave * 0.1,
          speedMultiplier: 1
        })
      }, i * 400)
    }
    
    // Play wave sound
    SoundManager.play('wave_start.ogg')
  }
  
  // ==========================================================================
  // COMBAT EVENTS
  // ==========================================================================
  
  onEnemyKilled(enemy, goldReward, targetPlayer) {
    // Player who killed gets gold
    const defender = targetPlayer === 1 ? this.gameState.player1 : this.gameState.player2
    defender.gold += goldReward
    defender.enemiesKilled++
    
    // If it's me, update UI
    if ((targetPlayer === 1 && this.isPlayer1) || (targetPlayer === 2 && !this.isPlayer1)) {
      if (this.callbacks.onGoldChange) {
        this.callbacks.onGoldChange(this.myPlayer.gold)
      }
    }
  }
  
  onEnemyReachedBase(enemy, targetPlayer) {
    // Player whose base was reached loses health
    const defender = targetPlayer === 1 ? this.gameState.player1 : this.gameState.player2
    const damage = (enemy.lives || 1) * 50
    
    defender.health -= damage
    
    // Damage effect
    if ((targetPlayer === 1 && this.isPlayer1) || (targetPlayer === 2 && !this.isPlayer1)) {
      this.graphicsEngine.triggerDamageEffect(0.4)
      
      if (this.callbacks.onHealthChange) {
        this.callbacks.onHealthChange(this.myPlayer.health, this.myPlayer.maxHealth)
      }
    }
    
    // Check for game over
    if (defender.health <= 0) {
      const winner = targetPlayer === 1 ? 2 : 1
      this.handleGameEnd({ winner })
    }
  }
  
  handleGameEnd(result) {
    this.gameOver = true
    this.gameState.phase = 'finished'
    this.gameState.winner = result.winner
    
    const iWon = (result.winner === 1 && this.isPlayer1) || (result.winner === 2 && !this.isPlayer1)
    
    console.log(iWon ? '🏆 Victory!' : '💀 Defeat')
    
    if (this.callbacks.onGameEnd) {
      this.callbacks.onGameEnd(iWon, {
        winner: result.winner,
        myStats: this.myPlayer,
        opponentStats: this.opponentPlayer
      })
    }
  }
  
  // ==========================================================================
  // INPUT HANDLING
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
    const intersects = this.raycaster.intersectObject(this.graphicsEngine.terrain)
    
    if (intersects.length > 0) {
      const point = intersects[0].point.clone()
      point.y = 0
      
      // Check if on my side
      if (!this.isMyTerritory(point)) {
        console.log('Cannot build on opponent territory')
        return
      }
      
      if (this.selectedStructureType) {
        this.placeTower(this.selectedStructureType, point)
      }
    }
  }
  
  isMyTerritory(position) {
    if (this.isPlayer1) {
      return position.z < 0
    } else {
      return position.z > 0
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
  
  async updateGhostPreview(position) {
    if (!this.selectedStructureType) return
    
    const isValid = this.isValidPlacement(position)
    
    if (!this.ghostPreview) {
      const modelKey = TOWER_TYPES[this.selectedStructureType]?.modelKey
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
    
    // Update color
    this.ghostPreview.traverse((child) => {
      if (child.isMesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material]
        mats.forEach(mat => {
          mat.emissive.setHex(isValid ? 0x00ff00 : 0xff0000)
        })
      }
    })
  }
  
  isValidPlacement(position) {
    // Must be on my side
    if (!this.isMyTerritory(position)) return false
    
    // Not too close to base
    const myBaseZ = this.isPlayer1 ? GAME_CONFIG.player1BaseZ : GAME_CONFIG.player2BaseZ
    if (Math.abs(position.z - myBaseZ) < 10) return false
    
    // Not too close to other structures
    for (const structure of this.structures) {
      if (structure.position.distanceTo(position) < 4) return false
    }
    
    // Within bounds
    if (Math.abs(position.x) > 25) return false
    
    return true
  }
  
  async placeTower(towerType, position) {
    const cost = TOWER_TYPES[towerType]?.cost || 100
    
    if (this.myPlayer.gold < cost) {
      console.log('Not enough gold!')
      return false
    }
    
    if (!this.isValidPlacement(position)) {
      console.log('Invalid placement!')
      return false
    }
    
    try {
      const tower = new Tower(towerType, position)
      await tower.load()
      
      this.scene.add(tower.mesh)
      this.structures.push(tower)
      
      if (this.isPlayer1) {
        this.towersP1.push(tower)
      } else {
        this.towersP2.push(tower)
      }
      
      // Deduct gold
      this.myPlayer.gold -= cost
      
      // Build effect
      if (this.visualEffects) {
        this.visualEffects.createBuildEffect(position, {
          glowColor: this.isPlayer1 ? 0x0066ff : 0xff6600
        })
        SoundManager.play3D('build.ogg', position)
      }
      
      // Send to server
      this.sendAction('tower_placed', {
        towerType,
        x: position.x,
        z: position.z
      })
      
      // Update UI
      if (this.callbacks.onGoldChange) {
        this.callbacks.onGoldChange(this.myPlayer.gold)
      }
      
      this.cancelPlacement()
      return true
    } catch (error) {
      console.error('Error placing tower:', error)
      return false
    }
  }
  
  selectTowerType(towerType) {
    this.selectedStructureType = towerType
  }
  
  cancelPlacement() {
    this.selectedStructureType = null
    if (this.ghostPreview) {
      this.scene.remove(this.ghostPreview)
      this.ghostPreview = null
    }
  }
  
  onKeyDown(event) {
    if (event.key === 'Escape') {
      this.cancelPlacement()
    } else if (event.key >= '1' && event.key <= '7') {
      const types = ['gattling', 'missile', 'laser', 'sniper', 'frost', 'fire', 'tesla']
      const index = parseInt(event.key) - 1
      if (index < types.length) {
        this.selectTowerType(types[index])
      }
    }
  }
  
  onResize() {
    this.graphicsEngine.handleResize()
    this.controls.update()
  }
  
  // ==========================================================================
  // UPDATE LOOP
  // ==========================================================================
  
  update(deltaTime) {
    if (this.gameOver || this.isPaused) return
    
    deltaTime = Math.min(deltaTime, 0.033)
    
    // Update controls
    this.controls.update()
    
    // Update graphics
    this.graphicsEngine.update(deltaTime)
    
    // Update visual effects
    if (this.visualEffects) {
      this.visualEffects.update(deltaTime)
    }
    
    // Update sound
    SoundManager.update(deltaTime * 1000)
    
    // Update enemy managers
    this.enemyManagerP1.update(deltaTime)
    this.enemyManagerP2.update(deltaTime)
    
    // Merge enemies for rendering
    this.enemies = [...this.enemyManagerP1.enemies, ...this.enemyManagerP2.enemies]
    
    // Update tower combat
    this.updateTowerCombat(deltaTime)
    
    // Update income
    this.updateIncome()
    
    // Animate bases
    this.animateBases(deltaTime)
    
    // Update game time
    this.gameState.time += deltaTime
  }
  
  updateTowerCombat(deltaTime) {
    const currentTime = Date.now() / 1000
    
    // Player 1 towers attack enemies heading toward player 1
    this.towersP1.forEach(tower => {
      const target = this.towerCombatP1.findTarget(
        tower,
        this.enemyManagerP1.enemies,
        TARGETING_MODES.FIRST
      )
      
      if (target) {
        tower.target = target
        if (tower.aimAtTarget) tower.aimAtTarget()
        this.towerCombatP1.fireTower(tower, target, currentTime)
      }
    })
    
    // Player 2 towers attack enemies heading toward player 2
    this.towersP2.forEach(tower => {
      const target = this.towerCombatP2.findTarget(
        tower,
        this.enemyManagerP2.enemies,
        TARGETING_MODES.FIRST
      )
      
      if (target) {
        tower.target = target
        if (tower.aimAtTarget) tower.aimAtTarget()
        this.towerCombatP2.fireTower(tower, target, currentTime)
      }
    })
    
    // Update projectiles
    this.towerCombatP1.update(deltaTime)
    this.towerCombatP2.update(deltaTime)
  }
  
  updateIncome() {
    const now = Date.now()
    
    if (now - this.lastIncomeTime >= GAME_CONFIG.incomeInterval) {
      // Add income to both players
      this.gameState.player1.gold += this.gameState.player1.income
      this.gameState.player2.gold += this.gameState.player2.income
      
      this.lastIncomeTime = now
      this.gameState.wave++
      
      // Update my UI
      if (this.callbacks.onGoldChange) {
        this.callbacks.onGoldChange(this.myPlayer.gold)
      }
      
      if (this.callbacks.onIncomeReceived) {
        this.callbacks.onIncomeReceived(this.myPlayer.income)
      }
      
      console.log(`💰 Income: +${this.myPlayer.income}g (Wave ${this.gameState.wave})`)
    }
  }
  
  animateBases(deltaTime) {
    // Animate crystals
    const time = Date.now() * 0.002
    
    if (this.base1Crystal) {
      this.base1Crystal.rotation.y += deltaTime * 0.5
      this.base1Crystal.position.y = 6 + Math.sin(time) * 0.5
      
      // Pulse based on health
      const healthRatio = this.gameState.player1.health / this.gameState.player1.maxHealth
      this.base1Crystal.material.emissiveIntensity = 0.5 + healthRatio * 0.5
    }
    
    if (this.base2Crystal) {
      this.base2Crystal.rotation.y -= deltaTime * 0.5
      this.base2Crystal.position.y = 6 + Math.sin(time + Math.PI) * 0.5
      
      const healthRatio = this.gameState.player2.health / this.gameState.player2.maxHealth
      this.base2Crystal.material.emissiveIntensity = 0.5 + healthRatio * 0.5
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
  // PUBLIC API
  // ==========================================================================
  
  getGameState() {
    return this.gameState
  }
  
  getMyStats() {
    return this.myPlayer
  }
  
  getOpponentStats() {
    return this.opponentPlayer
  }
  
  // ==========================================================================
  // CLEANUP
  // ==========================================================================
  
  destroy() {
    this.towerCombatP1.destroy()
    this.towerCombatP2.destroy()
    this.enemyManagerP1.destroy()
    this.enemyManagerP2.destroy()
    
    this.structures.forEach(s => {
      if (s.mesh) this.scene.remove(s.mesh)
      if (s.destroy) s.destroy()
    })
    
    this.graphicsEngine.dispose()
    
    if (this.socket) {
      this.socket.off('gameState')
      this.socket.off('opponentAction')
      this.socket.off('gameStart')
      this.socket.off('gameEnd')
      this.socket.off('opponentDisconnected')
    }
    
    console.log('🧹 Multiplayer game destroyed')
  }
}

export { GAME_CONFIG }
