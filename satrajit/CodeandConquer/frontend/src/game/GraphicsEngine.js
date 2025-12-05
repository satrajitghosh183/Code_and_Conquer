// =============================================================================
// GRAPHICS ENGINE - Beautiful Sci-Fi Tower Defense Environment
// ENHANCED: Optimized rendering, instancing, LOD, and stunning visuals
// =============================================================================

import * as THREE from 'three'

export class GraphicsEngine {
  constructor(container, options = {}) {
    this.container = container
    this.options = {
      quality: options.quality || 'medium',
      enablePostProcessing: options.enablePostProcessing !== undefined ? options.enablePostProcessing : true,
      enableShadows: options.enableShadows !== undefined ? options.enableShadows : true,
      theme: options.theme || 'default',
      ...options
    }
    
    this.scene = null
    this.camera = null
    this.renderer = null
    this.lights = {}
    this.environmentObjects = []
    this.terrain = null
    this.animatedObjects = []
    this.instancedMeshes = new Map() // For instancing optimization
    this.textureLoader = new THREE.TextureLoader()
    this.loadedTextures = new Map()
    
    this.clock = new THREE.Clock()
    this.animationTime = 0
    this.composer = null
    this.skybox = null
  }

  initialize() {
    this.createScene()
    this.createCamera()
    this.createRenderer()
    this.createSkybox()
    this.createLights()
    this.createTerrain()
    this.createEnvironment()
    this.createAtmosphere()
    
    if (this.options.enablePostProcessing) {
      this.setupPostProcessing()
    }
    
    return {
      scene: this.scene,
      camera: this.camera,
      renderer: this.renderer,
      composer: this.composer
    }
  }
  
  createScene() {
    this.scene = new THREE.Scene()
    // Background will be replaced by skybox
    this.scene.background = new THREE.Color(0x050510)
    // Enhanced fog for depth perception
    this.scene.fog = new THREE.FogExp2(0x050520, 0.006)
  }
  
