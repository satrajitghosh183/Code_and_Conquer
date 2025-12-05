import * as THREE from 'three'
import { modelLoader } from '../ModelLoader.js'

export class Structure {
  constructor(type, position, modelKey, options = {}) {
    this.type = type // 'tower', 'wall', 'spawner'
    this.position = position.clone()
    this.modelKey = modelKey
    this.mesh = null
    this.health = options.health || 100
    this.maxHealth = options.maxHealth || this.health
    this.cost = options.cost || 100
    this.level = options.level || 1
    this.isDestroyed = false
    this.healthBar = null
    this.loaded = false
  }
  
  async load() {
    if (this.loaded && this.mesh) return this.mesh
    
    const instance = modelLoader.createInstance(this.modelKey)
    if (!instance) {
      console.warn(`Failed to create instance of model: ${this.modelKey}, creating fallback geometry`)
      // Create fallback geometric representation
      this.mesh = this.createFallbackMesh()
    } else {
      this.mesh = instance
    }
    
    this.mesh.position.copy(this.position)
    this.applyRedTheme()
    this.createHealthBar()
    this.loaded = true
    
    return this.mesh
  }
  
  createFallbackMesh() {
    // Create a simple geometric representation based on structure type
    let geometry, material
    
    if (this.type === 'tower') {
      // Create a tower-like shape (cylinder with cone top)
      const baseGeometry = new THREE.CylinderGeometry(0.8, 1.0, 3, 8)
      const topGeometry = new THREE.ConeGeometry(0.6, 1.5, 8)
      const baseMesh = new THREE.Mesh(baseGeometry, new THREE.MeshStandardMaterial({ color: 0x8B0000 }))
      const topMesh = new THREE.Mesh(topGeometry, new THREE.MeshStandardMaterial({ color: 0x660000 }))
      topMesh.position.y = 2.25
      
      const group = new THREE.Group()
      group.add(baseMesh)
      group.add(topMesh)
      return group
    } else if (this.type === 'wall') {
      // Create a wall-like shape
      geometry = new THREE.BoxGeometry(2, 1.5, 0.5)
      material = new THREE.MeshStandardMaterial({ color: 0x8B0000 })
    } else {
      // Default structure
      geometry = new THREE.BoxGeometry(1.5, 2, 1.5)
      material = new THREE.MeshStandardMaterial({ color: 0x8B0000 })
    }
    
    const mesh = new THREE.Mesh(geometry, material)
    mesh.castShadow = true
    mesh.receiveShadow = true
    return mesh
  }
  
  applyRedTheme() {
    if (!this.mesh) return
    
    this.mesh.traverse((child) => {
      if (child.isMesh && child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material]
        
        materials.forEach(material => {
          // Add red tint to materials
          if (!material.emissive) {
            material.emissive = new THREE.Color(0x330000)
            material.emissiveIntensity = 0.2
          }
          
          // Ensure shadows work
          material.shadowSide = THREE.FrontSide
        })
      }
    })
  }
  
  createHealthBar() {
    if (this.health === this.maxHealth) return // Don't show if full health
    
    // Create simple health bar above structure
    const barWidth = 2
    const barHeight = 0.2
    const barGeometry = new THREE.PlaneGeometry(barWidth, barHeight)
    const barMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 })
    this.healthBar = new THREE.Mesh(barGeometry, barMaterial)
    this.healthBar.position.copy(this.position)
    this.healthBar.position.y += 3
    this.healthBar.lookAt(this.position.x, this.position.y + 3, this.position.z + 1)
  }
  
  updateHealthBar() {
    if (!this.healthBar) {
      if (this.health < this.maxHealth) {
        this.createHealthBar()
        if (this.mesh && this.mesh.parent) {
          this.mesh.parent.add(this.healthBar)
        }
      }
      return
    }
    
    const healthPercent = this.health / this.maxHealth
    this.healthBar.scale.x = healthPercent
    
    // Change color based on health
    if (healthPercent > 0.6) {
      this.healthBar.material.color.setHex(0x00ff00)
    } else if (healthPercent > 0.3) {
      this.healthBar.material.color.setHex(0xffff00)
    } else {
      this.healthBar.material.color.setHex(0xff0000)
    }
    
    if (this.health <= 0) {
      this.removeHealthBar()
    }
  }
  
  removeHealthBar() {
    if (this.healthBar && this.healthBar.parent) {
      this.healthBar.parent.remove(this.healthBar)
      this.healthBar.geometry.dispose()
      this.healthBar.material.dispose()
      this.healthBar = null
    }
  }
  
  takeDamage(amount) {
    if (this.isDestroyed) return
    
    this.health = Math.max(0, this.health - amount)
    this.updateHealthBar()
    
    if (this.health <= 0) {
      this.destroy()
    }
  }
  
  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount)
    this.updateHealthBar()
  }
  
  upgrade() {
    this.level++
    this.maxHealth *= 1.2
    this.health = this.maxHealth
    this.updateHealthBar()
  }
  
  destroy() {
    if (this.isDestroyed) return
    
    this.isDestroyed = true
    this.removeHealthBar()
    
    // Cleanup mesh
    if (this.mesh) {
      this.mesh.traverse((child) => {
        if (child.geometry) child.geometry.dispose()
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => mat.dispose())
          } else {
            child.material.dispose()
          }
        }
        if (child.texture) child.texture.dispose()
      })
    }
  }
  
  getPosition() {
    return this.position.clone()
  }
  
  setPosition(position) {
    this.position.copy(position)
    if (this.mesh) {
      this.mesh.position.copy(position)
    }
    if (this.healthBar) {
      this.healthBar.position.copy(position)
      this.healthBar.position.y += 3
    }
  }
  
  getMesh() {
    return this.mesh
  }
  
  isAlive() {
    return !this.isDestroyed && this.health > 0
  }
}

