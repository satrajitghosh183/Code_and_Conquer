// Enemy Class - Individual enemy unit
// Integrated from dabbott/towerdefense with enhancements

import * as THREE from 'three'
import { ENEMY_TYPES } from './EnemyTypes.js'
import { SoundManager } from './SoundManager.js'

export class Enemy {
  constructor(type, args = {}) {
    // Get default values from enemy type
    const defaults = ENEMY_TYPES[type] || ENEMY_TYPES.spider

    this.type = type
    this.name = defaults.name
    this.model = defaults.model
    this.speed = defaults.speed
    this.health = defaults.health
    this.maxHealth = defaults.health
    this.armor = defaults.armor || 0
    this.lives = defaults.lives || 1
    this.goldReward = defaults.goldReward
    this.xpReward = defaults.xpReward
    this.color = defaults.color
    this.scale = defaults.scale || 1.0
    this.description = defaults.description
    this.isBoss = defaults.isBoss || false

    // Special abilities
    this.healRadius = defaults.healRadius
    this.healAmount = defaults.healAmount
    this.splitCount = defaults.splitCount
    this.splitType = defaults.splitType

    // Visual effects reference (for damage numbers, blood splatter, etc.)
    this.visualEffects = args.visualEffects || null

    // Apply wave modifiers
    if (args.healthMultiplier) {
      this.health *= args.healthMultiplier
      this.maxHealth = this.health
    }
    
    // Apply speed multiplier for progressive difficulty
    if (args.speedMultiplier) {
      this.speed *= args.speedMultiplier
    }

    // Override with custom args
    Object.assign(this, args)

    // State
    this.path = []
    this.next = null
    this.direction = [0, 0]
    this.finished = false
    this.isDead = false
    this.id = `enemy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // 3D representation
    this.mesh = null
    this.healthBar = null

    // Animation
    this.animationTime = 0
  }
  
  // Create the 3D mesh for this enemy
  createMesh() {
    const group = new THREE.Group()
    
    // Body
    const bodyGeometry = new THREE.SphereGeometry(0.8 * this.scale, 12, 12)
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: this.color,
      metalness: 0.3,
      roughness: 0.7,
      emissive: this.color,
      emissiveIntensity: 0.3
    })
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
    body.position.y = 1 * this.scale
    body.castShadow = true
    group.add(body)
    
    // Eyes
    const eyeGeometry = new THREE.SphereGeometry(0.15 * this.scale, 8, 8)
    const eyeMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9
    })
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
    leftEye.position.set(-0.3 * this.scale, 1.1 * this.scale, 0.6 * this.scale)
    group.add(leftEye)
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
    rightEye.position.set(0.3 * this.scale, 1.1 * this.scale, 0.6 * this.scale)
    group.add(rightEye)
    
    // Pupils
    const pupilGeometry = new THREE.SphereGeometry(0.08 * this.scale, 6, 6)
    const pupilMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 })
    
    const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial)
    leftPupil.position.set(-0.3 * this.scale, 1.1 * this.scale, 0.7 * this.scale)
    group.add(leftPupil)
    
    const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial)
    rightPupil.position.set(0.3 * this.scale, 1.1 * this.scale, 0.7 * this.scale)
    group.add(rightPupil)
    
    // Boss crown
    if (this.isBoss) {
      const crownGeometry = new THREE.ConeGeometry(0.3 * this.scale, 0.5 * this.scale, 5)
      const crownMaterial = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        metalness: 0.8,
        roughness: 0.2,
        emissive: 0xffd700,
        emissiveIntensity: 0.5
      })
      const crown = new THREE.Mesh(crownGeometry, crownMaterial)
      crown.position.y = 1.8 * this.scale
      group.add(crown)
    }
    
    // Healer glow
    if (this.healRadius) {
      const healRingGeometry = new THREE.TorusGeometry(this.healRadius / 2, 0.1, 8, 16)
      const healRingMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ff88,
        transparent: true,
        opacity: 0.3
      })
      const healRing = new THREE.Mesh(healRingGeometry, healRingMaterial)
      healRing.rotation.x = Math.PI / 2
      healRing.position.y = 0.5
      group.add(healRing)
    }
    
    // Health bar
    this.createHealthBar(group)
    
    this.mesh = group
    return group
  }
  
  createHealthBar(parent) {
    const barWidth = 1.5 * this.scale
    const barHeight = 0.15
    
    // Background
    const bgGeometry = new THREE.PlaneGeometry(barWidth, barHeight)
    const bgMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x333333,
      side: THREE.DoubleSide
    })
    const bg = new THREE.Mesh(bgGeometry, bgMaterial)
    bg.position.y = 2 * this.scale + 0.5
    parent.add(bg)
    
    // Health fill
    const fillGeometry = new THREE.PlaneGeometry(barWidth - 0.05, barHeight - 0.05)
    const fillMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x00ff00,
      side: THREE.DoubleSide
    })
    this.healthBar = new THREE.Mesh(fillGeometry, fillMaterial)
    this.healthBar.position.y = 2 * this.scale + 0.5
    this.healthBar.position.z = 0.01
    parent.add(this.healthBar)
  }
  
  updateHealthBar() {
    if (!this.healthBar) return
    
    const ratio = this.health / this.maxHealth
    this.healthBar.scale.x = Math.max(0, ratio)
    this.healthBar.position.x = (1 - ratio) * -0.5 * this.scale
    
    // Color based on health
    if (ratio > 0.6) {
      this.healthBar.material.color.setHex(0x00ff00)
    } else if (ratio > 0.3) {
      this.healthBar.material.color.setHex(0xffff00)
    } else {
      this.healthBar.material.color.setHex(0xff0000)
    }
  }
  
  // Kill this enemy
  kill() {
    this.health = 0
    this.isDead = true

    // Play death sound with spatial audio
    if (this.mesh && this.mesh.position) {
      SoundManager.play3D('enemy_death.ogg', this.mesh.position)
    }
  }
  
  // Deal damage to this enemy
  damage(amount) {
    // Apply armor reduction
    const effectiveDamage = amount * (1 - this.armor)

    // Show floating damage number
    if (this.visualEffects && this.mesh && this.mesh.position) {
      // Critical hit if damage is > 30% of max health
      const isCritical = effectiveDamage > this.maxHealth * 0.3

      const damageNumberPos = this.mesh.position.clone()
      damageNumberPos.y += 1.5 * this.scale // Above enemy

      this.visualEffects.createDamageNumber(damageNumberPos, Math.round(effectiveDamage), {
        color: isCritical ? 0xffff00 : 0xff4444,
        size: isCritical ? 1.5 : 1.0,
        duration: isCritical ? 1200 : 1000,
        isCritical
      })
    }

    if (this.health > effectiveDamage) {
      this.health -= effectiveDamage

      // Play hit sound with spatial audio (only if still alive)
      if (this.mesh && this.mesh.position) {
        SoundManager.play3D('enemy_hit.ogg', this.mesh.position, { volume: 0.6 })
      }
    } else {
      this.health = 0
      this.isDead = true

      // Play death sound with spatial audio
      if (this.mesh && this.mesh.position) {
        SoundManager.play3D('enemy_death.ogg', this.mesh.position)
      }

      // Create blood splatter on death
      if (this.visualEffects && this.mesh && this.mesh.position) {
        this.visualEffects.createBloodSplatter(this.mesh.position, {
          count: this.isBoss ? 50 : 30,
          color: 0x8b0000,
          size: this.isBoss ? 0.4 : 0.3,
          duration: this.isBoss ? 800 : 600
        })
      }
    }

    this.updateHealthBar()

    // Visual damage feedback (flash white)
    if (this.mesh) {
      const body = this.mesh.children[0]
      if (body && body.material) {
        const originalColor = body.material.emissive.getHex()
        body.material.emissive.setHex(0xffffff)
        setTimeout(() => {
          if (body.material) {
            body.material.emissive.setHex(originalColor)
          }
        }, 100)
      }
    }

    return this.isDead
  }
  
  // Advance this enemy on its path
  advance() {
    if (this.path && this.path.length >= 1) {
      const prev = this.next || (this.path[0] && { x: this.path[0].x || 0, y: this.path[0].y || 0.5, z: this.path[0].z || 0 })
      const n = this.path.shift()
      
      // Handle both world positions and grid coordinates
      if (n && typeof n.x === 'number') {
        this.next = { x: n.x, y: n.y || 0.5, z: n.z || 0 }
      } else if (Array.isArray(n)) {
        // Grid coordinate - will be converted by game
        this.next = { x: n[1] || 0, y: 0.5, z: n[0] || 0 }
      } else {
        this.finished = true
        return false
      }
      
      if (prev) {
        this.direction = [
          this.next.x - prev.x,
          this.next.y - prev.y,
          (this.next.z || 0) - (prev.z || 0)
        ]
      }
      
      return true
    }
    
    this.finished = true
    return false
  }
  
  // Set a new path (accepts both world positions and grid coordinates)
  setPath(path) {
    if (!path || path.length === 0) {
      this.finished = true
      return
    }
    
    // Convert path to world positions if needed
    if (path[0] && typeof path[0].x === 'number' && typeof path[0].y === 'number') {
      // Already world positions
      this.path = path.map(p => ({ x: p.x, y: p.y || 0.5, z: p.z || 0 }))
    } else if (Array.isArray(path[0])) {
      // Grid coordinates - convert to world (will be handled by game)
      this.path = path
    } else {
      // Assume world positions
      this.path = path.slice()
    }
    
    this.finished = false
    this.advance()
  }
  
  // Get enemies that should spawn when this enemy dies (for splitter type)
  getSpawnOnDeath() {
    if (!this.splitCount || !this.splitType) return []
    
    const spawns = []
    for (let i = 0; i < this.splitCount; i++) {
      spawns.push({
        type: this.splitType,
        position: this.mesh ? this.mesh.position.clone() : null
      })
    }
    return spawns
  }
  
  // Update enemy animation
  updateAnimation(deltaTime) {
    if (!this.mesh) return
    
    this.animationTime += deltaTime
    
    // Bobbing animation
    const bobOffset = Math.sin(this.animationTime * 5 + this.id.charCodeAt(0)) * 0.2
    this.mesh.position.y += bobOffset * deltaTime
    
    // Slight rotation wobble
    this.mesh.rotation.y += Math.sin(this.animationTime * 3) * 0.01
  }
  
  // Clean up
  destroy() {
    if (this.mesh) {
      this.mesh.traverse((child) => {
        if (child.geometry) child.geometry.dispose()
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose())
          } else {
            child.material.dispose()
          }
        }
      })
    }
  }
}
