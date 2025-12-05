import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { PerformanceManager } from './PerformanceManager.js'
import { CodingRewardSystem } from './CodingRewardSystem.js'
import { TaskBuffSystem } from './TaskBuffSystem.js'
import { modelLoader } from './ModelLoader.js'
import { ObjectPool } from './ObjectPool.js'
import { SpatialHashGrid } from './SpatialHashGrid.js'
import { LODManager } from './LODManager.js'
import { Tower } from './structures/Tower.js'
import { Wall } from './structures/Wall.js'
import { UnitSpawner } from './structures/UnitSpawner.js'
import { DefensiveUnit } from './units/DefensiveUnit.js'
import { TOWER_TYPES } from './structures/TowerTypes.js'
import { SoundManager } from './SoundManager.js'
import { Enemy } from './Enemy.js'
import { generateWave, ENEMY_TYPES } from './EnemyTypes.js'
import { VisualEffects } from './VisualEffects.js'
import { Arena } from './Arena.js'
import { AIPlayer } from './AIPlayer.js'
import { WaveTimer } from './WaveTimer.js'

export class EnhancedGame {
  constructor(container, callbacks = {}, userProfile = {}, gameMode = 'single') {
    this.container = container
    this.callbacks = callbacks
    this.userProfile = userProfile
    this.gameMode = gameMode // 'single' or 'multiplayer'
    
    // Game state
    this.gold = callbacks.initialGold || 500
    this.energy = callbacks.initialEnergy || 50
    this.maxEnergy = 100
    this.health = 1000
    this.maxHealth = 1000
    this.wave = 0
    this.enemies = []
    this.structures = [] // All structures (towers, walls, spawners)
    this.towers = [] // Just towers for compatibility
    this.walls = []
    this.spawners = []
    this.defensiveUnits = []
    this.projectiles = []
    this.isPaused = false
    this.gameOver = false
    this.score = 0
    this.xp = 0
    
    // Build system
    this.selectedStructureType = null
    this.ghostPreview = null
    this.placementRotation = 0
    
    // Initialize systems
    this.performanceManager = new PerformanceManager(this)
    this.codingRewards = new CodingRewardSystem(this)
    this.taskBuffs = new TaskBuffSystem()
    this.spatialGrid = new SpatialHashGrid(10)
    this.lodManager = new LODManager(null) // Will set camera later
    this.arena = new Arena() // Grid-based pathfinding
    
    // Sound system - will initialize after user interaction
    // Visual effects (will be initialized after scene)
    
    // Object pools
    this.projectilePool = new ObjectPool(
      () => this.createProjectileMesh(),
      (obj) => {
        obj.visible = false
        obj.position.set(0, 0, 0)
      },
      100
    )
    
    // Apply task buffs
    const preGameBuffs = this.taskBuffs.calculatePreGameBuffs(userProfile.tasks || {})
    this.gold = preGameBuffs.startingGold
    this.maxHealth = 1000 * preGameBuffs.baseHealthMultiplier
    this.health = this.maxHealth
    this.availableTowers = preGameBuffs.availableTowerTypes || ['basic']
    this.passiveBuffs = this.taskBuffs.calculateInGamePassiveBuffs(userProfile.tasks || {})
    
    // Initialize coding rewards
    this.codingRewards.initialize(userProfile.totalProblemsSolved || 0)
    
    // Track problems solved and tasks completed during this game
    this.problemsSolvedThisGame = 0
    this.tasksCompletedThisGame = 0
    
    // Calculate passive energy generation rates based on lifetime progress
    // Gold is ONLY awarded when solving coding problems (no passive gold)
    // Each problem solved = +0.05 energy/sec
    // Each task completed = +0.08 energy/sec
    const lifetimeProblems = userProfile.totalProblemsSolved || 0
    const lifetimeTasks = (userProfile.tasks?.allTimeCompleted || 0) + 
                          (userProfile.tasks?.dailyCompleted || 0) * 0.1 + 
                          (userProfile.tasks?.weeklyCompleted || 0) * 0.2
    
    const baseEnergyPerSecond = 0.2 // Base passive energy
    
    const passiveEnergyPerSecond = baseEnergyPerSecond + 
                                   (lifetimeProblems * 0.05) + 
                                   (lifetimeTasks * 0.08)
    
    this.passiveGoldPerSecond = 0 // NO passive gold - only from coding problems
    this.passiveEnergyPerSecond = passiveEnergyPerSecond
    this.lastPassiveTick = Date.now()
    
    // Initialize wave timer for automatic attacks
    this.waveTimer = new WaveTimer(this, {
      waveInterval: 30000, // 30 seconds between waves
      problemSolvedBonus: 5, // +5 seconds per problem solved
      taskCompletedBonus: 10, // +10 seconds per task completed
      energyPerProblem: 10,
      energyPerTask: 15,
      energyPerSecond: passiveEnergyPerSecond, // Dynamic passive energy generation
      onWaveStart: (waveNum) => {
        if (this.callbacks.onWaveChange) {
          this.callbacks.onWaveChange(waveNum)
        }
      },
      onCountdownUpdate: (countdown, total) => {
        if (this.callbacks.onWaveCountdown) {
          this.callbacks.onWaveCountdown(countdown, total)
        }
      },
      onProblemSolved: (rewards) => {
        if (this.callbacks.onProblemReward) {
          this.callbacks.onProblemReward(rewards)
        }
      },
      onTaskCompleted: (rewards) => {
        if (this.callbacks.onTaskReward) {
          this.callbacks.onTaskReward(rewards)
        }
      }
    })

    this.initScene()
    this.initCamera()
    this.initRenderer()
    this.initLights()
    this.initControls()
    this.createTerrain()
    this.createPath()
    this.createBase()
    this.createDecorations()
    this.initPostProcessing()
    
    // Initialize visual effects (after scene is created)
    this.visualEffects = new VisualEffects(this.scene, this.camera)

    // Set LOD manager camera
    this.lodManager.camera = this.camera

    // Initialize sound system with camera for spatial audio
    this.initializeSoundSystem()

    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)

    // Start performance monitoring
    this.performanceManager.startMonitoring()

    // Preload essential models
    modelLoader.preloadEssentialModels().then(() => {
      this.modelsReady = true
      if (this.callbacks.onModelsReady) {
        this.callbacks.onModelsReady()
      }
    })

    this.setupEventListeners()
    this.clock = new THREE.Clock()
    
    // Start wave timer after a short delay (give player time to prepare)
    setTimeout(() => {
      this.waveTimer.start()
    }, 5000) // 5 second grace period
    
