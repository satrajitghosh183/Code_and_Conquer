// Homing Projectile System
// Inspired by chriscourses/tower-defense projectile tracking

import * as THREE from 'three'

export class HomingProjectile {
  constructor(options = {}) {
    this.position = options.position ? options.position.clone() : new THREE.Vector3()
    this.target = options.target
    this.damage = options.damage || 20
    this.speed = options.speed || 30
    this.splashRadius = options.splashRadius || 0
    this.attackType = options.attackType || 'gattling'
    this.sourcePosition = options.sourcePosition ? options.sourcePosition.clone() : this.position.clone()
    
    // Effects
    this.burnDamage = options.burnDamage || 0
    this.burnDuration = options.burnDuration || 0
    this.slowAmount = options.slowAmount || 0
    this.slowDuration = options.slowDuration || 0
    this.chainCount = options.chainCount || 0
    this.armorPiercing = options.armorPiercing || 0
    
    // Create mesh
    this.mesh = this.createMesh()
    
    // Trail particles
    this.trail = []
    this.maxTrailLength = 10
    
    // State
    this.isActive = true
    this.hasHit = false
    this.travelDistance = 0
    this.maxDistance = 100
    
    // Callbacks
    this.onHit = options.onHit || null
    this.onMiss = options.onMiss || null
  }
  
  createMesh() {
    const geometry = new THREE.SphereGeometry(0.3, 8, 8)
    
    let color = 0xff0000
    switch(this.attackType) {
      case 'missile': color = 0xff6600; break
      case 'laser': color = 0x00aaff; break
      case 'frost': color = 0x88ddff; break
      case 'fire': color = 0xff4400; break
      case 'tesla': color = 0xffff00; break
      case 'sniper': color = 0xff00ff; break
      default: color = 0xff0000
    }
    
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.9
    })
    
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.copy(this.position)
    
    return mesh
  }
  
  update(deltaTime, scene) {
    if (!this.isActive || this.hasHit) return false
    
    // Check if target is still valid
    if (!this.target || this.target.isDead) {
      // Find new target or deactivate
      this.isActive = false
      if (this.onMiss) this.onMiss(this)
      return false
    }
    
    // Get target position
    const targetPos = this.target.position || (this.target.mesh ? this.target.mesh.position : null)
    if (!targetPos) {
      this.isActive = false
      return false
    }
    
    // Calculate homing trajectory (from chriscourses)
    const direction = new THREE.Vector3()
    direction.subVectors(targetPos, this.position)
    
    // Angle-based homing for smooth curves
    const angle = Math.atan2(direction.z, direction.x)
    const currentAngle = Math.atan2(this.mesh.position.z - this.position.z, this.mesh.position.x - this.position.x) || angle
    
    // Smooth rotation towards target
    const turnSpeed = 10 * deltaTime
    const newAngle = currentAngle + (angle - currentAngle) * turnSpeed
    
    // Calculate velocity
    const velocity = new THREE.Vector3(
      Math.cos(newAngle) * this.speed * deltaTime,
      0,
      Math.sin(newAngle) * this.speed * deltaTime
    )
    
    // Y-axis tracking (3D)
    const yDiff = targetPos.y - this.position.y
    velocity.y = yDiff * 3 * deltaTime
    
    // Update position
    this.position.add(velocity)
    this.mesh.position.copy(this.position)
    
    // Track distance
    this.travelDistance += velocity.length()
    
    // Add trail point
    if (scene) {
      this.updateTrail(scene)
    }
    
    // Check collision
    const distanceToTarget = this.position.distanceTo(targetPos)
    if (distanceToTarget < 1.5) {
      this.hit()
      return false
    }
    
    // Check max distance
    if (this.travelDistance > this.maxDistance) {
      this.isActive = false
      if (this.onMiss) this.onMiss(this)
      return false
    }
    
    return true
  }
  
  updateTrail(scene) {
    // Add new trail point
    const trailGeom = new THREE.SphereGeometry(0.15, 4, 4)
    const trailMat = new THREE.MeshBasicMaterial({
      color: this.mesh.material.color.getHex(),
      transparent: true,
      opacity: 0.5
    })
    const trailMesh = new THREE.Mesh(trailGeom, trailMat)
    trailMesh.position.copy(this.position)
    
    scene.add(trailMesh)
    this.trail.push({ mesh: trailMesh, age: 0 })
    
    // Update and remove old trail points
    for (let i = this.trail.length - 1; i >= 0; i--) {
      this.trail[i].age++
      this.trail[i].mesh.material.opacity = 0.5 * (1 - this.trail[i].age / this.maxTrailLength)
      this.trail[i].mesh.scale.setScalar(1 - this.trail[i].age / this.maxTrailLength)
      
      if (this.trail[i].age > this.maxTrailLength) {
        scene.remove(this.trail[i].mesh)
        this.trail[i].mesh.geometry.dispose()
        this.trail[i].mesh.material.dispose()
        this.trail.splice(i, 1)
      }
    }
  }
  
  hit() {
    this.hasHit = true
    this.isActive = false
    
    // Apply damage
    if (this.target) {
      let effectiveDamage = this.damage
      
      // Armor piercing
      if (this.armorPiercing > 0 && this.target.armor) {
        effectiveDamage = this.damage * (1 - (this.target.armor * (1 - this.armorPiercing)))
      }
      
      if (this.target.damage) {
        this.target.damage(effectiveDamage)
      } else if (typeof this.target.health === 'number') {
        this.target.health -= effectiveDamage
        if (this.target.health <= 0) {
          this.target.isDead = true
        }
      }
      
      // Apply burn
      if (this.burnDamage > 0 && this.burnDuration > 0) {
        this.target.burn = {
          damage: this.burnDamage,
          duration: this.burnDuration,
          ticksRemaining: Math.floor(this.burnDuration / 500)
        }
      }
      
      // Apply slow
      if (this.slowAmount > 0 && this.slowDuration > 0) {
        this.target.slow = {
          amount: this.slowAmount,
          duration: this.slowDuration,
          endTime: Date.now() + this.slowDuration
        }
      }
    }
    
    if (this.onHit) {
      this.onHit(this, this.target)
    }
  }
  
  destroy(scene) {
    // Remove mesh
    if (this.mesh && scene) {
      scene.remove(this.mesh)
      this.mesh.geometry.dispose()
      this.mesh.material.dispose()
    }
    
    // Remove trail
    this.trail.forEach(t => {
      if (scene) scene.remove(t.mesh)
      t.mesh.geometry.dispose()
      t.mesh.material.dispose()
    })
    this.trail = []
    
    this.isActive = false
  }
}

export default HomingProjectile

