// =============================================================================
// PROFESSIONAL GRAPHICS ENGINE - Studio-Quality Rendering System
// =============================================================================
// Advanced rendering with PBR materials, dynamic lighting, post-processing,
// environment effects, and optimized terrain for AAA visual quality.
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
      
      // Normal vignette
      texel.rgb *= mix(1.0, vignette, darkness);
      
      // Damage red overlay
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
      
      // Brightness
      texel.rgb += brightness;
      
      // Contrast
      texel.rgb = (texel.rgb - 0.5) * contrast + 0.5;
      
      // Saturation
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
      quality: options.quality || 'high', // low, medium, high, ultra
      theme: options.theme || 'hellfire', // hellfire, frost, nature, void
      enablePostProcessing: options.enablePostProcessing !== false,
      enableShadows: options.enableShadows !== false,
      enableParticles: options.enableParticles !== false,
      ...options
    }
    
    // Quality presets
    this.qualityPresets = {
      low: { shadowMapSize: 512, particleCount: 50, bloomStrength: 0.8, antiAlias: false },
      medium: { shadowMapSize: 1024, particleCount: 150, bloomStrength: 1.2, antiAlias: true },
      high: { shadowMapSize: 2048, particleCount: 300, bloomStrength: 1.5, antiAlias: true },
      ultra: { shadowMapSize: 4096, particleCount: 500, bloomStrength: 2.0, antiAlias: true }
    }
    
    // Color themes
    this.themes = {
      hellfire: {
        background: 0x0a0000,
        fog: 0x1a0505,
        ambient: 0xff6644,
        ground: 0x1a0808,
        accent: 0xff0000,
        glow: 0xff4400
      },
      frost: {
        background: 0x000a14,
        fog: 0x051420,
        ambient: 0x88ccff,
        ground: 0x0a1520,
        accent: 0x00aaff,
        glow: 0x44ddff
      },
      nature: {
        background: 0x001a00,
        fog: 0x0a200a,
        ambient: 0x88ff88,
        ground: 0x1a2a1a,
        accent: 0x00ff44,
        glow: 0x44ff88
      },
      void: {
        background: 0x050010,
        fog: 0x100525,
        ambient: 0xaa88ff,
        ground: 0x150a20,
        accent: 0x8844ff,
        glow: 0xaa66ff
      }
    }
    
    this.currentQuality = this.qualityPresets[this.options.quality]
    this.currentTheme = this.themes[this.options.theme]
    
    // Initialize core systems
    this.scene = null
    this.camera = null
    this.renderer = null
    this.composer = null
    
    // Light references
    this.lights = {}
    
    // Environment objects
    this.terrain = null
    this.skybox = null
    this.particles = []
    
    // Animation state
    this.clock = new THREE.Clock()
    this.animationTime = 0
    
    // Damage vignette
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
    this.scene.fog = new THREE.FogExp2(this.currentTheme.fog, 0.008)
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
    
    // Shadow configuration
    if (this.options.enableShadows) {
      this.renderer.shadowMap.enabled = true
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    }
    
    // Tone mapping for HDR look
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.2
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    
    this.container.appendChild(this.renderer.domElement)
  }
  
  // ==========================================================================
  // LIGHTING SYSTEM
  // ==========================================================================
  
  createLights() {
    // Ambient light - soft overall illumination
    this.lights.ambient = new THREE.AmbientLight(0xffffff, 0.4)
    this.scene.add(this.lights.ambient)
    
    // Main directional light (sun)
    this.lights.sun = new THREE.DirectionalLight(0xffffee, 1.2)
    this.lights.sun.position.set(30, 60, 30)
    this.lights.sun.castShadow = this.options.enableShadows
    
    if (this.options.enableShadows) {
      const shadowSize = this.currentQuality.shadowMapSize
      this.lights.sun.shadow.mapSize.width = shadowSize
      this.lights.sun.shadow.mapSize.height = shadowSize
      this.lights.sun.shadow.camera.left = -70
      this.lights.sun.shadow.camera.right = 70
      this.lights.sun.shadow.camera.top = 70
      this.lights.sun.shadow.camera.bottom = -70
      this.lights.sun.shadow.camera.near = 0.5
      this.lights.sun.shadow.camera.far = 200
      this.lights.sun.shadow.bias = -0.0001
      this.lights.sun.shadow.normalBias = 0.02
    }
    this.scene.add(this.lights.sun)
    
    // Hemisphere light for sky/ground color blend
    this.lights.hemisphere = new THREE.HemisphereLight(
      this.currentTheme.ambient,
      this.currentTheme.ground,
      0.5
    )
    this.scene.add(this.lights.hemisphere)
    
    // Accent colored lights for dramatic effect
    this.lights.accent1 = new THREE.PointLight(this.currentTheme.accent, 3, 50)
    this.lights.accent1.position.set(-30, 15, -30)
    this.lights.accent1.castShadow = false
    this.scene.add(this.lights.accent1)
    
    this.lights.accent2 = new THREE.PointLight(this.currentTheme.accent, 2, 40)
    this.lights.accent2.position.set(30, 12, -20)
    this.scene.add(this.lights.accent2)
    
    // Central base glow light
    this.lights.baseGlow = new THREE.PointLight(this.currentTheme.glow, 4, 35)
    this.lights.baseGlow.position.set(0, 8, 0)
    this.lights.baseGlow.castShadow = this.options.enableShadows
    this.scene.add(this.lights.baseGlow)
    
    // Rim light for object definition
    this.lights.rim = new THREE.DirectionalLight(this.currentTheme.accent, 0.4)
    this.lights.rim.position.set(-20, 15, -40)
    this.scene.add(this.lights.rim)
  }
  
  // ==========================================================================
  // TERRAIN SYSTEM
  // ==========================================================================
  
  createTerrain() {
    // Main ground plane with displacement
    const groundSize = 140
    const groundSegments = 64
    
    const groundGeometry = new THREE.PlaneGeometry(
      groundSize, groundSize, 
      groundSegments, groundSegments
    )
    
    // Add height variation
    const positions = groundGeometry.attributes.position.array
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i]
      const z = positions[i + 1]
      
      // Perlin-like noise simulation
      const noise1 = Math.sin(x * 0.05) * Math.cos(z * 0.05) * 1.5
      const noise2 = Math.sin(x * 0.1 + 1) * Math.cos(z * 0.08) * 0.8
      const noise3 = Math.sin(x * 0.2) * Math.sin(z * 0.2) * 0.4
      
      // Keep center flatter for gameplay
      const centerDist = Math.sqrt(x * x + z * z)
      const centerFlatten = Math.max(0, 1 - centerDist / 30)
      
      positions[i + 2] = (noise1 + noise2 + noise3) * (1 - centerFlatten * 0.8)
    }
    
    groundGeometry.computeVertexNormals()
    
    // PBR ground material
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: this.currentTheme.ground,
      roughness: 0.9,
      metalness: 0.05,
      flatShading: true
    })
    
    this.terrain = new THREE.Mesh(groundGeometry, groundMaterial)
    this.terrain.rotation.x = -Math.PI / 2
    this.terrain.receiveShadow = true
    this.scene.add(this.terrain)
    
    // Grid overlay for placement
    this.createGrid()
    
    // Border walls
    this.createBorderWalls()
  }
  
  createGrid() {
    const gridSize = 100
    const gridDivisions = 20
    
    // Main grid
    const gridHelper = new THREE.GridHelper(
      gridSize, gridDivisions,
      this.currentTheme.accent,
      new THREE.Color(this.currentTheme.ground).multiplyScalar(0.5)
    )
    gridHelper.position.y = 0.05
    gridHelper.material.opacity = 0.3
    gridHelper.material.transparent = true
    this.scene.add(gridHelper)
    
    // Subtle secondary grid for precision
    const subGrid = new THREE.GridHelper(
      gridSize, gridDivisions * 2,
      this.currentTheme.ground,
      this.currentTheme.ground
    )
    subGrid.position.y = 0.02
    subGrid.material.opacity = 0.15
    subGrid.material.transparent = true
    this.scene.add(subGrid)
  }
  
  createBorderWalls() {
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(this.currentTheme.ground).multiplyScalar(0.7),
      roughness: 0.8,
      metalness: 0.3,
      emissive: this.currentTheme.accent,
      emissiveIntensity: 0.1
    })
    
    const wallHeight = 4
    const wallThickness = 1.5
    const mapSize = 55
    
    // Create all four walls
    const wallConfigs = [
      { pos: [0, wallHeight/2, -mapSize], size: [mapSize * 2 + wallThickness, wallHeight, wallThickness] },
      { pos: [0, wallHeight/2, mapSize], size: [mapSize * 2 + wallThickness, wallHeight, wallThickness] },
      { pos: [-mapSize, wallHeight/2, 0], size: [wallThickness, wallHeight, mapSize * 2] },
      { pos: [mapSize, wallHeight/2, 0], size: [wallThickness, wallHeight, mapSize * 2] }
    ]
    
    wallConfigs.forEach(config => {
      const wallGeom = new THREE.BoxGeometry(...config.size)
      const wall = new THREE.Mesh(wallGeom, wallMaterial)
      wall.position.set(...config.pos)
      wall.castShadow = true
      wall.receiveShadow = true
      this.scene.add(wall)
    })
    
    // Corner pillars with glow
    this.createCornerPillars(mapSize, wallHeight)
  }
  
  createCornerPillars(mapSize, wallHeight) {
    const pillarGeom = new THREE.CylinderGeometry(1.5, 2, wallHeight + 2, 8)
    const pillarMat = new THREE.MeshStandardMaterial({
      color: this.currentTheme.ground,
      roughness: 0.6,
      metalness: 0.4,
      emissive: this.currentTheme.accent,
      emissiveIntensity: 0.2
    })
    
    const corners = [
      [-mapSize, mapSize],
      [mapSize, mapSize],
      [-mapSize, -mapSize],
      [mapSize, -mapSize]
    ]
    
    corners.forEach(([x, z]) => {
      const pillar = new THREE.Mesh(pillarGeom, pillarMat)
      pillar.position.set(x, wallHeight / 2 + 1, z)
      pillar.castShadow = true
      this.scene.add(pillar)
      
      // Glowing top
      const glowGeom = new THREE.SphereGeometry(0.8, 16, 16)
      const glowMat = new THREE.MeshBasicMaterial({
        color: this.currentTheme.glow,
        transparent: true,
        opacity: 0.8
      })
      const glow = new THREE.Mesh(glowGeom, glowMat)
      glow.position.set(x, wallHeight + 2, z)
      this.scene.add(glow)
    })
  }
  
  // ==========================================================================
  // ENVIRONMENT & ATMOSPHERE
  // ==========================================================================
  
  createEnvironment() {
    // Atmospheric particles
    if (this.options.enableParticles) {
      this.createAtmosphericParticles()
    }
    
    // Decorative rocks
    this.createRocks()
    
    // Environmental fog volumes
    this.createFogVolumes()
  }
  
  createAtmosphericParticles() {
    const particleCount = this.currentQuality.particleCount
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(particleCount * 3)
    const colors = new Float32Array(particleCount * 3)
    const sizes = new Float32Array(particleCount)
    
    const themeColor = new THREE.Color(this.currentTheme.accent)
    
    for (let i = 0; i < particleCount; i++) {
      // Position in a dome above the terrain
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI * 0.4
      const radius = 30 + Math.random() * 50
      
      positions[i * 3] = Math.sin(phi) * Math.cos(theta) * radius
      positions[i * 3 + 1] = 5 + Math.random() * 40
      positions[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * radius
      
      // Color variation
      const colorVariation = 0.7 + Math.random() * 0.3
      colors[i * 3] = themeColor.r * colorVariation
      colors[i * 3 + 1] = themeColor.g * colorVariation
      colors[i * 3 + 2] = themeColor.b * colorVariation
      
      sizes[i] = 0.2 + Math.random() * 0.4
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    
    const material = new THREE.PointsMaterial({
      size: 0.4,
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
      color: new THREE.Color(this.currentTheme.ground).multiplyScalar(1.2),
      roughness: 0.95,
      metalness: 0.05,
      flatShading: true
    })
    
    // Place rocks avoiding the play area
    for (let i = 0; i < 30; i++) {
      let x, z
      do {
        x = (Math.random() - 0.5) * 100
        z = (Math.random() - 0.5) * 100
      } while (Math.abs(x) < 25 && Math.abs(z) < 35) // Avoid center
      
      const geomIndex = Math.floor(Math.random() * rockGeometries.length)
      const rock = new THREE.Mesh(rockGeometries[geomIndex], rockMaterial.clone())
      
      const scale = 0.5 + Math.random() * 2
      rock.scale.set(scale, scale * (0.6 + Math.random() * 0.4), scale)
      rock.position.set(x, scale * 0.3, z)
      rock.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      )
      
      rock.castShadow = true
      rock.receiveShadow = true
      this.scene.add(rock)
    }
  }
  
  createFogVolumes() {
    // Ground-hugging fog (volumetric effect simulation)
    const fogGeometry = new THREE.PlaneGeometry(150, 150, 1, 1)
    const fogMaterial = new THREE.MeshBasicMaterial({
      color: this.currentTheme.fog,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
      depthWrite: false
    })
    
    this.groundFog = new THREE.Mesh(fogGeometry, fogMaterial)
    this.groundFog.rotation.x = -Math.PI / 2
    this.groundFog.position.y = 0.5
    this.scene.add(this.groundFog)
  }
  
  // ==========================================================================
  // POST-PROCESSING
  // ==========================================================================
  
  createPostProcessing() {
    this.composer = new EffectComposer(this.renderer)
    
    // Base render pass
    const renderPass = new RenderPass(this.scene, this.camera)
    this.composer.addPass(renderPass)
    
    // Bloom for glow effects
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(this.container.clientWidth, this.container.clientHeight),
      this.currentQuality.bloomStrength,
      0.5,
      0.4
    )
    this.composer.addPass(bloomPass)
    this.bloomPass = bloomPass
    
    // SMAA antialiasing
    if (this.currentQuality.antiAlias) {
      const smaaPass = new SMAAPass(
        this.container.clientWidth * this.renderer.getPixelRatio(),
        this.container.clientHeight * this.renderer.getPixelRatio()
      )
      this.composer.addPass(smaaPass)
    }
    
    // Vignette and damage overlay
    this.vignettePass = new ShaderPass(VignetteShader)
    this.vignettePass.uniforms.offset.value = 1.0
    this.vignettePass.uniforms.darkness.value = 0.4
    this.composer.addPass(this.vignettePass)
    
    // Color correction
    const colorPass = new ShaderPass(ColorCorrectionShader)
    this.composer.addPass(colorPass)
    
    // Final output
    const outputPass = new OutputPass()
    this.composer.addPass(outputPass)
  }
  
  // ==========================================================================
  // UPDATE & RENDER
  // ==========================================================================
  
  update(deltaTime) {
    this.animationTime += deltaTime
    
    // Animate atmosphere particles
    if (this.atmosphereParticles) {
      this.atmosphereParticles.rotation.y += deltaTime * 0.02
      
      const positions = this.atmosphereParticles.geometry.attributes.position.array
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] += Math.sin(this.animationTime + i * 0.01) * 0.02
      }
      this.atmosphereParticles.geometry.attributes.position.needsUpdate = true
    }
    
    // Animate ground fog
    if (this.groundFog) {
      this.groundFog.material.opacity = 0.1 + Math.sin(this.animationTime * 0.3) * 0.03
    }
    
    // Animate accent lights
    if (this.lights.accent1) {
      this.lights.accent1.intensity = 2.5 + Math.sin(this.animationTime * 1.5) * 0.5
    }
    if (this.lights.baseGlow) {
      this.lights.baseGlow.intensity = 3 + Math.sin(this.animationTime * 2) * 1
    }
    
    // Update damage vignette
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
    
    // Update shadow quality
    if (this.lights.sun && this.lights.sun.shadow) {
      this.lights.sun.shadow.mapSize.width = preset.shadowMapSize
      this.lights.sun.shadow.mapSize.height = preset.shadowMapSize
    }
    
    // Update bloom strength
    if (this.bloomPass) {
      this.bloomPass.strength = preset.bloomStrength
    }
  }
  
  setTheme(themeName) {
    const theme = this.themes[themeName]
    if (!theme) return
    
    this.currentTheme = theme
    this.options.theme = themeName
    
    // Update colors
    this.scene.background.setHex(theme.background)
    this.scene.fog.color.setHex(theme.fog)
    
    if (this.lights.hemisphere) {
      this.lights.hemisphere.color.setHex(theme.ambient)
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
    // Dispose geometries and materials
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
    
    // Dispose renderer
    if (this.renderer) {
      this.renderer.dispose()
    }
    
    // Dispose composer
    if (this.composer) {
      this.composer.dispose()
    }
  }
}

export { VignetteShader, ColorCorrectionShader }

