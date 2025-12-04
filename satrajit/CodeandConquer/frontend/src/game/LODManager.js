import * as THREE from 'three'

export class LODManager {
  constructor(camera) {
    this.camera = camera
    this.lodObjects = []
  }
  
  add(mesh, distances = [0, 20, 40]) {
    // If mesh already has LOD levels, use them
    if (mesh.high && mesh.medium && mesh.low) {
      const lod = new THREE.LOD()
      lod.addLevel(mesh.high, distances[0])
      lod.addLevel(mesh.medium, distances[1])
      lod.addLevel(mesh.low, distances[2])
      this.lodObjects.push(lod)
      return lod
    }
    
    // Otherwise, create simplified versions
    const lod = new THREE.LOD()
    
    // High detail (original)
    lod.addLevel(mesh.clone(), distances[0])
    
    // Medium detail (simplified)
    const mediumMesh = mesh.clone()
    if (mediumMesh.geometry) {
      // Reduce detail by scaling down
      mediumMesh.scale.set(0.95, 0.95, 0.95)
    }
    lod.addLevel(mediumMesh, distances[1])
    
    // Low detail (very simplified)
    const lowMesh = mesh.clone()
    if (lowMesh.geometry) {
      lowMesh.scale.set(0.9, 0.9, 0.9)
      // Could use geometry simplification here
    }
    lod.addLevel(lowMesh, distances[2])
    
    this.lodObjects.push(lod)
    return lod
  }
  
  update() {
    if (!this.camera) return
    
    this.lodObjects.forEach(lod => {
      lod.update(this.camera)
    })
  }
  
  remove(lod) {
    const index = this.lodObjects.indexOf(lod)
    if (index > -1) {
      this.lodObjects.splice(index, 1)
    }
  }
  
  clear() {
    this.lodObjects.forEach(lod => {
      lod.children.forEach(level => {
        if (level.geometry) level.geometry.dispose()
        if (level.material) {
          if (Array.isArray(level.material)) {
            level.material.forEach(mat => mat.dispose())
          } else {
            level.material.dispose()
          }
        }
      })
    })
    this.lodObjects = []
  }
}