    this.animate()
  }
  
  createProjectileMesh() {
    const geometry = new THREE.SphereGeometry(0.3, 8, 8)
    const material = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.9
    })
    return new THREE.Mesh(geometry, material)
  }

  initScene() {
    this.scene = new THREE.Scene()
    // Pure black background for performance
    this.scene.background = new THREE.Color(0x000000)
    this.scene.fog = new THREE.FogExp2(0x000000, 0.005) // Reduced fog density
  }

  initCamera() {
    this.camera = new THREE.PerspectiveCamera(
      55,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1000
    )
    // Isometric-style view like Age of Arms
    this.camera.position.set(0, 45, 50)
    this.camera.lookAt(0, 0, 0)
  }

  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      powerPreference: 'high-performance'
    })
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.3
    this.container.appendChild(this.renderer.domElement)
  }

  initLights() {
    // Bright ambient for visibility
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7)
    this.scene.add(ambientLight)

    // Main sun light
    const sunLight = new THREE.DirectionalLight(0xffddaa, 1.5)
    sunLight.position.set(20, 40, 20)
    sunLight.castShadow = true
    sunLight.shadow.mapSize.width = 2048
    sunLight.shadow.mapSize.height = 2048
    sunLight.shadow.camera.left = -60
    sunLight.shadow.camera.right = 60
    sunLight.shadow.camera.top = 60
    sunLight.shadow.camera.bottom = -60
    sunLight.shadow.camera.near = 0.5
    sunLight.shadow.camera.far = 200
    sunLight.shadow.bias = -0.0001
    this.scene.add(sunLight)

    // Red dramatic light from base
    this.baseLight = new THREE.PointLight(0xff0000, 2, 40)
    this.baseLight.position.set(0, 8, 0)
    this.baseLight.castShadow = true
    this.scene.add(this.baseLight)

    // Hemisphere light for natural look
    const hemiLight = new THREE.HemisphereLight(0xff6666, 0x330000, 0.6)
    this.scene.add(hemiLight)

    // Rim light for definition
    const rimLight = new THREE.DirectionalLight(0xff3333, 0.5)
    rimLight.position.set(-20, 10, -20)
    this.scene.add(rimLight)
  }

  initControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    this.controls.minDistance = 20
    this.controls.maxDistance = 80
    this.controls.maxPolarAngle = Math.PI / 2.3
    this.controls.target.set(0, 0, 0)
  }

  createTerrain() {
    // Main ground - textured terrain
    const groundGeometry = new THREE.PlaneGeometry(120, 120, 30, 30)
    
    // Add height variation for terrain feel
    const positions = groundGeometry.attributes.position.array
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i]
      const z = positions[i + 1]
      // Add some organic height variation
      positions[i + 2] = Math.sin(x * 0.1) * Math.cos(z * 0.1) * 0.5 + Math.random() * 0.2
    }
    groundGeometry.computeVertexNormals()
    
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x2a0808, // Dark red terrain
      roughness: 0.95,
      metalness: 0,
      flatShading: true
    })
    this.ground = new THREE.Mesh(groundGeometry, groundMaterial)
    this.ground.rotation.x = -Math.PI / 2
    this.ground.receiveShadow = true
    this.scene.add(this.ground)

    // Grid for tower placement
    const gridHelper = new THREE.GridHelper(100, 20, 0x550000, 0x330000)
    gridHelper.position.y = 0.05
    gridHelper.material.opacity = 0.4
    gridHelper.material.transparent = true
    this.scene.add(gridHelper)

    // Border walls
    this.createBorderWalls()
  }

  createBorderWalls() {
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x440000,
      roughness: 0.8,
      metalness: 0.2
    })

    // Create walls around the perimeter
    const wallHeight = 3
    const wallThickness = 1
    const mapSize = 50

    // North wall
    const northWall = new THREE.Mesh(
      new THREE.BoxGeometry(mapSize * 2, wallHeight, wallThickness),
      wallMaterial
    )
    northWall.position.set(0, wallHeight / 2, -mapSize)
    northWall.castShadow = true
    northWall.receiveShadow = true
    this.scene.add(northWall)

    // South wall
    const southWall = northWall.clone()
    southWall.position.z = mapSize
    this.scene.add(southWall)

    // East wall
    const eastWall = new THREE.Mesh(
      new THREE.BoxGeometry(wallThickness, wallHeight, mapSize * 2),
      wallMaterial
    )
    eastWall.position.set(mapSize, wallHeight / 2, 0)
    eastWall.castShadow = true
    eastWall.receiveShadow = true
    this.scene.add(eastWall)

    // West wall
    const westWall = eastWall.clone()
    westWall.position.x = -mapSize
    this.scene.add(westWall)
  }

  createPath() {
    // Create a winding path from spawn to base
    const pathPoints = [
      new THREE.Vector3(0, 0.15, 40),
      new THREE.Vector3(15, 0.15, 30),
      new THREE.Vector3(15, 0.15, 10),
      new THREE.Vector3(-10, 0.15, 5),
      new THREE.Vector3(-10, 0.15, -10),
      new THREE.Vector3(5, 0.15, -15),
      new THREE.Vector3(0, 0.15, -20),
    ]

    this.enemyPath = pathPoints

    // Visual path - glowing red path
    const pathMaterial = new THREE.MeshStandardMaterial({
      color: 0x660000,
      roughness: 0.6,
      emissive: 0x330000,
      emissiveIntensity: 0.5
    })

    for (let i = 0; i < pathPoints.length - 1; i++) {
      const start = pathPoints[i]
      const end = pathPoints[i + 1]
      const distance = start.distanceTo(end)
      
      const pathSegment = new THREE.Mesh(
        new THREE.BoxGeometry(6, 0.2, distance),
        pathMaterial
      )
      
      pathSegment.position.set(
        (start.x + end.x) / 2,
        0.15,
        (start.z + end.z) / 2
      )
      
      pathSegment.lookAt(end.x, 0.15, end.z)
      pathSegment.rotation.x = -Math.PI / 2
      pathSegment.receiveShadow = true
      
      this.scene.add(pathSegment)
    }

    // Path markers/arrows
    this.createPathMarkers(pathPoints)
  }

  createPathMarkers(pathPoints) {
    const arrowMaterial = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xaa0000,
      emissiveIntensity: 0.7
    })

    pathPoints.forEach((point, index) => {
      if (index < pathPoints.length - 1) {
        const nextPoint = pathPoints[index + 1]
        const arrow = new THREE.Mesh(
          new THREE.ConeGeometry(0.5, 1, 3),
          arrowMaterial
        )
        arrow.position.copy(point)
        arrow.position.y = 0.5
        arrow.lookAt(nextPoint)
        arrow.rotation.x = Math.PI / 2
        this.scene.add(arrow)
      }
    })
  }

  createBase() {
    // Multi-tiered platform
    const basePlatform = new THREE.Group()

    // Bottom tier
    const bottomTier = new THREE.Mesh(
      new THREE.CylinderGeometry(8, 9, 2, 8),
      new THREE.MeshStandardMaterial({
        color: 0x440000,
        metalness: 0.7,
        roughness: 0.3,
        emissive: 0x220000,
        emissiveIntensity: 0.2
      })
    )
    bottomTier.position.y = 1
    bottomTier.castShadow = true
    bottomTier.receiveShadow = true
    basePlatform.add(bottomTier)

    // Middle tier
    const middleTier = new THREE.Mesh(
      new THREE.CylinderGeometry(6, 7, 1.5, 8),
      new THREE.MeshStandardMaterial({
        color: 0x660000,
        metalness: 0.6,
        roughness: 0.4,
        emissive: 0x330000,
        emissiveIntensity: 0.3
      })
    )
    middleTier.position.y = 2.75
    middleTier.castShadow = true
    basePlatform.add(middleTier)

    this.scene.add(basePlatform)

    // Main crystal - dramatic and glowing
    const crystalGeometry = new THREE.OctahedronGeometry(3, 1)
    const crystalMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xff0000,
      emissive: 0xcc0000,
      emissiveIntensity: 1.2,
      metalness: 0.1,
      roughness: 0.05,
      transparent: true,
      opacity: 0.9,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      transmission: 0.3
    })
    this.crystal = new THREE.Mesh(crystalGeometry, crystalMaterial)
    this.crystal.position.set(0, 6, 0)
    this.crystal.castShadow = true
    this.scene.add(this.crystal)

    // Energy rings orbiting the crystal
    this.createEnergyRings()

    // Pillars around the base
    this.createPillars()
  }

  createEnergyRings() {
    const ringGeometry = new THREE.TorusGeometry(4.5, 0.15, 8, 32)
    const ringMaterial = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 0.8,
      metalness: 0.8,
      roughness: 0.2
    })
    
    this.energyRings = []
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(ringGeometry, ringMaterial.clone())
      ring.position.set(0, 5, 0)
      ring.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.3
      ring.rotation.y = (Math.PI * 2 * i) / 3
      this.energyRings.push(ring)
      this.scene.add(ring)
    }
  }

  createPillars() {
    const pillarGeometry = new THREE.CylinderGeometry(0.6, 0.7, 5, 6)
    const pillarMaterial = new THREE.MeshStandardMaterial({
      color: 0x880000,
      metalness: 0.7,
      roughness: 0.3,
      emissive: 0x440000,
      emissiveIntensity: 0.3
    })
    
    const pillarPositions = [
      [5, 2.5, 0],
      [-5, 2.5, 0],
      [0, 2.5, 5],
      [0, 2.5, -5],
      [3.5, 2.5, 3.5],
      [-3.5, 2.5, 3.5],
      [3.5, 2.5, -3.5],
      [-3.5, 2.5, -3.5]
    ]
    
    pillarPositions.forEach(pos => {
      const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial.clone())
      pillar.position.set(...pos)
      pillar.castShadow = true
      pillar.receiveShadow = true
      this.scene.add(pillar)

      // Glow on top of pillars
      const glowGeometry = new THREE.SphereGeometry(0.4, 8, 8)
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.8
      })
      const glow = new THREE.Mesh(glowGeometry, glowMaterial)
      glow.position.set(pos[0], pos[1] + 2.5, pos[2])
      this.scene.add(glow)
    })
  }

  createDecorations() {
    // Rocks scattered around
    const rockGeometry = new THREE.DodecahedronGeometry(1, 0)
    const rockMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x3a1a1a,
      roughness: 0.95,
      flatShading: true
    })

    for (let i = 0; i < 25; i++) {
      const rock = new THREE.Mesh(rockGeometry, rockMaterial.clone())
      
      // Place away from path
      let x, z
      do {
        x = (Math.random() - 0.5) * 80
        z = (Math.random() - 0.5) * 80
      } while (Math.abs(x) < 15 && Math.abs(z) < 25) // Avoid center path
      
      rock.position.set(x, Math.random() * 0.8, z)
      rock.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      )
      rock.scale.set(
        0.8 + Math.random() * 1.5,
        0.8 + Math.random() * 1.2,
        0.8 + Math.random() * 1.5
      )
      rock.castShadow = true
      rock.receiveShadow = true
      this.scene.add(rock)
    }

    // Floating particles
    this.createParticles()
  }

  createParticles() {
    // Reduced particles for performance (200 instead of 2000)
    const particlesGeometry = new THREE.BufferGeometry()
    const particlesCount = 200
    const positions = new Float32Array(particlesCount * 3)
    const colors = new Float32Array(particlesCount * 3)

    for (let i = 0; i < particlesCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 120
      positions[i + 1] = Math.random() * 50 + 5
      positions[i + 2] = (Math.random() - 0.5) * 120
      
      // Red/orange/black particles
      const colorChoice = Math.random()
      if (colorChoice < 0.6) {
        colors[i] = 1.0
        colors[i + 1] = 0.0
        colors[i + 2] = 0.0
      } else if (colorChoice < 0.85) {
        colors[i] = 1.0
        colors[i + 1] = 0.3
        colors[i + 2] = 0.0
      } else {
        colors[i] = 0.5
        colors[i + 1] = 0.0
        colors[i + 2] = 0.0
      }
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    const particlesMaterial = new THREE.PointsMaterial({
      size: 0.4,
      transparent: true,
      opacity: 0.4,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })

    this.particles = new THREE.Points(particlesGeometry, particlesMaterial)
    this.scene.add(this.particles)
  }

  // Initialize sound system with Web Audio API
  async initializeSoundSystem() {
    try {
      await SoundManager.initialize(this.camera)
      await SoundManager.preloadSounds()

      // Start menu/theme music
      if (!this.gameStarted) {
        SoundManager.playMusic('theme.ogg')
      }
    } catch (error) {
      console.warn('Sound initialization failed:', error)
    }
  }

  initPostProcessing() {
    this.composer = new EffectComposer(this.renderer)
    
    const renderPass = new RenderPass(this.scene, this.camera)
    this.composer.addPass(renderPass)
    
    // Stronger bloom for dramatic glow
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(this.container.clientWidth, this.container.clientHeight),
      2.0, // strength
      0.6, // radius
      0.3 // threshold
    )
    this.composer.addPass(bloomPass)
    
    const outputPass = new OutputPass()
    this.composer.addPass(outputPass)
  }

  // Create better tower visual
  createTowerModel(type = 'basic') {
    const towerGroup = new THREE.Group()

    // Base
    const baseGeometry = new THREE.CylinderGeometry(1.5, 2, 1, 8)
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: 0x660000,
      metalness: 0.6,
      roughness: 0.4
    })
    const base = new THREE.Mesh(baseGeometry, baseMaterial)
    base.position.y = 0.5
    base.castShadow = true
    base.receiveShadow = true
    towerGroup.add(base)

    // Main body
    const bodyGeometry = new THREE.CylinderGeometry(1.2, 1.5, 3, 6)
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x880000,
      metalness: 0.5,
      roughness: 0.5
    })
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
    body.position.y = 2.5
    body.castShadow = true
    towerGroup.add(body)

    // Top turret
    const turretGeometry = new THREE.ConeGeometry(1, 2, 6)
    const turretMaterial = new THREE.MeshStandardMaterial({
      color: 0xaa0000,
      metalness: 0.7,
      roughness: 0.3,
      emissive: 0x440000,
      emissiveIntensity: 0.4
    })
    const turret = new THREE.Mesh(turretGeometry, turretMaterial)
    turret.position.y = 4.5
    turret.castShadow = true
    towerGroup.add(turret)

    // Glowing tip
    const tipGeometry = new THREE.SphereGeometry(0.3, 8, 8)
    const tipMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.9
    })
    const tip = new THREE.Mesh(tipGeometry, tipMaterial)
    tip.position.y = 5.5
    towerGroup.add(tip)

    return towerGroup
  }

  // Create better enemy visual
  createEnemyModel() {
    const enemyGroup = new THREE.Group()

    // Body
    const bodyGeometry = new THREE.SphereGeometry(0.8, 12, 12)
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ff00,
      metalness: 0.3,
      roughness: 0.7,
      emissive: 0x00aa00,
      emissiveIntensity: 0.3
    })
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
    body.position.y = 1
    body.castShadow = true
    enemyGroup.add(body)

    // Eye glow
    const eyeGeometry = new THREE.SphereGeometry(0.2, 8, 8)
    const eyeMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.9
    })
    const eye = new THREE.Mesh(eyeGeometry, eyeMaterial)
    eye.position.set(0, 1.2, 0.6)
    enemyGroup.add(eye)

    return enemyGroup
  }

  placeTower(position) {
    if (this.gold < 100) {
      console.log('Not enough gold!')
      return false
    }

    const towerModel = this.createTowerModel('basic')
    towerModel.position.copy(position)
    this.scene.add(towerModel)

    const tower = {
      mesh: towerModel,
      position: position.clone(),
      damage: 25,
      range: 12,
      fireRate: 1.0,
      lastShot: 0,
      health: 300,
      maxHealth: 300
    }

    this.towers.push(tower)
    this.gold -= 100

    if (this.callbacks.onGoldChange) {
      this.callbacks.onGoldChange(this.gold)
    }

    return true
  }

  spawnEnemy() {
    // Legacy method - spawn basic spider
    this.spawnEnemyOfType('spider', 1 + this.wave * 0.1, null, 1)
  }
  
  spawnEnemyOfType(type = 'spider', healthMultiplier = 1.0, spawnPoint = null, speedMultiplier = 1) {
    // Create enemy using the Enemy class with visual effects reference
    const enemy = new Enemy(type, {
      healthMultiplier,
      speedMultiplier,
      visualEffects: this.visualEffects
    })
    const mesh = enemy.createMesh()
    if (!mesh) return
    
    // Set spawn position - use provided spawn point or default
    let startPos
    if (spawnPoint) {
      startPos = new THREE.Vector3(spawnPoint.x, 0.5, spawnPoint.z)
    } else {
      // Get spawn position from arena
      const spawnWorld = this.arena.gridToWorld(this.arena.start)
      startPos = new THREE.Vector3(spawnWorld.x, spawnWorld.y, spawnWorld.z)
    }
    
    mesh.position.copy(startPos)
    enemy.position = startPos.clone()
    
    // Use A* pathfinding to find path to base from spawn point
    const gridPath = this.arena.findPath(
      this.arena.worldToGrid(startPos),
      this.arena.worldToGrid(this.base.position)
    )
    if (gridPath && gridPath.length > 0) {
      // Convert grid path to world path
      const worldPath = this.arena.getWorldPath(gridPath)
      enemy.setPath(worldPath)
      enemy.pathIndex = 0
    } else {
      // Fallback to old path if A* fails
      if (this.enemyPath && this.enemyPath.length > 0) {
        enemy.setPath(this.enemyPath)
        enemy.pathIndex = 0
      }
    }
    
    this.scene.add(mesh)
    this.enemies.push(enemy)
    
    // Add to spatial grid for collision
    this.spatialGrid.insert(enemy)
  }

  startWave() {
    this.wave++
    
    // Generate wave configuration with enemy variety
    const waveConfig = generateWave(this.wave)
    
    // Play wave start sound (UI sound, non-spatial)
    SoundManager.play('wave_start.ogg')
    
    // Flatten enemy list for spawning
    const enemiesToSpawn = []
    waveConfig.enemies.forEach(config => {
      for (let i = 0; i < config.count; i++) {
        enemiesToSpawn.push({
          type: config.type,
          healthMultiplier: waveConfig.healthMultiplier,
          speedMultiplier: waveConfig.speedMultiplier || 1
        })
      }
    })
    
    // Shuffle for variety
    enemiesToSpawn.sort(() => Math.random() - 0.5)
    
    // Spawn enemies with delay
    enemiesToSpawn.forEach((config, i) => {
      setTimeout(() => {
        if (!this.gameOver) {
          this.spawnEnemyOfType(config.type, config.healthMultiplier)
        }
      }, i * 1000) // 1 second between each spawn
    })
    
    if (this.callbacks.onWaveChange) {
      this.callbacks.onWaveChange(this.wave)
    }
  }

  update(deltaTime) {
    if (this.gameOver || this.isPaused) return
    
    // Cap delta time to prevent physics explosions
    deltaTime = Math.min(deltaTime, 0.033) // Max 30ms
    
    // Performance monitoring
    this.performanceManager.update(deltaTime)
    
    // Update sound manager
    SoundManager.update(deltaTime * 1000) // Convert to milliseconds
    
    // Update visual effects
    if (this.visualEffects) {
      this.visualEffects.update(deltaTime)
    }
    
    // Apply passive buffs
    if (this.passiveBuffs) {
      // Gold rate multiplier applied when enemies die
    }
    
    // Update passive energy generation only (NO passive gold - coins only from coding problems)
    const now = Date.now()
    if (now - this.lastPassiveTick >= 1000) {
      this.lastPassiveTick = now
      // Energy generation is handled by WaveTimer
    }
    
    // Update wave timer (handles passive energy generation)
    if (this.waveTimer) {
      this.waveTimer.update(deltaTime)
    }
    
    // Update AI player for single player mode
    if (this.aiPlayer && !this.isPaused && !this.gameOver) {
      this.aiPlayer.update(deltaTime, Date.now())
    }

    this.controls.update()
    
    // Update spatial grid
    this.updateSpatialGrid()
    
    // Update LOD
    this.lodManager.update()

    // Animate crystal
    if (this.crystal) {
      this.crystal.rotation.y += deltaTime * 0.6
      this.crystal.rotation.x += deltaTime * 0.4
      this.crystal.position.y = 6 + Math.sin(Date.now() * 0.002) * 0.6
      
      // Pulse the glow
      const pulse = (Math.sin(Date.now() * 0.003) + 1) / 2
      this.crystal.material.emissiveIntensity = 0.8 + pulse * 0.6
    }

    // Animate energy rings
    if (this.energyRings) {
      this.energyRings.forEach((ring, i) => {
        ring.rotation.z += deltaTime * (0.8 + i * 0.4)
        ring.position.y = 5 + Math.sin(Date.now() * 0.001 + i * 2) * 0.5
      })
    }

    // Animate base light intensity
    if (this.baseLight) {
      const pulse = (Math.sin(Date.now() * 0.002) + 1) / 2
      this.baseLight.intensity = 1.5 + pulse * 0.8
    }

    // Animate particles
    if (this.particles) {
      this.particles.rotation.y += deltaTime * 0.05
      
      // Drift particles
      const positions = this.particles.geometry.attributes.position.array
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] += Math.sin(Date.now() * 0.001 + i) * 0.01
      }
      this.particles.geometry.attributes.position.needsUpdate = true
    }

    // Update structures
    this.updateStructures(deltaTime)
    
    // Update defensive units
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

    // Update enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i]
      this.updateEnemy(enemy, deltaTime)

      if (enemy.reachedEnd || enemy.finished) {
        const livesLost = enemy.lives || 1
        this.health -= 50 * livesLost
        
        if (enemy.mesh) {
          this.scene.remove(enemy.mesh)
        }
        if (enemy.destroy) {
          enemy.destroy()
        }
        this.enemies.splice(i, 1)

        if (this.health <= 0) {
          this.endGame(false)
        }
        
        if (this.callbacks.onHealthChange) {
          this.callbacks.onHealthChange(this.health, this.maxHealth)
        }
      } else if (enemy.isDead) {
        // Calculate rewards
        const goldReward = enemy.goldReward || 25
        const xpReward = enemy.xpReward || 10
        
        // Apply passive buffs
        const goldMultiplier = this.passiveBuffs?.goldRateMultiplier || 1
        this.gold += Math.floor(goldReward * goldMultiplier)
        this.score += xpReward
        
        // Create death explosion
        if (enemy.mesh) {
          this.createHitEffect(enemy.mesh.position)
          
          // Handle splitter enemies
          if (enemy.getSpawnOnDeath) {
            const spawns = enemy.getSpawnOnDeath()
            spawns.forEach(spawnConfig => {
              setTimeout(() => {
                this.spawnEnemyOfType(spawnConfig.type, 1.0, null, 1)
              }, 100)
            })
          }
          
          this.scene.remove(enemy.mesh)
        }
        if (enemy.destroy) {
          enemy.destroy()
        }
        this.enemies.splice(i, 1)
        
        if (this.callbacks.onGoldChange) {
          this.callbacks.onGoldChange(this.gold)
        }
      }
    }

    // Update projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i]
      this.updateProjectile(proj, deltaTime)

      if (proj.shouldRemove) {
        this.scene.remove(proj.mesh)
        this.projectiles.splice(i, 1)
      }
    }
  }

  updateTower(tower, deltaTime) {
    const now = Date.now() / 1000

    if (now - tower.lastShot < 1 / tower.fireRate) return

    // Find enemies in range
    const enemiesInRange = this.enemies.filter(enemy => {
      if (enemy.isDead) return false
      const dist = tower.position.distanceTo(enemy.position)
      return dist <= tower.range
    })

    if (enemiesInRange.length === 0) return

    // Target closest enemy
    const target = enemiesInRange.reduce((closest, enemy) => {
      const distClosest = tower.position.distanceTo(closest.position)
      const distEnemy = tower.position.distanceTo(enemy.position)
      return distEnemy < distClosest ? enemy : closest
    })

    // Fire projectile with attack type and splash radius
    const attackType = tower.attackType || 'gattling'
    const splashRadius = tower.splashRadius || 0
    this.fireProjectile(tower.position.clone(), target, tower.damage, attackType, splashRadius)
    tower.lastShot = now

    // Visual feedback - flash turret
    if (tower.mesh.children[2]) { // turret part
      const originalEmissive = tower.mesh.children[2].material.emissiveIntensity
      tower.mesh.children[2].material.emissiveIntensity = 1.0
      setTimeout(() => {
        if (tower.mesh.children[2]) {
          tower.mesh.children[2].material.emissiveIntensity = originalEmissive
        }
      }, 100)
    }
  }

  updateEnemy(enemy, deltaTime) {
    if (enemy.isDead || enemy.finished) return

    // Use Enemy class pathfinding if available
    if (enemy.path && enemy.path.length > 0 && enemy.next) {
      const targetPos = new THREE.Vector3(enemy.next.x, enemy.next.y || 0.5, enemy.next.z || 0)
      const enemyPos = enemy.position || (enemy.mesh ? enemy.mesh.position.clone() : new THREE.Vector3())
      
      const direction = new THREE.Vector3().subVectors(targetPos, enemyPos)
      const distance = direction.length()
      
      if (distance > 0.5) {
        direction.normalize()
        
        const speed = enemy.speed || 3
        const moveDistance = speed * deltaTime
        
        if (enemy.position) {
          enemy.position.add(direction.multiplyScalar(moveDistance))
          if (enemy.mesh) {
            enemy.mesh.position.copy(enemy.position)
          }
        } else if (enemy.mesh) {
          enemy.mesh.position.add(direction.multiplyScalar(moveDistance))
          enemy.position = enemy.mesh.position.clone()
        }

        // Rotate enemy to face direction
        if (enemy.mesh && distance > 0.1) {
          enemy.mesh.lookAt(targetPos)
        }
      } else {
        // Reached waypoint, advance to next
        enemy.advance()
        
        if (enemy.finished) {
          enemy.reachedEnd = true
        }
      }
    } else if (this.enemyPath && enemy.pathIndex !== undefined && enemy.pathIndex < this.enemyPath.length) {
      // Legacy path system
      const targetPos = this.enemyPath[enemy.pathIndex]
      const enemyPos = enemy.position || (enemy.mesh ? enemy.mesh.position.clone() : new THREE.Vector3())
      
      const direction = new THREE.Vector3().subVectors(targetPos, enemyPos).normalize()
      
      const speed = enemy.speed || 3
      const moveDistance = speed * deltaTime
      
      if (enemy.position) {
        enemy.position.add(direction.multiplyScalar(moveDistance))
        if (enemy.mesh) {
          enemy.mesh.position.copy(enemy.position)
        }
      } else if (enemy.mesh) {
        enemy.mesh.position.add(direction.multiplyScalar(moveDistance))
        enemy.position = enemy.mesh.position.clone()
      }

      // Check if reached waypoint
      const currentPos = enemy.position || (enemy.mesh ? enemy.mesh.position : new THREE.Vector3())
      if (currentPos.distanceTo(targetPos) < 1) {
        enemy.pathIndex++
        
        if (enemy.pathIndex >= this.enemyPath.length) {
          enemy.reachedEnd = true
          enemy.finished = true
        }
      }

      // Rotate enemy to face direction
      if (enemy.mesh) {
        enemy.mesh.lookAt(targetPos)
      }
    }

    // Animation update (if using Enemy class)
    if (enemy.updateAnimation) {
      enemy.updateAnimation(deltaTime)
    } else if (enemy.mesh) {
      // Legacy bob animation
      const baseY = enemy.position ? enemy.position.y : 0
      enemy.mesh.position.y = baseY + Math.sin(Date.now() * 0.005 + (enemy.id || 0)) * 0.2
    }
    
    // Update health bar (if using Enemy class)
    if (enemy.updateHealthBar) {
      enemy.updateHealthBar()
    }
  }

  updateProjectile(proj, deltaTime) {
    if (!proj.target || proj.target.isDead) {
      proj.shouldRemove = true
      return
    }
    
    const targetPos = proj.target.position || (proj.target.mesh ? proj.target.mesh.position : new THREE.Vector3())
    const direction = new THREE.Vector3().subVectors(targetPos, proj.position)
    const distance = direction.length()
    
    if (distance < 0.5) {
      // Hit target
      const damage = proj.damage || 20
      const splashRadius = proj.splashRadius || 0
      
      // Apply damage using Enemy class method if available
      if (proj.target.damage) {
        proj.target.damage(damage)
      } else {
        proj.target.health -= damage
        if (proj.target.health <= 0) {
          proj.target.isDead = true
        }
      }
      
      // Splash damage for missiles
      if (splashRadius > 0) {
        this.enemies.forEach(enemy => {
          if (enemy.isDead || enemy === proj.target) return
          const enemyPos = enemy.position || (enemy.mesh ? enemy.mesh.position : new THREE.Vector3())
          const splashDist = proj.position.distanceTo(enemyPos)
          if (splashDist <= splashRadius) {
            const splashDamage = damage * (1 - splashDist / splashRadius) * 0.5
            if (enemy.damage) {
              enemy.damage(splashDamage)
            } else {
              enemy.health -= splashDamage
              if (enemy.health <= 0) {
                enemy.isDead = true
              }
            }
          }
        })
      }
      
      proj.shouldRemove = true
      
      // Hit effect (reduced particles for performance)
      this.createHitEffect(proj.position, splashRadius > 0)
      
      // Clean up trail effect
      if (proj.trailEffect && proj.trailEffect.destroy) {
        proj.trailEffect.destroy()
      }
      return
    }
    
    // Move projectile
    direction.normalize()
    const speed = proj.speed || 30
    const moveDistance = speed * deltaTime
    proj.position.add(direction.multiplyScalar(moveDistance))
    if (proj.mesh) {
      proj.mesh.position.copy(proj.position)
    }

    // Remove if too far
    if (proj.position.length() > 200) {
      proj.shouldRemove = true
      if (proj.trailEffect && proj.trailEffect.destroy) {
        proj.trailEffect.destroy()
      }
    }
  }

  fireProjectile(from, target, damage, attackType = 'gattling', splashRadius = 0) {
    // Play appropriate sound based on attack type with 3D spatial audio
    if (attackType === 'missile') {
      SoundManager.play3D('missile.ogg', from)
    } else if (attackType === 'laser') {
      SoundManager.play3D('laser.ogg', from)
    } else if (attackType === 'sniper') {
      SoundManager.play3D('sniper.ogg', from)
    } else if (attackType === 'frost') {
      SoundManager.play3D('frost.ogg', from)
    } else if (attackType === 'fire') {
      SoundManager.play3D('fire.ogg', from)
    } else if (attackType === 'tesla') {
      SoundManager.play3D('tesla.ogg', from)
    } else {
      SoundManager.play3D('gattling.ogg', from)
    }
    
    // Larger projectile for missiles
    const projSize = attackType === 'missile' ? 0.5 : 0.3
    const projGeometry = new THREE.SphereGeometry(projSize, 8, 8)
    const projMaterial = new THREE.MeshBasicMaterial({
      color: attackType === 'frost' ? 0x88ddff : attackType === 'missile' ? 0xff6600 : 0xff0000,
      transparent: true,
      opacity: 0.9
    })
    const projMesh = new THREE.Mesh(projGeometry, projMaterial)
    projMesh.position.copy(from)
    projMesh.position.y += 2
    this.scene.add(projMesh)

    // Create muzzle flash
    if (this.visualEffects) {
      const targetPos = target.position || (target.mesh ? target.mesh.position : new THREE.Vector3())
      const direction = new THREE.Vector3().subVectors(targetPos, from).normalize()
      this.visualEffects.createMuzzleFlash(from.clone().add(new THREE.Vector3(0, 2, 0)), direction, {
        color: attackType === 'frost' ? 0x88ddff : 0xff6600,
        size: 0.8,
        duration: 100
      })
    }

    // Trail effect using visual effects system
    let trailEffect = null
    if (this.visualEffects) {
      trailEffect = this.visualEffects.createProjectileTrail(projMesh, {
        color: attackType === 'frost' ? 0x88ddff : 0xff3333,
        length: 8
      })
    } else {
      // Fallback trail
      const trailGeometry = new THREE.SphereGeometry(0.15, 6, 6)
      const trailMaterial = new THREE.MeshBasicMaterial({
        color: 0xff3333,
        transparent: true,
        opacity: 0.5
      })
      const trail = new THREE.Mesh(trailGeometry, trailMaterial)
      trail.position.copy(projMesh.position)
      this.scene.add(trail)
      setTimeout(() => this.scene.remove(trail), 300)
    }

    const projectile = {
      mesh: projMesh,
      position: projMesh.position.clone(),
      target,
      damage,
      attackType,
      splashRadius,
      speed: attackType === 'missile' ? 20 : 30, // Slower missiles
      shouldRemove: false,
      trailEffect
    }

    this.projectiles.push(projectile)
  }

  createHitEffect(position, isSplash = false) {
    // Use visual effects system for explosion (reduced particles for performance)
    if (this.visualEffects) {
      // Main explosion
      this.visualEffects.createExplosion(position, {
        numParticles: isSplash ? 40 : 15, // More particles for splash
        color: isSplash ? 0xff4400 : 0xff6600,
        maxDist: isSplash ? 12 : 6,
        duration: 300
      })

      // Add shockwave for splash damage
      if (isSplash) {
        this.visualEffects.createShockwave(position, {
          maxRadius: 15,
          color: 0xff6600,
          duration: 600
        })

        // Screen shake for big explosions
        const distanceToCamera = position.distanceTo(this.camera.position)
        if (distanceToCamera < 50) {
          const intensity = Math.max(0.5, 2.0 - distanceToCamera / 25)
          this.visualEffects.triggerScreenShake(intensity, 200)
        }
      }

      // Impact sparks
      const impactDirection = new THREE.Vector3(0, -1, 0)
      this.visualEffects.createImpactSparks(position, impactDirection, {
        count: isSplash ? 30 : 15,
        color: 0xffaa00,
        speed: isSplash ? 20 : 15
      })

      // Play explosion sound with 3D spatial audio (rate limited)
      SoundManager.play3D('explosion.ogg', position)
    } else {
      // Fallback: simple explosion effect
      const explosionGeometry = new THREE.SphereGeometry(1, 8, 8)
      const explosionMaterial = new THREE.MeshBasicMaterial({
        color: isSplash ? 0xff4400 : 0xff6600,
        transparent: true,
        opacity: 0.8
      })
      const explosion = new THREE.Mesh(explosionGeometry, explosionMaterial)
      explosion.position.copy(position)
      this.scene.add(explosion)

      // Animate explosion
      let scale = 0
      const animate = () => {
        scale += 0.1
        explosion.scale.setScalar(scale)
        explosionMaterial.opacity = 0.8 - scale * 0.4
        
        if (scale < 2) {
          requestAnimationFrame(animate)
        } else {
          this.scene.remove(explosion)
          explosionGeometry.dispose()
          explosionMaterial.dispose()
        }
      }
      animate()
    }
  }
  
  // Create laser effect for laser towers
  createLaserEffect(source, target, duration = 500) {
    if (this.visualEffects) {
      this.visualEffects.createLightning(source, target, {
        color: 0x00aaff,
        duration,
        segments: 15,
        displacement: 2
      })
      // Laser sound already played in fireProjectile
    }
  }
  
  // Create frost effect for frost towers
  createFrostEffect(position, radius) {
    if (this.visualEffects) {
      this.visualEffects.createFrostEffect(position, radius, {
        color: 0x88ddff,
        duration: 800
      })
    }
  }

  setupEventListeners() {
    this.renderer.domElement.addEventListener('click', (e) => this.onClick(e))
    this.renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e))
    window.addEventListener('resize', () => this.onResize())
    window.addEventListener('keydown', (e) => this.onKeyDown(e))
  }

  onClick(event) {
    if (this.gameOver) return

    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

    this.raycaster.setFromCamera(this.mouse, this.camera)
    
    const intersects = this.raycaster.intersectObject(this.ground)
    
    if (intersects.length > 0) {
      const point = intersects[0].point
      point.y = 0
      
      if (this.selectedStructureType) {
        this.placeStructure(this.selectedStructureType, point)
      } else {
        // Legacy: place basic tower if nothing selected
        this.placeTower(point)
      }
    }
  }
  
  onMouseMove(event) {
    if (!this.selectedStructureType) return
    
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1
    
    this.raycaster.setFromCamera(this.mouse, this.camera)
    const intersects = this.raycaster.intersectObject(this.ground)
    
    if (intersects.length > 0) {
      const point = intersects[0].point
      point.y = 0
      this.updateGhostPreview(point)
    }
  }
  
  onKeyDown(event) {
    if (event.code === 'Space' && !this.gameOver) {
      this.startWave()
    } else if (event.key === 'Escape') {
      this.cancelPlacement()
    } else if (event.key === 'r' || event.key === 'R') {
      this.placementRotation = (this.placementRotation + Math.PI / 4) % (Math.PI * 2)
      if (this.ghostPreview) {
        this.ghostPreview.rotation.y = this.placementRotation
      }
    }
  }
  
  selectStructureType(structureId) {
    // Map build bar IDs to structure types
    const mapping = {
      // Towers
      'gattling': { type: 'tower', towerType: 'gattling' },
      'missile': { type: 'tower', towerType: 'missile' },
      'laser': { type: 'tower', towerType: 'laser' },
      'sniper': { type: 'tower', towerType: 'sniper' },
      'frost': { type: 'tower', towerType: 'frost' },
      'fire': { type: 'tower', towerType: 'fire' },
      'tesla': { type: 'tower', towerType: 'tesla' },
      // Legacy
      'basic_tower': { type: 'tower', towerType: 'gattling' },
      'cannon': { type: 'tower', towerType: 'missile' },
      // Walls
      'wall': { type: 'wall', wallType: 'maze' },
      'blocking_wall': { type: 'wall', wallType: 'blocking' },
      // Spawner
      'spawner': { type: 'spawner', spawnerType: 'barracks' }
    }
    
    const config = mapping[structureId]
    if (config) {
      this.selectedStructureType = config
      this.placementRotation = 0
      console.log('Selected structure:', structureId, config)
    } else {
      this.selectedStructureType = null
      console.log('Cancelled placement')
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
    if (!this.selectedStructureType) {
      if (this.ghostPreview) {
        this.scene.remove(this.ghostPreview)
        this.ghostPreview = null
      }
      return
    }
    
    const isValid = this.isValidPlacement(position)
    
    if (!this.ghostPreview) {
      // Create ghost preview
      const modelKey = this.getModelKeyForStructure()
      if (!modelKey) return
      
      const instance = modelLoader.createInstance(modelKey)
      if (!instance) return
      
      this.ghostPreview = instance
      this.ghostPreview.traverse((child) => {
        if (child.isMesh && child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material]
          materials.forEach(mat => {
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
    
    // Update color based on validity
    this.ghostPreview.traverse((child) => {
      if (child.isMesh && child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material]
        materials.forEach(mat => {
          mat.emissive = new THREE.Color(isValid ? 0x00ff00 : 0xff0000)
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
    // Check if on path
    if (this.isOnPath(position)) return false
    
    // Check if too close to other structures
    for (const structure of this.structures) {
      if (structure.position.distanceTo(position) < 3) {
        return false
      }
    }
    
    // Check if too close to base
    if (position.distanceTo(new THREE.Vector3(0, 0, 0)) < 8) {
      return false
    }
    
    return true
  }
  
  isOnPath(position) {
    if (!this.enemyPath) return false
    
    for (let i = 0; i < this.enemyPath.length - 1; i++) {
      const start = this.enemyPath[i]
      const end = this.enemyPath[i + 1]
      const distToLine = this.distanceToLineSegment(position, start, end)
      if (distToLine < 4) return true
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
    if (this.gold < cost) return false
    if (!this.isValidPlacement(position)) return false
    
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

      // Create build effect
      if (this.visualEffects && structure.mesh && structure.mesh.position) {
        this.visualEffects.createBuildEffect(structure.mesh.position, {
          particleCount: structureConfig.type === 'tower' ? 30 : 20,
          glowColor: structureConfig.type === 'tower' ? 0x44ff44 : 0x4444ff
        })
        SoundManager.play3D('build.ogg', structure.mesh.position, { volume: 0.5 })
      }

      if (structureConfig.type === 'tower') {
        this.towers.push(structure)
      } else if (structureConfig.type === 'wall') {
        this.walls.push(structure)
      } else if (structureConfig.type === 'spawner') {
        this.spawners.push(structure)
      }
      
      // Update spatial grid
      this.spatialGrid.insert(structure)
      
      // Update arena grid for pathfinding (walls block path)
      if (structureConfig.type === 'wall' || structureConfig.type === 'tower') {
        const gridCoord = this.arena.worldToGrid(position)
        if (gridCoord) {
          this.arena.placeStructure(gridCoord, structure)
          
          // Recompute paths for all enemies (walls change pathfinding)
          if (structureConfig.type === 'wall') {
            this.enemies.forEach(enemy => {
              if (!enemy.isDead && !enemy.finished) {
                const currentGrid = this.arena.worldToGrid(enemy.position || enemy.mesh.position)
                if (currentGrid) {
                  const newPath = this.arena.findPath(currentGrid, this.arena.destination)
                  if (newPath && newPath.length > 0) {
                    const worldPath = this.arena.getWorldPath(newPath)
                    enemy.setPath(worldPath)
                  }
                }
              }
            })
          }
        }
      }
      
      // Deduct gold
      this.gold -= cost
      if (this.callbacks.onGoldChange) {
        this.callbacks.onGoldChange(this.gold)
      }
      
      // Clear selection
      this.cancelPlacement()
      
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
      return structureConfig.wallType === 'maze' ? 50 : 100
    } else if (structureConfig.type === 'spawner') {
      return 250
    }
    return 100
  }
  
  updateStructures(deltaTime) {
    const currentTime = Date.now() / 1000
    
    // Update towers
    this.towers.forEach(tower => {
      if (tower instanceof Tower) {
        // Find target and aim
        const target = tower.findTarget(this.enemies)
        if (target) {
          tower.aimAtTarget()
          
          // Fire if ready
          if (tower.canFire(currentTime)) {
            const attackType = tower.attackType || 'gattling'
            const splashRadius = tower.splashRadius || 0
            this.fireProjectile(
              tower.position.clone(),
              target,
              tower.damage,
              attackType,
              splashRadius
            )
            tower.lastShot = currentTime
          }
        }
      } else {
        // Legacy tower support
        this.updateTower(tower, deltaTime)
      }
    })
    
    // Update spawners
    this.spawners.forEach(spawner => {
      if (spawner.canSpawn(currentTime)) {
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
  
  updateSpatialGrid() {
    // Update grid with current positions
    this.enemies.forEach(enemy => {
      if (enemy.position) {
        this.spatialGrid.update(enemy)
      }
    })
    
    this.defensiveUnits.forEach(unit => {
      if (unit.position) {
        this.spatialGrid.update(unit)
      }
    })
  }
  
  addGold(amount) {
    this.gold += Math.floor(amount * (this.passiveBuffs?.enemyGoldRewardBonus || 1))
    if (this.callbacks.onGoldChange) {
      this.callbacks.onGoldChange(this.gold)
    }
  }
  
  addXP(amount) {
    this.xp += amount
    if (this.callbacks.onXPChange) {
      this.callbacks.onXPChange(this.xp)
    }
  }
  
  // Expose addEnergy for WaveTimer (arrow function to preserve 'this')
  addEnergy(amount) {
    this.energy = Math.min(this.maxEnergy, this.energy + amount)
    if (this.callbacks.onEnergyChange) {
      this.callbacks.onEnergyChange(this.energy, this.maxEnergy)
    }
  }
  
  addAbilityCharge(amount) {
    // Store ability charge for hero abilities
    if (this.callbacks.onAbilityCharge) {
      this.callbacks.onAbilityCharge(amount)
    }
  }
  
  onProblemSolved(problemData) {
    const rewards = this.codingRewards.onProblemSolved(
      problemData.difficulty || 'medium',
      problemData.timeSpent || 0,
      problemData.testsPassedRatio || 1.0
    )
    
    // Increment problems solved counter
    this.problemsSolvedThisGame++
    
    // Increase passive energy generation (NO gold - coins only from problem rewards)
    // Each problem solved increases passive energy income
    this.passiveEnergyPerSecond += 0.05 // +0.05 energy/sec per problem
    
    // Update wave timer's passive generation
    if (this.waveTimer) {
      this.waveTimer.energyPerSecond = this.passiveEnergyPerSecond
      this.waveTimer.onProblemSolved(problemData.difficulty || 'medium')
    }
    
    // Add immediate energy reward from problem solving
    const energyReward = this.waveTimer?.energyPerProblem || 10
    const difficultyMultiplier = problemData.difficulty === 'hard' ? 2 : 
                                 problemData.difficulty === 'medium' ? 1.5 : 1
    this.addEnergy(Math.floor(energyReward * difficultyMultiplier))
    
    // Notify UI of passive rate change
    if (this.callbacks.onPassiveRateChange) {
      this.callbacks.onPassiveRateChange({
        goldPerSecond: 0, // No passive gold
        energyPerSecond: this.passiveEnergyPerSecond
      })
    }
    
    return {
      ...rewards,
      energy: Math.floor(energyReward * difficultyMultiplier),
      passiveEnergyIncrease: 0.05
    }
  }
  
  // Handle task completion
  onTaskCompleted(taskType = 'daily') {
    // Increment tasks completed counter
    this.tasksCompletedThisGame++
    
    // Increase passive energy generation (NO gold - coins only from coding problems)
    // Each task completed increases passive energy income
    const energyIncrease = taskType === 'weekly' ? 0.12 : 0.08
    
    this.passiveEnergyPerSecond += energyIncrease
    
    // Update wave timer's passive generation
    if (this.waveTimer) {
      this.waveTimer.energyPerSecond = this.passiveEnergyPerSecond
      this.waveTimer.onTaskCompleted(taskType)
    }
    
    // Add immediate energy reward
    const energyReward = this.waveTimer?.energyPerTask || 15
    const multiplier = taskType === 'weekly' ? 1.5 : 1
    this.addEnergy(Math.floor(energyReward * multiplier))
    
    // Notify UI of passive rate change
    if (this.callbacks.onPassiveRateChange) {
      this.callbacks.onPassiveRateChange({
        goldPerSecond: 0, // No passive gold
        energyPerSecond: this.passiveEnergyPerSecond
      })
    }
    
    return {
      timeBonus: this.waveTimer?.taskCompletedBonus || 10,
      energy: Math.floor(energyReward * multiplier),
      passiveEnergyIncrease: energyIncrease
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
  
  showLearningModule(problemCount) {
    if (this.callbacks.onShowLearningModule) {
      this.callbacks.onShowLearningModule(problemCount)
    }
  }
  
  showFloatingText(text, position, options = {}) {
    // Create floating text effect
    if (this.callbacks.onShowFloatingText) {
      this.callbacks.onShowFloatingText(text, position, options)
    }
  }


  onKeyDown(event) {
    if (event.code === 'Space' && !this.gameOver) {
      this.startWave()
    }
  }

  onResize() {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight)
    this.composer.setSize(this.container.clientWidth, this.container.clientHeight)
  }

  animate() {
    if (!this.container.parentElement) return

    requestAnimationFrame(() => this.animate())

    const deltaTime = this.clock.getDelta()
    this.update(deltaTime)

    if (this.composer) {
      this.composer.render()
    } else {
      this.renderer.render(this.scene, this.camera)
    }

    // Update UI callbacks
    if (this.callbacks.onHealthChange) {
      this.callbacks.onHealthChange(this.health, this.maxHealth)
    }
    if (this.callbacks.onWaveChange) {
      this.callbacks.onWaveChange(this.wave)
    }
  }

  endGame(won) {
    this.gameOver = true
    if (this.callbacks.onGameEnd) {
      this.callbacks.onGameEnd(won)
    }
  }

  destroy() {
    if (this.renderer) {
      this.container.removeChild(this.renderer.domElement)
      this.renderer.dispose()
    }
    if (this.composer) {
      this.composer.dispose()
    }
  }
}

