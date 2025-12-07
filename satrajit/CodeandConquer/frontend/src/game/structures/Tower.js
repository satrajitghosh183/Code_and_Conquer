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

