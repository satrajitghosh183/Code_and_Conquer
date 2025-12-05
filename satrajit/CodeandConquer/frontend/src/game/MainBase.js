// =============================================================================
// MAIN BASE - Upgradeable Central Tower
// =============================================================================
// The core structure players must defend. Can be upgraded for better
// stats, visual improvements, and defensive capabilities.
// =============================================================================

import * as THREE from 'three'

export const BASE_LEVELS = {
  1: {
    name: 'Outpost',
    maxHealth: 1000,
    healthRegen: 0,
    goldPerSecond: 0,
    range: 15,
    damage: 0,
    upgradeCost: 0,
    scale: 1.0,
    crystalSize: 3.0,
    ringCount: 2,
    pillarCount: 4,
    tierCount: 2,
    description: 'Basic defensive outpost'
  },
  2: {
    name: 'Fortress',
    maxHealth: 1500,
    healthRegen: 2,
    goldPerSecond: 1,
    range: 18,
    damage: 10,
    upgradeCost: 500,
    scale: 1.2,
    crystalSize: 4.0,
    ringCount: 3,
    pillarCount: 6,
    tierCount: 2,
    description: 'Reinforced fortress with passive regen'
  },
  3: {
    name: 'Citadel',
    maxHealth: 2500,
    healthRegen: 5,
    goldPerSecond: 2,
    range: 22,
    damage: 25,
    upgradeCost: 1200,
    scale: 1.4,
    crystalSize: 5.0,
    ringCount: 4,
    pillarCount: 8,
    tierCount: 3,
    description: 'Mighty citadel with defensive fire'
  },
  4: {
    name: 'Bastion',
    maxHealth: 4000,
    healthRegen: 10,
    goldPerSecond: 3,
    range: 26,
    damage: 50,
    upgradeCost: 2500,
    scale: 1.6,
    crystalSize: 6.0,
    ringCount: 5,
    pillarCount: 10,
    tierCount: 3,
    description: 'Impenetrable bastion with powerful defenses'
  },
  5: {
    name: 'Nexus',
    maxHealth: 6000,
    healthRegen: 20,
    goldPerSecond: 5,
    range: 30,
    damage: 100,
    upgradeCost: 5000,
    scale: 1.8,
    crystalSize: 7.0,
    ringCount: 6,
    pillarCount: 12,
    tierCount: 4,
    description: 'Ultimate nexus of power'
  }
}

export class MainBase {
  constructor(position, options = {}) {
    this.position = position.clone()
    this.level = options.level || 1
    this.config = BASE_LEVELS[this.level]
    
    this.health = this.config.maxHealth
    this.maxHealth = this.config.maxHealth
    
    this.mesh = null
    this.crystal = null
    this.energyRings = []
    this.pillars = []
    this.healthBar = null
    this.aura = null
    
    this.lastAttackTime = 0
    this.attackCooldown = 1.5 // seconds
    this.target = null
    
    this.animationTime = 0
    
    // Event callbacks
    this.onHealthChange = options.onHealthChange || null
    this.onDestroyed = options.onDestroyed || null
    this.onUpgrade = options.onUpgrade || null
  }
  
  create(scene) {
    this.scene = scene
    this.mesh = new THREE.Group()
    
    this.createPlatform()
    this.createCrystal()
    this.createEnergyRings()
    this.createPillars()
    this.createHealthBar()
    this.createAura()
    
    this.mesh.position.copy(this.position)
    this.scene.add(this.mesh)
    
    return this.mesh
  }
  
