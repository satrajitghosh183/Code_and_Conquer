// =============================================================================
// MAIN BASE - Spectacular Sci-Fi Central Citadel
// =============================================================================

import * as THREE from 'three'

export const BASE_LEVELS = {
  1: { name: 'Outpost', maxHealth: 1000, healthRegen: 0, range: 15, damage: 0, upgradeCost: 500 },
  2: { name: 'Fortress', maxHealth: 1500, healthRegen: 2, range: 18, damage: 10, upgradeCost: 1200 },
  3: { name: 'Citadel', maxHealth: 2500, healthRegen: 5, range: 22, damage: 25, upgradeCost: 2500 },
  4: { name: 'Bastion', maxHealth: 4000, healthRegen: 10, range: 26, damage: 50, upgradeCost: 5000 },
  5: { name: 'Nexus', maxHealth: 6000, healthRegen: 20, range: 30, damage: 100, upgradeCost: Infinity }
}

// Color schemes per level - SPACE STATION COLORS
const LEVEL_COLORS = {
  1: { primary: 0x1a1a2e, secondary: 0x252540, energy: 0x00ffff, glow: 0x00ddff, accent: 0xff6600 },
  2: { primary: 0x1e2040, secondary: 0x2a2a55, energy: 0x44ffff, glow: 0x22aaff, accent: 0xff8844 },
  3: { primary: 0x202050, secondary: 0x303070, energy: 0x6688ff, glow: 0x4466ff, accent: 0xffaa00 },
  4: { primary: 0x182838, secondary: 0x254050, energy: 0x00ff88, glow: 0x00ffaa, accent: 0xff4444 },
  5: { primary: 0x2a2030, secondary: 0x403050, energy: 0xffd700, glow: 0xffcc00, accent: 0xff0066 }
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
    this.animatedParts = []
    this.lights = []
    this.particles = []
    
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
    
    // Build the spectacular citadel
    this.createFoundation()
    this.createMainTower()
    this.createOrbitalRings()
    this.createEnergyCore()
    this.createDefenseTurrets()
    this.createFloatingPlatforms()
    this.createParticleEffects()
    this.createShieldDome()
    this.createHealthBar()
    
    this.mesh.position.copy(this.position)
    this.scene.add(this.mesh)
    
    return this.mesh
  }
  
  createFoundation() {
    // Multi-layered hexagonal foundation
    const layers = [
      { radius: 16, height: 1.5, y: 0.75, segments: 6 },
      { radius: 13, height: 2, y: 2.5, segments: 6 },
      { radius: 10, height: 2.5, y: 4.75, segments: 8 },
      { radius: 7, height: 3, y: 7.5, segments: 8 }
    ]
    
    layers.forEach((layer, index) => {
      // Main platform
      const geom = new THREE.CylinderGeometry(layer.radius, layer.radius + 1, layer.height, layer.segments)
      const mat = new THREE.MeshStandardMaterial({
        color: index % 2 === 0 ? this.colors.primary : this.colors.secondary,
        metalness: 0.7,
        roughness: 0.3,
        emissive: this.colors.primary,
        emissiveIntensity: 0.1
      })
      const platform = new THREE.Mesh(geom, mat)
      platform.position.y = layer.y
      platform.castShadow = true
      platform.receiveShadow = true
      this.mesh.add(platform)
      
      // Glowing edge ring
      const edgeGeom = new THREE.TorusGeometry(layer.radius + 0.3, 0.2, 8, layer.segments * 4)
      const edgeMat = new THREE.MeshBasicMaterial({
        color: this.colors.energy,
        transparent: true,
        opacity: 0.8
      })
      const edge = new THREE.Mesh(edgeGeom, edgeMat)
      edge.position.y = layer.y + layer.height / 2
      edge.rotation.x = Math.PI / 2
      this.mesh.add(edge)
      this.animatedParts.push({ mesh: edge, type: 'glow', baseOpacity: 0.8 })
      
      // Corner pillars on bottom layers
      if (index < 2) {
        for (let i = 0; i < layer.segments; i++) {
          const angle = (i / layer.segments) * Math.PI * 2
          const pillarGroup = this.createCornerPillar(layer.radius * 0.9, angle, layer.y)
          this.mesh.add(pillarGroup)
        }
      }
    })
    
    // Central glowing floor pattern
    const floorPatternGeom = new THREE.RingGeometry(2, 15, 32, 4)
    const floorPatternMat = new THREE.MeshBasicMaterial({
      color: this.colors.energy,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    })
    const floorPattern = new THREE.Mesh(floorPatternGeom, floorPatternMat)
    floorPattern.rotation.x = -Math.PI / 2
    floorPattern.position.y = 0.1
    this.mesh.add(floorPattern)
    this.animatedParts.push({ mesh: floorPattern, type: 'rotate', speed: 0.2 })
  }
  
  createCornerPillar(radius, angle, baseY) {
    const group = new THREE.Group()
    
    const pillarGeom = new THREE.CylinderGeometry(0.4, 0.6, 8, 6)
    const pillarMat = new THREE.MeshStandardMaterial({
      color: this.colors.secondary,
      metalness: 0.8,
      roughness: 0.2
    })
    const pillar = new THREE.Mesh(pillarGeom, pillarMat)
    pillar.position.y = 4
    group.add(pillar)
    
    // Top crystal
    const crystalGeom = new THREE.OctahedronGeometry(0.6, 0)
    const crystalMat = new THREE.MeshBasicMaterial({
      color: this.colors.glow,
      transparent: true,
      opacity: 0.9
    })
    const crystal = new THREE.Mesh(crystalGeom, crystalMat)
    crystal.position.y = 9
    group.add(crystal)
    this.animatedParts.push({ mesh: crystal, type: 'float', baseY: 9, amplitude: 0.3, speed: 2 })
    
    // Pillar light
    const light = new THREE.PointLight(this.colors.glow, 2, 15)
    light.position.y = 9
    group.add(light)
    this.lights.push(light)
    
    group.position.set(Math.cos(angle) * radius, baseY, Math.sin(angle) * radius)
    return group
  }
  
  createMainTower() {
    // Central spire tower
    const towerGroup = new THREE.Group()
    
    // Main tower body - tapered cylinder
    const towerGeom = new THREE.CylinderGeometry(2.5, 4.5, 18, 8)
    const towerMat = new THREE.MeshStandardMaterial({
      color: this.colors.primary,
      metalness: 0.8,
      roughness: 0.2,
      emissive: this.colors.secondary,
      emissiveIntensity: 0.15
    })
    const tower = new THREE.Mesh(towerGeom, towerMat)
    tower.position.y = 18
    tower.castShadow = true
    towerGroup.add(tower)
    
    // Tower mid-section details
    for (let i = 0; i < 3; i++) {
      const ringY = 12 + i * 5
      const ringRadius = 4 - i * 0.5
      
      const ringGeom = new THREE.TorusGeometry(ringRadius, 0.3, 8, 32)
      const ringMat = new THREE.MeshBasicMaterial({
        color: this.colors.energy,
        transparent: true,
        opacity: 0.7
      })
      const ring = new THREE.Mesh(ringGeom, ringMat)
      ring.position.y = ringY
      ring.rotation.x = Math.PI / 2
      towerGroup.add(ring)
      this.animatedParts.push({ mesh: ring, type: 'rotate', speed: 0.5 + i * 0.2 })
    }
    
    // Tower spire top
    const spireGeom = new THREE.ConeGeometry(2, 10, 6)
    const spireMat = new THREE.MeshStandardMaterial({
      color: this.colors.secondary,
      metalness: 0.9,
      roughness: 0.1,
      emissive: this.colors.energy,
      emissiveIntensity: 0.3
    })
    const spire = new THREE.Mesh(spireGeom, spireMat)
    spire.position.y = 32
    towerGroup.add(spire)
    
    // Spire tip crystal
    const tipGeom = new THREE.IcosahedronGeometry(1.5, 1)
    const tipMat = new THREE.MeshBasicMaterial({
      color: this.colors.glow,
      transparent: true,
      opacity: 0.95
    })
    const tip = new THREE.Mesh(tipGeom, tipMat)
    tip.position.y = 38
    towerGroup.add(tip)
    this.animatedParts.push({ mesh: tip, type: 'spin', speed: 2 })
    
    // Spire beacon light
    const beaconLight = new THREE.PointLight(this.colors.glow, 15, 80)
    beaconLight.position.y = 38
    towerGroup.add(beaconLight)
    this.lights.push(beaconLight)
    this.beaconLight = beaconLight
    
    // Light beam going up
    const beamGeom = new THREE.CylinderGeometry(0.3, 1.5, 20, 8)
    const beamMat = new THREE.MeshBasicMaterial({
      color: this.colors.glow,
      transparent: true,
      opacity: 0.3
    })
    const beam = new THREE.Mesh(beamGeom, beamMat)
    beam.position.y = 48
    towerGroup.add(beam)
    this.animatedParts.push({ mesh: beam, type: 'pulse', baseScale: 1 })
    
    this.mesh.add(towerGroup)
  }
  
  createOrbitalRings() {
    // Multiple orbital rings around the tower
    const orbitalConfigs = [
      { radius: 8, tilt: 0.3, speed: 0.4, height: 15 },
      { radius: 10, tilt: -0.4, speed: -0.3, height: 20 },
      { radius: 6, tilt: 0.5, speed: 0.6, height: 25 }
    ]
    
    orbitalConfigs.forEach((config, index) => {
      const ringGroup = new THREE.Group()
      
      // Main ring
      const ringGeom = new THREE.TorusGeometry(config.radius, 0.15, 8, 64)
      const ringMat = new THREE.MeshBasicMaterial({
        color: this.colors.accent,
        transparent: true,
        opacity: 0.6
      })
      const ring = new THREE.Mesh(ringGeom, ringMat)
      ringGroup.add(ring)
      
      // Orbiting orbs
      const orbCount = 3 + index
      for (let i = 0; i < orbCount; i++) {
        const angle = (i / orbCount) * Math.PI * 2
        const orbGeom = new THREE.SphereGeometry(0.5, 12, 12)
        const orbMat = new THREE.MeshBasicMaterial({
          color: this.colors.energy,
          transparent: true,
          opacity: 0.9
        })
        const orb = new THREE.Mesh(orbGeom, orbMat)
        orb.position.set(Math.cos(angle) * config.radius, 0, Math.sin(angle) * config.radius)
        ringGroup.add(orb)
      }
      
      ringGroup.position.y = config.height
      ringGroup.rotation.x = config.tilt
      this.mesh.add(ringGroup)
      
      this.animatedParts.push({ 
        mesh: ringGroup, 
        type: 'orbit', 
        speed: config.speed,
        tilt: config.tilt
      })
    })
  }
  
  createEnergyCore() {
    const coreGroup = new THREE.Group()
    coreGroup.position.y = 15
    
    // Main energy sphere
    const coreGeom = new THREE.SphereGeometry(3, 32, 32)
    const coreMat = new THREE.MeshBasicMaterial({
      color: this.colors.energy,
      transparent: true,
      opacity: 0.8
    })
    this.energyCore = new THREE.Mesh(coreGeom, coreMat)
    coreGroup.add(this.energyCore)
    
    // Inner bright core
    const innerCoreGeom = new THREE.SphereGeometry(2, 24, 24)
    const innerCoreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9
    })
    this.innerCore = new THREE.Mesh(innerCoreGeom, innerCoreMat)
    coreGroup.add(this.innerCore)
    
    // Outer glow layers
    for (let i = 0; i < 3; i++) {
      const glowSize = 4 + i * 2
      const glowGeom = new THREE.SphereGeometry(glowSize, 16, 16)
      const glowMat = new THREE.MeshBasicMaterial({
        color: this.colors.glow,
        transparent: true,
        opacity: 0.15 - i * 0.04
      })
      const glow = new THREE.Mesh(glowGeom, glowMat)
      coreGroup.add(glow)
      this.animatedParts.push({ mesh: glow, type: 'pulse', baseScale: 1, speed: 1.5 - i * 0.3 })
    }
    
    // Core point light
    this.coreLight = new THREE.PointLight(this.colors.energy, 10, 50)
    coreGroup.add(this.coreLight)
    this.lights.push(this.coreLight)
    
    this.mesh.add(coreGroup)
  }
  
  createDefenseTurrets() {
    // 4 defense turret platforms
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.PI / 4
      const turretGroup = new THREE.Group()
      
      // Turret base
      const baseGeom = new THREE.CylinderGeometry(1.2, 1.5, 2, 6)
      const baseMat = new THREE.MeshStandardMaterial({
        color: this.colors.secondary,
        metalness: 0.7,
        roughness: 0.3
      })
      const base = new THREE.Mesh(baseGeom, baseMat)
      base.position.y = 1
      turretGroup.add(base)
      
      // Turret cannon
      const cannonGeom = new THREE.CylinderGeometry(0.3, 0.4, 3, 8)
      const cannonMat = new THREE.MeshStandardMaterial({
        color: this.colors.primary,
        metalness: 0.9,
        roughness: 0.1
      })
      const cannon = new THREE.Mesh(cannonGeom, cannonMat)
      cannon.position.y = 3
      cannon.rotation.x = -Math.PI / 4
      turretGroup.add(cannon)
      
      // Turret glow
      const turretLight = new THREE.PointLight(this.colors.energy, 1.5, 10)
      turretLight.position.y = 3
      turretGroup.add(turretLight)
      this.lights.push(turretLight)
      
      turretGroup.position.set(Math.cos(angle) * 11, 6, Math.sin(angle) * 11)
      turretGroup.rotation.y = -angle + Math.PI
      this.mesh.add(turretGroup)
    }
  }
  
  createFloatingPlatforms() {
    // Floating crystal platforms around the base
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2
      const distance = 14 + Math.random() * 4
      const height = 8 + Math.random() * 10
      
      const platformGroup = new THREE.Group()
      
      // Floating platform
      const platGeom = new THREE.CylinderGeometry(1.5, 1.8, 0.5, 6)
      const platMat = new THREE.MeshStandardMaterial({
        color: this.colors.secondary,
        metalness: 0.6,
        roughness: 0.4,
        emissive: this.colors.energy,
        emissiveIntensity: 0.2
      })
      const platform = new THREE.Mesh(platGeom, platMat)
      platformGroup.add(platform)
      
      // Crystal on platform
      const crystalGeom = new THREE.OctahedronGeometry(0.8, 0)
      const crystalMat = new THREE.MeshBasicMaterial({
        color: this.colors.glow,
        transparent: true,
        opacity: 0.85
      })
      const crystal = new THREE.Mesh(crystalGeom, crystalMat)
      crystal.position.y = 1.2
      crystal.rotation.y = Math.random() * Math.PI * 2
      platformGroup.add(crystal)
      
      platformGroup.position.set(
        Math.cos(angle) * distance,
        height,
        Math.sin(angle) * distance
      )
      
      this.mesh.add(platformGroup)
      this.animatedParts.push({ 
        mesh: platformGroup, 
        type: 'float', 
        baseY: height, 
        amplitude: 0.5 + Math.random() * 0.5,
        speed: 1 + Math.random() * 0.5,
        offset: i
      })
    }
  }
  
  createParticleEffects() {
    // Floating energy particles
    const particleCount = 50
    const particleGeom = new THREE.SphereGeometry(0.15, 6, 6)
    const particleMat = new THREE.MeshBasicMaterial({
      color: this.colors.energy,
      transparent: true,
      opacity: 0.8
    })
    
    for (let i = 0; i < particleCount; i++) {
      const particle = new THREE.Mesh(particleGeom.clone(), particleMat.clone())
      const angle = Math.random() * Math.PI * 2
      const radius = 5 + Math.random() * 15
      const height = Math.random() * 35
      
      particle.position.set(
        Math.cos(angle) * radius,
        height,
        Math.sin(angle) * radius
      )
      
      this.mesh.add(particle)
      this.particles.push({
        mesh: particle,
        angle,
        radius,
        baseY: height,
        speed: 0.5 + Math.random() * 1,
        ySpeed: 0.3 + Math.random() * 0.5
      })
    }
  }
  
  createShieldDome() {
    // Transparent shield dome
    const shieldGeom = new THREE.SphereGeometry(18, 32, 24, 0, Math.PI * 2, 0, Math.PI / 2)
    const shieldMat = new THREE.MeshBasicMaterial({
      color: this.colors.accent,
      transparent: true,
      opacity: 0.06,
      side: THREE.DoubleSide
    })
    this.shield = new THREE.Mesh(shieldGeom, shieldMat)
    this.mesh.add(this.shield)
    
    // Shield hex wireframe
    const wireGeom = new THREE.SphereGeometry(18.5, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2)
    const wireMat = new THREE.MeshBasicMaterial({
      color: this.colors.energy,
      wireframe: true,
      transparent: true,
      opacity: 0.1
    })
    this.shieldWire = new THREE.Mesh(wireGeom, wireMat)
    this.mesh.add(this.shieldWire)
    
    // Range indicator
    const rangeGeom = new THREE.RingGeometry(this.config.range - 1, this.config.range, 64)
    const rangeMat = new THREE.MeshBasicMaterial({
      color: this.colors.glow,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide
    })
    this.rangeIndicator = new THREE.Mesh(rangeGeom, rangeMat)
    this.rangeIndicator.rotation.x = -Math.PI / 2
    this.rangeIndicator.position.y = 0.1
    this.mesh.add(this.rangeIndicator)
  }
  
  createHealthBar() {
    const barWidth = 18
    const barHeight = 1.2
    const barY = 45
    
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
    
    const fillGeom = new THREE.PlaneGeometry(barWidth, barHeight)
    const fillMat = new THREE.MeshBasicMaterial({
      color: 0x00ff44,
      side: THREE.DoubleSide
    })
    this.healthBarFill = new THREE.Mesh(fillGeom, fillMat)
    this.healthBarFill.position.y = barY
    this.healthBarFill.position.z = 0.01
    this.mesh.add(this.healthBarFill)
    
    // Level indicator sprite
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
    
    const texture = new THREE.CanvasTexture(canvas)
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true })
    this.levelSprite = new THREE.Sprite(spriteMat)
    this.levelSprite.position.y = barY + 3
    this.levelSprite.scale.set(10, 5, 1)
    this.mesh.add(this.levelSprite)
  }
  
  takeDamage(amount) {
    return this.damage(amount)
  }
  
  damage(amount) {
    if (this.health <= 0) return true
    
    this.health = Math.max(0, this.health - amount)
    this.updateHealthBar()
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
    // Flash shield
    if (this.shield) {
      this.shield.material.opacity = 0.4
      setTimeout(() => {
        if (this.shield) this.shield.material.opacity = 0.06
      }, 100)
    }
    
    // Flash energy core
    if (this.energyCore) {
      const originalColor = this.energyCore.material.color.getHex()
      this.energyCore.material.color.setHex(0xff0000)
      setTimeout(() => {
        if (this.energyCore) this.energyCore.material.color.setHex(originalColor)
      }, 150)
    }
    
    // Flash all lights
    this.lights.forEach(light => {
      const originalIntensity = light.intensity
      light.intensity = originalIntensity * 3
      light.color.setHex(0xff0000)
      setTimeout(() => {
        light.intensity = originalIntensity
        light.color.setHex(this.colors.glow)
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
    this.healthBarFill.position.x = (1 - ratio) * -9
    
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
    
    this.updateColors()
    this.updateHealthBar()
    this.updateLevelDisplay()
    
    if (this.onUpgrade) {
      this.onUpgrade(this.level, this.config)
    }
    
    return true
  }
  
  updateColors() {
    // Update all lights
    this.lights.forEach(light => {
      light.color.setHex(this.colors.glow)
    })
    
    // Update energy core
    if (this.energyCore) {
      this.energyCore.material.color.setHex(this.colors.energy)
    }
    
    // Update particles
    this.particles.forEach(p => {
      p.mesh.material.color.setHex(this.colors.energy)
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
    
    if (visualEffects && target.position) {
      const startPos = this.position.clone()
      startPos.y = 15
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
    
    // Animate parts
    this.animatedParts.forEach(part => {
      switch (part.type) {
        case 'rotate':
          part.mesh.rotation.z += deltaTime * (part.speed || 0.5)
          break
        case 'orbit':
          part.mesh.rotation.y += deltaTime * part.speed
          break
        case 'spin':
          part.mesh.rotation.y += deltaTime * (part.speed || 1)
          part.mesh.rotation.x += deltaTime * 0.5
          break
        case 'float':
          const floatOffset = Math.sin(this.animationTime * (part.speed || 1) + (part.offset || 0)) * (part.amplitude || 0.5)
          part.mesh.position.y = part.baseY + floatOffset
          break
        case 'pulse':
          const pulseScale = (part.baseScale || 1) + Math.sin(this.animationTime * (part.speed || 2)) * 0.15
          part.mesh.scale.setScalar(pulseScale)
          break
        case 'glow':
          part.mesh.material.opacity = (part.baseOpacity || 0.8) + Math.sin(this.animationTime * 3) * 0.2
          break
      }
    })
    
    // Animate energy core
    if (this.energyCore) {
      const coreScale = 1 + Math.sin(this.animationTime * 3) * 0.15
      this.energyCore.scale.setScalar(coreScale)
      this.energyCore.material.opacity = 0.7 + Math.sin(this.animationTime * 2) * 0.2
    }
    
    if (this.innerCore) {
      const innerScale = 0.9 + Math.sin(this.animationTime * 4) * 0.2
      this.innerCore.scale.setScalar(innerScale)
    }
    
    // Animate beacon light
    if (this.beaconLight) {
      this.beaconLight.intensity = 12 + Math.sin(this.animationTime * 2) * 5
    }
    
    // Animate core light
    if (this.coreLight) {
      this.coreLight.intensity = 8 + Math.sin(this.animationTime * 2.5) * 4
    }
    
    // Animate particles
    this.particles.forEach(p => {
      p.angle += deltaTime * p.speed
      p.mesh.position.x = Math.cos(p.angle) * p.radius
      p.mesh.position.z = Math.sin(p.angle) * p.radius
      p.mesh.position.y = p.baseY + Math.sin(this.animationTime * p.ySpeed + p.angle) * 2
      
      // Pulse particle opacity
      p.mesh.material.opacity = 0.6 + Math.sin(this.animationTime * 4 + p.angle) * 0.3
    })
    
    // Shield wireframe rotation
    if (this.shieldWire) {
      this.shieldWire.rotation.y += deltaTime * 0.1
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
