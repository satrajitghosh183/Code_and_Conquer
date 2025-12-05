// =============================================================================
// OPTIMIZATION MANAGER - Advanced performance optimization
// Features: Object pooling, frustum culling, LOD management, render optimization
// =============================================================================

import * as THREE from 'three'

export class OptimizationManager {
  constructor(scene, camera, renderer) {
    this.scene = scene
    this.camera = camera
    this.renderer = renderer
    
    // Object pools
    this.pools = {
      projectiles: [],
      particles: [],
      effects: [],
      enemies: []
    }
    
    this.poolSizes = {
      projectiles: 200,
      particles: 500,
      effects: 100,
      enemies: 100
    }
    
    // Frustum culling
    this.frustum = new THREE.Frustum()
    this.cameraViewProjectionMatrix = new THREE.Matrix4()
    this.cullableObjects = []
    
    // LOD management
    this.lodObjects = new Map()
    
    // Performance monitoring
    this.stats = {
      objectsInView: 0,
      objectsCulled: 0,
      pooledObjectsActive: 0,
      drawCalls: 0
    }
    
    // Optimization settings
    this.settings = {
      enableFrustumCulling: true,
      enableLOD: true,
      enableInstancing: true,
      maxDrawCalls: 1000,
      cullDistance: 200
    }
    
    this.initializePools()
  }
  
  // =========================================================================
  // OBJECT POOLING
  // =========================================================================
  
  initializePools() {
    console.log('[Optimization] Initializing object pools...')
    
    // Pre-allocate objects for each pool type
    Object.keys(this.pools).forEach(type => {
      this.pools[type] = []
      for (let i = 0; i < this.poolSizes[type]; i++) {
        const obj = this.createPooledObject(type)
        if (obj) {
          obj.pooled = true
          obj.inUse = false
          obj.poolType = type
          this.pools[type].push(obj)
        }
      }
    })
    
    console.log('[Optimization] Pools initialized:', Object.keys(this.pools).map(k => `${k}: ${this.pools[k].length}`))
  }
  
  createPooledObject(type) {
    switch(type) {
      case 'projectiles':
        return this.createProjectileTemplate()
      case 'particles':
        return this.createParticleTemplate()
      case 'effects':
        return this.createEffectTemplate()
      default:
        return null
    }
  }
  
  createProjectileTemplate() {
    const geometry = new THREE.SphereGeometry(0.15, 8, 8)
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.visible = false
    return mesh
  }
  
  createParticleTemplate() {
    const geometry = new THREE.SphereGeometry(0.1, 4, 4)
    const material = new THREE.MeshBasicMaterial({ 
      color: 0xffffff,
      transparent: true
    })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.visible = false
    return mesh
  }
  
  createEffectTemplate() {
    const geometry = new THREE.RingGeometry(1, 1.2, 16)
    const material = new THREE.MeshBasicMaterial({ 
      transparent: true,
      side: THREE.DoubleSide
    })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.visible = false
    return mesh
  }
  
  getFromPool(type) {
    const pool = this.pools[type]
    if (!pool) return null
    
    let obj = pool.find(o => !o.inUse)
    
    if (!obj && pool.length < this.poolSizes[type] * 2) {
      // Pool exhausted, create new object
      obj = this.createPooledObject(type)
      if (obj) {
        obj.pooled = true
        obj.poolType = type
        pool.push(obj)
      }
    }
    
    if (obj) {
      obj.inUse = true
      obj.visible = true
      return obj
    }
    
    return null
  }
  
  returnToPool(obj) {
    if (!obj || !obj.pooled) return
    
    obj.inUse = false
    obj.visible = false
    
    // Reset object state
    if (obj.position) obj.position.set(0, 0, 0)
    if (obj.rotation) obj.rotation.set(0, 0, 0)
    if (obj.scale) obj.scale.set(1, 1, 1)
    if (obj.material) {
      obj.material.opacity = 1.0
      obj.material.color.setHex(0xffffff)
    }
  }
  
  getPoolStats() {
    const stats = {}
    Object.keys(this.pools).forEach(type => {
      const pool = this.pools[type]
      stats[type] = {
        total: pool.length,
        inUse: pool.filter(o => o.inUse).length,
        available: pool.filter(o => !o.inUse).length
      }
    })
    return stats
  }
  
  // =========================================================================
  // FRUSTUM CULLING
  // =========================================================================
  
  registerCullableObject(object) {
    if (!this.cullableObjects.includes(object)) {
      this.cullableObjects.push(object)
      object.originalVisible = object.visible
    }
  }
  
  unregisterCullableObject(object) {
    const index = this.cullableObjects.indexOf(object)
    if (index > -1) {
      this.cullableObjects.splice(index, 1)
    }
  }
  
