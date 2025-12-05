// =============================================================================
// GRAPHICS ENGINE - Beautiful Sci-Fi Tower Defense Environment
// =============================================================================

import * as THREE from 'three'

export class GraphicsEngine {
  constructor(container, options = {}) {
    this.container = container
    this.options = {
      quality: options.quality || 'medium',
      enablePostProcessing: false,
      enableShadows: false,
      ...options
    }
    
    this.scene = null
    this.camera = null
    this.renderer = null
    this.lights = {}
    this.environmentObjects = []
    this.terrain = null
    this.animatedObjects = []
    
    this.clock = new THREE.Clock()
    this.animationTime = 0
  }

  initialize() {
    this.createScene()
    this.createCamera()
    this.createRenderer()
    this.createLights()
    this.createTerrain()
    this.createEnvironment()
    this.createAtmosphere()
    
    return {
      scene: this.scene,
      camera: this.camera,
      renderer: this.renderer,
      composer: null
    }
  }
  
  createScene() {
    this.scene = new THREE.Scene()
    // Deep space blue-purple gradient effect via fog
    this.scene.background = new THREE.Color(0x050510)
    this.scene.fog = new THREE.FogExp2(0x050510, 0.008)
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
      depth: true
    })
    
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.2
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    
    this.container.appendChild(this.renderer.domElement)
  }

  createLights() {
    // Ambient - cool blue tint
    this.lights.ambient = new THREE.AmbientLight(0x334466, 0.4)
    this.scene.add(this.lights.ambient)
    
    // Main sun - warm white
    this.lights.sun = new THREE.DirectionalLight(0xffeedd, 0.8)
    this.lights.sun.position.set(50, 80, 30)
    this.scene.add(this.lights.sun)
    
    // Fill light - cool
    this.lights.fill = new THREE.DirectionalLight(0x4466aa, 0.3)
    this.lights.fill.position.set(-30, 40, -20)
    this.scene.add(this.lights.fill)
    
    // Base glow - pulsing red/orange
    this.lights.baseGlow = new THREE.PointLight(0xff4400, 4, 60)
    this.lights.baseGlow.position.set(0, 15, -25)
    this.scene.add(this.lights.baseGlow)
    
    // Secondary base glow
    this.lights.baseGlow2 = new THREE.PointLight(0xff2200, 2, 40)
    this.lights.baseGlow2.position.set(0, 5, -25)
    this.scene.add(this.lights.baseGlow2)
    
    // Spawn portal glow - green
    this.lights.spawnGlow = new THREE.PointLight(0x00ff44, 3, 40)
    this.lights.spawnGlow.position.set(0, 8, 45)
    this.scene.add(this.lights.spawnGlow)
    
    // Path accent lights
    const pathLightPositions = [
      { x: 18, z: 25, color: 0x4488ff },
      { x: -12, z: 0, color: 0x4488ff },
      { x: 8, z: -10, color: 0xff4444 }
    ]
    
    pathLightPositions.forEach((pos, i) => {
      const light = new THREE.PointLight(pos.color, 1.5, 25)
      light.position.set(pos.x, 4, pos.z)
      this.scene.add(light)
      this.lights[`path${i}`] = light
    })
  }

  createTerrain() {
    // Main ground - hexagonal pattern look
    const groundGeometry = new THREE.PlaneGeometry(180, 150, 60, 50)
    
    // Add subtle height variation
    const positions = groundGeometry.attributes.position
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i)
      const y = positions.getY(i)
      const noise = Math.sin(x * 0.1) * Math.cos(y * 0.1) * 0.3
      positions.setZ(i, noise)
    }
    groundGeometry.computeVertexNormals()
    
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      metalness: 0.3,
      roughness: 0.8,
      flatShading: true
    })
    
    this.terrain = new THREE.Mesh(groundGeometry, groundMaterial)
    this.terrain.rotation.x = -Math.PI / 2
    this.terrain.position.y = -0.5
    this.scene.add(this.terrain)
    this.environmentObjects.push(this.terrain)
    
    // Glowing grid lines
    this.createGlowingGrid()
    
    // Hex platform areas
    this.createHexPlatforms()
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
    
    // Animate lights
    if (this.lights.baseGlow) {
      this.lights.baseGlow.intensity = 4 + Math.sin(this.animationTime * 2) * 1.5
    }
    if (this.lights.baseGlow2) {
      this.lights.baseGlow2.intensity = 2 + Math.sin(this.animationTime * 3) * 0.8
    }
    if (this.lights.spawnGlow) {
      this.lights.spawnGlow.intensity = 3 + Math.sin(this.animationTime * 2.5) * 1
    }
    
    // Animate objects
    this.animatedObjects.forEach(obj => {
      switch (obj.type) {
        case 'rotate':
          obj.mesh.rotation.z += deltaTime * 0.5
          break
        case 'rotate_slow':
          obj.mesh.rotation.z += deltaTime * 0.2
          break
        case 'rotate_reverse':
          obj.mesh.rotation.z -= deltaTime * 0.3
          break
        case 'pulse':
          const scale = 1 + Math.sin(this.animationTime * 2) * 0.05
          obj.mesh.scale.setScalar(scale)
          break
      }
    })
    
    // Animate particles
    if (this.particles) {
      const positions = this.particles.geometry.attributes.position.array
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] += Math.sin(this.animationTime + i) * 0.02
      }
      this.particles.geometry.attributes.position.needsUpdate = true
      this.particles.rotation.y += deltaTime * 0.02
    }
  }
  
  render() {
    this.renderer.render(this.scene, this.camera)
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
