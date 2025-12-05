// =============================================================================
// ENEMY CLASS - Beautiful Sci-Fi Invaders
// =============================================================================

import * as THREE from 'three'
import { ENEMY_TYPES } from './EnemyTypes.js'

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
    
    // Behavior & abilities
    this.behavior = config.behavior || 'standard'
    this.healRadius = config.healRadius || 0
    this.healAmount = config.healAmount || 0
    this.splitCount = config.splitCount || 0
    this.splitType = config.splitType || null
    this.hasAura = config.hasAura || false
    this.hasShield = config.hasShield || false
    this.shieldHealth = config.shieldHealth || 0
    this.maxShieldHealth = this.shieldHealth
    
    // Status effects
    this.slowAmount = 0
    this.burnDamage = 0
    this.burnEndTime = 0
    this.isStunned = false
    this.isEnraged = false
    this.isPhasing = false
    
    // State
    this.isDead = false
    this.finished = false
    this.reachedEnd = false
    
    // Path
    this.path = []
    this.next = null
    this.position = args.position ? args.position.clone() : new THREE.Vector3(0, 0.5, 45)
    
    // Mesh references
    this.mesh = null
    this.bodyMesh = null
    this.coreMesh = null
    this.healthBarFill = null
    this.shieldMesh = null
    this.auraMesh = null
    this.particles = []
    
    this.id = `enemy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    this.animationTime = Math.random() * Math.PI * 2
  }
  
  createMesh() {
    const group = new THREE.Group()
    
    // Create body based on tier and type
    this.createBody(group)
    
    // Add decorations
    this.createDecorations(group)
    
    // Add glow effects
    this.createGlowEffects(group)
    
    // Add shield if applicable
    if (this.hasShield && this.shieldHealth > 0) {
      this.createShield(group)
    }
    
    // Add healer aura if applicable
    if (this.hasAura) {
      this.createHealerAura(group)
    }
    
    // Create health bar
    this.createHealthBar(group)
    
    group.position.copy(this.position)
    this.mesh = group
    this.mesh.userData.enemy = this
    
    return group
  }
  
  createBody(group) {
    const s = this.scale
    let bodyGeom, bodyMat
    
    // Different shapes based on enemy type/tier
    if (this.isBoss) {
      // Boss - large complex shape
      bodyGeom = new THREE.IcosahedronGeometry(1.8 * s, 1)
      bodyMat = new THREE.MeshStandardMaterial({
        color: this.color,
        metalness: 0.6,
        roughness: 0.3,
        emissive: this.glowColor,
        emissiveIntensity: 0.5
      })
    } else if (this.tier >= 3) {
      // Elite - dodecahedron
      bodyGeom = new THREE.DodecahedronGeometry(1 * s, 0)
      bodyMat = new THREE.MeshStandardMaterial({
        color: this.color,
        metalness: 0.5,
        roughness: 0.4,
        emissive: this.glowColor,
        emissiveIntensity: 0.4
      })
    } else if (this.tier === 2) {
      // Advanced - octahedron
      bodyGeom = new THREE.OctahedronGeometry(0.9 * s, 0)
      bodyMat = new THREE.MeshStandardMaterial({
        color: this.color,
        metalness: 0.4,
        roughness: 0.5,
        emissive: this.glowColor,
        emissiveIntensity: 0.3
      })
    } else {
      // Basic - sphere with segments
      bodyGeom = new THREE.SphereGeometry(0.7 * s, 12, 12)
      bodyMat = new THREE.MeshStandardMaterial({
        color: this.color,
        metalness: 0.3,
        roughness: 0.6,
        emissive: this.glowColor,
        emissiveIntensity: 0.25
      })
    }
    
    this.bodyMesh = new THREE.Mesh(bodyGeom, bodyMat)
    this.bodyMesh.position.y = 1.2 * s
    group.add(this.bodyMesh)
    
    // Inner core (glowing)
    const coreSize = this.isBoss ? 1 : this.tier >= 2 ? 0.5 : 0.35
    const coreGeom = new THREE.SphereGeometry(coreSize * s, 12, 12)
    const coreMat = new THREE.MeshBasicMaterial({
      color: this.glowColor,
      transparent: true,
      opacity: 0.9
    })
    this.coreMesh = new THREE.Mesh(coreGeom, coreMat)
    this.coreMesh.position.y = 1.2 * s
    group.add(this.coreMesh)
  }
  
  createDecorations(group) {
    const s = this.scale
    
    // Eyes (for all enemies)
    const eyeCount = this.isBoss ? 4 : this.tier >= 2 ? 3 : 2
    const eyeRadius = this.isBoss ? 0.25 : 0.15
    
    for (let i = 0; i < eyeCount; i++) {
      const angle = (i / eyeCount) * Math.PI * 2 - Math.PI / 2
      const eyeDistance = this.isBoss ? 1 : 0.5
      
      // Eye white
      const eyeGeom = new THREE.SphereGeometry(eyeRadius * s, 8, 8)
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff })
      const eye = new THREE.Mesh(eyeGeom, eyeMat)
      eye.position.set(
        Math.sin(angle) * eyeDistance * s,
        1.3 * s,
        Math.cos(angle) * eyeDistance * s + 0.3 * s
      )
      group.add(eye)
      
      // Pupil
      const pupilGeom = new THREE.SphereGeometry(eyeRadius * 0.5 * s, 6, 6)
      const pupilMat = new THREE.MeshBasicMaterial({ color: 0x000000 })
      const pupil = new THREE.Mesh(pupilGeom, pupilMat)
      pupil.position.copy(eye.position)
      pupil.position.z += eyeRadius * 0.6 * s
      group.add(pupil)
    }
    
    // Spikes/horns for tier 2+ and bosses
    if (this.tier >= 2 || this.isBoss) {
      const spikeCount = this.isBoss ? 8 : 4
      for (let i = 0; i < spikeCount; i++) {
        const angle = (i / spikeCount) * Math.PI * 2
        const spikeGeom = new THREE.ConeGeometry(0.15 * s, 0.6 * s, 4)
        const spikeMat = new THREE.MeshStandardMaterial({
          color: this.color,
          metalness: 0.7,
          roughness: 0.3
        })
        const spike = new THREE.Mesh(spikeGeom, spikeMat)
        spike.position.set(
          Math.cos(angle) * 0.8 * s,
          1.2 * s,
          Math.sin(angle) * 0.8 * s
        )
        spike.rotation.z = Math.cos(angle) * 0.5
        spike.rotation.x = Math.sin(angle) * 0.5
        group.add(spike)
      }
    }
    
    // Crown for bosses
    if (this.isBoss) {
      const crownGeom = new THREE.ConeGeometry(0.5 * s, 1 * s, 6)
      const crownMat = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        metalness: 0.9,
        roughness: 0.1,
        emissive: 0xffd700,
        emissiveIntensity: 0.5
      })
      const crown = new THREE.Mesh(crownGeom, crownMat)
      crown.position.y = 2.8 * s
      group.add(crown)
    }
    
    // Legs/tentacles for spider-type enemies
    if (this.type === 'spider' || this.type === 'scout') {
      const legCount = 6
      for (let i = 0; i < legCount; i++) {
        const angle = (i / legCount) * Math.PI * 2
        const legGeom = new THREE.CylinderGeometry(0.05 * s, 0.08 * s, 0.8 * s, 6)
        const legMat = new THREE.MeshStandardMaterial({
          color: this.color,
          metalness: 0.3,
          roughness: 0.7
        })
        const leg = new THREE.Mesh(legGeom, legMat)
        leg.position.set(
          Math.cos(angle) * 0.5 * s,
          0.4 * s,
          Math.sin(angle) * 0.5 * s
        )
        leg.rotation.z = Math.cos(angle) * 0.8
        leg.rotation.x = Math.sin(angle) * 0.8
        group.add(leg)
      }
    }
  }
  
  createGlowEffects(group) {
    const s = this.scale
    
    // Outer glow sphere
    const glowSize = this.isBoss ? 2.5 : this.tier >= 2 ? 1.4 : 1
    const glowGeom = new THREE.SphereGeometry(glowSize * s, 16, 16)
    const glowMat = new THREE.MeshBasicMaterial({
      color: this.glowColor,
      transparent: true,
      opacity: 0.15
    })
    const glow = new THREE.Mesh(glowGeom, glowMat)
    glow.position.y = 1.2 * s
    group.add(glow)
    this.glowMesh = glow
    
    // Floating particles around enemy
    const particleCount = this.isBoss ? 12 : this.tier >= 2 ? 6 : 3
    const particleGeom = new THREE.SphereGeometry(0.08 * s, 6, 6)
    const particleMat = new THREE.MeshBasicMaterial({
      color: this.glowColor,
      transparent: true,
      opacity: 0.7
    })
    
    for (let i = 0; i < particleCount; i++) {
      const particle = new THREE.Mesh(particleGeom.clone(), particleMat.clone())
      this.particles.push({
        mesh: particle,
        angle: (i / particleCount) * Math.PI * 2,
        radius: 1 + Math.random() * 0.5,
        speed: 1 + Math.random() * 0.5,
        yOffset: Math.random() * 0.5
      })
      group.add(particle)
    }
    
    // Point light
    const lightIntensity = this.isBoss ? 2 : this.tier >= 2 ? 1 : 0.5
    const light = new THREE.PointLight(this.glowColor, lightIntensity, 10 * s)
    light.position.y = 1.2 * s
    group.add(light)
    this.enemyLight = light
  }
  
  createShield(group) {
    const s = this.scale
    const shieldSize = this.isBoss ? 3 : 1.5
    
    const shieldGeom = new THREE.SphereGeometry(shieldSize * s, 24, 18)
    const shieldMat = new THREE.MeshBasicMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide
    })
    this.shieldMesh = new THREE.Mesh(shieldGeom, shieldMat)
    this.shieldMesh.position.y = 1.2 * s
    group.add(this.shieldMesh)
    
    // Shield wireframe
    const wireGeom = new THREE.SphereGeometry(shieldSize * s * 1.02, 12, 8)
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x4488ff,
      wireframe: true,
      transparent: true,
      opacity: 0.4
    })
    const wireShield = new THREE.Mesh(wireGeom, wireMat)
    wireShield.position.y = 1.2 * s
    group.add(wireShield)
    this.shieldWire = wireShield
  }
  
  createHealerAura(group) {
    const s = this.scale
    const healRadius = this.healRadius / 2
    
    const auraGeom = new THREE.TorusGeometry(healRadius, 0.15, 8, 32)
    const auraMat = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.4
    })
    this.auraMesh = new THREE.Mesh(auraGeom, auraMat)
    this.auraMesh.rotation.x = Math.PI / 2
    this.auraMesh.position.y = 0.2
    group.add(this.auraMesh)
  }
  
  createHealthBar(group) {
    const s = this.scale
    const barWidth = 1.5 * s
    const barHeight = 0.15
    const barY = (this.isBoss ? 4 : 2.2) * s
    
    // Background
    const bgGeom = new THREE.PlaneGeometry(barWidth + 0.1, barHeight + 0.05)
    const bgMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    })
    const bg = new THREE.Mesh(bgGeom, bgMat)
    bg.position.y = barY
    group.add(bg)
    
    // Health fill
    const fillGeom = new THREE.PlaneGeometry(barWidth, barHeight)
    const fillMat = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      side: THREE.DoubleSide
    })
    this.healthBarFill = new THREE.Mesh(fillGeom, fillMat)
    this.healthBarFill.position.y = barY
    this.healthBarFill.position.z = 0.01
    group.add(this.healthBarFill)
    
    // Shield bar if applicable
    if (this.hasShield && this.shieldHealth > 0) {
      const shieldFillGeom = new THREE.PlaneGeometry(barWidth, barHeight * 0.5)
      const shieldFillMat = new THREE.MeshBasicMaterial({
        color: 0x4488ff,
        side: THREE.DoubleSide
      })
      this.shieldBarFill = new THREE.Mesh(shieldFillGeom, shieldFillMat)
      this.shieldBarFill.position.y = barY + barHeight * 0.6
      this.shieldBarFill.position.z = 0.01
      group.add(this.shieldBarFill)
    }
  }
  
  damage(amount, source = null, damageType = 'physical') {
    if (this.isDead || this.isPhasing) return false
    
    // Shield absorbs damage first
    if (this.shieldHealth > 0) {
      const shieldDamage = Math.min(this.shieldHealth, amount)
      this.shieldHealth -= shieldDamage
      amount -= shieldDamage
      this.updateShieldBar()
      
      if (this.shieldHealth <= 0 && this.shieldMesh) {
        this.shieldMesh.visible = false
        if (this.shieldWire) this.shieldWire.visible = false
      }
    }
    
    const effectiveDamage = amount * (1 - this.armor)
    this.health -= effectiveDamage
    
    this.flashDamage()
    this.updateHealthBar()
    
    if (this.health <= 0) {
      this.health = 0
      this.isDead = true
      return true
    }
    
    return false
  }
  
  flashDamage() {
    if (!this.bodyMesh || !this.bodyMesh.material) return
    
    const original = this.color
    this.bodyMesh.material.emissive.setHex(0xffffff)
    this.bodyMesh.material.emissiveIntensity = 1.5
    
    setTimeout(() => {
      if (this.bodyMesh && this.bodyMesh.material) {
        this.bodyMesh.material.emissive.setHex(this.glowColor)
        this.bodyMesh.material.emissiveIntensity = this.isBoss ? 0.5 : 0.3
      }
    }, 100)
  }
  
  heal(amount) {
    if (this.isDead) return
    this.health = Math.min(this.maxHealth, this.health + amount)
    this.updateHealthBar()
  }
  
  updateHealthBar() {
    if (!this.healthBarFill) return
    
    const ratio = Math.max(0, this.health / this.maxHealth)
    const barWidth = 1.5 * this.scale
    
    this.healthBarFill.scale.x = ratio
    this.healthBarFill.position.x = (1 - ratio) * -barWidth / 2
    
    if (ratio > 0.6) {
      this.healthBarFill.material.color.setHex(0x00ff44)
    } else if (ratio > 0.3) {
      this.healthBarFill.material.color.setHex(0xffff00)
    } else {
      this.healthBarFill.material.color.setHex(0xff2200)
    }
  }
  
  updateShieldBar() {
    if (!this.shieldBarFill) return
    
    const ratio = Math.max(0, this.shieldHealth / this.maxShieldHealth)
    const barWidth = 1.5 * this.scale
    
    this.shieldBarFill.scale.x = ratio
    this.shieldBarFill.position.x = (1 - ratio) * -barWidth / 2
    this.shieldBarFill.visible = ratio > 0
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
    
    if (this.slowTimer) clearTimeout(this.slowTimer)
    
    this.slowTimer = setTimeout(() => {
      this.slowAmount = 0
      this.speed = this.originalSpeed
    }, duration)
    
    // Blue tint
    if (this.bodyMesh && this.bodyMesh.material) {
      this.bodyMesh.material.color.lerp(new THREE.Color(0x88ccff), 0.5)
    }
  }
  
  applyBurn(damagePerSecond, duration) {
    this.burnDamage = damagePerSecond
    this.burnEndTime = Date.now() + duration
  }
  
  update(deltaTime) {
    if (this.isDead) return
    
    this.animationTime += deltaTime
    
    // Animate body (floating/bobbing)
    if (this.bodyMesh) {
      this.bodyMesh.position.y = 1.2 * this.scale + Math.sin(this.animationTime * 2) * 0.15
      this.bodyMesh.rotation.y += deltaTime * 0.5
    }
    
    // Animate core
    if (this.coreMesh) {
      this.coreMesh.position.y = 1.2 * this.scale + Math.sin(this.animationTime * 2) * 0.15
      const pulse = 0.8 + Math.sin(this.animationTime * 4) * 0.2
      this.coreMesh.scale.setScalar(pulse)
    }
    
    // Animate glow
    if (this.glowMesh) {
      const glowPulse = 1 + Math.sin(this.animationTime * 3) * 0.15
      this.glowMesh.scale.setScalar(glowPulse)
    }
    
    // Animate particles
    this.particles.forEach((p, i) => {
      p.angle += deltaTime * p.speed
      p.mesh.position.set(
        Math.cos(p.angle) * p.radius * this.scale,
        1.2 * this.scale + Math.sin(this.animationTime * 2 + p.yOffset) * 0.3 + p.yOffset,
        Math.sin(p.angle) * p.radius * this.scale
      )
    })
    
    // Animate shield
    if (this.shieldMesh && this.shieldMesh.visible) {
      const shieldPulse = 1 + Math.sin(this.animationTime * 2) * 0.03
      this.shieldMesh.scale.setScalar(shieldPulse)
    }
    if (this.shieldWire && this.shieldWire.visible) {
      this.shieldWire.rotation.y += deltaTime * 0.5
    }
    
    // Animate healer aura
    if (this.auraMesh) {
      this.auraMesh.rotation.z += deltaTime * 1.5
      const auraPulse = 1 + Math.sin(this.animationTime * 2) * 0.1
      this.auraMesh.scale.setScalar(auraPulse)
    }
    
    // Burn damage
    if (this.burnDamage > 0 && Date.now() < this.burnEndTime) {
      this.health -= this.burnDamage * deltaTime
      this.updateHealthBar()
      if (this.health <= 0) {
        this.health = 0
        this.isDead = true
      }
    } else if (Date.now() >= this.burnEndTime) {
      this.burnDamage = 0
    }
  }
  
  updateAnimation(deltaTime) {
    this.update(deltaTime)
  }
  
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
    this.isEnraged = false
    this.isPhasing = false
    this.path = []
    this.next = null
    
    this.updateHealthBar()
    this.updateShieldBar()
    
    if (this.shieldMesh) this.shieldMesh.visible = this.shieldHealth > 0
    if (this.shieldWire) this.shieldWire.visible = this.shieldHealth > 0
  }
  
  destroy() {
    if (this.slowTimer) clearTimeout(this.slowTimer)
    
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