  updateFrustumCulling() {
    if (!this.settings.enableFrustumCulling) return
    
    // Update frustum
    this.camera.updateMatrixWorld()
    this.cameraViewProjectionMatrix.multiplyMatrices(
      this.camera.projectionMatrix,
      this.camera.matrixWorldInverse
    )
    this.frustum.setFromProjectionMatrix(this.cameraViewProjectionMatrix)
    
    let inView = 0
    let culled = 0
    
    // Check each object against frustum
    this.cullableObjects.forEach(obj => {
      if (!obj || !obj.geometry) return
      
      // Get bounding sphere
      if (!obj.geometry.boundingSphere) {
        obj.geometry.computeBoundingSphere()
      }
      
      const sphere = obj.geometry.boundingSphere.clone()
      sphere.applyMatrix4(obj.matrixWorld)
      
      // Check if in frustum
      const inFrustum = this.frustum.intersectsSphere(sphere)
      
      // Distance culling
      const distance = this.camera.position.distanceTo(obj.position)
      const tooFar = distance > this.settings.cullDistance
      
      const shouldBeVisible = inFrustum && !tooFar && obj.originalVisible !== false
      
      if (obj.visible !== shouldBeVisible) {
        obj.visible = shouldBeVisible
      }
      
      if (shouldBeVisible) inView++
      else culled++
    })
    
    this.stats.objectsInView = inView
    this.stats.objectsCulled = culled
  }
  
  // =========================================================================
  // LOD MANAGEMENT
  // =========================================================================
  
  registerLOD(object, lodLevels) {
    // lodLevels: [ { distance: 0, detail: 'high' }, { distance: 30, detail: 'medium' }, ... ]
    this.lodObjects.set(object, {
      levels: lodLevels,
      currentLevel: 0
    })
  }
  
  updateLOD() {
    if (!this.settings.enableLOD) return
    
    this.lodObjects.forEach((lodData, object) => {
      if (!object.visible) return
      
      const distance = this.camera.position.distanceTo(object.position)
      
      // Find appropriate LOD level
      let newLevel = 0
      for (let i = lodData.levels.length - 1; i >= 0; i--) {
        if (distance >= lodData.levels[i].distance) {
          newLevel = i
          break
        }
      }
      
      // Apply LOD if changed
      if (newLevel !== lodData.currentLevel) {
        lodData.currentLevel = newLevel
        const detail = lodData.levels[newLevel].detail
        this.applyLODLevel(object, detail)
      }
    })
  }
  
  applyLODLevel(object, detail) {
    // Apply visual detail changes based on LOD level
    if (!object.traverse) return
    
    object.traverse(child => {
      if (!child.isMesh) return
      
      switch(detail) {
        case 'high':
          child.castShadow = true
          child.receiveShadow = true
          if (child.material) {
            child.material.flatShading = false
          }
          break
          
        case 'medium':
          child.castShadow = true
          child.receiveShadow = false
          if (child.material) {
            child.material.flatShading = false
          }
          break
          
        case 'low':
          child.castShadow = false
          child.receiveShadow = false
          if (child.material) {
            child.material.flatShading = true
          }
          break
      }
    })
  }
  
  // =========================================================================
  // RENDER OPTIMIZATION
  // =========================================================================
  
  optimizeRendering() {
    // Auto-sort transparent objects
    this.scene.traverse(obj => {
      if (obj.isMesh && obj.material && obj.material.transparent) {
        obj.renderOrder = 999
      }
    })
    
    // Update renderer info
    this.stats.drawCalls = this.renderer.info.render.calls
  }
  
  // =========================================================================
  // BATCH UPDATES
  // =========================================================================
  
  createInstancedMesh(geometry, material, count) {
    const mesh = new THREE.InstancedMesh(geometry, material, count)
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    return mesh
  }
  
  updateInstancedMesh(mesh, positions, rotations, scales) {
    const matrix = new THREE.Matrix4()
    const position = new THREE.Vector3()
    const rotation = new THREE.Quaternion()
    const scale = new THREE.Vector3(1, 1, 1)
    
    for (let i = 0; i < positions.length; i++) {
      position.copy(positions[i])
      if (rotations && rotations[i]) rotation.copy(rotations[i])
      if (scales && scales[i]) scale.copy(scales[i])
      
      matrix.compose(position, rotation, scale)
      mesh.setMatrixAt(i, matrix)
    }
    
    mesh.instanceMatrix.needsUpdate = true
  }
  
  // =========================================================================
  // UPDATE LOOP
  // =========================================================================
  
  update() {
    // Update frustum culling
    this.updateFrustumCulling()
    
    // Update LOD
    this.updateLOD()
    
    // Optimize rendering
    this.optimizeRendering()
    
    // Update stats
    const poolStats = this.getPoolStats()
    this.stats.pooledObjectsActive = Object.values(poolStats)
      .reduce((sum, stat) => sum + stat.inUse, 0)
  }
  
  getStats() {
    return { ...this.stats }
  }
  
  // =========================================================================
  // CLEANUP
  // =========================================================================
  
  dispose() {
    // Clear pools
    Object.values(this.pools).forEach(pool => {
      pool.forEach(obj => {
        if (obj.geometry) obj.geometry.dispose()
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose())
          } else {
            obj.material.dispose()
          }
        }
        if (obj.parent) obj.parent.remove(obj)
      })
    })
    
    this.pools = {}
    this.cullableObjects = []
    this.lodObjects.clear()
  }
}

export default OptimizationManager

