// =============================================================================
// PATH MANAGER - Enemy Movement Path System
// =============================================================================

import * as THREE from 'three'

export default class PathManager {
  constructor(scene, basePosition = new THREE.Vector3(0, 0, -25)) {
    this.scene = scene
    this.basePosition = basePosition.clone()
    this.paths = new Map()
    this.visualGroup = new THREE.Group()
    this.visualGroup.name = 'pathVisuals'
    this.scene.add(this.visualGroup)
    
    // Default colors
    this.defaultColors = [
      0x00ff88,  // Green
      0xff4488,  // Pink
      0x4488ff,  // Blue
    ]
    
    // Spawn Z position
    this.customSpawnZ = 50
    
    // Register default path
    this._registerDefaultPaths()
    
    // Create visual representation
    this.createVisuals()
    
    console.log('📍 PathManager initialized with', this.paths.size, 'paths')
  }
  
  _registerDefaultPaths() {
    const zStart = this.customSpawnZ
    const zBase = this.basePosition.z
    
    // Main serpentine path
    const mainPath = {
      id: 'main',
      spawn: new THREE.Vector3(0, 0.5, zStart),
      waypoints: [
        new THREE.Vector3(0, 0.5, zStart),          // Spawn
        new THREE.Vector3(20, 0.5, 40),             // Curve right
        new THREE.Vector3(25, 0.5, 28),             // Continue right
        new THREE.Vector3(10, 0.5, 15),             // Back toward center
        new THREE.Vector3(-15, 0.5, 8),             // Curve left
        new THREE.Vector3(-20, 0.5, -5),            // Continue left
        new THREE.Vector3(-8, 0.5, -12),            // Back toward center
        new THREE.Vector3(5, 0.5, -18),             // Slight right
        new THREE.Vector3(0, 0.5, zBase)            // End at base
      ],
      color: this.defaultColors[0]
    }
    
    this.registerPath(mainPath)
    
    // Alias 'center' to 'main'
    this.paths.set('center', mainPath)
  }
  
  registerPath(pathData) {
    const { id, spawn, waypoints, color } = pathData
    
    this.paths.set(id, {
      id,
      spawn: spawn.clone(),
      waypoints: waypoints.map(wp => 
        wp instanceof THREE.Vector3 ? wp.clone() : new THREE.Vector3(wp.x, wp.y || 0.5, wp.z)
      ),
      color: color || this.defaultColors[0]
    })
    
    console.log(`📍 Path '${id}' registered with ${waypoints.length} waypoints`)
  }
  
  getPath(id) {
    return this.paths.get(id) || this.paths.get('main')
  }
  
  getRandomPath() {
    const pathIds = Array.from(this.paths.keys()).filter(id => id !== 'center')
    if (pathIds.length === 0) return null
    const randomId = pathIds[Math.floor(Math.random() * pathIds.length)]
    return this.paths.get(randomId)
  }
  
  getAllPaths() {
    return Array.from(this.paths.values())
  }
  
  createVisuals() {
    // Clear existing visuals
    while (this.visualGroup.children.length > 0) {
      const child = this.visualGroup.children[0]
      if (child.geometry) child.geometry.dispose()
      if (child.material) child.material.dispose()
      this.visualGroup.remove(child)
    }
    
    const mainPath = this.paths.get('main')
    if (!mainPath) return
    
    const waypoints = mainPath.waypoints
    const color = mainPath.color
    
    // Create visible path line
    const points = waypoints.map(wp => new THREE.Vector3(wp.x, 0.2, wp.z))
    
    // Main path line - glowing tube
    const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5)
    const tubeGeom = new THREE.TubeGeometry(curve, waypoints.length * 10, 0.4, 8, false)
    const tubeMat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.4
    })
    const tube = new THREE.Mesh(tubeGeom, tubeMat)
    this.visualGroup.add(tube)
    
    // Inner bright line
    const innerTubeGeom = new THREE.TubeGeometry(curve, waypoints.length * 10, 0.15, 8, false)
    const innerTubeMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.6
    })
    const innerTube = new THREE.Mesh(innerTubeGeom, innerTubeMat)
    this.visualGroup.add(innerTube)
    
    // Waypoint markers
    waypoints.forEach((wp, index) => {
      const isSpawn = index === 0
      const isEnd = index === waypoints.length - 1
      const markerSize = isSpawn || isEnd ? 1.5 : 0.6
      const markerColor = isSpawn ? 0x00ff44 : (isEnd ? 0xff4400 : color)
      
      // Ring marker
      const ringGeom = new THREE.RingGeometry(markerSize * 0.6, markerSize, 16)
      const ringMat = new THREE.MeshBasicMaterial({
        color: markerColor,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide
      })
      const ring = new THREE.Mesh(ringGeom, ringMat)
      ring.rotation.x = -Math.PI / 2
      ring.position.set(wp.x, 0.15, wp.z)
      this.visualGroup.add(ring)
      
      // Vertical glow pillar for spawn/end
      if (isSpawn || isEnd) {
        const pillarGeom = new THREE.CylinderGeometry(markerSize * 0.3, markerSize * 0.5, 3, 16)
        const pillarMat = new THREE.MeshBasicMaterial({
          color: markerColor,
          transparent: true,
          opacity: 0.3
        })
        const pillar = new THREE.Mesh(pillarGeom, pillarMat)
        pillar.position.set(wp.x, 1.5, wp.z)
        this.visualGroup.add(pillar)
      }
    })
    
    // Animated energy flow (stored for update)
    this.energyFlowParticles = []
    const numFlowParticles = 15
    const particleGeom = new THREE.SphereGeometry(0.3, 8, 8)
    const particleMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9
    })
    
    for (let i = 0; i < numFlowParticles; i++) {
      const particle = new THREE.Mesh(particleGeom.clone(), particleMat.clone())
      particle.userData.progress = i / numFlowParticles
      particle.userData.speed = 0.05 + Math.random() * 0.03
      this.visualGroup.add(particle)
      this.energyFlowParticles.push({ mesh: particle, curve })
    }
  }
  
  update(deltaTime) {
    // Animate energy flow particles along path
    this.energyFlowParticles.forEach(particle => {
      particle.mesh.userData.progress += particle.mesh.userData.speed * deltaTime
      
      if (particle.mesh.userData.progress > 1) {
        particle.mesh.userData.progress = 0
      }
      
      if (particle.curve) {
        const point = particle.curve.getPointAt(particle.mesh.userData.progress)
        particle.mesh.position.copy(point)
        particle.mesh.position.y += 0.3 + Math.sin(Date.now() * 0.005) * 0.2
        
        // Pulse size
        const scale = 0.8 + Math.sin(Date.now() * 0.01 + particle.mesh.userData.progress * 10) * 0.3
        particle.mesh.scale.setScalar(scale)
      }
    })
  }
  
  setPathColor(pathId, color) {
    const path = this.paths.get(pathId)
    if (path) {
      path.color = color
    }
  }
  
  destroy() {
    this.visualGroup.traverse(child => {
      if (child.geometry) child.geometry.dispose()
      if (child.material) child.material.dispose()
    })
    this.scene.remove(this.visualGroup)
    this.paths.clear()
    this.energyFlowParticles = []
  }
}
