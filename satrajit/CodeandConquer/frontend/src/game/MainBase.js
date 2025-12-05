// =============================================================================
// MAIN BASE - Beautiful Sci-Fi Central Nexus
// =============================================================================

import * as THREE from 'three'

export const BASE_LEVELS = {
  1: { name: 'Outpost', maxHealth: 1000, healthRegen: 0, range: 15, damage: 0, upgradeCost: 500 },
  2: { name: 'Fortress', maxHealth: 1500, healthRegen: 2, range: 18, damage: 10, upgradeCost: 1200 },
  3: { name: 'Citadel', maxHealth: 2500, healthRegen: 5, range: 22, damage: 25, upgradeCost: 2500 },
  4: { name: 'Bastion', maxHealth: 4000, healthRegen: 10, range: 26, damage: 50, upgradeCost: 5000 },
  5: { name: 'Nexus', maxHealth: 6000, healthRegen: 20, range: 30, damage: 100, upgradeCost: Infinity }
}

// Color schemes per level
const LEVEL_COLORS = {
  1: { primary: 0x884422, secondary: 0xaa6633, energy: 0xff6600, glow: 0xff4400 },
  2: { primary: 0x663344, secondary: 0x885566, energy: 0xff4488, glow: 0xff2266 },
  3: { primary: 0x443366, secondary: 0x665588, energy: 0x8866ff, glow: 0x6644ff },
  4: { primary: 0x226655, secondary: 0x448877, energy: 0x44ffaa, glow: 0x22ff88 },
  5: { primary: 0x553322, secondary: 0xaa8844, energy: 0xffcc00, glow: 0xffaa00 }
}

export class MainBase {
  constructor(position, options = {}) {
    this.position = position.clone()
    this.level = options.level || 1
    this.config = BASE_LEVELS[this.level]
    this.colors = LEVEL_COLORS[this.level]
    
    this.health = this.config.maxHealth
    this.maxHealth = this.config.maxHealth
    
    this.mesh = null
    this.crystal = null
    this.energyRings = []
    this.pillars = []
    this.healthBarBg = null
    this.healthBarFill = null
    this.levelSprite = null
    this.aura = null
    this.shields = []
    
    this.lastAttackTime = 0
    this.attackCooldown = 1.5
    this.animationTime = 0
    
    this.onHealthChange = options.onHealthChange || null
    this.onDestroyed = options.onDestroyed || null
    this.onUpgrade = options.onUpgrade || null
  }
  
  create(scene) {
    this.scene = scene
    this.mesh = new THREE.Group()
    
    this.createPlatform()
    this.createPillars()
    this.createCrystal()
    this.createEnergyRings()
    this.createShieldDome()
    this.createAuraRing()
    this.createHealthBar()
    
    this.mesh.position.copy(this.position)
    this.scene.add(this.mesh)
    
    return this.mesh
  }
  
