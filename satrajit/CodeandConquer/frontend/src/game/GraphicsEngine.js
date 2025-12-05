// =============================================================================
// PROFESSIONAL GRAPHICS ENGINE - Immersive Environment & Rendering
// =============================================================================
// AAA-quality environment with dynamic terrain, atmospheric effects,
// proper wall positioning, and cinematic lighting
// =============================================================================

import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'

// =============================================================================
// CUSTOM SHADERS
// =============================================================================

const VignetteShader = {
  uniforms: {
    tDiffuse: { value: null },
    offset: { value: 1.0 },
    darkness: { value: 1.0 },
    damageIntensity: { value: 0.0 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float offset;
    uniform float darkness;
    uniform float damageIntensity;
    varying vec2 vUv;
    
    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      vec2 uv = (vUv - vec2(0.5)) * vec2(offset);
      float vignette = clamp(1.0 - dot(uv, uv), 0.0, 1.0);
      
      texel.rgb *= mix(1.0, vignette, darkness);
      
      if (damageIntensity > 0.0) {
        float damageVignette = 1.0 - pow(vignette, 2.0);
        texel.rgb = mix(texel.rgb, vec3(0.8, 0.0, 0.0), damageVignette * damageIntensity * 0.5);
      }
      
      gl_FragColor = texel;
    }
  `
}

const ColorCorrectionShader = {
  uniforms: {
    tDiffuse: { value: null },
    contrast: { value: 1.1 },
    saturation: { value: 1.15 },
    brightness: { value: 0.0 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float contrast;
    uniform float saturation;
    uniform float brightness;
    varying vec2 vUv;
    
    vec3 adjustSaturation(vec3 color, float adjustment) {
      float grey = dot(color, vec3(0.2126, 0.7152, 0.0722));
      return mix(vec3(grey), color, adjustment);
    }
    
    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      texel.rgb += brightness;
      texel.rgb = (texel.rgb - 0.5) * contrast + 0.5;
      texel.rgb = adjustSaturation(texel.rgb, saturation);
      gl_FragColor = texel;
    }
  `
}

// =============================================================================
// GRAPHICS ENGINE CLASS
// =============================================================================

export class GraphicsEngine {
  constructor(container, options = {}) {
    this.container = container
    this.options = {
      quality: options.quality || 'high',
      theme: options.theme || 'hellfire',
      enablePostProcessing: options.enablePostProcessing !== false,
      enableShadows: options.enableShadows !== false,
      enableParticles: options.enableParticles !== false,
      ...options
    }
    
    this.qualityPresets = {
      low: { shadowMapSize: 512, particleCount: 50, bloomStrength: 0.6, antiAlias: false },
      medium: { shadowMapSize: 1024, particleCount: 150, bloomStrength: 1.0, antiAlias: true },
      high: { shadowMapSize: 2048, particleCount: 300, bloomStrength: 1.3, antiAlias: true },
      ultra: { shadowMapSize: 4096, particleCount: 500, bloomStrength: 1.8, antiAlias: true }
    }
    
    this.themes = {
      hellfire: {
        background: 0x080404,
        fog: 0x150808,
        fogDensity: 0.012,
        ambient: 0xff6644,
        ground: 0x1a0a0a,
        groundAccent: 0x2a1010,
        accent: 0xff2200,
        glow: 0xff4400,
        skyColor: 0x200505,
        pathColor: 0x331111
      },
      frost: {
        background: 0x040810,
        fog: 0x081420,
        fogDensity: 0.010,
        ambient: 0x88ccff,
        ground: 0x0a1520,
        groundAccent: 0x152535,
        accent: 0x00aaff,
        glow: 0x44ddff,
        skyColor: 0x051525,
        pathColor: 0x112233
      },
      nature: {
        background: 0x040a04,
        fog: 0x0a200a,
        fogDensity: 0.008,
        ambient: 0x88ff88,
        ground: 0x1a2a1a,
        groundAccent: 0x2a3a2a,
        accent: 0x00ff44,
        glow: 0x44ff88,
        skyColor: 0x0a150a,
        pathColor: 0x223322
      },
      void: {
        background: 0x050008,
        fog: 0x100520,
        fogDensity: 0.015,
        ambient: 0xaa88ff,
        ground: 0x150a20,
        groundAccent: 0x201530,
        accent: 0x8844ff,
        glow: 0xaa66ff,
        skyColor: 0x0a0515,
        pathColor: 0x221133
      }
    }
    
    this.currentQuality = this.qualityPresets[this.options.quality]
    this.currentTheme = this.themes[this.options.theme]
    
    this.scene = null
    this.camera = null
    this.renderer = null
    this.composer = null
    
    this.lights = {}
    this.terrain = null
    this.skybox = null
    this.particles = []
    this.environmentObjects = []
    
    this.clock = new THREE.Clock()
    this.animationTime = 0
    
    this.damageIntensity = 0
    this.vignettePass = null
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================
  
  initialize() {
    this.createScene()
    this.createCamera()
    this.createRenderer()
    this.createLights()
    this.createTerrain()
    this.createEnvironment()
    this.createSkyDome()
    
    if (this.options.enablePostProcessing) {
      this.createPostProcessing()
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
    this.scene.background = new THREE.Color(this.currentTheme.background)
    this.scene.fog = new THREE.FogExp2(this.currentTheme.fog, this.currentTheme.fogDensity)
  }
  
  createCamera() {
    this.camera = new THREE.PerspectiveCamera(
      55,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1000
    )
    this.camera.position.set(0, 50, 55)
    this.camera.lookAt(0, 0, 0)
  }
  
  createRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: this.currentQuality.antiAlias,
      powerPreference: 'high-performance',
      stencil: false
    })
    
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    
    if (this.options.enableShadows) {
      this.renderer.shadowMap.enabled = true
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    }
    
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.2
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    
    this.container.appendChild(this.renderer.domElement)
  }

  // ==========================================================================
  // LIGHTING - Dramatic cinematic lighting
  // ==========================================================================
  
  createLights() {
    // Soft ambient
    this.lights.ambient = new THREE.AmbientLight(0xffffff, 0.25)
    this.scene.add(this.lights.ambient)
    
    // Main directional (sun/moon)
    this.lights.sun = new THREE.DirectionalLight(0xffeedd, 1.0)
    this.lights.sun.position.set(40, 80, 40)
    this.lights.sun.castShadow = this.options.enableShadows
    
    if (this.options.enableShadows) {
      const shadowSize = this.currentQuality.shadowMapSize
      this.lights.sun.shadow.mapSize.width = shadowSize
      this.lights.sun.shadow.mapSize.height = shadowSize
      this.lights.sun.shadow.camera.left = -80
      this.lights.sun.shadow.camera.right = 80
      this.lights.sun.shadow.camera.top = 80
      this.lights.sun.shadow.camera.bottom = -80
      this.lights.sun.shadow.camera.near = 0.5
      this.lights.sun.shadow.camera.far = 250
      this.lights.sun.shadow.bias = -0.0001
      this.lights.sun.shadow.normalBias = 0.02
    }
    this.scene.add(this.lights.sun)
    
    // Hemisphere for sky/ground blend
    this.lights.hemisphere = new THREE.HemisphereLight(
      this.currentTheme.skyColor,
      this.currentTheme.ground,
      0.4
    )
    this.scene.add(this.lights.hemisphere)
    
    // Dramatic accent lights
    this.lights.accent1 = new THREE.PointLight(this.currentTheme.accent, 2.5, 60)
    this.lights.accent1.position.set(-35, 20, -35)
    this.scene.add(this.lights.accent1)
    
    this.lights.accent2 = new THREE.PointLight(this.currentTheme.accent, 2, 50)
    this.lights.accent2.position.set(35, 15, -25)
    this.scene.add(this.lights.accent2)
    
    // Central glow
    this.lights.baseGlow = new THREE.PointLight(this.currentTheme.glow, 5, 45)
    this.lights.baseGlow.position.set(0, 12, -25)
    if (this.options.enableShadows) {
      this.lights.baseGlow.castShadow = true
      this.lights.baseGlow.shadow.mapSize.width = 512
      this.lights.baseGlow.shadow.mapSize.height = 512
    }
    this.scene.add(this.lights.baseGlow)
    
    // Rim light for depth
    this.lights.rim = new THREE.DirectionalLight(this.currentTheme.accent, 0.3)
    this.lights.rim.position.set(-30, 20, -50)
    this.scene.add(this.lights.rim)
  }

  // ==========================================================================
  // TERRAIN - Immersive ground with proper layering
  // ==========================================================================
  
  createTerrain() {
    const groundSize = 160
    const groundSegments = 80
    
    // Main terrain with displacement
    const groundGeometry = new THREE.PlaneGeometry(
      groundSize, groundSize, 
      groundSegments, groundSegments
    )
    
    const positions = groundGeometry.attributes.position.array
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i]
      const z = positions[i + 1]
      
      // Multi-layer noise for natural terrain
      const noise1 = Math.sin(x * 0.04) * Math.cos(z * 0.04) * 2.0
      const noise2 = Math.sin(x * 0.08 + 2) * Math.cos(z * 0.06) * 1.2
      const noise3 = Math.sin(x * 0.15) * Math.sin(z * 0.15) * 0.6
      const noise4 = Math.sin(x * 0.25 + z * 0.25) * 0.3
      
      // Flatten center for gameplay
      const centerDist = Math.sqrt(x * x + z * z)
      const centerFlatten = Math.max(0, 1 - centerDist / 35)
      
      // Edge mountains
      const edgeFactor = Math.max(0, (centerDist - 50) / 30)
      const edgeHeight = edgeFactor * edgeFactor * 8
      
      positions[i + 2] = (noise1 + noise2 + noise3 + noise4) * (1 - centerFlatten * 0.9) + edgeHeight
    }
    
    groundGeometry.computeVertexNormals()
    
    // PBR ground material with detail
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: this.currentTheme.ground,
      roughness: 0.85,
      metalness: 0.1,
      flatShading: true
    })
    
    this.terrain = new THREE.Mesh(groundGeometry, groundMaterial)
    this.terrain.rotation.x = -Math.PI / 2
    this.terrain.receiveShadow = true
    this.terrain.position.y = -0.5
    this.scene.add(this.terrain)
    
    // Path indicator (subtle glow on ground)
    this.createPathIndicator()
    
    // Grid overlay
    this.createGrid()
    
    // Boundary walls (positioned properly on sides, not on top)
    this.createBoundaryWalls()
  }
  
  createPathIndicator() {
    // Glowing path from spawn to base
    const pathPoints = [
      new THREE.Vector3(0, 0.1, 50),
      new THREE.Vector3(20, 0.1, 35),
      new THREE.Vector3(20, 0.1, 15),
      new THREE.Vector3(-15, 0.1, 8),
      new THREE.Vector3(-15, 0.1, -10),
      new THREE.Vector3(10, 0.1, -18),
      new THREE.Vector3(0, 0.1, -25)
    ]
    
    const curve = new THREE.CatmullRomCurve3(pathPoints)
    const pathGeometry = new THREE.TubeGeometry(curve, 100, 2.5, 8, false)
    const pathMaterial = new THREE.MeshBasicMaterial({
      color: this.currentTheme.pathColor,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    })
    
    const pathMesh = new THREE.Mesh(pathGeometry, pathMaterial)
    pathMesh.position.y = -0.3
    this.scene.add(pathMesh)
    this.environmentObjects.push(pathMesh)
    
    // Path edge glow
    const edgeGeometry = new THREE.TubeGeometry(curve, 100, 3.0, 8, false)
    const edgeMaterial = new THREE.MeshBasicMaterial({
      color: this.currentTheme.accent,
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide
    })
    
    const edgeMesh = new THREE.Mesh(edgeGeometry, edgeMaterial)
    edgeMesh.position.y = -0.35
    this.scene.add(edgeMesh)
    this.environmentObjects.push(edgeMesh)
  }
  
  createGrid() {
    const gridSize = 100
    const gridDivisions = 20
    
    // Main grid
    const gridHelper = new THREE.GridHelper(
      gridSize, gridDivisions,
      new THREE.Color(this.currentTheme.accent).multiplyScalar(0.5),
      new THREE.Color(this.currentTheme.ground).multiplyScalar(0.3)
    )
    gridHelper.position.y = 0.02
    gridHelper.material.opacity = 0.25
    gridHelper.material.transparent = true
    this.scene.add(gridHelper)
    
    // Fine grid
    const fineGrid = new THREE.GridHelper(
      gridSize, gridDivisions * 2,
      new THREE.Color(this.currentTheme.ground).multiplyScalar(0.4),
      new THREE.Color(this.currentTheme.ground).multiplyScalar(0.2)
    )
    fineGrid.position.y = 0.01
    fineGrid.material.opacity = 0.15
    fineGrid.material.transparent = true
    this.scene.add(fineGrid)
  }
  
  createBoundaryWalls() {
    // Low boundary walls around the perimeter (on the sides, not blocking view)
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(this.currentTheme.ground).multiplyScalar(0.6),
      roughness: 0.7,
      metalness: 0.4,
      emissive: this.currentTheme.accent,
      emissiveIntensity: 0.08
    })
    
    const wallHeight = 3
    const wallThickness = 2
    const mapSize = 60
    
    // Only create walls on the far edges (not blocking camera view)
    const wallConfigs = [
      // Back wall (far from camera)
      { pos: [0, wallHeight/2, -mapSize], size: [mapSize * 2 + wallThickness, wallHeight, wallThickness] },
      // Side walls
      { pos: [-mapSize, wallHeight/2, 0], size: [wallThickness, wallHeight, mapSize * 2] },
      { pos: [mapSize, wallHeight/2, 0], size: [wallThickness, wallHeight, mapSize * 2] }
    ]
    
    wallConfigs.forEach(config => {
      const wallGeom = new THREE.BoxGeometry(...config.size)
      const wall = new THREE.Mesh(wallGeom, wallMaterial.clone())
      wall.position.set(...config.pos)
      wall.castShadow = true
      wall.receiveShadow = true
      this.scene.add(wall)
      this.environmentObjects.push(wall)
    })
    
    // Corner towers with glowing tops
    this.createCornerTowers(mapSize, wallHeight)
  }
  
  createCornerTowers(mapSize, wallHeight) {
    const towerGeom = new THREE.CylinderGeometry(2, 2.5, wallHeight + 4, 8)
    const towerMat = new THREE.MeshStandardMaterial({
      color: this.currentTheme.ground,
      roughness: 0.5,
      metalness: 0.5,
      emissive: this.currentTheme.accent,
      emissiveIntensity: 0.15
    })
    
    // Only corners that don't block view
    const corners = [
      [-mapSize, -mapSize],
      [mapSize, -mapSize],
      [-mapSize, mapSize],
      [mapSize, mapSize]
    ]
    
    corners.forEach(([x, z]) => {
      const tower = new THREE.Mesh(towerGeom, towerMat.clone())
      tower.position.set(x, wallHeight / 2 + 2, z)
      tower.castShadow = true
      this.scene.add(tower)
      this.environmentObjects.push(tower)
      
      // Glowing beacon
      const beaconGeom = new THREE.SphereGeometry(1, 16, 16)
      const beaconMat = new THREE.MeshBasicMaterial({
        color: this.currentTheme.glow,
        transparent: true,
        opacity: 0.8
      })
      const beacon = new THREE.Mesh(beaconGeom, beaconMat)
      beacon.position.set(x, wallHeight + 5, z)
      this.scene.add(beacon)
      this.environmentObjects.push(beacon)
      
      // Beacon light
      const beaconLight = new THREE.PointLight(this.currentTheme.glow, 1.5, 25)
      beaconLight.position.set(x, wallHeight + 5, z)
      this.scene.add(beaconLight)
    })
  }

  // ==========================================================================
  // ENVIRONMENT - Atmosphere and decoration
  // ==========================================================================
  
  createEnvironment() {
    if (this.options.enableParticles) {
      this.createAtmosphericParticles()
    }
    
    this.createRocks()
    this.createCrystals()
    this.createGroundFog()
  }
  
  createAtmosphericParticles() {
    const particleCount = this.currentQuality.particleCount
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(particleCount * 3)
    const colors = new Float32Array(particleCount * 3)
    const sizes = new Float32Array(particleCount)
    
    const themeColor = new THREE.Color(this.currentTheme.accent)
    
    for (let i = 0; i < particleCount; i++) {
      // Distribute in a dome
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI * 0.5
      const radius = 20 + Math.random() * 60
      
      positions[i * 3] = Math.sin(phi) * Math.cos(theta) * radius
      positions[i * 3 + 1] = 3 + Math.random() * 50
      positions[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * radius
      
      const colorVariation = 0.6 + Math.random() * 0.4
      colors[i * 3] = themeColor.r * colorVariation
      colors[i * 3 + 1] = themeColor.g * colorVariation
      colors[i * 3 + 2] = themeColor.b * colorVariation
      
      sizes[i] = 0.15 + Math.random() * 0.35
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    
    const material = new THREE.PointsMaterial({
      size: 0.35,
      transparent: true,
      opacity: 0.5,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    })
    
    this.atmosphereParticles = new THREE.Points(geometry, material)
    this.scene.add(this.atmosphereParticles)
  }
  
  createRocks() {
    const rockGeometries = [
      new THREE.DodecahedronGeometry(1, 0),
      new THREE.IcosahedronGeometry(1, 0),
      new THREE.OctahedronGeometry(1, 0)
    ]
    
    const rockMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(this.currentTheme.ground).multiplyScalar(1.3),
      roughness: 0.9,
      metalness: 0.1,
      flatShading: true
    })
    
    // Place rocks avoiding play area
    for (let i = 0; i < 40; i++) {
      let x, z
      do {
        x = (Math.random() - 0.5) * 120
        z = (Math.random() - 0.5) * 120
      } while (Math.abs(x) < 30 && Math.abs(z) < 40)
      
      const geomIndex = Math.floor(Math.random() * rockGeometries.length)
      const rock = new THREE.Mesh(rockGeometries[geomIndex], rockMaterial.clone())
      
      const scale = 0.4 + Math.random() * 2.5
      rock.scale.set(scale, scale * (0.5 + Math.random() * 0.5), scale)
      rock.position.set(x, scale * 0.25, z)
      rock.rotation.set(Math.random() * 0.5, Math.random() * Math.PI, Math.random() * 0.5)
      
      rock.castShadow = true
      rock.receiveShadow = true
      this.scene.add(rock)
      this.environmentObjects.push(rock)
    }
  }
  
  createCrystals() {
    const crystalMat = new THREE.MeshPhysicalMaterial({
      color: this.currentTheme.accent,
      emissive: this.currentTheme.glow,
      emissiveIntensity: 0.4,
      metalness: 0.2,
      roughness: 0.1,
      transparent: true,
      opacity: 0.8,
      clearcoat: 1.0
    })
    
    // Scatter glowing crystals
    for (let i = 0; i < 15; i++) {
      let x, z
      do {
        x = (Math.random() - 0.5) * 100
        z = (Math.random() - 0.5) * 100
      } while (Math.abs(x) < 25 && Math.abs(z) < 35)
      
      const crystalGeom = new THREE.OctahedronGeometry(0.5 + Math.random() * 0.8, 0)
      const crystal = new THREE.Mesh(crystalGeom, crystalMat.clone())
      
      crystal.position.set(x, 0.3 + Math.random() * 0.5, z)
      crystal.rotation.set(0, Math.random() * Math.PI, Math.random() * 0.3)
      crystal.scale.y = 1.5 + Math.random()
      
      crystal.castShadow = true
      this.scene.add(crystal)
      this.environmentObjects.push(crystal)
      
      // Crystal light
      const crystalLight = new THREE.PointLight(this.currentTheme.glow, 0.5, 10)
      crystalLight.position.copy(crystal.position)
      crystalLight.position.y += 1
      this.scene.add(crystalLight)
    }
  }
  
  createGroundFog() {
    // Layered fog planes for depth
    const fogLayers = 3
    
    for (let i = 0; i < fogLayers; i++) {
      const fogGeometry = new THREE.PlaneGeometry(180, 180, 1, 1)
      const fogMaterial = new THREE.MeshBasicMaterial({
        color: this.currentTheme.fog,
        transparent: true,
        opacity: 0.08 - i * 0.02,
        side: THREE.DoubleSide,
        depthWrite: false
      })
      
      const fogPlane = new THREE.Mesh(fogGeometry, fogMaterial)
      fogPlane.rotation.x = -Math.PI / 2
      fogPlane.position.y = 0.3 + i * 0.5
      this.scene.add(fogPlane)
      this.environmentObjects.push(fogPlane)
    }
  }
  
  createSkyDome() {
    // Gradient sky dome
    const skyGeometry = new THREE.SphereGeometry(400, 32, 32)
    
    // Gradient shader
    const skyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(this.currentTheme.skyColor) },
        bottomColor: { value: new THREE.Color(this.currentTheme.fog) },
        offset: { value: 10 },
        exponent: { value: 0.6 }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + offset).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
      `,
      side: THREE.BackSide
    })
    
    this.skybox = new THREE.Mesh(skyGeometry, skyMaterial)
    this.scene.add(this.skybox)
  }

  // ==========================================================================
  // POST-PROCESSING
  // ==========================================================================
  
  createPostProcessing() {
    this.composer = new EffectComposer(this.renderer)
    
    const renderPass = new RenderPass(this.scene, this.camera)
    this.composer.addPass(renderPass)
    
    // Bloom
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(this.container.clientWidth, this.container.clientHeight),
      this.currentQuality.bloomStrength,
      0.4,
      0.35
    )
    this.composer.addPass(bloomPass)
    this.bloomPass = bloomPass
    
    // SMAA
    if (this.currentQuality.antiAlias) {
      const smaaPass = new SMAAPass(
        this.container.clientWidth * this.renderer.getPixelRatio(),
        this.container.clientHeight * this.renderer.getPixelRatio()
      )
      this.composer.addPass(smaaPass)
    }
    
    // Vignette
    this.vignettePass = new ShaderPass(VignetteShader)
    this.vignettePass.uniforms.offset.value = 1.0
    this.vignettePass.uniforms.darkness.value = 0.35
    this.composer.addPass(this.vignettePass)
    
    // Color correction
    const colorPass = new ShaderPass(ColorCorrectionShader)
    this.composer.addPass(colorPass)
    
    // Output
    const outputPass = new OutputPass()
    this.composer.addPass(outputPass)
  }

  // ==========================================================================
  // UPDATE & RENDER
  // ==========================================================================
  
  update(deltaTime) {
    this.animationTime += deltaTime
    
    // Animate atmosphere
    if (this.atmosphereParticles) {
      this.atmosphereParticles.rotation.y += deltaTime * 0.015
      
      const positions = this.atmosphereParticles.geometry.attributes.position.array
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] += Math.sin(this.animationTime * 0.5 + i * 0.005) * 0.015
      }
      this.atmosphereParticles.geometry.attributes.position.needsUpdate = true
    }
    
    // Animate lights
    if (this.lights.accent1) {
      this.lights.accent1.intensity = 2 + Math.sin(this.animationTime * 1.2) * 0.5
    }
    if (this.lights.baseGlow) {
      this.lights.baseGlow.intensity = 4 + Math.sin(this.animationTime * 1.8) * 1.5
    }
    
    // Damage vignette
    if (this.damageIntensity > 0) {
      this.damageIntensity = Math.max(0, this.damageIntensity - deltaTime * 2)
      if (this.vignettePass) {
        this.vignettePass.uniforms.damageIntensity.value = this.damageIntensity
      }
    }
  }
  
  render() {
    if (this.composer) {
      this.composer.render()
    } else {
      this.renderer.render(this.scene, this.camera)
    }
  }

  // ==========================================================================
  // PUBLIC METHODS
  // ==========================================================================
  
  triggerDamageEffect(intensity = 0.5) {
    this.damageIntensity = Math.min(1.0, this.damageIntensity + intensity)
  }
  
  setQuality(quality) {
    const preset = this.qualityPresets[quality]
    if (!preset) return
    
    this.currentQuality = preset
    this.options.quality = quality
    
    if (this.lights.sun && this.lights.sun.shadow) {
      this.lights.sun.shadow.mapSize.width = preset.shadowMapSize
      this.lights.sun.shadow.mapSize.height = preset.shadowMapSize
    }
    
    if (this.bloomPass) {
      this.bloomPass.strength = preset.bloomStrength
    }
  }
  
  setTheme(themeName) {
    const theme = this.themes[themeName]
    if (!theme) return
    
    this.currentTheme = theme
    this.options.theme = themeName
    
    this.scene.background.setHex(theme.background)
    this.scene.fog.color.setHex(theme.fog)
    
    if (this.lights.hemisphere) {
      this.lights.hemisphere.color.setHex(theme.skyColor)
      this.lights.hemisphere.groundColor.setHex(theme.ground)
    }
    
    if (this.lights.accent1) {
      this.lights.accent1.color.setHex(theme.accent)
    }
    
    if (this.lights.baseGlow) {
      this.lights.baseGlow.color.setHex(theme.glow)
    }
    
    if (this.terrain) {
      this.terrain.material.color.setHex(theme.ground)
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
    }
  }
  
  dispose() {
    // Dispose environment objects
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
    
    this.scene.traverse((object) => {
      if (object.geometry) object.geometry.dispose()
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(m => m.dispose())
        } else {
          object.material.dispose()
        }
      }
    })
    
    if (this.renderer) {
      this.renderer.dispose()
    }
    
    if (this.composer) {
      this.composer.dispose()
    }
  }
}

export { VignetteShader, ColorCorrectionShader }
