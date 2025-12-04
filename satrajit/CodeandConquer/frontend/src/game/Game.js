import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { Tower } from './Tower.js'
import { Enemy } from './Enemy.js'
import { ParticleSystem } from './ParticleSystem.js'

export class Game {
  constructor(container, callbacks = {}) {
    this.container = container
    this.callbacks = callbacks
    this.coins = callbacks.initialCoins || 500
    this.health = 1000
    this.wave = 0
    this.enemies = []
    this.towers = []
    this.projectiles = []
    this.isPaused = false
    this.gameOver = false

    this.initScene()
    this.initCamera()
    this.initRenderer()
    this.initLights()
    this.initControls()
    this.createEnvironment()
    this.initPostProcessing()
    
    this.particleSystem = new ParticleSystem(this.scene)
    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)

    this.setupEventListeners()
    this.clock = new THREE.Clock()
    this.animate()
  }

  initScene() {
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x1a0000)
    this.scene.fog = new THREE.FogExp2(0x1a0000, 0.01)
  }

  initCamera() {
    this.camera = new THREE.PerspectiveCamera(
      70,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1000
    )
    this.camera.position.set(0, 30, 35)
    this.camera.lookAt(0, 0, 0)
  }

  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      powerPreference: 'high-performance',
      alpha: true
    })
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.2
    this.container.appendChild(this.renderer.domElement)
  }

  initPostProcessing() {
    this.composer = new EffectComposer(this.renderer)
    
    const renderPass = new RenderPass(this.scene, this.camera)
    this.composer.addPass(renderPass)
    
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(this.container.clientWidth, this.container.clientHeight),
      1.5, // strength
      0.4, // radius
      0.85 // threshold
    )
    this.composer.addPass(bloomPass)
    
    const outputPass = new OutputPass()
    this.composer.addPass(outputPass)
  }

  initLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3)
    this.scene.add(ambientLight)
    
    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8)
    mainLight.position.set(0, 50, 30)
    mainLight.castShadow = true
    mainLight.shadow.camera.left = -50
    mainLight.shadow.camera.right = 50
    mainLight.shadow.camera.top = 50
    mainLight.shadow.camera.bottom = -50
    mainLight.shadow.mapSize.width = 2048
    mainLight.shadow.mapSize.height = 2048
    this.scene.add(mainLight)

    const pointLight1 = new THREE.PointLight(0xff0000, 3, 60)
    pointLight1.position.set(-25, 15, -25)
    pointLight1.castShadow = true
    this.scene.add(pointLight1)

    const pointLight2 = new THREE.PointLight(0xaa0000, 3, 60)
    pointLight2.position.set(25, 15, -25)
    pointLight2.castShadow = true
    this.scene.add(pointLight2)

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.4)
    rimLight.position.set(0, 20, -40)
    this.scene.add(rimLight)
  }

  initControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.05
    this.controls.minDistance = 15
    this.controls.maxDistance = 60
    this.controls.maxPolarAngle = Math.PI / 2.2
  }

  createEnvironment() {
    // Floor with reflective material
    const floorGeometry = new THREE.PlaneGeometry(100, 80)
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x111111,
      metalness: 0.95,
      roughness: 0.05,
      envMapIntensity: 1.0
    })
    const floor = new THREE.Mesh(floorGeometry, floorMaterial)
    floor.rotation.x = -Math.PI / 2
    floor.receiveShadow = true
    this.scene.add(floor)

    // Subtle grid
    const gridHelper = new THREE.GridHelper(100, 50, 0xffffff, 0x222222)
    gridHelper.material.opacity = 0.15
    gridHelper.material.transparent = true
    this.scene.add(gridHelper)

    // Base (player's base) - more detailed
    const baseGeometry = new THREE.CylinderGeometry(2.5, 3.5, 4, 16)
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xaa0000,
      emissiveIntensity: 1.2,
      metalness: 0.9,
      roughness: 0.1
    })
    this.base = new THREE.Mesh(baseGeometry, baseMaterial)
    this.base.position.set(0, 2, -30)
    this.base.castShadow = true
    this.scene.add(this.base)

    // Base crystal with glow
    const crystalGeometry = new THREE.OctahedronGeometry(1.5, 0)
    const crystalMaterial = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 2.0,
      transparent: true,
      opacity: 0.9,
      metalness: 0.8,
      roughness: 0.1
    })
    this.crystal = new THREE.Mesh(crystalGeometry, crystalMaterial)
    this.crystal.position.set(0, 5, -30)
    this.crystal.castShadow = true
    this.scene.add(this.crystal)

    // Add atmospheric particles
    this.createAtmosphere()
  }

  createAtmosphere() {
    const particleCount = 200
    const particles = new THREE.BufferGeometry()
    const positions = new Float32Array(particleCount * 3)

    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 100
      positions[i + 1] = Math.random() * 30
      positions[i + 2] = (Math.random() - 0.5) * 80
    }

    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    
    const particleMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.1,
      transparent: true,
      opacity: 0.3
    })

    const particleSystem = new THREE.Points(particles, particleMaterial)
    this.scene.add(particleSystem)
    this.atmosphereParticles = particleSystem
  }

  setupEventListeners() {
    this.container.addEventListener('click', (e) => this.handleClick(e))
    window.addEventListener('resize', () => this.handleResize())
    
    // Start wave on space
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !this.isPaused) {
        this.startWave()
      }
    })
  }

  handleClick(event) {
    if (this.gameOver || this.isPaused) return

    const rect = this.container.getBoundingClientRect()
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    this.raycaster.setFromCamera(this.mouse, this.camera)
    const intersectPoint = new THREE.Vector3()
    this.raycaster.ray.intersectPlane(this.groundPlane, intersectPoint)

    // Place tower if enough coins
    if (this.coins >= 100) {
      this.placeTower(intersectPoint)
    }
  }

  placeTower(position) {
    // Check if position is valid (not too close to base or other towers)
    if (position.distanceTo(this.base.position) < 5) return

    for (let tower of this.towers) {
      if (tower.mesh.position.distanceTo(position) < 3) return
    }

    // Spend coins
    if (this.callbacks.onSpendCoins) {
      if (!this.callbacks.onSpendCoins(100)) return
    }
    this.coins -= 100

    // Create tower
    const tower = new Tower(this.scene, position)
    this.towers.push(tower)

    // Particle effect
    this.particleSystem.createExplosion(position.clone().add(new THREE.Vector3(0, 1, 0)), 20, 0x00ffff)
  }

  startWave() {
    this.wave++
    const enemyCount = 5 + this.wave * 2

    for (let i = 0; i < enemyCount; i++) {
      setTimeout(() => {
        const startPos = new THREE.Vector3(
          (Math.random() - 0.5) * 40,
          0.5,
          25
        )
        const enemy = new Enemy(this.scene, startPos, this.base.position.clone())
        this.enemies.push(enemy)
      }, i * 1000)
    }
  }

  update(deltaTime) {
    if (this.gameOver || this.isPaused) return

    this.controls.update()

    // Animate base crystal
    if (this.crystal) {
      this.crystal.rotation.y += deltaTime * 0.5
      this.crystal.rotation.x += deltaTime * 0.3
      this.crystal.position.y = 5 + Math.sin(Date.now() * 0.002) * 0.5
      this.crystal.scale.setScalar(1 + Math.sin(Date.now() * 0.003) * 0.1)
    }

    // Animate crystal rings
    if (this.crystalRings) {
      this.crystalRings.forEach((ring, i) => {
        ring.rotation.z += deltaTime * (0.5 + i * 0.3)
        ring.position.y = 4 + i + Math.sin(Date.now() * 0.001 + i) * 0.3
      })
    }

    // Animate atmosphere particles
    if (this.atmosphereParticles) {
      this.atmosphereParticles.rotation.y += deltaTime * 0.1
    }

    // Update towers
    this.towers.forEach(tower => {
      tower.update(deltaTime, this.enemies, this.scene, this.projectiles)
    })

    // Update enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i]
      enemy.update(deltaTime)

      if (enemy.reachedEnd) {
        this.health -= 50
        enemy.destroy()
        this.enemies.splice(i, 1)

        if (this.health <= 0) {
          this.endGame(false)
        }
      } else if (enemy.isDead) {
        this.coins += 25
        enemy.destroy()
        this.enemies.splice(i, 1)
      }
    }

    // Update projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i]
      proj.update(deltaTime)

      if (proj.shouldRemove) {
        proj.destroy()
        this.projectiles.splice(i, 1)
      }
    }

    // Update particle system
    this.particleSystem.update(deltaTime)
  }

  endGame(won) {
    this.gameOver = true
    if (this.callbacks.onGameEnd) {
      this.callbacks.onGameEnd(won)
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate())
    const deltaTime = Math.min(this.clock.getDelta(), 0.1)
    this.update(deltaTime)
    
    // Use composer for post-processing
    if (this.composer) {
      this.composer.render()
    } else {
      this.renderer.render(this.scene, this.camera)
    }
  }

  handleResize() {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight)
    if (this.composer) {
      this.composer.setSize(this.container.clientWidth, this.container.clientHeight)
    }
  }

  destroy() {
    // Cleanup
    this.towers.forEach(t => t.destroy())
    this.enemies.forEach(e => e.destroy())
    this.projectiles.forEach(p => p.destroy())
    this.renderer.dispose()
  }
}