  createPlatform() {
    const scale = this.config.scale
    const tierCount = this.config.tierCount
    
    // Platform materials
    const platformMats = [
      new THREE.MeshStandardMaterial({
        color: 0x330000,
        metalness: 0.7,
        roughness: 0.3,
        emissive: 0x110000,
        emissiveIntensity: 0.2
      }),
      new THREE.MeshStandardMaterial({
        color: 0x550000,
        metalness: 0.6,
        roughness: 0.4,
        emissive: 0x220000,
        emissiveIntensity: 0.3
      }),
      new THREE.MeshStandardMaterial({
        color: 0x660000,
        metalness: 0.5,
        roughness: 0.5,
        emissive: 0x330000,
        emissiveIntensity: 0.4
      })
    ]
    
    let currentY = 0
    
    for (let i = 0; i < tierCount; i++) {
      const tierScale = scale * (1 - i * 0.15)
      const tierHeight = 1.5 + (tierCount - i) * 0.5
      
      const tierGeom = new THREE.CylinderGeometry(
        (8 - i * 1.5) * tierScale,
        (9 - i * 1.5) * tierScale,
        tierHeight,
        8
      )
      
      const tier = new THREE.Mesh(tierGeom, platformMats[i % platformMats.length].clone())
      tier.position.y = currentY + tierHeight / 2
      tier.castShadow = true
      tier.receiveShadow = true
      this.mesh.add(tier)
      
      currentY += tierHeight
      
      // Decorative edge
      if (i < tierCount - 1) {
        const edgeGeom = new THREE.TorusGeometry((8 - i * 1.5) * tierScale, 0.15, 8, 32)
        const edgeMat = new THREE.MeshStandardMaterial({
          color: 0xaa0000,
          emissive: 0xff0000,
          emissiveIntensity: 0.3,
          metalness: 0.8,
          roughness: 0.2
        })
        const edge = new THREE.Mesh(edgeGeom, edgeMat)
        edge.rotation.x = Math.PI / 2
        edge.position.y = currentY
        this.mesh.add(edge)
      }
    }
    
    this.platformHeight = currentY
  }
  
  createCrystal() {
    const crystalSize = this.config.crystalSize
    
    // Main crystal
    const crystalGeom = new THREE.OctahedronGeometry(crystalSize, 2)
    const crystalMat = new THREE.MeshPhysicalMaterial({
      color: 0xff0000,
      emissive: 0xcc0000,
      emissiveIntensity: 1.0 + this.level * 0.2,
      metalness: 0.1,
      roughness: 0.05,
      transparent: true,
      opacity: 0.9,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1
    })
    
    this.crystal = new THREE.Mesh(crystalGeom, crystalMat)
    this.crystal.position.y = this.platformHeight + crystalSize + 2
    this.crystal.castShadow = true
    this.mesh.add(this.crystal)
    
    // Inner crystal glow
    const innerCrystalGeom = new THREE.OctahedronGeometry(crystalSize * 0.6, 1)
    const innerCrystalMat = new THREE.MeshBasicMaterial({
      color: 0xff4400,
      transparent: true,
      opacity: 0.6
    })
    const innerCrystal = new THREE.Mesh(innerCrystalGeom, innerCrystalMat)
    this.crystal.add(innerCrystal)
    
    // Crystal light
    this.crystalLight = new THREE.PointLight(0xff2200, 4 + this.level, 30 + this.level * 5)
    this.crystalLight.position.y = this.platformHeight + crystalSize + 2
    this.mesh.add(this.crystalLight)
  }
  
