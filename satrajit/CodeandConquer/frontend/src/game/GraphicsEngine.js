// =============================================================================
// OPTIMIZED GRAPHICS ENGINE - Dark Theme with Pop Effects
// =============================================================================
// High-performance rendering with dark background where models and effects pop
// =============================================================================

import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'

// =============================================================================
// GRAPHICS ENGINE CLASS - Optimized for Performance
// =============================================================================

export class GraphicsEngine {
  constructor(container, options = {}) {
    this.container = container
    this.options = {
      quality: options.quality || 'high',
      enablePostProcessing: options.enablePostProcessing !== false,
      enableShadows: options.enableShadows !== false,
      ...options
    }
    
    // Quality presets - optimized
    this.qualityPresets = {
      low: { shadowMapSize: 512, bloomStrength: 0.8, antiAlias: false },
      medium: { shadowMapSize: 1024, bloomStrength: 1.0, antiAlias: true },
      high: { shadowMapSize: 2048, bloomStrength: 1.2, antiAlias: true },
      ultra: { shadowMapSize: 4096, bloomStrength: 1.5, antiAlias: true }
    }
    
    this.currentQuality = this.qualityPresets[this.options.quality]
    
    this.scene = null
    this.camera = null
    this.renderer = null
    this.composer = null
    this.lights = {}
    this.environmentObjects = []
    
    this.clock = new THREE.Clock()
    this.animationTime = 0
    this.damageIntensity = 0
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
    this.createGrid()
    
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
    // Pure black background - makes everything pop
    this.scene.background = new THREE.Color(0x000000)
    // Very subtle fog for depth, not haze
    this.scene.fog = new THREE.FogExp2(0x000000, 0.005)
  }
  
  createCamera() {
    this.camera = new THREE.PerspectiveCamera(
      55,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      500
    )
    this.camera.position.set(0, 45, 50)
    this.camera.lookAt(0, 0, 0)
  }
  
  createRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: this.currentQuality.antiAlias,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true
    })
    
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    
    if (this.options.enableShadows) {
      this.renderer.shadowMap.enabled = true
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    }
    
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.0
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    
    this.container.appendChild(this.renderer.domElement)
  }

  // ==========================================================================
  // LIGHTING - High contrast for dark theme
  // ==========================================================================
  
  createLights() {
    // Very low ambient - keeps it dark
    this.lights.ambient = new THREE.AmbientLight(0xffffff, 0.1)
    this.scene.add(this.lights.ambient)
    
    // Main directional light - creates contrast
    this.lights.sun = new THREE.DirectionalLight(0xffffff, 0.8)
    this.lights.sun.position.set(30, 60, 30)
    this.lights.sun.castShadow = this.options.enableShadows
    
    if (this.options.enableShadows) {
      const shadowSize = this.currentQuality.shadowMapSize
      this.lights.sun.shadow.mapSize.width = shadowSize
      this.lights.sun.shadow.mapSize.height = shadowSize
      this.lights.sun.shadow.camera.left = -60
      this.lights.sun.shadow.camera.right = 60
      this.lights.sun.shadow.camera.top = 60
      this.lights.sun.shadow.camera.bottom = -60
      this.lights.sun.shadow.camera.near = 1
      this.lights.sun.shadow.camera.far = 150
      this.lights.sun.shadow.bias = -0.001
    }
    this.scene.add(this.lights.sun)
    
    // Red accent lights for the hellfire theme - makes red elements glow
    this.lights.accent1 = new THREE.PointLight(0xff2200, 2, 40)
    this.lights.accent1.position.set(-25, 10, -25)
    this.scene.add(this.lights.accent1)
    
    this.lights.accent2 = new THREE.PointLight(0xff4400, 1.5, 35)
    this.lights.accent2.position.set(25, 8, -20)
    this.scene.add(this.lights.accent2)
    
    // Base glow - highlights the main base
    this.lights.baseGlow = new THREE.PointLight(0xff0000, 3, 30)
    this.lights.baseGlow.position.set(0, 10, -25)
    this.scene.add(this.lights.baseGlow)
  }

  // ==========================================================================
  // TERRAIN - Simple, dark, performant
  // ==========================================================================
  
  createTerrain() {
    // Simple flat ground - dark material
    const groundGeometry = new THREE.PlaneGeometry(150, 150, 1, 1)
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x0a0a0a,
      roughness: 0.9,
      metalness: 0.1
    })
    
    const ground = new THREE.Mesh(groundGeometry, groundMaterial)
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -0.1
    ground.receiveShadow = true
    this.scene.add(ground)
    this.environmentObjects.push(ground)
  }
  
  createGrid() {
    // Subtle red grid lines
    const gridSize = 100
    const gridDivisions = 20
    
    const gridHelper = new THREE.GridHelper(
      gridSize, 
      gridDivisions,
      0x330000,  // Red center line
      0x1a0000   // Dark red grid
    )
    gridHelper.position.y = 0.01
    gridHelper.material.opacity = 0.4
    gridHelper.material.transparent = true
    this.scene.add(gridHelper)
  }

  // ==========================================================================
  // POST-PROCESSING - Bloom makes effects pop
  // ==========================================================================
  
  createPostProcessing() {
    this.composer = new EffectComposer(this.renderer)
    
    const renderPass = new RenderPass(this.scene, this.camera)
    this.composer.addPass(renderPass)
    
    // Bloom for glowing effects
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(this.container.clientWidth, this.container.clientHeight),
      this.currentQuality.bloomStrength,
      0.4,
      0.2  // Lower threshold = more bloom on bright objects
    )
    this.composer.addPass(bloomPass)
    this.bloomPass = bloomPass
    
    // Output
    const outputPass = new OutputPass()
    this.composer.addPass(outputPass)
  }

  // ==========================================================================
  // UPDATE & RENDER
  // ==========================================================================
  
  update(deltaTime) {
    this.animationTime += deltaTime
    
    // Subtle light animation - pulsing for atmosphere
    if (this.lights.accent1) {
      this.lights.accent1.intensity = 1.5 + Math.sin(this.animationTime * 1.5) * 0.5
    }
    if (this.lights.baseGlow) {
      this.lights.baseGlow.intensity = 2.5 + Math.sin(this.animationTime * 2) * 1
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
    
    if (this.renderer) {
      this.renderer.dispose()
    }
    
    if (this.composer) {
      this.composer.dispose()
    }
  }
}

export default GraphicsEngine
