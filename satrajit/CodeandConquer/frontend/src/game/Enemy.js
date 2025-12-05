// =============================================================================
// PROFESSIONAL ENEMY CLASS - Studio-Quality Enemy Implementation
// =============================================================================
// Full-featured enemy with 3D visuals, animations, abilities, behaviors,
// and sophisticated pathfinding for AAA tower defense experience.
// =============================================================================

import * as THREE from 'three'
import { ENEMY_TYPES, ENEMY_BEHAVIORS, createEnemyMesh } from './EnemyTypes.js'
import { SoundManager } from './SoundManager.js'

export class Enemy {
  constructor(type, args = {}) {
    // Get configuration from enemy type
    const config = ENEMY_TYPES[type] || ENEMY_TYPES.spider
    
    // Basic properties
    this.type = type
    this.name = config.name
    this.tier = config.tier || 1
    this.color = config.color
    this.glowColor = config.glowColor || config.color
    
    // Combat stats with multipliers
    const healthMult = args.healthMultiplier || 1
    const speedMult = args.speedMultiplier || 1
    
    this.baseHealth = config.health
    this.health = Math.floor(config.health * healthMult)
    this.maxHealth = this.health
    this.baseSpeed = config.speed
    this.speed = config.speed * speedMult
    this.originalSpeed = this.speed
    this.armor = config.armor || 0
    this.lives = config.lives || 1
    
    // Rewards
    this.goldReward = config.goldReward
    this.xpReward = config.xpReward
    
    // Visual configuration
    this.scale = config.scale || 1.0
    this.isBoss = config.isBoss || false
    this.description = config.description
    
    // Behavior configuration
    this.behavior = ENEMY_BEHAVIORS[config.behavior] || ENEMY_BEHAVIORS.standard
    this.behaviorState = {}
    
    // Special abilities
    this.healRadius = config.healRadius || 0
    this.healAmount = config.healAmount || 0
    this.healInterval = config.healInterval || 1.0
    this.lastHealTime = 0
    
    this.splitCount = config.splitCount || 0
    this.splitType = config.splitType || null
    
    this.phaseInterval = config.phaseInterval || 0
    this.phaseDuration = config.phaseDuration || 0
    this.isPhasing = false
    this.lastPhaseTime = 0
    
    this.disableRadius = config.disableRadius || 0
    this.disableDuration = config.disableDuration || 0
    this.lastDisableTime = 0
    
    this.rageThreshold = config.rageThreshold || 0
    this.rageSpeedMult = config.rageSpeedMult || 1
    this.isEnraged = false
    
    this.teleportRange = config.teleportRange || 0
    this.teleportCooldown = config.teleportCooldown || 0
    this.lastTeleportTime = 0
    
    // Shield system
    this.hasShield = config.hasShield || false
    this.shieldHealth = config.shieldHealth || 0
    this.maxShieldHealth = this.shieldHealth
    this.shieldRegen = config.shieldRegen || 0
    
    // Carrier system
    this.carryCapacity = config.carryCapacity || 0
    this.carryType = config.carryType || null
    this.releaseInterval = config.releaseInterval || 0
    this.releaseCount = config.releaseCount || 0
    this.lastReleaseTime = 0
    this.unitsCarried = this.carryCapacity
    
    // Immunities
    this.slowImmune = config.slowImmune || false
    this.knockbackImmune = config.knockbackImmune || false
    
    // Status effects
    this.statusEffects = []
    this.slowAmount = 0
    this.isBurning = false
    this.burnDamage = 0
    this.burnEndTime = 0
    this.isFrozen = false
    this.isStunned = false
    this.stunEndTime = 0
    this.isDisabled = false
    
    // Pathfinding state
    this.path = []
    this.pathIndex = 0
    this.next = null
    this.direction = new THREE.Vector3()
    this.finished = false
    this.reachedEnd = false
    
    // Position (3D)
    this.position = args.position ? args.position.clone() : new THREE.Vector3(0, 0.5, 0)
    
    // State flags
    this.isDead = false
    this.isSpawning = true
    this.spawnTime = Date.now()
    this.spawnDuration = 500
    
    // Visual references
    this.mesh = null
    this.healthBarBg = null
    this.healthBarFill = null
    this.shieldMesh = null
    this.auraMesh = null
    
    // Animation state
    this.animationTime = 0
    this.walkCycle = 0
    this.bobOffset = 0
    
    // Unique ID
    this.id = `enemy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Visual effects reference
    this.visualEffects = args.visualEffects || null
    
    // Zigzag behavior state
    this.zigzagOffset = 0
    this.zigzagDirection = 1
  }
  
  // ==========================================================================
  // MESH CREATION
  // ==========================================================================
  
  createMesh() {
    const group = new THREE.Group()
    const config = ENEMY_TYPES[this.type] || ENEMY_TYPES.spider
    
    // Create body
    this.createBody(group, config)
    
    // Create eyes
    this.createEyes(group, config)
    
    // Create special features
    if (this.isBoss && config.hasCrown) {
      this.createCrown(group, config)
    }
    
    if (this.healRadius > 0) {
      this.createHealerAura(group, config)
    }
    
    if (this.hasShield || config.hasShieldEffect) {
      this.createShieldMesh(group)
    }
    
    // Create health bar
    this.createHealthBar(group)
    
    // Position and scale
    group.position.copy(this.position)
    
    // Store reference
    this.mesh = group
    this.mesh.userData.enemy = this
    
    // Spawn animation
    this.mesh.scale.setScalar(0.01)
    
    return group
  }
  
  createBody(group, config) {
    const s = this.scale
    
    // Determine geometry based on body style
    let bodyGeom
    const style = config.bodyStyle || 'insect'
    
    switch (style) {
      case 'heavy':
      case 'tank':
      case 'fortress':
        bodyGeom = new THREE.DodecahedronGeometry(0.9 * s, 0)
        break
      case 'sleek':
        bodyGeom = new THREE.ConeGeometry(0.5 * s, 1.2 * s, 6)
        break
      case 'ball':
        bodyGeom = new THREE.SphereGeometry(0.45 * s, 12, 12)
        break
      case 'segmented':
      case 'carrier':
        bodyGeom = new THREE.CapsuleGeometry(0.5 * s, 0.7 * s, 8, 16)
        break
      case 'armored':
        bodyGeom = new THREE.BoxGeometry(1.0 * s, 0.7 * s, 1.0 * s)
        break
      case 'queen':
      case 'overlord':
        bodyGeom = new THREE.OctahedronGeometry(1.0 * s, 1)
        break
      case 'organic':
        bodyGeom = new THREE.IcosahedronGeometry(0.7 * s, 1)
        break
      case 'ethereal':
      case 'ghost':
        bodyGeom = new THREE.TorusKnotGeometry(0.4 * s, 0.15 * s, 64, 8)
        break
      case 'feral':
        bodyGeom = new THREE.TetrahedronGeometry(0.8 * s, 1)
        break
      default:
        bodyGeom = new THREE.SphereGeometry(0.7 * s, 16, 16)
    }
    
    // Body material with emissive glow
    const bodyMat = new THREE.MeshStandardMaterial({
      color: this.color,
      metalness: 0.3,
      roughness: 0.6,
      emissive: this.glowColor,
      emissiveIntensity: 0.35,
      transparent: config.hasTransparency || false,
      opacity: config.baseOpacity || 1.0
    })
    
    const body = new THREE.Mesh(bodyGeom, bodyMat)
    body.position.y = 0.9 * s
    body.castShadow = true
    body.receiveShadow = true
    body.name = 'body'
    this.bodyMesh = body
    group.add(body)
    
    // Add details based on type
    if (style === 'armored' || style === 'tank') {
      this.addArmorPlates(group, config)
    }
    
    if (config.legCount && config.legCount > 0) {
      this.addLegs(group, config)
    }
  }
  
  addArmorPlates(group, config) {
    const s = this.scale
    const plateGeom = new THREE.BoxGeometry(0.3 * s, 0.15 * s, 0.8 * s)
    const plateMat = new THREE.MeshStandardMaterial({
      color: 0x555555,
      metalness: 0.8,
      roughness: 0.2
    })
    
    // Side plates
    const leftPlate = new THREE.Mesh(plateGeom, plateMat)
    leftPlate.position.set(-0.55 * s, 0.9 * s, 0)
    leftPlate.castShadow = true
    group.add(leftPlate)
    
    const rightPlate = new THREE.Mesh(plateGeom, plateMat)
    rightPlate.position.set(0.55 * s, 0.9 * s, 0)
    rightPlate.castShadow = true
    group.add(rightPlate)
  }
  
  addLegs(group, config) {
    const s = this.scale
    const legCount = config.legCount || 6
    
    const legGeom = new THREE.CylinderGeometry(0.03 * s, 0.05 * s, 0.5 * s, 6)
    const legMat = new THREE.MeshStandardMaterial({
      color: this.color,
      metalness: 0.2,
      roughness: 0.8
    })
    
    this.legs = []
    
    for (let i = 0; i < legCount; i++) {
      const angle = (i / legCount) * Math.PI * 2
      const leg = new THREE.Mesh(legGeom, legMat)
      
      leg.position.set(
        Math.sin(angle) * 0.5 * s,
        0.25 * s,
        Math.cos(angle) * 0.5 * s
      )
      leg.rotation.z = Math.sin(angle) * 0.4
      leg.rotation.x = Math.cos(angle) * 0.4
      leg.castShadow = true
      
      this.legs.push(leg)
      group.add(leg)
    }
  }
  
  createEyes(group, config) {
    const s = this.scale
    const eyeCount = config.eyeCount || 2
    
    const eyeGeom = new THREE.SphereGeometry(0.1 * s, 8, 8)
    const eyeMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95
    })
    
    const pupilGeom = new THREE.SphereGeometry(0.05 * s, 6, 6)
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x000000 })
    
    this.eyes = []
    this.pupils = []
    
    for (let i = 0; i < eyeCount; i++) {
      const spreadAngle = (Math.PI * 0.6) / Math.max(eyeCount - 1, 1)
      const angle = -Math.PI * 0.3 + i * spreadAngle
      
      const eye = new THREE.Mesh(eyeGeom, eyeMat)
      eye.position.set(
        Math.sin(angle) * 0.35 * s,
        1.05 * s,
        0.55 * s
      )
      this.eyes.push(eye)
      group.add(eye)
      
      const pupil = new THREE.Mesh(pupilGeom, pupilMat)
      pupil.position.copy(eye.position)
      pupil.position.z += 0.06 * s
      this.pupils.push(pupil)
      group.add(pupil)
    }
  }
  
  createCrown(group, config) {
    const s = this.scale
    
    // Main crown spikes
    const spikeCount = 5
    const crownMat = new THREE.MeshStandardMaterial({
      color: config.crownColor || 0xffd700,
      metalness: 0.9,
      roughness: 0.1,
      emissive: config.crownColor || 0xffd700,
      emissiveIntensity: 0.5
    })
    
    for (let i = 0; i < spikeCount; i++) {
      const angle = (i / spikeCount) * Math.PI * 2
      const spikeGeom = new THREE.ConeGeometry(0.1 * s, 0.4 * s, 4)
      const spike = new THREE.Mesh(spikeGeom, crownMat)
      
      spike.position.set(
        Math.sin(angle) * 0.3 * s,
        1.7 * s,
        Math.cos(angle) * 0.3 * s
      )
      group.add(spike)
    }
    
    // Crown ring
    const ringGeom = new THREE.TorusGeometry(0.35 * s, 0.05 * s, 8, 16)
    const ring = new THREE.Mesh(ringGeom, crownMat)
    ring.position.y = 1.5 * s
    ring.rotation.x = Math.PI / 2
    group.add(ring)
  }
  
  createHealerAura(group, config) {
    const auraGeom = new THREE.TorusGeometry(this.healRadius / 4, 0.08, 8, 24)
    const auraMat = new THREE.MeshBasicMaterial({
      color: config.auraColor || 0x00ff88,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide
    })
    
    this.auraMesh = new THREE.Mesh(auraGeom, auraMat)
    this.auraMesh.rotation.x = Math.PI / 2
    this.auraMesh.position.y = 0.2
    group.add(this.auraMesh)
  }
  
  createShieldMesh(group) {
    const s = this.scale
    const shieldGeom = new THREE.SphereGeometry(1.2 * s, 24, 24)
    const shieldMat = new THREE.MeshBasicMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
      wireframe: false
    })
    
    this.shieldMesh = new THREE.Mesh(shieldGeom, shieldMat)
    this.shieldMesh.position.y = 0.9 * s
    group.add(this.shieldMesh)
  }
  
  createHealthBar(group) {
    const s = this.scale
    const barWidth = 1.2 * s
    const barHeight = 0.12
    
    // Background
    const bgGeom = new THREE.PlaneGeometry(barWidth, barHeight)
    const bgMat = new THREE.MeshBasicMaterial({
      color: 0x222222,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8
    })
    this.healthBarBg = new THREE.Mesh(bgGeom, bgMat)
    this.healthBarBg.position.y = 1.8 * s
    this.healthBarBg.name = 'healthBarBg'
    group.add(this.healthBarBg)
    
    // Health fill
    const fillGeom = new THREE.PlaneGeometry(barWidth - 0.04, barHeight - 0.04)
    const fillMat = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      side: THREE.DoubleSide
    })
    this.healthBarFill = new THREE.Mesh(fillGeom, fillMat)
    this.healthBarFill.position.y = 1.8 * s
    this.healthBarFill.position.z = 0.01
    this.healthBarFill.name = 'healthBarFill'
    group.add(this.healthBarFill)
    
    // Shield bar (if applicable)
    if (this.hasShield && this.shieldHealth > 0) {
      const shieldFillGeom = new THREE.PlaneGeometry(barWidth - 0.04, barHeight * 0.5)
      const shieldFillMat = new THREE.MeshBasicMaterial({
        color: 0x4488ff,
        side: THREE.DoubleSide
      })
      this.shieldBarFill = new THREE.Mesh(shieldFillGeom, shieldFillMat)
      this.shieldBarFill.position.y = 1.95 * s
      this.shieldBarFill.position.z = 0.01
      group.add(this.shieldBarFill)
    }
  }
  
  // ==========================================================================
  // HEALTH & DAMAGE SYSTEM
  // ==========================================================================
  
  damage(amount, source = null, damageType = 'physical') {
    if (this.isDead) return false
    
    // Check phasing immunity
    if (this.isPhasing) {
      // Show dodge effect
      if (this.visualEffects && this.mesh) {
        this.visualEffects.createDamageNumber(
          this.mesh.position.clone(),
          'PHASE!',
          { color: 0x8800ff, size: 0.8, duration: 600 }
        )
      }
      return false
    }
    
    // Shield absorbs damage first
    if (this.hasShield && this.shieldHealth > 0) {
      if (this.shieldHealth >= amount) {
        this.shieldHealth -= amount
        this.updateShieldBar()
        
        // Shield hit effect
        if (this.shieldMesh) {
          this.shieldMesh.material.opacity = 0.4
          setTimeout(() => {
            if (this.shieldMesh) this.shieldMesh.material.opacity = 0.12
          }, 100)
        }
        
        // Play shield hit sound
        if (this.mesh) {
          SoundManager.play3D('shield_hit.ogg', this.mesh.position, { volume: 0.5 })
        }
        
        return false
      } else {
        amount -= this.shieldHealth
        this.shieldHealth = 0
        this.updateShieldBar()
        
        // Shield break effect
        if (this.visualEffects && this.mesh) {
          this.visualEffects.createExplosion(this.mesh.position, {
            numParticles: 30,
            color: 0x4488ff,
            maxDist: 4,
            duration: 400
          })
        }
      }
    }
    
    // Apply armor reduction
    let effectiveDamage = amount * (1 - this.armor)
    
    // Berserker rage damage vulnerability
    if (this.isEnraged && this.rageThreshold > 0) {
      effectiveDamage *= 1.5
    }
    
    // Show damage number
    if (this.visualEffects && this.mesh) {
      const isCritical = effectiveDamage > this.maxHealth * 0.25
      this.visualEffects.createDamageNumber(
        this.mesh.position.clone().add(new THREE.Vector3(0, 1.5 * this.scale, 0)),
        Math.round(effectiveDamage),
        {
          color: isCritical ? 0xffff00 : 0xff4444,
          size: isCritical ? 1.3 : 1.0,
          duration: isCritical ? 1000 : 800,
          isCritical
        }
      )
    }
    
    // Apply damage
    this.health -= effectiveDamage
    
    // Teleporter reaction
    if (this.teleportRange > 0 && !this.isDead) {
      const now = Date.now() / 1000
      if (now - this.lastTeleportTime >= this.teleportCooldown) {
        this.performTeleport()
        this.lastTeleportTime = now
      }
    }
    
    // Update health bar
    this.updateHealthBar()
    
    // Visual damage feedback
    this.flashDamage()
    
    // Play hit sound
    if (this.mesh) {
      SoundManager.play3D('enemy_hit.ogg', this.mesh.position, { volume: 0.5 })
    }
    
    // Check death
    if (this.health <= 0) {
      this.kill()
      return true
    }
    
    // Check berserker rage activation
    if (this.rageThreshold > 0 && !this.isEnraged) {
      if (this.health / this.maxHealth <= this.rageThreshold) {
        this.activateRage()
      }
    }
    
    return false
  }
  
  kill() {
    this.health = 0
    this.isDead = true
    
    // Play death sound
    if (this.mesh) {
      SoundManager.play3D('enemy_death.ogg', this.mesh.position)
      
      // Blood splatter effect
      if (this.visualEffects) {
        this.visualEffects.createBloodSplatter(this.mesh.position, {
          count: this.isBoss ? 60 : 35,
          color: this.isBoss ? 0xaa0000 : 0x880000,
          size: this.isBoss ? 0.5 : 0.3,
          duration: this.isBoss ? 1000 : 700
        })
      }
    }
  }
  
  heal(amount) {
    if (this.isDead) return
    
    this.health = Math.min(this.maxHealth, this.health + amount)
    this.updateHealthBar()
    
    // Heal visual
    if (this.visualEffects && this.mesh) {
      this.visualEffects.createDamageNumber(
        this.mesh.position.clone().add(new THREE.Vector3(0, 1.5, 0)),
        `+${amount}`,
        { color: 0x00ff88, size: 0.8, duration: 700 }
      )
    }
  }
  
  flashDamage() {
    if (!this.bodyMesh || !this.bodyMesh.material) return
    
    const mat = this.bodyMesh.material
    const originalEmissive = mat.emissiveIntensity
    
    mat.emissive.setHex(0xffffff)
    mat.emissiveIntensity = 1.0
    
    setTimeout(() => {
      if (mat) {
        mat.emissive.setHex(this.glowColor)
        mat.emissiveIntensity = originalEmissive
      }
    }, 80)
  }
  
  updateHealthBar() {
    if (!this.healthBarFill) return
    
    const ratio = Math.max(0, this.health / this.maxHealth)
    this.healthBarFill.scale.x = ratio
    this.healthBarFill.position.x = (1 - ratio) * -0.55 * this.scale
    
    // Color gradient
    if (ratio > 0.6) {
      this.healthBarFill.material.color.setHex(0x00ff00)
    } else if (ratio > 0.3) {
      this.healthBarFill.material.color.setHex(0xffff00)
    } else {
      this.healthBarFill.material.color.setHex(0xff0000)
    }
  }
  
  updateShieldBar() {
    if (!this.shieldBarFill) return
    
    const ratio = Math.max(0, this.shieldHealth / this.maxShieldHealth)
    this.shieldBarFill.scale.x = ratio
    this.shieldBarFill.position.x = (1 - ratio) * -0.55 * this.scale
    
    // Hide if depleted
    this.shieldBarFill.visible = ratio > 0
    if (this.shieldMesh) {
      this.shieldMesh.visible = ratio > 0
    }
  }
  
  // ==========================================================================
  // SPECIAL ABILITIES
  // ==========================================================================
  
  activateRage() {
    this.isEnraged = true
    this.speed = this.originalSpeed * this.rageSpeedMult
    
    // Visual rage effect
    if (this.bodyMesh && this.bodyMesh.material) {
      this.bodyMesh.material.emissive.setHex(0xff0000)
      this.bodyMesh.material.emissiveIntensity = 0.8
    }
    
    // Rage particles
    if (this.visualEffects && this.mesh) {
      this.visualEffects.createExplosion(this.mesh.position, {
        numParticles: 25,
        color: 0xff0000,
        maxDist: 3,
        duration: 500
      })
    }
    
    // Sound
    if (this.mesh) {
      SoundManager.play3D('rage.ogg', this.mesh.position)
    }
  }
  
  performTeleport() {
    if (!this.mesh || !this.next) return
    
    // Teleport toward destination
    const dir = new THREE.Vector3()
      .subVectors(new THREE.Vector3(this.next.x, 0, this.next.z), this.position)
      .normalize()
    
    const teleportDist = Math.min(this.teleportRange, 5)
    
    // Departure effect
    if (this.visualEffects) {
      this.visualEffects.createExplosion(this.mesh.position.clone(), {
        numParticles: 15,
        color: 0x8800ff,
        maxDist: 2,
        duration: 300
      })
    }
    
    // Move position
    this.position.add(dir.multiplyScalar(teleportDist))
    this.mesh.position.copy(this.position)
    
    // Arrival effect
    if (this.visualEffects) {
      this.visualEffects.createExplosion(this.mesh.position.clone(), {
        numParticles: 15,
        color: 0x8800ff,
        maxDist: 2,
        duration: 300
      })
    }
    
    // Sound
    SoundManager.play3D('teleport.ogg', this.mesh.position, { volume: 0.6 })
  }
  
  updatePhasing(deltaTime) {
    if (this.phaseInterval <= 0) return
    
    const now = Date.now() / 1000
    
    if (this.isPhasing) {
      // Check if phase should end
      if (now - this.lastPhaseTime >= this.phaseDuration) {
        this.isPhasing = false
        
        // Restore opacity
        if (this.bodyMesh && this.bodyMesh.material) {
          this.bodyMesh.material.opacity = 1.0
          this.bodyMesh.material.transparent = false
        }
      }
    } else {
      // Check if should start phasing
      if (now - this.lastPhaseTime >= this.phaseInterval) {
        this.isPhasing = true
        this.lastPhaseTime = now
        
        // Ghost effect
        if (this.bodyMesh && this.bodyMesh.material) {
          this.bodyMesh.material.opacity = 0.3
          this.bodyMesh.material.transparent = true
        }
        
        // Phase sound
        if (this.mesh) {
          SoundManager.play3D('phase.ogg', this.mesh.position, { volume: 0.4 })
        }
      }
    }
  }
  
  // ==========================================================================
  // PATHFINDING
  // ==========================================================================
  
  setPath(path) {
    if (!path || path.length === 0) {
      this.finished = true
      return
    }
    
    // Convert to world positions if needed
    this.path = path.map(p => ({
      x: p.x !== undefined ? p.x : 0,
      y: p.y !== undefined ? p.y : 0.5,
      z: p.z !== undefined ? p.z : 0
    }))
    
    this.pathIndex = 0
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
    
    if (!this.next) {
      this.finished = true
      this.reachedEnd = true
      return false
    }
    
    return true
  }
  
  // ==========================================================================
  // STATUS EFFECTS
  // ==========================================================================
  
  applySlow(amount, duration) {
    if (this.slowImmune) return
    
    this.slowAmount = Math.max(this.slowAmount, amount)
    this.speed = this.originalSpeed * (1 - this.slowAmount)
    
    // Clear existing slow timer
    if (this.slowTimer) clearTimeout(this.slowTimer)
    
    this.slowTimer = setTimeout(() => {
      this.slowAmount = 0
      this.speed = this.isEnraged ? this.originalSpeed * this.rageSpeedMult : this.originalSpeed
    }, duration)
    
    // Frost visual
    if (this.bodyMesh && this.bodyMesh.material) {
      this.bodyMesh.material.emissive.setHex(0x88ddff)
    }
  }
  
  applyBurn(damagePerSec, duration) {
    this.isBurning = true
    this.burnDamage = damagePerSec
    this.burnEndTime = Date.now() + duration
  }
  
  applyStun(duration) {
    if (this.knockbackImmune) return
    
    this.isStunned = true
    this.stunEndTime = Date.now() + duration
    
    // Stun visual
    if (this.visualEffects && this.mesh) {
      this.visualEffects.createExplosion(this.mesh.position, {
        numParticles: 10,
        color: 0xffff00,
        maxDist: 1,
        duration: 300
      })
    }
  }
  
  updateStatusEffects(deltaTime) {
    const now = Date.now()
    
    // Burn damage
    if (this.isBurning && now < this.burnEndTime) {
      this.damage(this.burnDamage * deltaTime, null, 'fire')
    } else if (this.isBurning && now >= this.burnEndTime) {
      this.isBurning = false
      // Restore glow color
      if (this.bodyMesh && this.bodyMesh.material) {
        this.bodyMesh.material.emissive.setHex(this.glowColor)
      }
    }
    
    // Stun check
    if (this.isStunned && now >= this.stunEndTime) {
      this.isStunned = false
    }
  }
  
  // ==========================================================================
  // UPDATE & ANIMATION
  // ==========================================================================
  
  update(deltaTime) {
    if (this.isDead) return
    
    // Update status effects
    this.updateStatusEffects(deltaTime)
    
    // Update phasing
    this.updatePhasing(deltaTime)
    
    // Shield regen
    if (this.hasShield && this.shieldHealth < this.maxShieldHealth) {
      this.shieldHealth = Math.min(
        this.maxShieldHealth,
        this.shieldHealth + this.shieldRegen * deltaTime
      )
      this.updateShieldBar()
    }
    
    // Spawn animation
    if (this.isSpawning) {
      const spawnProgress = Math.min(1, (Date.now() - this.spawnTime) / this.spawnDuration)
      if (this.mesh) {
        const scale = 0.01 + spawnProgress * 0.99
        this.mesh.scale.setScalar(scale)
      }
      if (spawnProgress >= 1) {
        this.isSpawning = false
      }
    }
    
    // Update animation
    this.updateAnimation(deltaTime)
  }
  
  updateAnimation(deltaTime) {
    if (!this.mesh) return
    
    this.animationTime += deltaTime
    this.walkCycle += deltaTime * this.speed * 2
    
    // Bob animation
    this.bobOffset = Math.sin(this.animationTime * 4) * 0.1 * this.scale
    
    // Apply to body
    if (this.bodyMesh) {
      this.bodyMesh.position.y = 0.9 * this.scale + this.bobOffset
      
      // Slight tilt while moving
      if (this.direction.length() > 0.1) {
        this.bodyMesh.rotation.x = Math.sin(this.walkCycle) * 0.08
        this.bodyMesh.rotation.z = Math.cos(this.walkCycle * 0.7) * 0.05
      }
    }
    
    // Animate legs
    if (this.legs) {
      this.legs.forEach((leg, i) => {
        const phase = (i / this.legs.length) * Math.PI * 2
        leg.rotation.x += Math.sin(this.walkCycle + phase) * 0.15 * deltaTime * 10
      })
    }
    
    // Animate healer aura
    if (this.auraMesh) {
      this.auraMesh.rotation.z += deltaTime * 0.5
      this.auraMesh.material.opacity = 0.15 + Math.sin(this.animationTime * 2) * 0.05
    }
    
    // Animate shield
    if (this.shieldMesh && this.shieldMesh.visible) {
      this.shieldMesh.rotation.y += deltaTime * 0.3
      this.shieldMesh.rotation.x = Math.sin(this.animationTime * 0.5) * 0.1
    }
    
    // Boss pulse effect
    if (this.isBoss && this.bodyMesh && this.bodyMesh.material) {
      const pulse = 0.35 + Math.sin(this.animationTime * 2) * 0.15
      this.bodyMesh.material.emissiveIntensity = pulse
    }
  }
  
  // ==========================================================================
  // RESET & CLEANUP
  // ==========================================================================
  
  reset(config = {}) {
    // Reset health
    const healthMult = config.healthMultiplier || 1
    const speedMult = config.speedMultiplier || 1
    
    this.health = Math.floor(this.baseHealth * healthMult)
    this.maxHealth = this.health
    this.speed = this.baseSpeed * speedMult
    this.originalSpeed = this.speed
    
    // Reset state
    this.isDead = false
    this.finished = false
    this.reachedEnd = false
    this.isEnraged = false
    this.isPhasing = false
    this.isStunned = false
    this.isBurning = false
    this.slowAmount = 0
    this.isSpawning = true
    this.spawnTime = Date.now()
    
    // Reset shield
    if (this.hasShield) {
      this.shieldHealth = this.maxShieldHealth
    }
    
    // Reset carrier
    if (this.carryCapacity > 0) {
      this.unitsCarried = this.carryCapacity
    }
    
    // Reset path
    this.path = []
    this.next = null
    
    // Reset visuals
    if (this.mesh) {
      this.mesh.scale.setScalar(0.01)
    }
    
    this.updateHealthBar()
    this.updateShieldBar()
  }
  
  getSpawnOnDeath() {
    if (!this.splitCount || !this.splitType) return []
    
    const spawns = []
    for (let i = 0; i < this.splitCount; i++) {
      spawns.push({
        type: this.splitType,
        position: this.mesh ? this.mesh.position.clone() : this.position.clone()
      })
    }
    return spawns
  }
  
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
    
    if (this.slowTimer) {
      clearTimeout(this.slowTimer)
    }
  }
}
