// =============================================================================
// ENHANCED ENEMY CLASS - With Rich Visuals and Behaviors
// =============================================================================

import * as THREE from 'three'
import { ENEMY_TYPES, createEnemyMesh } from './EnemyTypes.js'

export class Enemy {
  constructor(type, args = {}) {
    const config = ENEMY_TYPES[type] || ENEMY_TYPES.spider
    
    this.type = type
    this.config = config
    this.name = config.name
    this.tier = config.tier || 1
    this.color = config.color || 0x00ff00
    this.glowColor = config.glowColor || config.color
    
    const healthMult = args.healthMultiplier || 1
    const speedMult = args.speedMultiplier || 1
    
    this.health = Math.floor((config.health || 100) * healthMult)
    this.maxHealth = this.health
    this.speed = (config.speed || 5) * speedMult
    this.originalSpeed = this.speed
    this.armor = config.armor || 0
    this.lives = config.lives || 1
    this.goldReward = config.goldReward || 10
    this.xpReward = config.xpReward || 5
    this.scale = config.scale || 1.0
    this.isBoss = config.isBoss || false
    
    // Behavior
    this.behavior = config.behavior || 'standard'
    
    // Healer abilities
    this.healRadius = config.healRadius || 0
    this.healAmount = config.healAmount || 0
    this.healInterval = config.healInterval || 1.0
    this.lastHealTime = 0
    this.hasAura = config.hasAura || false
    
    // Splitter abilities
    this.splitCount = config.splitCount || 0
    this.splitType = config.splitType || null
    
    // Special abilities
    this.phaseInterval = config.phaseInterval || 0
    this.phaseDuration = config.phaseDuration || 0
    this.isPhasing = false
    this.lastPhaseTime = 0
    
    // Berserker
    this.rageThreshold = config.rageThreshold || 0
    this.rageSpeedMult = config.rageSpeedMult || 1
    this.isEnraged = false
    
    // Shield
    this.hasShield = config.hasShield || false
    this.shieldHealth = config.shieldHealth || 0
    this.maxShieldHealth = this.shieldHealth
    this.shieldRegen = config.shieldRegen || 0
    
    // Status effects
    this.slowAmount = 0
    this.burnDamage = 0
    this.burnEndTime = 0
    this.isStunned = false
    this.stunEndTime = 0
    
    // State
    this.isDead = false
    this.finished = false
    this.reachedEnd = false
    
    // Path following
    this.path = []
    this.next = null
    this.position = args.position ? args.position.clone() : new THREE.Vector3(0, 0.5, 45)
    
    // Mesh references
    this.mesh = null
    this.bodyMesh = null
    this.healthBarFill = null
    this.healthBarBg = null
    this.shieldBarFill = null
    this.auraMesh = null
    this.shieldMesh = null
    
    this.id = `enemy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    this.animationTime = 0
  }
  
  createMesh() {
    // Use the enhanced mesh generator from EnemyTypes
    const group = createEnemyMesh({ type: this.type }, this.scale)
    
    // Find body mesh for effects
    group.traverse((child) => {
      if (child.isMesh && !this.bodyMesh) {
        this.bodyMesh = child
      }
      if (child.name === 'shield') {
        this.shieldMesh = child
      }
      if (child.name === 'healAura') {
        this.auraMesh = child
      }
    })
    
    // Create health bar
    this.createHealthBar(group)
    
    // Position the group
    group.position.copy(this.position)
    
    this.mesh = group
    this.mesh.userData.enemy = this
    
    return group
  }
  
  createHealthBar(group) {
    const barWidth = 1.2 * this.scale
    const barHeight = 0.12
    const barY = 1.8 * this.scale
    
    // Background
    const bgGeom = new THREE.PlaneGeometry(barWidth, barHeight)
    const bgMat = new THREE.MeshBasicMaterial({
      color: 0x222222,
      side: THREE.DoubleSide
    })
    this.healthBarBg = new THREE.Mesh(bgGeom, bgMat)
    this.healthBarBg.position.y = barY
    this.healthBarBg.name = 'healthBarBg'
    group.add(this.healthBarBg)
    
    // Health fill
    const fillGeom = new THREE.PlaneGeometry(barWidth - 0.06, barHeight - 0.03)
    const fillMat = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      side: THREE.DoubleSide
    })
    this.healthBarFill = new THREE.Mesh(fillGeom, fillMat)
    this.healthBarFill.position.y = barY
    this.healthBarFill.position.z = 0.01
    this.healthBarFill.name = 'healthBarFill'
    group.add(this.healthBarFill)
    
    // Shield bar (if has shield)
    if (this.hasShield && this.shieldHealth > 0) {
      const shieldFillGeom = new THREE.PlaneGeometry(barWidth - 0.06, barHeight * 0.5)
      const shieldFillMat = new THREE.MeshBasicMaterial({
        color: 0x4488ff,
        side: THREE.DoubleSide
      })
      this.shieldBarFill = new THREE.Mesh(shieldFillGeom, shieldFillMat)
      this.shieldBarFill.position.y = barY + barHeight * 0.6
      this.shieldBarFill.position.z = 0.01
      this.shieldBarFill.name = 'shieldBarFill'
      group.add(this.shieldBarFill)
    }
  }
  
  damage(amount, source = null, damageType = 'physical') {
    if (this.isDead) return false
    
    // Phasing immunity
    if (this.isPhasing) {
      return false
    }
    
    // Shield absorbs damage first
    if (this.shieldHealth > 0) {
      const shieldDamage = Math.min(this.shieldHealth, amount)
      this.shieldHealth -= shieldDamage
      amount -= shieldDamage
      this.updateShieldBar()
      
      // Shield break flash
      if (this.shieldHealth <= 0 && this.shieldMesh) {
        this.shieldMesh.visible = false
      }
    }
    
    // Apply armor reduction
    const effectiveDamage = amount * (1 - this.armor)
    this.health -= effectiveDamage
    
    // Flash damage effect
    this.flashDamage()
    
    // Update health bar
    this.updateHealthBar()
    
    // Check berserker rage
    if (this.rageThreshold > 0 && !this.isEnraged) {
      const healthRatio = this.health / this.maxHealth
      if (healthRatio <= this.rageThreshold) {
        this.activateRage()
      }
    }
    
    // Check death
    if (this.health <= 0) {
      this.health = 0
      this.isDead = true
      return true
    }
    
    return false
  }
  
  flashDamage() {
    if (!this.bodyMesh || !this.bodyMesh.material) return
    
    const originalColor = this.color
    this.bodyMesh.material.color.setHex(0xffffff)
    this.bodyMesh.material.emissive?.setHex(0xffffff)
    this.bodyMesh.material.emissiveIntensity = 1.0
    
    setTimeout(() => {
      if (this.bodyMesh && this.bodyMesh.material) {
        this.bodyMesh.material.color.setHex(originalColor)
        this.bodyMesh.material.emissive?.setHex(this.glowColor)
        this.bodyMesh.material.emissiveIntensity = 0.4
      }
    }, 80)
  }
  
  heal(amount) {
    if (this.isDead) return
    
    const oldHealth = this.health
    this.health = Math.min(this.maxHealth, this.health + amount)
    this.updateHealthBar()
    
    // Green flash for healing
    if (this.health > oldHealth && this.bodyMesh) {
      const original = this.bodyMesh.material.emissiveIntensity
      this.bodyMesh.material.emissive?.setHex(0x00ff00)
      this.bodyMesh.material.emissiveIntensity = 0.8
      
      setTimeout(() => {
        if (this.bodyMesh && this.bodyMesh.material) {
          this.bodyMesh.material.emissive?.setHex(this.glowColor)
          this.bodyMesh.material.emissiveIntensity = original
        }
      }, 200)
    }
  }
  
  updateHealthBar() {
    if (!this.healthBarFill) return
    
    const ratio = Math.max(0, this.health / this.maxHealth)
    this.healthBarFill.scale.x = ratio
    this.healthBarFill.position.x = (1 - ratio) * -0.55 * this.scale
    
    // Color based on health
    if (ratio > 0.6) {
      this.healthBarFill.material.color.setHex(0x00ff00)
    } else if (ratio > 0.3) {
      this.healthBarFill.material.color.setHex(0xffff00)
    } else {
      this.healthBarFill.material.color.setHex(0xff0000)
    }
    
    // Enraged color
    if (this.isEnraged) {
      this.healthBarFill.material.color.setHex(0xff4400)
    }
  }
  
  updateShieldBar() {
    if (!this.shieldBarFill) return
    
    const ratio = Math.max(0, this.shieldHealth / this.maxShieldHealth)
    this.shieldBarFill.scale.x = ratio
    this.shieldBarFill.position.x = (1 - ratio) * -0.55 * this.scale
    
    // Hide if depleted
    this.shieldBarFill.visible = ratio > 0
  }
  
  activateRage() {
    if (this.isEnraged) return
    
    this.isEnraged = true
    this.speed = this.originalSpeed * this.rageSpeedMult
    
    // Visual rage effect
    if (this.bodyMesh && this.bodyMesh.material) {
      this.bodyMesh.material.emissive?.setHex(0xff0000)
      this.bodyMesh.material.emissiveIntensity = 0.8
    }
    
    // Scale up slightly
    if (this.mesh) {
      this.mesh.scale.multiplyScalar(1.15)
    }
  }
  
  setPath(path) {
    if (!path || path.length === 0) {
      this.finished = true
      return
    }
    
    this.path = path.map(p => ({
      x: p.x !== undefined ? p.x : 0,
      y: p.y !== undefined ? p.y : 0.5,
      z: p.z !== undefined ? p.z : 0
    }))
    
    this.finished = false
    this.advance()
  }
  
  advance() {
    if (this.path.length === 0) {
      this.finished = true
      this.reachedEnd = true
      return false
    }
    
    this.next = this.path.shift()
    return this.next !== null
  }
  
  applySlow(amount, duration) {
    this.slowAmount = Math.max(this.slowAmount, amount)
    this.speed = this.originalSpeed * (1 - this.slowAmount)
    
    // Apply rage speed if enraged
    if (this.isEnraged) {
      this.speed *= this.rageSpeedMult
    }
    
    if (this.slowTimer) clearTimeout(this.slowTimer)
    
    this.slowTimer = setTimeout(() => {
      this.slowAmount = 0
      this.speed = this.originalSpeed * (this.isEnraged ? this.rageSpeedMult : 1)
    }, duration)
    
    // Blue tint for frozen
    if (this.bodyMesh && this.bodyMesh.material) {
      this.bodyMesh.material.color.lerp(new THREE.Color(0x88ccff), 0.5)
    }
  }
  
  applyBurn(damagePerSecond, duration) {
    this.burnDamage = damagePerSecond
    this.burnEndTime = Date.now() + duration
    
    // Orange tint for burning
    if (this.bodyMesh && this.bodyMesh.material) {
      this.bodyMesh.material.emissive?.setHex(0xff6600)
    }
  }
  
  applyStun(duration) {
    this.isStunned = true
    this.stunEndTime = Date.now() + duration
    this.speed = 0
  }
  
  updateStatusEffects(deltaTime) {
    const now = Date.now()
    
    // Burn damage
    if (this.burnDamage > 0 && now < this.burnEndTime) {
      this.health -= this.burnDamage * deltaTime
      this.updateHealthBar()
      
      if (this.health <= 0) {
        this.health = 0
        this.isDead = true
      }
    } else if (now >= this.burnEndTime) {
      this.burnDamage = 0
      if (this.bodyMesh && this.bodyMesh.material) {
        this.bodyMesh.material.emissive?.setHex(this.glowColor)
      }
    }
    
    // Stun recovery
    if (this.isStunned && now >= this.stunEndTime) {
      this.isStunned = false
      this.speed = this.originalSpeed * (1 - this.slowAmount) * (this.isEnraged ? this.rageSpeedMult : 1)
    }
    
    // Shield regen
    if (this.shieldRegen > 0 && this.shieldHealth < this.maxShieldHealth) {
      this.shieldHealth = Math.min(this.maxShieldHealth, this.shieldHealth + this.shieldRegen * deltaTime)
      this.updateShieldBar()
      
      if (this.shieldHealth > 0 && this.shieldMesh) {
        this.shieldMesh.visible = true
      }
    }
  }
  
  updatePhasing(currentTime) {
    if (this.phaseInterval <= 0) return
    
    const timeSincePhase = currentTime - this.lastPhaseTime
    
    if (this.isPhasing) {
      // End phasing
      if (timeSincePhase >= this.phaseDuration) {
        this.isPhasing = false
        this.lastPhaseTime = currentTime
        
        // Restore visibility
        if (this.mesh) {
          this.mesh.traverse((child) => {
            if (child.material) {
              child.material.opacity = 1.0
              child.material.transparent = false
            }
          })
        }
      }
    } else {
      // Start phasing
      if (timeSincePhase >= this.phaseInterval) {
        this.isPhasing = true
        this.lastPhaseTime = currentTime
        
        // Make semi-transparent
        if (this.mesh) {
          this.mesh.traverse((child) => {
            if (child.material) {
              child.material.transparent = true
              child.material.opacity = 0.3
            }
          })
        }
      }
    }
  }
  
  update(deltaTime) {
    if (this.isDead) return
    
    const currentTime = Date.now() / 1000
    this.animationTime += deltaTime
    
    // Update status effects
    this.updateStatusEffects(deltaTime)
    
    // Update phasing
    this.updatePhasing(currentTime)
    
    // Animate body
    this.updateAnimation(deltaTime)
  }
  
  updateAnimation(deltaTime) {
    if (!this.mesh) return
    
    // Bob animation
    if (this.bodyMesh) {
      this.bodyMesh.position.y = 1 * this.scale + Math.sin(this.animationTime * 4) * 0.08
    }
    
    // Rotate aura
    if (this.auraMesh) {
      this.auraMesh.rotation.z += deltaTime * 1.5
    }
    
    // Shield pulse
    if (this.shieldMesh && this.shieldMesh.visible) {
      const pulse = 0.95 + Math.sin(this.animationTime * 3) * 0.05
      this.shieldMesh.scale.setScalar(pulse)
    }
    
    // Boss pulse effect
    if (this.isBoss && this.mesh) {
      const pulse = 1 + Math.sin(this.animationTime * 2) * 0.02
      this.mesh.scale.setScalar(this.scale * pulse)
    }
  }
  
  // Get split enemies on death
  getSpawnOnDeath() {
    if (this.splitCount > 0 && this.splitType) {
      const spawns = []
      for (let i = 0; i < this.splitCount; i++) {
        spawns.push({
          type: this.splitType,
          position: this.position.clone().add(
            new THREE.Vector3(
              (Math.random() - 0.5) * 2,
              0,
              (Math.random() - 0.5) * 2
            )
          )
        })
      }
      return spawns
    }
    return null
  }
  
  reset(config = {}) {
    const healthMult = config.healthMultiplier || 1
    const speedMult = config.speedMultiplier || 1
    
    const enemyConfig = ENEMY_TYPES[this.type] || ENEMY_TYPES.spider
    
    this.health = Math.floor((enemyConfig.health || 100) * healthMult)
    this.maxHealth = this.health
    this.speed = (enemyConfig.speed || 5) * speedMult
    this.originalSpeed = this.speed
    
    this.shieldHealth = enemyConfig.shieldHealth || 0
    this.maxShieldHealth = this.shieldHealth
    
    this.isDead = false
    this.finished = false
    this.reachedEnd = false
    this.slowAmount = 0
    this.burnDamage = 0
    this.isStunned = false
    this.isEnraged = false
    this.isPhasing = false
    this.path = []
    this.next = null
    
    this.updateHealthBar()
    this.updateShieldBar()
    
    // Reset visuals
    if (this.bodyMesh && this.bodyMesh.material) {
      this.bodyMesh.material.color.setHex(this.color)
      this.bodyMesh.material.emissive?.setHex(this.glowColor)
      this.bodyMesh.material.emissiveIntensity = 0.4
      this.bodyMesh.material.transparent = false
      this.bodyMesh.material.opacity = 1.0
    }
    
    if (this.mesh) {
      this.mesh.scale.setScalar(this.scale)
    }
    
    if (this.shieldMesh) {
      this.shieldMesh.visible = this.shieldHealth > 0
    }
  }
  
  destroy() {
    if (this.slowTimer) {
      clearTimeout(this.slowTimer)
    }
    
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