  createPlatform() {
    // Base foundation - multi-tiered
    const tiers = [
      { radius: 10, height: 1, y: 0.5, color: this.colors.primary },
      { radius: 8, height: 1.5, y: 1.75, color: this.colors.secondary },
      { radius: 6, height: 2, y: 3.5, color: this.colors.primary }
    ]
    
    tiers.forEach((tier, index) => {
      const geom = new THREE.CylinderGeometry(tier.radius, tier.radius + 0.5, tier.height, 12)
      const mat = new THREE.MeshStandardMaterial({
        color: tier.color,
        metalness: 0.6,
        roughness: 0.3
      })
      const mesh = new THREE.Mesh(geom, mat)
      mesh.position.y = tier.y
      this.mesh.add(mesh)
      
      // Add glowing rim
      const rimGeom = new THREE.TorusGeometry(tier.radius + 0.2, 0.15, 8, 32)
      const rimMat = new THREE.MeshBasicMaterial({
        color: this.colors.energy,
        transparent: true,
        opacity: 0.7
      })
      const rim = new THREE.Mesh(rimGeom, rimMat)
      rim.position.y = tier.y + tier.height / 2
      rim.rotation.x = Math.PI / 2
      this.mesh.add(rim)
    })
    
    // Center platform (for crystal)
    const centerGeom = new THREE.CylinderGeometry(3, 4, 3, 8)
    const centerMat = new THREE.MeshStandardMaterial({
      color: this.colors.secondary,
      metalness: 0.7,
      roughness: 0.2,
      emissive: this.colors.energy,
      emissiveIntensity: 0.2
    })
    const center = new THREE.Mesh(centerGeom, centerMat)
    center.position.y = 6
    this.mesh.add(center)
    
    // Decorative hex plates on main platform
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2
      const plateGeom = new THREE.BoxGeometry(2, 0.3, 3)
      const plateMat = new THREE.MeshStandardMaterial({
        color: this.colors.secondary,
        metalness: 0.5,
        roughness: 0.4
      })
      const plate = new THREE.Mesh(plateGeom, plateMat)
      plate.position.set(Math.cos(angle) * 7, 1.1, Math.sin(angle) * 7)
      plate.rotation.y = angle
      this.mesh.add(plate)
    }
  }
  
  createPillars() {
    // Create 6 ornate pillars around the base
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2
      const pillarGroup = new THREE.Group()
      
      // Main pillar
      const pillarGeom = new THREE.CylinderGeometry(0.5, 0.7, 12, 8)
      const pillarMat = new THREE.MeshStandardMaterial({
        color: this.colors.primary,
        metalness: 0.7,
        roughness: 0.3
      })
      const pillar = new THREE.Mesh(pillarGeom, pillarMat)
      pillar.position.y = 6
      pillarGroup.add(pillar)
      
      // Top crystal
      const topGeom = new THREE.OctahedronGeometry(0.8, 0)
      const topMat = new THREE.MeshBasicMaterial({
        color: this.colors.energy,
        transparent: true,
        opacity: 0.9
      })
      const top = new THREE.Mesh(topGeom, topMat)
      top.position.y = 13
      pillarGroup.add(top)
      this.pillars.push(top)
      
      // Pillar light
      const light = new THREE.PointLight(this.colors.glow, 1, 15)
      light.position.y = 13
      pillarGroup.add(light)
      
      // Energy ring around pillar
      const ringGeom = new THREE.TorusGeometry(1, 0.1, 8, 24)
      const ringMat = new THREE.MeshBasicMaterial({
        color: this.colors.energy,
        transparent: true,
        opacity: 0.6
      })
      const ring = new THREE.Mesh(ringGeom, ringMat)
      ring.position.y = 10
      ring.rotation.x = Math.PI / 2
      pillarGroup.add(ring)
      this.energyRings.push(ring)
      
      pillarGroup.position.set(Math.cos(angle) * 9, 0, Math.sin(angle) * 9)
      this.mesh.add(pillarGroup)
    }
  }
  
  createCrystal() {
    const crystalGroup = new THREE.Group()
    
    // Main crystal
    const crystalGeom = new THREE.OctahedronGeometry(3, 0)
    const crystalMat = new THREE.MeshStandardMaterial({
      color: this.colors.energy,
      emissive: this.colors.energy,
      emissiveIntensity: 0.8,
      metalness: 0.9,
      roughness: 0.1,
      transparent: true,
      opacity: 0.9
    })
    this.crystal = new THREE.Mesh(crystalGeom, crystalMat)
    this.crystal.position.y = 11
    crystalGroup.add(this.crystal)
    
    // Inner glow
    const innerGlowGeom = new THREE.SphereGeometry(2, 16, 16)
    const innerGlowMat = new THREE.MeshBasicMaterial({
      color: this.colors.glow,
      transparent: true,
      opacity: 0.5
    })
    const innerGlow = new THREE.Mesh(innerGlowGeom, innerGlowMat)
    innerGlow.position.y = 11
    crystalGroup.add(innerGlow)
    
    // Outer glow
    const outerGlowGeom = new THREE.SphereGeometry(4, 16, 16)
    const outerGlowMat = new THREE.MeshBasicMaterial({
      color: this.colors.energy,
      transparent: true,
      opacity: 0.2
    })
    const outerGlow = new THREE.Mesh(outerGlowGeom, outerGlowMat)
    outerGlow.position.y = 11
    crystalGroup.add(outerGlow)
    this.crystalGlow = outerGlow
    
    // Crystal point light
    this.crystalLight = new THREE.PointLight(this.colors.glow, 5, 50)
    this.crystalLight.position.y = 11
    crystalGroup.add(this.crystalLight)
    
    // Secondary light for more glow
    const secondLight = new THREE.PointLight(this.colors.energy, 2, 30)
    secondLight.position.y = 11
    crystalGroup.add(secondLight)
    
    this.mesh.add(crystalGroup)
  }
  
  createEnergyRings() {
    // Horizontal energy rings around the crystal
    const ringRadii = [5, 6.5, 8]
    
    ringRadii.forEach((radius, index) => {
      const ringGeom = new THREE.TorusGeometry(radius, 0.15, 8, 48)
      const ringMat = new THREE.MeshBasicMaterial({
        color: this.colors.energy,
        transparent: true,
        opacity: 0.5 - index * 0.1
      })
      const ring = new THREE.Mesh(ringGeom, ringMat)
      ring.position.y = 8 + index * 2
      ring.rotation.x = Math.PI / 2
      this.mesh.add(ring)
      this.energyRings.push(ring)
    })
    
    // Vertical spinning ring
    const vertRingGeom = new THREE.TorusGeometry(4, 0.2, 8, 48)
    const vertRingMat = new THREE.MeshBasicMaterial({
      color: this.colors.glow,
      transparent: true,
      opacity: 0.6
    })
    const vertRing = new THREE.Mesh(vertRingGeom, vertRingMat)
    vertRing.position.y = 11
    this.mesh.add(vertRing)
    this.energyRings.push(vertRing)
  }
  
  createShieldDome() {
    // Transparent shield dome
    const shieldGeom = new THREE.SphereGeometry(12, 32, 24, 0, Math.PI * 2, 0, Math.PI / 2)
    const shieldMat = new THREE.MeshBasicMaterial({
      color: this.colors.energy,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide
    })
    const shield = new THREE.Mesh(shieldGeom, shieldMat)
    shield.position.y = 0
    this.mesh.add(shield)
    this.shields.push(shield)
    
    // Shield hex pattern
    const hexPatternGeom = new THREE.SphereGeometry(12.2, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2)
    const hexPatternMat = new THREE.MeshBasicMaterial({
      color: this.colors.energy,
      wireframe: true,
      transparent: true,
      opacity: 0.15
    })
    const hexPattern = new THREE.Mesh(hexPatternGeom, hexPatternMat)
    hexPattern.position.y = 0
    this.mesh.add(hexPattern)
    this.shields.push(hexPattern)
  }
  
  createAuraRing() {
    // Range indicator ring
    const auraGeom = new THREE.RingGeometry(this.config.range - 1, this.config.range, 64)
    const auraMat = new THREE.MeshBasicMaterial({
      color: this.colors.glow,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide
    })
    this.aura = new THREE.Mesh(auraGeom, auraMat)
    this.aura.rotation.x = -Math.PI / 2
    this.aura.position.y = 0.1
    this.mesh.add(this.aura)
    
    // Outer glow ring
    const outerAuraGeom = new THREE.RingGeometry(this.config.range, this.config.range + 2, 64)
    const outerAuraMat = new THREE.MeshBasicMaterial({
      color: this.colors.energy,
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide
    })
    const outerAura = new THREE.Mesh(outerAuraGeom, outerAuraMat)
    outerAura.rotation.x = -Math.PI / 2
    outerAura.position.y = 0.1
    this.mesh.add(outerAura)
  }
  
  createHealthBar() {
    const barWidth = 14
    const barHeight = 1
    const barY = 18
    
    // Background panel
    const bgGeom = new THREE.PlaneGeometry(barWidth + 1, barHeight + 0.8)
    const bgMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    })
    this.healthBarBg = new THREE.Mesh(bgGeom, bgMat)
    this.healthBarBg.position.y = barY
    this.mesh.add(this.healthBarBg)
    
    // Health fill with gradient effect
    const fillGeom = new THREE.PlaneGeometry(barWidth, barHeight)
    const fillMat = new THREE.MeshBasicMaterial({
      color: 0x00ff44,
      side: THREE.DoubleSide
    })
    this.healthBarFill = new THREE.Mesh(fillGeom, fillMat)
    this.healthBarFill.position.y = barY
    this.healthBarFill.position.z = 0.01
    this.mesh.add(this.healthBarFill)
    
    // Border frame
    const borderGeom = new THREE.RingGeometry(0, 0.1, 4)
    const borderMat = new THREE.MeshBasicMaterial({
      color: this.colors.energy,
      transparent: true,
      opacity: 0.8
    })
    
    // Level indicator
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 128
    const ctx = canvas.getContext('2d')
    
    // Draw background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    ctx.fillRect(0, 0, 256, 128)
    
    // Draw text
    ctx.font = 'bold 48px Arial'
    ctx.textAlign = 'center'
    ctx.fillStyle = `#${this.colors.energy.toString(16).padStart(6, '0')}`
    ctx.fillText(`Lv.${this.level}`, 128, 55)
    ctx.font = '24px Arial'
    ctx.fillStyle = '#ffffff'
    ctx.fillText(this.config.name, 128, 95)
    
    const texture = new THREE.CanvasTexture(canvas)
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true })
    this.levelSprite = new THREE.Sprite(spriteMat)
    this.levelSprite.position.y = barY + 2.5
    this.levelSprite.scale.set(8, 4, 1)
    this.mesh.add(this.levelSprite)
  }
  
  takeDamage(amount) {
    return this.damage(amount)
  }
  
  damage(amount) {
    if (this.health <= 0) return true
    
    this.health = Math.max(0, this.health - amount)
    this.updateHealthBar()
    
    // Flash effect
    this.flashDamage()
    
    if (this.onHealthChange) {
      this.onHealthChange(this.health, this.maxHealth)
    }
    
    if (this.health <= 0 && this.onDestroyed) {
      this.onDestroyed()
    }
    
    return this.health <= 0
  }
  
  flashDamage() {
    if (this.crystal) {
      const originalEmissive = this.crystal.material.emissiveIntensity
      this.crystal.material.emissive.setHex(0xffffff)
      this.crystal.material.emissiveIntensity = 2
      
      setTimeout(() => {
        if (this.crystal) {
          this.crystal.material.emissive.setHex(this.colors.energy)
          this.crystal.material.emissiveIntensity = originalEmissive
        }
      }, 150)
    }
    
    // Flash shields
    this.shields.forEach(shield => {
      shield.material.opacity = 0.4
      setTimeout(() => {
        shield.material.opacity = shield.material.wireframe ? 0.15 : 0.08
      }, 100)
    })
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
    this.healthBarFill.position.x = (1 - ratio) * -7
    
    // Color gradient based on health
    if (ratio > 0.6) {
      this.healthBarFill.material.color.setHex(0x00ff44)
    } else if (ratio > 0.3) {
      this.healthBarFill.material.color.setHex(0xffff00)
    } else {
      this.healthBarFill.material.color.setHex(0xff2200)
    }
  }
  
  getUpgradeCost() {
    return this.config.upgradeCost
  }
  
  canUpgrade(gold) {
    const nextLevel = this.level + 1
    if (!BASE_LEVELS[nextLevel]) return false
    return gold >= this.config.upgradeCost
  }
  
  upgrade() {
    const nextLevel = this.level + 1
    if (!BASE_LEVELS[nextLevel]) return false
    
    this.level = nextLevel
    this.config = BASE_LEVELS[this.level]
    this.colors = LEVEL_COLORS[this.level]
    
    const healthRatio = this.health / this.maxHealth
    this.maxHealth = this.config.maxHealth
    this.health = Math.floor(this.maxHealth * healthRatio)
    
    // Update colors
    this.updateColors()
    this.updateHealthBar()
    this.updateLevelDisplay()
    
    if (this.onUpgrade) {
      this.onUpgrade(this.level, this.config)
    }
    
    return true
  }
  
  updateColors() {
    // Update crystal color
    if (this.crystal) {
      this.crystal.material.color.setHex(this.colors.energy)
      this.crystal.material.emissive.setHex(this.colors.energy)
    }
    if (this.crystalLight) {
      this.crystalLight.color.setHex(this.colors.glow)
    }
    
    // Update energy rings
    this.energyRings.forEach(ring => {
      ring.material.color.setHex(this.colors.energy)
    })
    
    // Update pillars
    this.pillars.forEach(pillar => {
      pillar.material.color.setHex(this.colors.energy)
    })
  }
  
  updateLevelDisplay() {
    if (this.levelSprite) {
      const canvas = document.createElement('canvas')
      canvas.width = 256
      canvas.height = 128
      const ctx = canvas.getContext('2d')
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
      ctx.fillRect(0, 0, 256, 128)
      
      ctx.font = 'bold 48px Arial'
      ctx.textAlign = 'center'
      ctx.fillStyle = `#${this.colors.energy.toString(16).padStart(6, '0')}`
      ctx.fillText(`Lv.${this.level}`, 128, 55)
      ctx.font = '24px Arial'
      ctx.fillStyle = '#ffffff'
      ctx.fillText(this.config.name, 128, 95)
      
      this.levelSprite.material.map.dispose()
      this.levelSprite.material.map = new THREE.CanvasTexture(canvas)
      this.levelSprite.material.needsUpdate = true
    }
  }
  
  findTarget(enemies) {
    if (this.config.damage <= 0) return null
    
    let closest = null
    let closestDist = this.config.range
    
    enemies.forEach(enemy => {
      if (enemy.isDead) return
      
      const pos = enemy.mesh ? enemy.mesh.position : enemy.position
      if (!pos) return
      
      const dist = this.position.distanceTo(pos)
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
    
    // Create attack beam
    if (visualEffects && target.position) {
      const startPos = this.position.clone()
      startPos.y = 11
      visualEffects.createLightning(startPos, target.position, {
        color: this.colors.glow,
        duration: 200
      })
    }
    
    target.damage(this.config.damage)
    return true
  }
  
  update(deltaTime, enemies, visualEffects) {
    this.animationTime += deltaTime
    
    // Animate crystal
    if (this.crystal) {
      this.crystal.rotation.y += deltaTime * 0.8
      this.crystal.position.y = 11 + Math.sin(this.animationTime * 1.5) * 0.5
    }
    
    // Pulse crystal glow
    if (this.crystalGlow) {
      const pulse = 1 + Math.sin(this.animationTime * 2) * 0.2
      this.crystalGlow.scale.setScalar(pulse)
    }
    
    // Pulse crystal light
    if (this.crystalLight) {
      this.crystalLight.intensity = 5 + Math.sin(this.animationTime * 2.5) * 2
    }
    
    // Animate energy rings
    this.energyRings.forEach((ring, index) => {
      const speed = 0.5 + index * 0.2
      const direction = index % 2 === 0 ? 1 : -1
      ring.rotation.z += deltaTime * speed * direction
    })
    
    // Animate pillar crystals
    this.pillars.forEach((pillar, index) => {
      pillar.rotation.y += deltaTime * 1.5
      pillar.position.y = 13 + Math.sin(this.animationTime * 2 + index) * 0.3
    })
    
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
  }
  
  getStats() {
    return {
      level: this.level,
      name: this.config.name,
      health: Math.floor(this.health),
      maxHealth: this.maxHealth,
      healthRegen: this.config.healthRegen,
      range: this.config.range,
      damage: this.config.damage,
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
