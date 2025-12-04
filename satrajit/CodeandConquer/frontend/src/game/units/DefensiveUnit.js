import * as THREE from 'three'
import { modelLoader } from '../ModelLoader.js'

export class DefensiveUnit {
  constructor(unitType, position, spawner) {
    this.unitType = unitType
    this.position = position.clone()
    this.spawner = spawner
    this.mesh = null
    this.health = 100
    this.maxHealth = 100
    this.damage = 20
    this.speed = 3
    this.attackRange = 5
    this.attackCooldown = 1.0
    this.lastAttack = 0
    
    // Patrol behavior
    this.patrolCenter = spawner ? spawner.position.clone() : position.clone()
    this.patrolRadius = spawner ? spawner.patrolRadius : 15
    this.patrolTarget = null
    this.patrolAngle = Math.random() * Math.PI * 2
    
    // Combat
    this.target = null
    this.isDead = false
    this.state = 'patrol' // 'patrol', 'chase', 'attack', 'return'
    
    this.loaded = false
  }
  
  async load() {
    if (this.loaded && this.mesh) return this.mesh
    
    const instance = modelLoader.createInstance(this.unitType)
    if (!instance) {
      console.warn(`Failed to load unit model: ${this.unitType}, using placeholder`)
      // Create placeholder
      const geometry = new THREE.BoxGeometry(0.8, 1.2, 0.8)
      const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 })
      this.mesh = new THREE.Mesh(geometry, material)
    } else {
      this.mesh = instance
      // Scale is already applied by ModelLoader.createInstance()
      // No need to scale again
    }
    
    this.mesh.position.copy(this.position)
    this.mesh.castShadow = true
    this.mesh.receiveShadow = true
    this.loaded = true
    
    return this.mesh
  }
  
  update(deltaTime, enemies, spatialGrid) {
    if (this.isDead) return
    
    const currentTime = Date.now() / 1000
    
    // Find nearest enemy
    this.findTarget(enemies, spatialGrid)
    
    // State machine
    if (this.target && this.target.position.distanceTo(this.position) <= this.attackRange) {
      this.state = 'attack'
      this.attack(currentTime)
    } else if (this.target) {
      this.state = 'chase'
      this.chaseTarget(deltaTime)
    } else {
      this.state = 'patrol'
      this.patrol(deltaTime)
    }
    
    // Update mesh position
    if (this.mesh) {
      this.mesh.position.copy(this.position)
      
      // Bob animation
      this.mesh.position.y = this.position.y + Math.sin(Date.now() * 0.005 + this.mesh.id) * 0.2
      
      // Face movement direction
      if (this.target && this.state === 'chase') {
        const direction = new THREE.Vector3()
          .subVectors(this.target.position, this.position)
          .normalize()
        if (direction.length() > 0) {
          this.mesh.lookAt(this.position.clone().add(direction))
        }
      }
    }
  }
  
  findTarget(enemies, spatialGrid) {
    if (!enemies || enemies.length === 0) {
      this.target = null
      return
    }
    
    // Use spatial grid if available for optimization
    let candidates = enemies
    if (spatialGrid) {
      const nearby = spatialGrid.getNearby(this.position, this.patrolRadius * 2)
      candidates = nearby.map(item => item.entity).filter(e => e && !e.isDead)
    }
    
    // Find closest enemy
    let closest = null
    let closestDist = Infinity
    
    candidates.forEach(enemy => {
      if (!enemy || enemy.isDead || !enemy.position) return
      
      const dist = this.position.distanceTo(enemy.position)
      if (dist <= this.patrolRadius * 2 && dist < closestDist) {
        closest = enemy
        closestDist = dist
      }
    })
    
    this.target = closest
  }
  
  patrol(deltaTime) {
    // Move in a circle around patrol center
    this.patrolAngle += deltaTime * 0.5
    
    const targetX = this.patrolCenter.x + Math.cos(this.patrolAngle) * this.patrolRadius
    const targetZ = this.patrolCenter.z + Math.sin(this.patrolAngle) * this.patrolRadius
    
    const direction = new THREE.Vector3(targetX, this.position.y, targetZ)
      .sub(this.position)
      .normalize()
    
    this.position.add(direction.multiplyScalar(this.speed * deltaTime * 0.5))
    
    // Keep within patrol radius
    const distFromCenter = this.position.distanceTo(this.patrolCenter)
    if (distFromCenter > this.patrolRadius) {
      const backDirection = new THREE.Vector3()
        .subVectors(this.patrolCenter, this.position)
        .normalize()
      this.position.add(backDirection.multiplyScalar(this.speed * deltaTime))
    }
  }
  
  chaseTarget(deltaTime) {
    if (!this.target || !this.target.position) return
    
    const direction = new THREE.Vector3()
      .subVectors(this.target.position, this.position)
      .normalize()
    
    this.position.add(direction.multiplyScalar(this.speed * deltaTime))
  }
  
  attack(currentTime) {
    if (!this.target || !this.canAttack(currentTime)) return
    
    this.lastAttack = currentTime
    
    // Deal damage to target
    if (this.target.takeDamage) {
      this.target.takeDamage(this.damage)
    } else if (this.target.health !== undefined) {
      this.target.health -= this.damage
      if (this.target.health <= 0) {
        this.target.isDead = true
        this.target = null
      }
    }
    
    // Visual feedback
    if (this.mesh) {
      const originalScale = this.mesh.scale.clone()
      this.mesh.scale.multiplyScalar(1.2)
      setTimeout(() => {
        if (this.mesh) {
          this.mesh.scale.copy(originalScale)
        }
      }, 100)
    }
  }
  
  canAttack(currentTime) {
    return (currentTime - this.lastAttack) >= this.attackCooldown
  }
  
  takeDamage(amount) {
    this.health -= amount
    if (this.health <= 0) {
      this.die()
    }
  }
  
  die() {
    this.isDead = true
    if (this.spawner) {
      this.spawner.removeUnit(this)
    }
    
    // Fade out animation
    if (this.mesh) {
      const fadeOut = () => {
        if (this.mesh && this.mesh.material) {
          const materials = Array.isArray(this.mesh.material) 
            ? this.mesh.material 
            : [this.mesh.material]
          
          materials.forEach(mat => {
            if (mat.opacity !== undefined) {
              mat.opacity -= 0.1
              mat.transparent = true
              if (mat.opacity <= 0) {
                this.destroy()
              } else {
                setTimeout(fadeOut, 50)
              }
            }
          })
        }
      }
      fadeOut()
    }
  }
  
  destroy() {
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
      })
    }
  }
  
  getPosition() {
    return this.position.clone()
  }
  
  getMesh() {
    return this.mesh
  }
}

