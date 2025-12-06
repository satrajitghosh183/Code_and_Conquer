// =============================================================================
// GRAPHICS ENGINE - Beautiful Sci-Fi Tower Defense Environment
// ENHANCED: Optimized rendering, instancing, LOD, and stunning visuals
// =============================================================================

import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js'

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
    // Create EPIC procedural space skybox - stunning cosmic vista
    const skyboxGeometry = new THREE.SphereGeometry(450, 64, 64)
    
    // Create high-res star field texture
    const canvas = document.createElement('canvas')
    canvas.width = 4096
    canvas.height = 2048
    const ctx = canvas.getContext('2d')
    
    // Deep space gradient - rich colors
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
    gradient.addColorStop(0, '#000208')
    gradient.addColorStop(0.2, '#050818')
    gradient.addColorStop(0.4, '#0a0520')
    gradient.addColorStop(0.6, '#080315')
    gradient.addColorStop(0.8, '#0d0420')
    gradient.addColorStop(1, '#020108')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    // Add distant galaxies first (before stars)
    for (let i = 0; i < 15; i++) {
      const x = Math.random() * canvas.width
      const y = Math.random() * canvas.height
      const radius = 40 + Math.random() * 80
      
      const galaxyGradient = ctx.createRadialGradient(x, y, 0, x, y, radius)
      const hue = Math.random() * 360
      galaxyGradient.addColorStop(0, `hsla(${hue}, 60%, 70%, 0.08)`)
      galaxyGradient.addColorStop(0.3, `hsla(${hue}, 50%, 50%, 0.04)`)
      galaxyGradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
      
      ctx.fillStyle = galaxyGradient
      ctx.beginPath()
      ctx.ellipse(x, y, radius * 1.5, radius * 0.6, Math.random() * Math.PI, 0, Math.PI * 2)
      ctx.fill()
    }
    
    // Add 5000+ stars with varied sizes and colors
    for (let i = 0; i < 6000; i++) {
      const x = Math.random() * canvas.width
      const y = Math.random() * canvas.height
      const size = Math.random() * 2.5
      const brightness = 0.3 + Math.random() * 0.7
      
      // White/blue stars
      ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`
      ctx.beginPath()
      ctx.arc(x, y, size, 0, Math.PI * 2)
      ctx.fill()
      
      // Star glow for brighter stars
      if (brightness > 0.7 && size > 1) {
        ctx.fillStyle = `rgba(180, 200, 255, ${brightness * 0.3})`
        ctx.beginPath()
        ctx.arc(x, y, size * 3, 0, Math.PI * 2)
        ctx.fill()
      }
      
      // Colored stars (5%)
      if (Math.random() > 0.95) {
        // Blue, cyan, orange, or red stars
        const colors = [
          { h: 210, s: 100, l: 75 }, // Blue
          { h: 185, s: 100, l: 70 }, // Cyan
          { h: 30, s: 100, l: 60 },  // Orange
          { h: 0, s: 100, l: 55 },   // Red
          { h: 280, s: 80, l: 65 },  // Purple
        ]
        const color = colors[Math.floor(Math.random() * colors.length)]
        ctx.fillStyle = `hsla(${color.h}, ${color.s}%, ${color.l}%, ${brightness})`
        ctx.beginPath()
        ctx.arc(x, y, size * 1.5, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    
    // Add dramatic nebula clouds
    const nebulaColors = [
      { h: 280, name: 'purple' },   // Purple nebula
      { h: 200, name: 'blue' },     // Blue nebula
      { h: 340, name: 'pink' },     // Pink nebula
      { h: 180, name: 'cyan' },     // Cyan nebula
      { h: 30, name: 'orange' },    // Orange/red nebula
    ]
    
    for (let i = 0; i < 12; i++) {
      const x = Math.random() * canvas.width
      const y = Math.random() * canvas.height
      const radius = 150 + Math.random() * 350
      const nebulaColor = nebulaColors[Math.floor(Math.random() * nebulaColors.length)]
      
      // Multi-layer nebula for depth
      for (let layer = 0; layer < 3; layer++) {
        const layerRadius = radius * (1 - layer * 0.2)
        const nebulaGradient = ctx.createRadialGradient(x, y, 0, x, y, layerRadius)
        const opacity = 0.12 - layer * 0.03
        
        nebulaGradient.addColorStop(0, `hsla(${nebulaColor.h}, 80%, 55%, ${opacity})`)
        nebulaGradient.addColorStop(0.4, `hsla(${nebulaColor.h + 20}, 70%, 45%, ${opacity * 0.7})`)
        nebulaGradient.addColorStop(0.7, `hsla(${nebulaColor.h - 10}, 60%, 35%, ${opacity * 0.3})`)
        nebulaGradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
        
        ctx.fillStyle = nebulaGradient
        ctx.fillRect(x - layerRadius, y - layerRadius, layerRadius * 2, layerRadius * 2)
      }
    }
    
    // Add some bright foreground stars with lens flare effect
    for (let i = 0; i < 30; i++) {
      const x = Math.random() * canvas.width
      const y = Math.random() * canvas.height
      
      // Star core
      const coreGradient = ctx.createRadialGradient(x, y, 0, x, y, 8)
      coreGradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
      coreGradient.addColorStop(0.3, 'rgba(200, 220, 255, 0.8)')
      coreGradient.addColorStop(1, 'rgba(100, 150, 255, 0)')
      ctx.fillStyle = coreGradient
      ctx.beginPath()
      ctx.arc(x, y, 8, 0, Math.PI * 2)
      ctx.fill()
      
      // Light rays
      ctx.strokeStyle = 'rgba(200, 220, 255, 0.3)'
      ctx.lineWidth = 1
      for (let r = 0; r < 4; r++) {
        const angle = r * Math.PI / 2 + Math.PI / 4
        ctx.beginPath()
        ctx.moveTo(x + Math.cos(angle) * 3, y + Math.sin(angle) * 3)
        ctx.lineTo(x + Math.cos(angle) * 20, y + Math.sin(angle) * 20)
        ctx.stroke()
      }
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
    
    // Add floating asteroids/debris for depth
    this.createSpaceDebris()
  }
  
  createSpaceDebris() {
    // Add floating asteroids and space debris
    const asteroidGeom = new THREE.IcosahedronGeometry(1, 0)
    const asteroidMat = new THREE.MeshStandardMaterial({
      color: 0x444455,
      metalness: 0.3,
      roughness: 0.9,
      emissive: 0x111122,
      emissiveIntensity: 0.1
    })
    
    for (let i = 0; i < 12; i++) {
      const asteroid = new THREE.Mesh(asteroidGeom.clone(), asteroidMat.clone())
      const angle = Math.random() * Math.PI * 2
      const distance = 100 + Math.random() * 150
      const height = -20 + Math.random() * 80
      
      asteroid.position.set(
        Math.cos(angle) * distance,
        height,
        Math.sin(angle) * distance
      )
      
      const scale = 0.5 + Math.random() * 2.5
      asteroid.scale.set(scale, scale * (0.7 + Math.random() * 0.6), scale)
      asteroid.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI)
      
      this.scene.add(asteroid)
      this.environmentObjects.push(asteroid)
      
      // Add subtle rotation animation
      this.animatedObjects.push({
        mesh: asteroid,
        type: 'asteroid',
        rotationSpeed: { x: Math.random() * 0.1, y: Math.random() * 0.1, z: Math.random() * 0.1 }
      })
    }
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
    
    // Enhanced tone mapping for sci-fi look - reduced exposure
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 0.9
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    
    // Enable shadows if quality allows
    if (this.options.enableShadows) {
      this.renderer.shadowMap.enabled = true
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    }
    
    this.container.appendChild(this.renderer.domElement)
  }

  setupPostProcessing() {
    this.composer = new EffectComposer(this.renderer)
    
    // Render pass
    const renderPass = new RenderPass(this.scene, this.camera)
    this.composer.addPass(renderPass)
    
    // Bloom for glowing effects - REDUCED for less brightness
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(this.container.clientWidth, this.container.clientHeight),
      0.8, // strength - reduced from 2.0
      0.4, // radius - reduced from 0.6
      0.5  // threshold - raised from 0.3 = fewer things glow
    )
    this.composer.addPass(bloomPass)
    this.bloomPass = bloomPass
    
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
    // Ambient - cool blue tint - reduced intensity
    this.lights.ambient = new THREE.AmbientLight(0x223344, 0.35)
    this.scene.add(this.lights.ambient)
    
    // Main sun - warm white with shadows - reduced intensity
    this.lights.sun = new THREE.DirectionalLight(0xffeedd, 0.7)
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
    
    // Fill light - cool with subtle shadows - reduced
    this.lights.fill = new THREE.DirectionalLight(0x334488, 0.25)
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
    
    // Base glow - pulsing red/orange - reduced
    this.lights.baseGlow = new THREE.PointLight(0xff4400, 2.5, 50)
    this.lights.baseGlow.position.set(0, 15, -25)
    this.lights.baseGlow.castShadow = false // Performance optimization
    this.scene.add(this.lights.baseGlow)
    
    // Secondary base glow - reduced
    this.lights.baseGlow2 = new THREE.PointLight(0xff2200, 1.5, 35)
    this.lights.baseGlow2.position.set(0, 5, -25)
    this.scene.add(this.lights.baseGlow2)
    
    // Spawn portal glow - reduced
    this.lights.spawnGlow = new THREE.PointLight(0x00ff44, 2, 40)
    this.lights.spawnGlow.position.set(0, 8, 45)
    this.scene.add(this.lights.spawnGlow)
    
    // Path accent lights - reduced
    const pathLightPositions = [
      { x: 18, z: 25, color: 0x4488ff, intensity: 1.2 },
      { x: -12, z: 0, color: 0x4488ff, intensity: 1.2 },
      { x: 8, z: -10, color: 0xff4444, intensity: 1.2 }
    ]
    
    pathLightPositions.forEach((pos, i) => {
      const light = new THREE.PointLight(pos.color, pos.intensity, 25)
      light.position.set(pos.x, 4, pos.z)
      this.scene.add(light)
      this.lights[`path${i}`] = light
    })
    
    // Add hemisphere light for better ambient lighting - reduced
    this.lights.hemisphere = new THREE.HemisphereLight(0x334466, 0x110822, 0.2)
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
    portalGroup.position.set(0, 0, 50)
    
    // Create a dramatic wormhole/hyperspace portal
    
    // Outer unstable energy ring
    const outerRingGeom = new THREE.TorusGeometry(12, 0.8, 24, 64)
    const outerRingMat = new THREE.MeshStandardMaterial({
      color: 0xff2266,
      emissive: 0xff0044,
      emissiveIntensity: 1.0,
      metalness: 0.9,
      roughness: 0.1
    })
    const outerRing = new THREE.Mesh(outerRingGeom, outerRingMat)
    outerRing.rotation.x = Math.PI / 2
    outerRing.position.y = 8
    portalGroup.add(outerRing)
    this.animatedObjects.push({ mesh: outerRing, type: 'rotate_slow' })
    
    // Middle energy ring
    const middleRingGeom = new THREE.TorusGeometry(9, 0.5, 16, 48)
    const middleRingMat = new THREE.MeshBasicMaterial({
      color: 0xff4488,
      transparent: true,
      opacity: 0.8
    })
    const middleRing = new THREE.Mesh(middleRingGeom, middleRingMat)
    middleRing.rotation.x = Math.PI / 2
    middleRing.position.y = 8
    portalGroup.add(middleRing)
    this.animatedObjects.push({ mesh: middleRing, type: 'rotate_reverse' })
    
    // Inner spinning ring
    const innerRingGeom = new THREE.TorusGeometry(6, 0.3, 12, 36)
    const innerRingMat = new THREE.MeshBasicMaterial({
      color: 0xff88cc,
      transparent: true,
      opacity: 0.9
    })
    const innerRing = new THREE.Mesh(innerRingGeom, innerRingMat)
    innerRing.rotation.x = Math.PI / 2
    innerRing.position.y = 8
    portalGroup.add(innerRing)
    this.animatedObjects.push({ mesh: innerRing, type: 'rotate' })
    
    // Portal vortex - multiple layers for depth
    for (let i = 0; i < 5; i++) {
      const vortexGeom = new THREE.CircleGeometry(5 - i * 0.8, 32)
      const vortexMat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0xff0066 : 0x8800ff,
        transparent: true,
        opacity: 0.3 - i * 0.05,
        side: THREE.DoubleSide
      })
      const vortex = new THREE.Mesh(vortexGeom, vortexMat)
      vortex.rotation.x = -Math.PI / 2
      vortex.position.y = 8 + i * 0.3
      portalGroup.add(vortex)
    }
    
    // Center black hole effect
    const coreGeom = new THREE.SphereGeometry(2, 24, 24)
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.9
    })
    const core = new THREE.Mesh(coreGeom, coreMat)
    core.position.y = 8
    portalGroup.add(core)
    
    // Event horizon glow
    const horizonGeom = new THREE.SphereGeometry(2.5, 24, 24)
    const horizonMat = new THREE.MeshBasicMaterial({
      color: 0xff0088,
      transparent: true,
      opacity: 0.4
    })
    const horizon = new THREE.Mesh(horizonGeom, horizonMat)
    horizon.position.y = 8
    portalGroup.add(horizon)
    this.animatedObjects.push({ mesh: horizon, type: 'pulse' })
    
    // Energy pillars around portal
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2
      
      // Main pillar
      const pillarGeom = new THREE.CylinderGeometry(0.3, 0.5, 16, 6)
      const pillarMat = new THREE.MeshStandardMaterial({
        color: 0x221133,
        metalness: 0.8,
        roughness: 0.2,
        emissive: 0xff0066,
        emissiveIntensity: 0.2
      })
      const pillar = new THREE.Mesh(pillarGeom, pillarMat)
      pillar.position.set(Math.cos(angle) * 14, 8, Math.sin(angle) * 14)
      portalGroup.add(pillar)
      
      // Energy orb on top
      const orbGeom = new THREE.OctahedronGeometry(0.8, 0)
      const orbMat = new THREE.MeshBasicMaterial({
        color: 0xff0088,
        transparent: true,
        opacity: 0.9
      })
      const orb = new THREE.Mesh(orbGeom, orbMat)
      orb.position.set(Math.cos(angle) * 14, 17, Math.sin(angle) * 14)
      portalGroup.add(orb)
      this.animatedObjects.push({ 
        mesh: orb, 
        type: 'float', 
        baseY: 17, 
        offset: i * 0.5,
        amplitude: 0.5
      })
    }
    
    // Dramatic portal light - reduced
    const portalLight = new THREE.PointLight(0xff0066, 3, 60)
    portalLight.position.y = 8
    portalGroup.add(portalLight)
    this.lights.portalGlow = portalLight
    
    // Secondary accent light - reduced
    const accentLight = new THREE.PointLight(0x8800ff, 1.5, 40)
    accentLight.position.y = 12
    portalGroup.add(accentLight)
    
    // Add particle ring around portal - reduced count
    const particleCount = 50
    const particleGeom = new THREE.BufferGeometry()
    const positions = new Float32Array(particleCount * 3)
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2
      const radius = 10 + Math.random() * 5
      positions[i * 3] = Math.cos(angle) * radius
      positions[i * 3 + 1] = 6 + Math.random() * 4
      positions[i * 3 + 2] = Math.sin(angle) * radius
    }
    
    particleGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    
    const particleMat = new THREE.PointsMaterial({
      color: 0xff4488,
      size: 0.5,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending
    })
    
    const portalParticles = new THREE.Points(particleGeom, particleMat)
    portalGroup.add(portalParticles)
    this.portalParticles = portalParticles
    
    this.scene.add(portalGroup)
    this.spawnPortal = portalGroup
  }
  
  createAmbientParticles() {
    // Reduced particle count for performance
    const particleCount = 80
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
      size: 0.35,
      vertexColors: true,
      transparent: true,
      opacity: 0.4,
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
      this.skybox.rotation.y += deltaTime * 0.003
    }
    
    // Animate lights with variation - reduced intensities
    if (this.lights.baseGlow) {
      this.lights.baseGlow.intensity = 2.5 + Math.sin(this.animationTime * 2) * 0.5
    }
    if (this.lights.baseGlow2) {
      this.lights.baseGlow2.intensity = 1.5 + Math.sin(this.animationTime * 3) * 0.3
    }
    if (this.lights.spawnGlow) {
      this.lights.spawnGlow.intensity = 2 + Math.sin(this.animationTime * 2.5) * 0.5
    }
    
    // Animate portal effects - reduced
    if (this.lights.portalGlow) {
      this.lights.portalGlow.intensity = 3 + Math.sin(this.animationTime * 3) * 0.8
    }
    
    // Rotate portal particles
    if (this.portalParticles) {
      this.portalParticles.rotation.y += deltaTime * 0.3
    }
    
    // Pulse path lights - reduced
    Object.keys(this.lights).forEach(key => {
      if (key.startsWith('path')) {
        const light = this.lights[key]
        light.intensity = 1.2 + Math.sin(this.animationTime * 1.5 + parseInt(key.replace('path', ''))) * 0.3
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
        case 'asteroid':
          obj.mesh.rotation.x += deltaTime * obj.rotationSpeed.x
          obj.mesh.rotation.y += deltaTime * obj.rotationSpeed.y
          obj.mesh.rotation.z += deltaTime * obj.rotationSpeed.z
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