  createEnergyRings() {
    const ringCount = this.config.ringCount
    const crystalY = this.platformHeight + this.config.crystalSize + 2
    
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 0.6 + this.level * 0.1,
      metalness: 0.8,
      roughness: 0.2,
      transparent: true,
      opacity: 0.8
    })
    
    for (let i = 0; i < ringCount; i++) {
      const radius = 4 + this.level * 0.5 + i * 0.5
      const ringGeom = new THREE.TorusGeometry(radius, 0.12, 8, 32)
      const ring = new THREE.Mesh(ringGeom, ringMat.clone())
      
      ring.position.y = crystalY
      ring.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.4
      ring.rotation.y = (Math.PI * 2 * i) / ringCount
      
      this.energyRings.push(ring)
      this.mesh.add(ring)
    }
  }
  
  createPillars() {
    const pillarCount = this.config.pillarCount
    const scale = this.config.scale
    
    const pillarGeom = new THREE.CylinderGeometry(0.5 * scale, 0.6 * scale, 5 * scale, 6)
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x880000,
      metalness: 0.7,
      roughness: 0.3,
      emissive: 0x440000,
      emissiveIntensity: 0.3
    })
    
    const orbMat = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.9
    })
    
    for (let i = 0; i < pillarCount; i++) {
      const angle = (i / pillarCount) * Math.PI * 2
      const radius = 6 * scale
      
      const pillar = new THREE.Mesh(pillarGeom, pillarMat.clone())
      pillar.position.set(
        Math.cos(angle) * radius,
        2.5 * scale,
        Math.sin(angle) * radius
      )
      pillar.castShadow = true
      this.pillars.push(pillar)
      this.mesh.add(pillar)
      
      // Orb on top
      const orbGeom = new THREE.SphereGeometry(0.35 * scale, 12, 12)
      const orb = new THREE.Mesh(orbGeom, orbMat.clone())
      orb.position.set(
        Math.cos(angle) * radius,
        5.5 * scale,
        Math.sin(angle) * radius
      )
      this.mesh.add(orb)
      
      // Orb light
      const orbLight = new THREE.PointLight(0xff0000, 0.5, 8)
      orbLight.position.copy(orb.position)
      this.mesh.add(orbLight)
    }
  }
  
  createHealthBar() {
    const barWidth = 12
    const barHeight = 0.8
    
    // Background
    const bgGeom = new THREE.PlaneGeometry(barWidth + 0.4, barHeight + 0.2)
    const bgMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide
    })
    const bg = new THREE.Mesh(bgGeom, bgMat)
    bg.position.y = this.platformHeight + this.config.crystalSize * 2 + 6
    bg.name = 'healthBarBg'
    this.mesh.add(bg)
    
    // Health fill
    const fillGeom = new THREE.PlaneGeometry(barWidth, barHeight)
    const fillMat = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      side: THREE.DoubleSide
    })
    this.healthBarFill = new THREE.Mesh(fillGeom, fillMat)
    this.healthBarFill.position.y = bg.position.y
    this.healthBarFill.position.z = 0.01
    this.healthBarFill.name = 'healthBarFill'
    this.mesh.add(this.healthBarFill)
    
    // Level indicator
    const levelCanvas = document.createElement('canvas')
    levelCanvas.width = 128
    levelCanvas.height = 64
    const ctx = levelCanvas.getContext('2d')
    ctx.font = 'bold 48px Arial'
    ctx.fillStyle = '#ffdd00'
    ctx.textAlign = 'center'
    ctx.fillText(`Lv.${this.level}`, 64, 48)
    
    const levelTexture = new THREE.CanvasTexture(levelCanvas)
    const levelMat = new THREE.SpriteMaterial({ map: levelTexture, transparent: true })
    this.levelSprite = new THREE.Sprite(levelMat)
    this.levelSprite.position.y = bg.position.y + 1.5
    this.levelSprite.scale.set(4, 2, 1)
    this.mesh.add(this.levelSprite)
    
    this.healthBarBg = bg
  }
  
  createAura() {
    // Range indicator
    const auraGeom = new THREE.RingGeometry(this.config.range - 0.5, this.config.range, 64)
    const auraMat = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide
    })
    
    this.aura = new THREE.Mesh(auraGeom, auraMat)
    this.aura.rotation.x = -Math.PI / 2
    this.aura.position.y = 0.1
    this.mesh.add(this.aura)
  }
  
  // ===========================================================================
  // GAMEPLAY
  // ===========================================================================
  
  damage(amount) {
    if (this.health <= 0) return
    
    this.health = Math.max(0, this.health - amount)
    this.updateHealthBar()
    
    // Flash effect
    if (this.crystal) {
      const originalEmissive = this.crystal.material.emissiveIntensity
      this.crystal.material.emissiveIntensity = 2.0
      setTimeout(() => {
        if (this.crystal) this.crystal.material.emissiveIntensity = originalEmissive
      }, 100)
    }
    
    if (this.onHealthChange) {
      this.onHealthChange(this.health, this.maxHealth)
    }
    
    if (this.health <= 0 && this.onDestroyed) {
      this.onDestroyed()
    }
    
    return this.health <= 0
  }
  
  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount)
    this.updateHealthBar()
    
    if (this.onHealthChange) {
      this.onHealthChange(this.health, this.maxHealth)
    }
  }
  
  updateHealthBar() {
    if (!this.healthBarFill) return
    
    const ratio = this.health / this.maxHealth
    this.healthBarFill.scale.x = ratio
    this.healthBarFill.position.x = (1 - ratio) * -6
    
    // Color gradient
    if (ratio > 0.6) {
      this.healthBarFill.material.color.setHex(0x00ff00)
    } else if (ratio > 0.3) {
      this.healthBarFill.material.color.setHex(0xffff00)
    } else {
      this.healthBarFill.material.color.setHex(0xff0000)
    }
  }
  
  canUpgrade(gold) {
    const nextLevel = this.level + 1
    if (!BASE_LEVELS[nextLevel]) return false
    return gold >= BASE_LEVELS[nextLevel].upgradeCost
  }
  
  getUpgradeCost() {
    const nextLevel = this.level + 1
    if (!BASE_LEVELS[nextLevel]) return Infinity
    return BASE_LEVELS[nextLevel].upgradeCost
  }
  
  upgrade() {
    const nextLevel = this.level + 1
    if (!BASE_LEVELS[nextLevel]) return false
    
    this.level = nextLevel
    this.config = BASE_LEVELS[this.level]
    
    // Update stats
    const healthRatio = this.health / this.maxHealth
    this.maxHealth = this.config.maxHealth
    this.health = Math.floor(this.maxHealth * healthRatio)
    
    // Rebuild visual
    this.rebuild()
    
    if (this.onUpgrade) {
      this.onUpgrade(this.level, this.config)
    }
    
    return true
  }
  
  rebuild() {
    // Remove old mesh
    if (this.mesh && this.scene) {
      this.scene.remove(this.mesh)
      this.mesh.traverse(child => {
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
    
    // Reset arrays
    this.energyRings = []
    this.pillars = []
    
    // Create new
    this.create(this.scene)
    this.updateHealthBar()
  }
  
  // Defensive attack (higher levels)
  findTarget(enemies) {
    if (this.config.damage <= 0) return null
    
    let closest = null
    let closestDist = this.config.range
    
    enemies.forEach(enemy => {
      if (enemy.isDead) return
      
      const enemyPos = enemy.mesh ? enemy.mesh.position : enemy.position
      if (!enemyPos) return
      
      const dist = this.position.distanceTo(enemyPos)
      if (dist < closestDist) {
        closest = enemy
        closestDist = dist
      }
    })
    
    return closest
  }
  
  attack(target, visualEffects) {
    if (!target || this.config.damage <= 0) return false
    
    const now = Date.now() / 1000
    if (now - this.lastAttackTime < this.attackCooldown) return false
    
    this.lastAttackTime = now
    
    // Deal damage
    target.damage(this.config.damage)
    
    // Visual effect - lightning from crystal to enemy
    if (visualEffects && this.crystal) {
      const crystalWorldPos = new THREE.Vector3()
      this.crystal.getWorldPosition(crystalWorldPos)
      
      const targetPos = target.mesh ? target.mesh.position.clone() : target.position.clone()
      targetPos.y += 1
      
      visualEffects.createLightning(crystalWorldPos, targetPos, {
        color: 0xff2200,
        duration: 200,
        segments: 15,
        displacement: 2
      })
    }
    
    return true
  }
  
  // ===========================================================================
  // UPDATE
  // ===========================================================================
  
  update(deltaTime, enemies, visualEffects) {
    this.animationTime += deltaTime
    
    // Animate crystal
    if (this.crystal) {
      this.crystal.rotation.y += deltaTime * 0.5
      this.crystal.rotation.x += deltaTime * 0.3
      this.crystal.position.y = this.platformHeight + this.config.crystalSize + 2 + 
        Math.sin(this.animationTime * 1.5) * 0.5
      
      // Pulse emissive
      const pulse = 0.8 + Math.sin(this.animationTime * 2) * 0.3
      this.crystal.material.emissiveIntensity = pulse * (1 + this.level * 0.2)
    }
    
    // Animate rings
    this.energyRings.forEach((ring, i) => {
      ring.rotation.z += deltaTime * (0.6 + i * 0.3)
      ring.position.y = this.platformHeight + this.config.crystalSize + 2 + 
        Math.sin(this.animationTime + i * 0.5) * 0.4
    })
    
    // Animate crystal light
    if (this.crystalLight) {
      this.crystalLight.intensity = 3 + this.level + Math.sin(this.animationTime * 2) * 1.5
    }
    
    // Pulse aura
    if (this.aura) {
      const auraPulse = 1 + Math.sin(this.animationTime * 1.5) * 0.05
      this.aura.scale.set(auraPulse, auraPulse, 1)
      this.aura.material.opacity = 0.1 + Math.sin(this.animationTime * 2) * 0.05
    }
    
    // Health regen
    if (this.config.healthRegen > 0 && this.health < this.maxHealth) {
      this.heal(this.config.healthRegen * deltaTime)
    }
    
    // Defensive attack
    if (this.config.damage > 0 && enemies && enemies.length > 0) {
      const target = this.findTarget(enemies)
      if (target) {
        this.attack(target, visualEffects)
      }
    }
    
    // Face health bar to camera
    if (this.healthBarBg) {
      // Health bar always faces camera - handled externally
    }
  }
  
  getStats() {
    return {
      level: this.level,
      name: this.config.name,
      health: this.health,
      maxHealth: this.maxHealth,
      healthRegen: this.config.healthRegen,
      goldPerSecond: this.config.goldPerSecond,
      range: this.config.range,
      damage: this.config.damage,
      description: this.config.description,
      nextUpgradeCost: this.getUpgradeCost()
    }
  }
  
  destroy() {
    if (this.mesh && this.scene) {
      this.scene.remove(this.mesh)
      this.mesh.traverse(child => {
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

export default MainBase

