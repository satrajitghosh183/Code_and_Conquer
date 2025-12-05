// =============================================================================
// LIGHTWEIGHT GRAPHICS ENGINE - Optimized for Performance
// =============================================================================
// Simple, fast rendering without heavy post-processing
// =============================================================================

import * as THREE from 'three'

export class GraphicsEngine {
  constructor(container, options = {}) {
    this.container = container
    this.options = {
      quality: options.quality || 'medium',
      enablePostProcessing: false, // Disabled for performance
      enableShadows: false, // Disabled for performance
      ...options
    }
    
    this.scene = null
    this.camera = null
    this.renderer = null
    this.composer = null
    this.lights = {}
    this.environmentObjects = []
    this.terrain = null
    
    this.clock = new THREE.Clock()
    this.animationTime = 0
  }

  initialize() {
    this.createScene()
    this.createCamera()
    this.createRenderer()
    this.createLights()
    this.createTerrain()
    this.createGrid()
    this.createPathVisualization()
    
    return {
      scene: this.scene,
      camera: this.camera,
      renderer: this.renderer,
      composer: null // No post-processing
    }
  }
  
  createScene() {
    this.scene = new THREE.Scene()
    // Dark red/black background
    this.scene.background = new THREE.Color(0x0a0000)
  }
  
  createCamera() {
    this.camera = new THREE.PerspectiveCamera(
      60,
      this.container.clientWidth / this.container.clientHeight,
      1,
      500
    )
    this.camera.position.set(0, 50, 60)
    this.camera.lookAt(0, 0, 0)
  }
  
  createRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: false, // Disabled for performance
      powerPreference: 'high-performance',
      stencil: false,
      depth: true
    })
    
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight)
    this.renderer.setPixelRatio(1) // Fixed pixel ratio for performance
    this.renderer.toneMapping = THREE.NoToneMapping
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    
    this.container.appendChild(this.renderer.domElement)
  }

  createLights() {
    // Simple ambient light
    this.lights.ambient = new THREE.AmbientLight(0xffffff, 0.6)
    this.scene.add(this.lights.ambient)
    
    // Main directional light (no shadows)
    this.lights.sun = new THREE.DirectionalLight(0xffffff, 1.0)
    this.lights.sun.position.set(30, 50, 30)
    this.scene.add(this.lights.sun)
    
    // Red accent light at base
    this.lights.baseGlow = new THREE.PointLight(0xff4400, 2, 50)
    this.lights.baseGlow.position.set(0, 10, -25)
    this.scene.add(this.lights.baseGlow)
    
    // Spawn area light
    this.lights.spawnGlow = new THREE.PointLight(0x00ff00, 1, 30)
    this.lights.spawnGlow.position.set(0, 5, 45)
    this.scene.add(this.lights.spawnGlow)
  }

  createTerrain() {
    // Simple flat ground
    const groundGeometry = new THREE.PlaneGeometry(150, 120)
    const groundMaterial = new THREE.MeshLambertMaterial({
      color: 0x1a1a1a
    })
    
    this.terrain = new THREE.Mesh(groundGeometry, groundMaterial)
    this.terrain.rotation.x = -Math.PI / 2
    this.terrain.position.y = -0.1
    this.scene.add(this.terrain)
    this.environmentObjects.push(this.terrain)
  }
  
  createGrid() {
    // Simple grid
    const gridHelper = new THREE.GridHelper(100, 20, 0x440000, 0x220000)
    gridHelper.position.y = 0.01
    gridHelper.material.opacity = 0.5
    gridHelper.material.transparent = true
    this.scene.add(gridHelper)
  }
  
  createPathVisualization() {
    // Create visible path from spawn to base
    const pathPoints = [
      new THREE.Vector3(0, 0.1, 45),
      new THREE.Vector3(18, 0.1, 35),
      new THREE.Vector3(18, 0.1, 15),
      new THREE.Vector3(-12, 0.1, 8),
      new THREE.Vector3(-12, 0.1, -8),
      new THREE.Vector3(8, 0.1, -15),
      new THREE.Vector3(0, 0.1, -25)
    ]
    
    // Path line
    const pathGeometry = new THREE.BufferGeometry().setFromPoints(pathPoints)
    const pathMaterial = new THREE.LineBasicMaterial({ 
      color: 0x444444,
      linewidth: 2
    })
    const pathLine = new THREE.Line(pathGeometry, pathMaterial)
    this.scene.add(pathLine)
    
    // Path dots at waypoints
    pathPoints.forEach((point, index) => {
      const dotGeometry = new THREE.CircleGeometry(1.5, 16)
      const dotMaterial = new THREE.MeshBasicMaterial({ 
        color: index === 0 ? 0x00ff00 : (index === pathPoints.length - 1 ? 0xff0000 : 0x666666)
      })
      const dot = new THREE.Mesh(dotGeometry, dotMaterial)
      dot.rotation.x = -Math.PI / 2
      dot.position.copy(point)
      dot.position.y = 0.05
      this.scene.add(dot)
    })
    
    // Spawn zone indicator
    const spawnGeometry = new THREE.RingGeometry(8, 10, 32)
    const spawnMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x00ff00,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.3
    })
    const spawnRing = new THREE.Mesh(spawnGeometry, spawnMaterial)
    spawnRing.rotation.x = -Math.PI / 2
    spawnRing.position.set(0, 0.05, 45)
    this.scene.add(spawnRing)
  }

  update(deltaTime) {
    this.animationTime += deltaTime
    
    // Pulse the base glow
    if (this.lights.baseGlow) {
      this.lights.baseGlow.intensity = 2 + Math.sin(this.animationTime * 2) * 0.5
    }
  }
  
  render() {
    this.renderer.render(this.scene, this.camera)
  }

  triggerDamageEffect(intensity = 0.5) {
    // Simple flash effect - just brighten ambient briefly
    if (this.lights.ambient) {
      const original = this.lights.ambient.intensity
      this.lights.ambient.intensity = 1.0
      this.lights.ambient.color.setHex(0xff4444)
      setTimeout(() => {
        this.lights.ambient.intensity = original
        this.lights.ambient.color.setHex(0xffffff)
      }, 100)
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
    
    if (this.renderer) {
      this.renderer.dispose()
    }
  }
}

export default GraphicsEngine
