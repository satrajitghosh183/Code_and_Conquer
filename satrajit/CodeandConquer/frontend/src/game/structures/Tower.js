import { Structure } from './Structure.js'
import { TOWER_TYPES } from './TowerTypes.js'
import * as THREE from 'three'

export class Tower extends Structure {
  constructor(towerType, position, options = {}) {
    const config = TOWER_TYPES[towerType]
    if (!config) {
      throw new Error(`Unknown tower type: ${towerType}`)
    }
    
    super('tower', position, config.modelKey, {
      health: config.health,
      maxHealth: config.health,
      cost: config.cost,
      rotation: options.rotation || 0
    })
    
    this.towerType = towerType
    this.damage = config.damage
    this.range = config.range
    this.fireRate = config.fireRate
    this.projectileSpeed = config.projectileSpeed || 20
    this.splashRadius = config.splashRadius || 0
    this.attackType = config.attackType || 'gattling'
    this.lastShot = 0
    this.target = null
    this.turretMesh = null
  }
  
  async load() {
    await super.load()
    
    // Special handling for frost tower - add ice visual effects
    if (this.towerType === 'frost' && this.mesh) {
      this.createFrostVisuals()
    }
    
    // Find turret part for rotation
    if (this.mesh) {
      this.mesh.traverse((child) => {
        // Look for likely turret parts (top parts, or parts with specific names)
        if (child.isMesh && child.position.y > 2) {
          this.turretMesh = child
        }
      })
      
      // If no turret found, use the whole mesh
      if (!this.turretMesh) {
        this.turretMesh = this.mesh
      }
    }
    
    return this.mesh
  }
  
  createFrostVisuals() {
    if (!this.mesh) return
    
    const group = this.mesh
    const s = 1.0
    
    // Add ice crystal particles around the tower
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2
      const radius = 1.5 * s
      
      const iceGeometry = new THREE.OctahedronGeometry(0.15 * s, 0)
      const iceMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x88ddff,
        emissive: 0x44aaff,
        emissiveIntensity: 0.8,
        metalness: 0.1,
        roughness: 0.05,
        transparent: true,
        opacity: 0.7,
        clearcoat: 1.0,
        transmission: 0.6
      })
      
      const iceCrystal = new THREE.Mesh(iceGeometry, iceMaterial)
      iceCrystal.position.set(
        Math.cos(angle) * radius,
        2 * s + Math.sin(i * 2) * 0.3 * s,
        Math.sin(angle) * radius
      )
      iceCrystal.userData.isIceParticle = true
      iceCrystal.userData.particleIndex = i
      group.add(iceCrystal)
    }
    
    // Add frost aura ring at base
    const ringGeometry = new THREE.TorusGeometry(1.2 * s, 0.1 * s, 8, 16)
    const ringMaterial = new THREE.MeshStandardMaterial({
      color: 0x88ddff,
      emissive: 0x44aaff,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.5
    })
    const frostRing = new THREE.Mesh(ringGeometry, ringMaterial)
    frostRing.rotation.x = Math.PI / 2
    frostRing.position.y = 0.1 * s
    frostRing.userData.isFrostRing = true
    group.add(frostRing)
  }
  
  updateFrostAnimation(deltaTime) {
    if (this.towerType !== 'frost' || !this.mesh) return
    
    const time = Date.now() * 0.001
    
    this.mesh.traverse((child) => {
      if (child.userData.isIceParticle) {
        // Rotate and pulse ice particles
        child.rotation.y += deltaTime * 2
        child.rotation.x += deltaTime * 1.5
        const pulse = Math.sin(time * 2 + child.userData.particleIndex) * 0.3 + 0.7
        if (child.material) {
          child.material.opacity = pulse * 0.7
          child.material.emissiveIntensity = pulse * 0.8
        }
      } else if (child.userData.isFrostRing) {
        // Rotate frost ring
        child.rotation.z += deltaTime * 0.5
        const pulse = Math.sin(time * 1.5) * 0.2 + 0.8
        if (child.material) {
          child.material.opacity = pulse * 0.5
          child.material.emissiveIntensity = pulse * 0.6
        }
      }
    })
  }
  
  canFire(currentTime) {
    return (currentTime - this.lastShot) >= (1.0 / this.fireRate)
  }
  
  findTarget(enemies) {
    if (!enemies || enemies.length === 0) {
      this.target = null
      return null
    }
    
    // Find closest enemy in range
    let closest = null
    let closestDist = Infinity
    
    enemies.forEach(enemy => {
      if (!enemy || enemy.isDead || !enemy.position) return
      
      const dist = this.position.distanceTo(enemy.position)
      if (dist <= this.range && dist < closestDist) {
        closest = enemy
        closestDist = dist
      }
    })
    
    this.target = closest
    return closest
  }
  
  aimAtTarget() {
    if (!this.target || !this.turretMesh) return
    
    const targetPos = this.target.position.clone()
    targetPos.y = this.position.y + 2 // Aim at enemy center
    
    // Rotate turret to face target
    this.turretMesh.lookAt(targetPos)
  }
  
  fire(currentTime, projectilePool) {
    if (!this.canFire(currentTime) || !this.target) return null
    
    this.lastShot = currentTime
    this.aimAtTarget()
    
    // Create projectile
    const projectile = {
      position: this.position.clone(),
      target: this.target,
      damage: this.damage,
      speed: this.projectileSpeed,
      splashRadius: this.splashRadius,
      tower: this
    }
    
    // Visual flash effect
    this.flashTurret()
    
    return projectile
  }
  
  flashTurret() {
    if (!this.turretMesh || !this.turretMesh.material) return
    
    const materials = Array.isArray(this.turretMesh.material) 
      ? this.turretMesh.material 
      : [this.turretMesh.material]
    
    materials.forEach(mat => {
      const originalEmissive = mat.emissiveIntensity || 0.2
      mat.emissiveIntensity = 1.0
      
      setTimeout(() => {
        if (mat) {
          mat.emissiveIntensity = originalEmissive
        }
      }, 100)
    })
  }
  
  upgrade() {
    super.upgrade()
    this.damage *= 1.3
    this.range *= 1.1
    this.fireRate *= 1.1
  }
  
  getStats() {
    return {
      type: this.towerType,
      damage: this.damage,
      range: this.range,
      fireRate: this.fireRate,
      health: this.health,
      maxHealth: this.maxHealth,
      level: this.level
    }
  }
}