  createSkybox() {
    // Create stunning procedural space skybox
    const skyboxGeometry = new THREE.SphereGeometry(400, 32, 32)
    
    // Create star field texture programmatically
    const canvas = document.createElement('canvas')
    canvas.width = 2048
    canvas.height = 1024
    const ctx = canvas.getContext('2d')
    
    // Deep space gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
    gradient.addColorStop(0, '#000510')
    gradient.addColorStop(0.3, '#0a0a20')
    gradient.addColorStop(0.6, '#110820')
    gradient.addColorStop(1, '#150515')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    // Add stars
    for (let i = 0; i < 3000; i++) {
      const x = Math.random() * canvas.width
      const y = Math.random() * canvas.height
      const size = Math.random() * 2
      const brightness = Math.random()
      
      ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`
      ctx.beginPath()
      ctx.arc(x, y, size, 0, Math.PI * 2)
      ctx.fill()
      
      // Add some colored stars
      if (Math.random() > 0.95) {
        const hue = Math.random() * 60 + 180 // Blue/cyan range
        ctx.fillStyle = `hsla(${hue}, 100%, 70%, ${brightness * 0.5})`
        ctx.beginPath()
        ctx.arc(x, y, size * 1.5, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    
    // Add nebula clouds
    for (let i = 0; i < 8; i++) {
      const x = Math.random() * canvas.width
      const y = Math.random() * canvas.height
      const radius = 100 + Math.random() * 200
      
      const nebulaGradient = ctx.createRadialGradient(x, y, 0, x, y, radius)
      const hue = Math.random() * 60 + 200 // Purple/blue range
      nebulaGradient.addColorStop(0, `hsla(${hue}, 80%, 50%, 0.15)`)
      nebulaGradient.addColorStop(0.5, `hsla(${hue}, 70%, 40%, 0.08)`)
      nebulaGradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
      
      ctx.fillStyle = nebulaGradient
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2)
    }
    
    const texture = new THREE.CanvasTexture(canvas)
    texture.mapping = THREE.EquirectangularReflectionMapping
    
    const skyboxMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.BackSide,
      fog: false
    })
    
    this.skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterial)
    this.scene.add(this.skybox)
    this.environmentObjects.push(this.skybox)
  }
  
  createCamera() {
    this.camera = new THREE.PerspectiveCamera(
      55,
      this.container.clientWidth / this.container.clientHeight,
      1,
      500
    )
    this.camera.position.set(0, 55, 70)
    this.camera.lookAt(0, 0, 5)
  }
  
  createRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
      logarithmicDepthBuffer: false
    })
    
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    
    // Enhanced tone mapping for sci-fi look
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.3
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    
    // Enable shadows if quality allows
    if (this.options.enableShadows) {
      this.renderer.shadowMap.enabled = true
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    }
    
    this.container.appendChild(this.renderer.domElement)
  }

  setupPostProcessing() {
    const { EffectComposer } = require('three/examples/jsm/postprocessing/EffectComposer.js')
    const { RenderPass } = require('three/examples/jsm/postprocessing/RenderPass.js')
    const { UnrealBloomPass } = require('three/examples/jsm/postprocessing/UnrealBloomPass.js')
    const { OutputPass } = require('three/examples/jsm/postprocessing/OutputPass.js')
    const { ShaderPass } = require('three/examples/jsm/postprocessing/ShaderPass.js')
    const { FXAAShader } = require('three/examples/jsm/shaders/FXAAShader.js')
    
    this.composer = new EffectComposer(this.renderer)
    
    // Render pass
    const renderPass = new RenderPass(this.scene, this.camera)
    this.composer.addPass(renderPass)
    
    // Bloom for glowing effects
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(this.container.clientWidth, this.container.clientHeight),
      1.5, // strength
      0.4, // radius
      0.85 // threshold
    )
    this.composer.addPass(bloomPass)
    
    // FXAA for anti-aliasing
    const fxaaPass = new ShaderPass(FXAAShader)
    const pixelRatio = this.renderer.getPixelRatio()
    fxaaPass.uniforms['resolution'].value.set(
      1 / (this.container.clientWidth * pixelRatio),
      1 / (this.container.clientHeight * pixelRatio)
    )
    this.composer.addPass(fxaaPass)
    
    // Output pass
    const outputPass = new OutputPass()
    this.composer.addPass(outputPass)
  }

  createLights() {
    // Ambient - cool blue tint
    this.lights.ambient = new THREE.AmbientLight(0x334466, 0.5)
    this.scene.add(this.lights.ambient)
    
    // Main sun - warm white with shadows
    this.lights.sun = new THREE.DirectionalLight(0xffeedd, 1.0)
    this.lights.sun.position.set(50, 80, 30)
    this.lights.sun.castShadow = this.options.enableShadows
    if (this.lights.sun.castShadow) {
      this.lights.sun.shadow.mapSize.width = 2048
      this.lights.sun.shadow.mapSize.height = 2048
      this.lights.sun.shadow.camera.left = -60
      this.lights.sun.shadow.camera.right = 60
      this.lights.sun.shadow.camera.top = 60
      this.lights.sun.shadow.camera.bottom = -60
      this.lights.sun.shadow.camera.near = 0.5
      this.lights.sun.shadow.camera.far = 200
      this.lights.sun.shadow.bias = -0.0001
      this.lights.sun.shadow.normalBias = 0.02
    }
    this.scene.add(this.lights.sun)
    
    // Fill light - cool with subtle shadows
    this.lights.fill = new THREE.DirectionalLight(0x4466aa, 0.4)
    this.lights.fill.position.set(-30, 40, -20)
    this.lights.fill.castShadow = this.options.enableShadows
    if (this.lights.fill.castShadow) {
      this.lights.fill.shadow.mapSize.width = 1024
      this.lights.fill.shadow.mapSize.height = 1024
      this.lights.fill.shadow.camera.left = -40
      this.lights.fill.shadow.camera.right = 40
      this.lights.fill.shadow.camera.top = 40
      this.lights.fill.shadow.camera.bottom = -40
    }
    this.scene.add(this.lights.fill)
    
    // Base glow - pulsing red/orange
    this.lights.baseGlow = new THREE.PointLight(0xff4400, 6, 70)
    this.lights.baseGlow.position.set(0, 15, -25)
    this.lights.baseGlow.castShadow = false // Performance optimization
    this.scene.add(this.lights.baseGlow)
    
    // Secondary base glow
    this.lights.baseGlow2 = new THREE.PointLight(0xff2200, 3, 45)
    this.lights.baseGlow2.position.set(0, 5, -25)
    this.scene.add(this.lights.baseGlow2)
    
    // Spawn portal glow - green
    this.lights.spawnGlow = new THREE.PointLight(0x00ff44, 5, 50)
    this.lights.spawnGlow.position.set(0, 8, 45)
    this.scene.add(this.lights.spawnGlow)
    
    // Path accent lights
    const pathLightPositions = [
      { x: 18, z: 25, color: 0x4488ff, intensity: 2.5 },
      { x: -12, z: 0, color: 0x4488ff, intensity: 2.5 },
      { x: 8, z: -10, color: 0xff4444, intensity: 2.5 }
    ]
    
    pathLightPositions.forEach((pos, i) => {
      const light = new THREE.PointLight(pos.color, pos.intensity, 30)
      light.position.set(pos.x, 4, pos.z)
      this.scene.add(light)
      this.lights[`path${i}`] = light
    })
    
    // Add hemisphere light for better ambient lighting
    this.lights.hemisphere = new THREE.HemisphereLight(0x4466ff, 0x221133, 0.3)
    this.scene.add(this.lights.hemisphere)
  }

  createTerrain() {
    // Main ground - hexagonal pattern with procedural textures
    const groundGeometry = new THREE.PlaneGeometry(180, 150, 80, 65)
    
    // Add more varied height variation
    const positions = groundGeometry.attributes.position
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i)
      const y = positions.getY(i)
      
      // Multiple octaves of noise for realistic terrain
      const noise1 = Math.sin(x * 0.08) * Math.cos(y * 0.08) * 0.4
      const noise2 = Math.sin(x * 0.2) * Math.cos(y * 0.2) * 0.15
      const noise3 = Math.sin(x * 0.4) * Math.cos(y * 0.4) * 0.08
      
      positions.setZ(i, noise1 + noise2 + noise3)
    }
    groundGeometry.computeVertexNormals()
    
    // Enhanced material with better visuals
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      metalness: 0.4,
      roughness: 0.85,
      flatShading: false,
      envMapIntensity: 0.5
    })
    
    // Try to load texture if available
    try {
      const metalTexture = this.textureLoader.load('/images/textures/metal.jpg', (texture) => {
        texture.wrapS = THREE.RepeatWrapping
        texture.wrapT = THREE.RepeatWrapping
        texture.repeat.set(20, 15)
        groundMaterial.map = texture
        groundMaterial.needsUpdate = true
      })
    } catch (e) {
      console.log('Texture not available, using procedural material')
    }
    
    this.terrain = new THREE.Mesh(groundGeometry, groundMaterial)
    this.terrain.rotation.x = -Math.PI / 2
    this.terrain.position.y = -0.5
    this.terrain.receiveShadow = this.options.enableShadows
    this.scene.add(this.terrain)
    this.environmentObjects.push(this.terrain)
    
    // Glowing grid lines
    this.createGlowingGrid()
    
    // Hex platform areas
    this.createHexPlatforms()
    
    // Add volumetric fog planes for depth
    this.createVolumetricFog()
  }
  
  createVolumetricFog() {
    // Add floating fog planes for atmospheric depth
    for (let i = 0; i < 3; i++) {
      const fogGeometry = new THREE.PlaneGeometry(200, 180)
      const fogMaterial = new THREE.MeshBasicMaterial({
        color: 0x0a0a20,
        transparent: true,
        opacity: 0.05 + i * 0.03,
        side: THREE.DoubleSide,
        depthWrite: false
      })
      
      const fogPlane = new THREE.Mesh(fogGeometry, fogMaterial)
      fogPlane.rotation.x = -Math.PI / 2
      fogPlane.position.y = 10 + i * 15
      this.scene.add(fogPlane)
      this.environmentObjects.push(fogPlane)
    }
  }
  
  createGlowingGrid() {
    // Main grid
    const gridSize = 100
    const divisions = 20
    const gridColor1 = 0x1a3a5a
    const gridColor2 = 0x0a1a2a
    
    const gridHelper = new THREE.GridHelper(gridSize, divisions, gridColor1, gridColor2)
    gridHelper.position.y = 0.02
    gridHelper.material.transparent = true
    gridHelper.material.opacity = 0.4
    this.scene.add(gridHelper)
    
    // Accent grid - larger squares
    const accentGrid = new THREE.GridHelper(100, 5, 0x2244aa, 0x112244)
    accentGrid.position.y = 0.03
    accentGrid.material.transparent = true
    accentGrid.material.opacity = 0.3
    this.scene.add(accentGrid)
  }
  
  createHexPlatforms() {
    // Create hex platform at key locations
    const hexLocations = [
      { x: 0, z: -25, scale: 2, color: 0xff2200, emissive: 0xff4400 }, // Base
      { x: 0, z: 45, scale: 1.5, color: 0x00aa44, emissive: 0x00ff44 }, // Spawn
      { x: 18, z: 25, scale: 0.8, color: 0x224488, emissive: 0x4466aa }, // Path
      { x: -12, z: 0, scale: 0.8, color: 0x224488, emissive: 0x4466aa },
      { x: 8, z: -12, scale: 0.8, color: 0x442244, emissive: 0x664466 }
    ]
    
    hexLocations.forEach(loc => {
      const hex = this.createHexPlatform(loc.scale, loc.color, loc.emissive)
      hex.position.set(loc.x, 0.05, loc.z)
      this.scene.add(hex)
      this.environmentObjects.push(hex)
    })
  }
  
  createHexPlatform(scale, color, emissive) {
    const group = new THREE.Group()
    
    // Hex shape
    const hexShape = new THREE.Shape()
    const size = 8 * scale
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 - Math.PI / 2
      const x = Math.cos(angle) * size
      const y = Math.sin(angle) * size
      if (i === 0) hexShape.moveTo(x, y)
      else hexShape.lineTo(x, y)
    }
    hexShape.closePath()
    
    // Outer glow ring
    const ringGeom = new THREE.RingGeometry(size * 0.95, size * 1.05, 6)
    const ringMat = new THREE.MeshBasicMaterial({
      color: emissive,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    })
    const ring = new THREE.Mesh(ringGeom, ringMat)
    ring.rotation.x = -Math.PI / 2
    ring.rotation.z = Math.PI / 6
    group.add(ring)
    
    // Inner platform
    const innerHexGeom = new THREE.CircleGeometry(size * 0.85, 6)
    const innerHexMat = new THREE.MeshStandardMaterial({
      color: color,
      metalness: 0.6,
      roughness: 0.3,
      transparent: true,
      opacity: 0.7
    })
    const innerHex = new THREE.Mesh(innerHexGeom, innerHexMat)
    innerHex.rotation.x = -Math.PI / 2
    innerHex.rotation.z = Math.PI / 6
    group.add(innerHex)
    
    // Center glow
    const centerGeom = new THREE.CircleGeometry(size * 0.3, 16)
    const centerMat = new THREE.MeshBasicMaterial({
      color: emissive,
      transparent: true,
      opacity: 0.8
    })
    const center = new THREE.Mesh(centerGeom, centerMat)
    center.rotation.x = -Math.PI / 2
    center.position.y = 0.02
    group.add(center)
    
    return group
  }

  createEnvironment() {
    // Create path visualization with energy lines
    this.createEnergyPath()
    
    // Spawn portal
    this.createSpawnPortal()
    
    // Floating particles
    this.createAmbientParticles()
    
    // Tower placement grid indicators
    this.createPlacementGrid()
  }
  
  createEnergyPath() {
    const pathPoints = [
      new THREE.Vector3(0, 0.2, 45),
      new THREE.Vector3(18, 0.2, 35),
      new THREE.Vector3(18, 0.2, 15),
      new THREE.Vector3(-12, 0.2, 8),
      new THREE.Vector3(-12, 0.2, -8),
      new THREE.Vector3(8, 0.2, -15),
      new THREE.Vector3(0, 0.2, -25)
    ]
    
    // Create curved path
    const curve = new THREE.CatmullRomCurve3(pathPoints, false, 'catmullrom', 0.3)
    const pathGeometry = new THREE.TubeGeometry(curve, 100, 0.5, 8, false)
    const pathMaterial = new THREE.MeshBasicMaterial({
      color: 0x2266ff,
      transparent: true,
      opacity: 0.4
    })
    const pathMesh = new THREE.Mesh(pathGeometry, pathMaterial)
    this.scene.add(pathMesh)
    
    // Outer glow tube
    const glowGeometry = new THREE.TubeGeometry(curve, 100, 1.2, 8, false)
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x1144aa,
      transparent: true,
      opacity: 0.15
    })
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial)
    this.scene.add(glowMesh)
    
    // Path edge lines
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(
      curve.getPoints(100)
    )
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.8
    })
    const pathLine = new THREE.Line(lineGeometry, lineMaterial)
    pathLine.position.y = 0.1
    this.scene.add(pathLine)
    
    // Waypoint markers
    pathPoints.forEach((point, index) => {
      const isStart = index === 0
      const isEnd = index === pathPoints.length - 1
      
      // Marker ring
      const ringGeom = new THREE.TorusGeometry(2, 0.2, 8, 24)
      const ringMat = new THREE.MeshBasicMaterial({
        color: isStart ? 0x00ff44 : isEnd ? 0xff4400 : 0x4488ff,
        transparent: true,
        opacity: 0.7
      })
      const ring = new THREE.Mesh(ringGeom, ringMat)
      ring.position.copy(point)
      ring.position.y = 0.3
      ring.rotation.x = Math.PI / 2
      this.scene.add(ring)
      this.animatedObjects.push({ mesh: ring, type: 'rotate' })
      
      // Vertical beam at waypoints
      if (!isStart && !isEnd) {
        const beamGeom = new THREE.CylinderGeometry(0.1, 0.1, 5, 8)
        const beamMat = new THREE.MeshBasicMaterial({
          color: 0x4488ff,
          transparent: true,
          opacity: 0.4
        })
        const beam = new THREE.Mesh(beamGeom, beamMat)
        beam.position.copy(point)
        beam.position.y = 2.5
        this.scene.add(beam)
      }
    })
  }
  
  createSpawnPortal() {
    const portalGroup = new THREE.Group()
    portalGroup.position.set(0, 0, 45)
    
    // Outer ring
    const outerRingGeom = new THREE.TorusGeometry(10, 0.5, 16, 48)
    const outerRingMat = new THREE.MeshStandardMaterial({
      color: 0x00ff44,
      emissive: 0x00ff44,
      emissiveIntensity: 0.5,
      metalness: 0.8,
      roughness: 0.2
    })
    const outerRing = new THREE.Mesh(outerRingGeom, outerRingMat)
    outerRing.rotation.x = Math.PI / 2
    outerRing.position.y = 5
    portalGroup.add(outerRing)
    this.animatedObjects.push({ mesh: outerRing, type: 'rotate_slow' })
    
    // Inner ring
    const innerRingGeom = new THREE.TorusGeometry(7, 0.3, 16, 48)
    const innerRingMat = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.7
    })
    const innerRing = new THREE.Mesh(innerRingGeom, innerRingMat)
    innerRing.rotation.x = Math.PI / 2
    innerRing.position.y = 5
    portalGroup.add(innerRing)
    this.animatedObjects.push({ mesh: innerRing, type: 'rotate_reverse' })
    
    // Portal surface
    const portalGeom = new THREE.CircleGeometry(6.5, 32)
    const portalMat = new THREE.MeshBasicMaterial({
      color: 0x00ff66,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    })
    const portal = new THREE.Mesh(portalGeom, portalMat)
    portal.rotation.x = Math.PI / 2
    portal.position.y = 5
    portalGroup.add(portal)
    this.animatedObjects.push({ mesh: portal, type: 'pulse' })
    
    // Vertical energy beams
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2
      const beamGeom = new THREE.CylinderGeometry(0.2, 0.2, 12, 8)
      const beamMat = new THREE.MeshBasicMaterial({
        color: 0x00ff44,
        transparent: true,
        opacity: 0.6
      })
      const beam = new THREE.Mesh(beamGeom, beamMat)
      beam.position.set(Math.cos(angle) * 9, 6, Math.sin(angle) * 9)
      portalGroup.add(beam)
    }
    
    this.scene.add(portalGroup)
    this.spawnPortal = portalGroup
  }
  
  createAmbientParticles() {
    const particleCount = 200
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(particleCount * 3)
    const colors = new Float32Array(particleCount * 3)
    
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 150
      positions[i * 3 + 1] = Math.random() * 30 + 2
      positions[i * 3 + 2] = (Math.random() - 0.5) * 120
      
      // Blue to cyan colors
      colors[i * 3] = 0.2 + Math.random() * 0.3
      colors[i * 3 + 1] = 0.4 + Math.random() * 0.4
      colors[i * 3 + 2] = 0.8 + Math.random() * 0.2
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    
    const material = new THREE.PointsMaterial({
      size: 0.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    })
    
    this.particles = new THREE.Points(geometry, material)
    this.scene.add(this.particles)
  }
  
  createPlacementGrid() {
    // Subtle placement indicator squares
    const gridPositions = []
    for (let x = -40; x <= 40; x += 8) {
      for (let z = -30; z <= 40; z += 8) {
        // Skip path area
        if (Math.abs(x) < 5 && z > 30) continue
        if (Math.abs(x - 18) < 5 && z > 10 && z < 40) continue
        if (Math.abs(x + 12) < 5 && z > -15 && z < 15) continue
        if (z < -20) continue
        
        gridPositions.push({ x, z })
      }
    }
    
    gridPositions.forEach(pos => {
      const squareGeom = new THREE.PlaneGeometry(6, 6)
      const squareMat = new THREE.MeshBasicMaterial({
        color: 0x224466,
        transparent: true,
        opacity: 0.1,
        side: THREE.DoubleSide
      })
      const square = new THREE.Mesh(squareGeom, squareMat)
      square.rotation.x = -Math.PI / 2
      square.position.set(pos.x, 0.04, pos.z)
      this.scene.add(square)
    })
  }

  createAtmosphere() {
    // Distant mountains/structures silhouettes
    const mountainGeom = new THREE.ConeGeometry(30, 60, 4)
    const mountainMat = new THREE.MeshBasicMaterial({
      color: 0x0a0a15,
      transparent: true,
      opacity: 0.8
    })
    
    const mountains = [
      { x: -80, z: -60, scale: 1 },
      { x: 80, z: -50, scale: 0.8 },
      { x: -60, z: 80, scale: 0.6 },
      { x: 70, z: 70, scale: 0.7 }
    ]
    
    mountains.forEach(m => {
      const mountain = new THREE.Mesh(mountainGeom.clone(), mountainMat.clone())
      mountain.position.set(m.x, 25 * m.scale, m.z)
      mountain.scale.setScalar(m.scale)
      this.scene.add(mountain)
    })
  }

  update(deltaTime) {
    this.animationTime += deltaTime
    
    // Animate skybox rotation for subtle motion
    if (this.skybox) {
      this.skybox.rotation.y += deltaTime * 0.005
    }
    
    // Animate lights with variation
    if (this.lights.baseGlow) {
      this.lights.baseGlow.intensity = 6 + Math.sin(this.animationTime * 2) * 2
    }
    if (this.lights.baseGlow2) {
      this.lights.baseGlow2.intensity = 3 + Math.sin(this.animationTime * 3) * 1.2
    }
    if (this.lights.spawnGlow) {
      this.lights.spawnGlow.intensity = 5 + Math.sin(this.animationTime * 2.5) * 1.5
    }
    
    // Pulse path lights
    Object.keys(this.lights).forEach(key => {
      if (key.startsWith('path')) {
        const light = this.lights[key]
        light.intensity = 2.5 + Math.sin(this.animationTime * 1.5 + parseInt(key.replace('path', ''))) * 0.8
      }
    })
    
    // Animate objects
    this.animatedObjects.forEach(obj => {
      switch (obj.type) {
        case 'rotate':
          obj.mesh.rotation.z += deltaTime * 0.6
          break
        case 'rotate_slow':
          obj.mesh.rotation.z += deltaTime * 0.25
          break
        case 'rotate_reverse':
          obj.mesh.rotation.z -= deltaTime * 0.35
          break
        case 'pulse':
          const scale = 1 + Math.sin(this.animationTime * 2) * 0.08
          obj.mesh.scale.setScalar(scale)
          break
        case 'float':
          obj.mesh.position.y = obj.baseY + Math.sin(this.animationTime * 1.5 + obj.offset) * 0.5
          break
      }
    })
    
    // Animate particles
    if (this.particles) {
      const positions = this.particles.geometry.attributes.position.array
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] += Math.sin(this.animationTime + i) * 0.025
      }
      this.particles.geometry.attributes.position.needsUpdate = true
      this.particles.rotation.y += deltaTime * 0.03
    }
  }
  
  render() {
    if (this.composer) {
      this.composer.render()
    } else {
      this.renderer.render(this.scene, this.camera)
    }
  }

  triggerDamageEffect(intensity = 0.5) {
    if (this.lights.ambient) {
      const original = this.lights.ambient.intensity
      const originalColor = this.lights.ambient.color.getHex()
      this.lights.ambient.intensity = 0.8
      this.lights.ambient.color.setHex(0xff2222)
      setTimeout(() => {
        this.lights.ambient.intensity = original
        this.lights.ambient.color.setHex(originalColor)
      }, 150)
    }
  }
  
  handleResize() {
    const width = this.container.clientWidth
    const height = this.container.clientHeight
    
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
    
    if (this.composer) {
      this.composer.setSize(width, height)
      
      // Update FXAA resolution
      const fxaaPass = this.composer.passes.find(pass => pass.uniforms && pass.uniforms['resolution'])
      if (fxaaPass) {
        const pixelRatio = this.renderer.getPixelRatio()
        fxaaPass.uniforms['resolution'].value.set(
          1 / (width * pixelRatio),
          1 / (height * pixelRatio)
        )
      }
    }
  }
  
  dispose() {
    this.environmentObjects.forEach(obj => {
      this.scene.remove(obj)
      if (obj.geometry) obj.geometry.dispose()
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose())
        } else {
          obj.material.dispose()
        }
      }
    })
    
    if (this.particles) {
      this.scene.remove(this.particles)
      this.particles.geometry.dispose()
      this.particles.material.dispose()
    }
    
    if (this.renderer) {
      this.renderer.dispose()
    }
  }
}

export default GraphicsEngine
