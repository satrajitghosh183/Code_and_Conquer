import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'

export class Game {
  constructor(container, options = {}) {
    this.container = container
    this.playerId = options.playerId
    this.playerIndex = options.playerIndex || 0
    this.matchId = options.matchId
    this.socket = options.socket
    this.onTowerPlace = options.onTowerPlace
    this.onWaveSpawn = options.onWaveSpawn
    this.gameState = options.gameState || {}

    this.towers = []
    this.enemies = []
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
    // Position camera based on player side
    if (this.playerIndex === 0) {
      this.camera.position.set(0, 30, 35)
    } else {
      this.camera.position.set(0, 30, -35)
    }
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
      1.5,
      0.4,
      0.85
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
    // Floor
    const floorGeometry = new THREE.PlaneGeometry(100, 80)
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a0505,
      metalness: 0.3,
      roughness: 0.8
    })
    const floor = new THREE.Mesh(floorGeometry, floorMaterial)
    floor.rotation.x = -Math.PI / 2
    floor.receiveShadow = true
    this.scene.add(floor)

    // Grid
    const gridHelper = new THREE.GridHelper(100, 50, 0x550000, 0x330000)
    gridHelper.material.opacity = 0.4
    gridHelper.material.transparent = true
    this.scene.add(gridHelper)

    // Player 1 base (left side, z = -30)
    const base1Geometry = new THREE.CylinderGeometry(2.5, 3.5, 4, 16)
    const base1Material = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xaa0000,
      emissiveIntensity: 1.2,
      metalness: 0.9,
      roughness: 0.1
    })
    this.base1 = new THREE.Mesh(base1Geometry, base1Material)
    this.base1.position.set(0, 2, -30)
    this.base1.castShadow = true
    this.scene.add(this.base1)

    // Player 2 base (right side, z = 30)
    const base2Geometry = new THREE.CylinderGeometry(2.5, 3.5, 4, 16)
    const base2Material = new THREE.MeshStandardMaterial({
      color: 0xff6600,
      emissive: 0xaa4400,
      emissiveIntensity: 1.2,
      metalness: 0.9,
      roughness: 0.1
    })
    this.base2 = new THREE.Mesh(base2Geometry, base2Material)
    this.base2.position.set(0, 2, 30)
    this.base2.castShadow = true
    this.scene.add(this.base2)
  }

  setupEventListeners() {
    this.container.addEventListener('click', (e) => this.handleClick(e))
    window.addEventListener('resize', () => this.handleResize())
    
    // Spawn wave on space
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !this.isPaused) {
        const waveNumber = (this.gameState?.wave || 0) + 1
        this.onWaveSpawn?.(waveNumber)
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

    // Place tower
    if (this.onTowerPlace) {
      this.onTowerPlace(intersectPoint, 'basic')
    }
  }

  updateGameState(newGameState) {
    this.gameState = newGameState
    
    // Update base HP visual
    if (this.base1 && newGameState.player1) {
      const hpPercent = newGameState.player1.baseHp / 1000
      this.base1.material.emissiveIntensity = 1.2 * hpPercent
    }
    if (this.base2 && newGameState.player2) {
      const hpPercent = newGameState.player2.baseHp / 1000
      this.base2.material.emissiveIntensity = 1.2 * hpPercent
    }

    // Update towers
    if (newGameState.player1?.towers) {
      this.syncTowers(newGameState.player1.towers, 0)
    }
    if (newGameState.player2?.towers) {
      this.syncTowers(newGameState.player2.towers, 1)
    }

    // Update enemies
    if (newGameState.enemies) {
      this.syncEnemies(newGameState.enemies)
    }

    // Update projectiles
    if (newGameState.projectiles) {
      this.syncProjectiles(newGameState.projectiles)
    }
  }

  syncTowers(towerData, playerIndex) {
    // Remove old towers for this player
    this.towers = this.towers.filter(t => {
      if (t.playerIndex === playerIndex) {
        this.scene.remove(t.mesh)
        t.mesh.traverse(child => {
          if (child.geometry) child.geometry.dispose()
          if (child.material) child.material.dispose()
        })
        return false
      }
      return true
    })

    // Add new towers
    towerData.forEach(tower => {
      const towerMesh = this.createTowerMesh(tower.position, playerIndex)
      this.towers.push({ ...tower, mesh: towerMesh, playerIndex })
      this.scene.add(towerMesh)
    })
  }

  createTowerMesh(position, playerIndex) {
    const group = new THREE.Group()
    
    const baseGeo = new THREE.CylinderGeometry(1, 1.2, 0.3, 8)
    const baseMat = new THREE.MeshStandardMaterial({
      color: playerIndex === 0 ? 0xff0000 : 0xff6600,
      metalness: 0.9,
      roughness: 0.3
    })
    const base = new THREE.Mesh(baseGeo, baseMat)
    base.position.y = 0.15
    base.castShadow = true
    group.add(base)
    
    const bodyGeo = new THREE.CylinderGeometry(0.6, 0.8, 1.8, 8)
    const bodyMat = new THREE.MeshStandardMaterial({
      color: playerIndex === 0 ? 0xff0000 : 0xff6600,
      emissive: playerIndex === 0 ? 0xaa0000 : 0xaa4400,
      emissiveIntensity: 0.5,
      metalness: 0.8,
      roughness: 0.2
    })
    const body = new THREE.Mesh(bodyGeo, bodyMat)
    body.position.y = 1.2
    body.castShadow = true
    group.add(body)
    
    group.position.set(position.x, 0, position.z)
    return group
  }

  syncEnemies(enemyData) {
    // Remove old enemies
    this.enemies.forEach(enemy => {
      this.scene.remove(enemy.mesh)
      enemy.mesh.geometry.dispose()
      enemy.mesh.material.dispose()
    })
    this.enemies = []

    // Add new enemies
    enemyData.forEach(enemy => {
      const enemyMesh = this.createEnemyMesh(enemy.position, enemy.hp / enemy.maxHp)
      this.enemies.push({ ...enemy, mesh: enemyMesh })
      this.scene.add(enemyMesh)
    })
  }

  createEnemyMesh(position, hpPercent) {
    const bodyGeo = new THREE.BoxGeometry(1, 1, 1)
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 0.5
    })
    const mesh = new THREE.Mesh(bodyGeo, bodyMat)
    mesh.position.set(position.x, 0.5, position.z)
    mesh.castShadow = true
    return mesh
  }

  syncProjectiles(projectileData) {
    // Remove old projectiles
    this.projectiles.forEach(proj => {
      if (proj.mesh) {
        this.scene.remove(proj.mesh)
        proj.mesh.geometry.dispose()
        proj.mesh.material.dispose()
      }
    })
    this.projectiles = []

    // Add new projectiles
    projectileData.forEach(proj => {
      const projGeo = new THREE.SphereGeometry(0.2, 8, 8)
      const projMat = new THREE.MeshStandardMaterial({
        color: 0xffff00,
        emissive: 0xffff00,
        emissiveIntensity: 2
      })
      const projMesh = new THREE.Mesh(projGeo, projMat)
      projMesh.position.set(proj.position.x, proj.position.y, proj.position.z)
      this.projectiles.push({ ...proj, mesh: projMesh })
      this.scene.add(projMesh)
    })
  }

  update(deltaTime) {
    if (this.gameOver || this.isPaused) return

    this.controls.update()

    // Animate bases
    if (this.base1) {
      this.base1.rotation.y += deltaTime * 0.2
    }
    if (this.base2) {
      this.base2.rotation.y += deltaTime * 0.2
    }

    // Update projectiles (visual only, actual logic is server-side)
    this.projectiles.forEach(proj => {
      if (proj.mesh && proj.velocity) {
        proj.mesh.position.x += proj.velocity.x * deltaTime
        proj.mesh.position.z += proj.velocity.z * deltaTime
      }
    })
  }

  animate() {
    requestAnimationFrame(() => this.animate())
    const deltaTime = Math.min(this.clock.getDelta(), 0.1)
    this.update(deltaTime)
    
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
    this.towers.forEach(t => {
      if (t.mesh) {
        this.scene.remove(t.mesh)
        t.mesh.traverse(child => {
          if (child.geometry) child.geometry.dispose()
          if (child.material) child.material.dispose()
        })
      }
    })
    this.enemies.forEach(e => {
      if (e.mesh) {
        this.scene.remove(e.mesh)
        e.mesh.geometry.dispose()
        e.mesh.material.dispose()
      }
    })
    this.projectiles.forEach(p => {
      if (p.mesh) {
        this.scene.remove(p.mesh)
        p.mesh.geometry.dispose()
        p.mesh.material.dispose()
      }
    })
    if (this.renderer) {
      this.renderer.dispose()
    }
  }
}

