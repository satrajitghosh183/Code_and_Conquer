// =============================================================================
// TOWER CLASS - Beautiful Sci-Fi Defense Towers
// =============================================================================

import { TOWER_TYPES } from './TowerTypes.js'
import { modelLoader } from '../ModelLoader.js'
import * as THREE from 'three'

// Tower visual configurations
const TOWER_VISUALS = {
  gattling: { 
    color: 0x7788aa, 
    emissive: 0x4488ff, 
    barrels: 3,
    style: 'rapid'
  },
  missile: { 
    color: 0xaa5533, 
    emissive: 0xff6600, 
    barrels: 2,
    style: 'heavy'
  },
  laser: { 
    color: 0x3388aa, 
    emissive: 0x00ffff, 
    barrels: 1,
    style: 'beam'
  },
  sniper: { 
    color: 0x446644, 
    emissive: 0x44ff44, 
    barrels: 1,
    style: 'precision'
  },
  frost: { 
    color: 0x88aacc, 
    emissive: 0x88ddff, 
    barrels: 1,
    style: 'aoe'
  },
  fire: { 
    color: 0xaa4422, 
    emissive: 0xff4400, 
    barrels: 1,
    style: 'aoe'
  },
  tesla: { 
    color: 0x6644aa, 
    emissive: 0x8866ff, 
    barrels: 0,
    style: 'tesla'
  }
}

export class Tower {
  constructor(towerType, position) {
    const config = TOWER_TYPES[towerType] || TOWER_TYPES.gattling
    
    this.type = 'tower'
    this.towerType = towerType
    this.config = config
    this.visuals = TOWER_VISUALS[towerType] || TOWER_VISUALS.gattling
    this.position = position.clone()
    
    // Combat stats
    this.damage = config.damage || 25
    this.range = config.range || 12
    this.fireRate = config.fireRate || 1.0
    this.cooldown = config.cooldown || 1000
    this.projectileSpeed = config.projectileSpeed || 20
    this.attackType = config.attackType || 'bullet'
    this.energyCost = config.energyCost || 0
    this.maxEnergy = config.maxEnergy || null
    
    // Special effects
    this.splashRadius = config.splashRadius || 0
    this.slowAmount = config.slowAmount || 0
    this.slowDuration = config.slowDuration || 0
    this.burnDamage = config.burnDamage || 0
    this.burnDuration = config.burnDuration || 3000
    this.chainCount = config.chainCount || 0
    this.beamDuration = config.beamDuration || 500
    this.energyRegenBonus = config.energyRegenBonus || 0
    
    // State
    this.target = null
    this.targetingMode = 'first'
    this.lastShot = 0
    this.isActive = true
    this.level = 1
    this.kills = 0
    this.totalDamage = 0
    
    // Mesh references
    this.mesh = null
    this.turretMesh = null
    this.barrelMesh = null
    this.rangeIndicator = null
    this.modelLoaded = false
    this.energyRing = null
    this.muzzleGlow = null
    
    this.animationTime = 0
    this.id = `tower_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  async load() {
    try {
      const modelKey = this.config.modelKey || 'gatling_tower'
      const gltf = await modelLoader.load(modelKey)
      
      if (gltf && gltf.scene) {
        this.mesh = modelLoader.createInstance(modelKey)
        this.modelLoaded = true
        this.findTurretComponents()
        this.applyTowerTint()
        this.mesh.position.copy(this.position)
        console.log(`✅ Loaded 3D model for ${this.towerType}`)
      } else {
        this.createBeautifulFallback()
      }
    } catch (error) {
      console.warn(`Using fallback mesh for ${this.towerType}:`, error.message)
      this.createBeautifulFallback()
    }
    
    return this.mesh
  }
  
  findTurretComponents() {
    if (!this.mesh) return
    
    this.mesh.traverse((child) => {
      const name = child.name?.toLowerCase() || ''
      if (name.includes('turret') || name.includes('head') || name.includes('top')) {
        if (!this.turretMesh) this.turretMesh = child
      }
      if (name.includes('barrel') || name.includes('cannon') || name.includes('muzzle')) {
        if (!this.barrelMesh) this.barrelMesh = child
      }
    })
    
    if (!this.turretMesh && this.mesh.children.length > 0) {
      this.turretMesh = this.mesh.children[this.mesh.children.length - 1]
    }
  }
  
  applyTowerTint() {
    const color = this.visuals.color
    const emissive = this.visuals.emissive
    
    this.mesh.traverse((child) => {
      if (child.isMesh && child.material) {
        if (!child.material._isTinted) {
          const materials = Array.isArray(child.material) ? child.material : [child.material]
          materials.forEach(mat => {
            if (mat.emissive) {
              mat.emissive.setHex(emissive)
              mat.emissiveIntensity = 0.2
            }
            mat._isTinted = true
          })
        }
      }
    })
  }
  
  createBeautifulFallback() {
    const group = new THREE.Group()
    const color = this.visuals.color
    const emissive = this.visuals.emissive
    
    // Base platform - hexagonal
    const baseGeom = new THREE.CylinderGeometry(2, 2.3, 0.8, 6)
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x2a2a3a,
      metalness: 0.8,
      roughness: 0.3
    })
    const base = new THREE.Mesh(baseGeom, baseMat)
    base.position.y = 0.4
    group.add(base)
    
    // Base glow ring
    const baseRingGeom = new THREE.TorusGeometry(2.1, 0.1, 8, 6)
    const baseRingMat = new THREE.MeshBasicMaterial({
      color: emissive,
      transparent: true,
      opacity: 0.7
    })
    const baseRing = new THREE.Mesh(baseRingGeom, baseRingMat)
    baseRing.rotation.x = Math.PI / 2
    baseRing.position.y = 0.85
    group.add(baseRing)
    
    // Main tower body based on style
    this.createTowerBody(group, color, emissive)
    
    // Add energy ring
    this.createEnergyRing(group, emissive)
    
    // Add muzzle glow
    this.createMuzzleGlow(group, emissive)
    
    // Light
    const light = new THREE.PointLight(emissive, 1.5, 15)
    light.position.y = 4
    group.add(light)
    this.towerLight = light
    
    group.position.copy(this.position)
    this.mesh = group
    this.modelLoaded = false
  }
  
  createTowerBody(group, color, emissive) {
    const style = this.visuals.style
    
    // Tower pillar
    let bodyGeom, bodyHeight = 3
    
    if (style === 'heavy') {
      bodyGeom = new THREE.CylinderGeometry(1.2, 1.5, bodyHeight, 8)
    } else if (style === 'beam') {
      bodyGeom = new THREE.CylinderGeometry(0.9, 1.1, bodyHeight + 0.5, 12)
      bodyHeight = 3.5
    } else if (style === 'tesla') {
      bodyGeom = new THREE.CylinderGeometry(1.0, 1.3, bodyHeight, 6)
    } else {
      bodyGeom = new THREE.CylinderGeometry(1.0, 1.2, bodyHeight, 10)
    }
    
    const bodyMat = new THREE.MeshStandardMaterial({
      color,
      metalness: 0.7,
      roughness: 0.3,
      emissive,
      emissiveIntensity: 0.15
    })
    const body = new THREE.Mesh(bodyGeom, bodyMat)
    body.position.y = bodyHeight / 2 + 0.8
    group.add(body)
    
    // Decorative rings on body
    for (let i = 0; i < 2; i++) {
      const ringY = 1.5 + i * 1.2
      const ringGeom = new THREE.TorusGeometry(1.15 - i * 0.1, 0.08, 8, 24)
      const ringMat = new THREE.MeshBasicMaterial({
        color: emissive,
        transparent: true,
        opacity: 0.6
      })
      const ring = new THREE.Mesh(ringGeom, ringMat)
      ring.rotation.x = Math.PI / 2
      ring.position.y = ringY
      group.add(ring)
    }
    
    // Turret head
    let turretGeom
    if (style === 'tesla') {
      turretGeom = new THREE.SphereGeometry(1.2, 16, 16)
    } else if (style === 'heavy') {
      turretGeom = new THREE.BoxGeometry(2, 1.2, 1.8)
    } else {
      turretGeom = new THREE.SphereGeometry(0.9, 12, 12)
    }
    
    const turretMat = new THREE.MeshStandardMaterial({
      color,
      metalness: 0.8,
      roughness: 0.2,
      emissive,
      emissiveIntensity: 0.25
    })
    const turret = new THREE.Mesh(turretGeom, turretMat)
    turret.position.y = bodyHeight + 1.2
    turret.name = 'turret'
    this.turretMesh = turret
    group.add(turret)
    
    // Barrels
    this.createBarrels(group, style, bodyHeight, emissive)
  }
  
  createBarrels(group, style, bodyHeight, emissive) {
    const barrelCount = this.visuals.barrels
    
    if (style === 'tesla') {
      // Tesla coil on top
      const coilGeom = new THREE.SphereGeometry(0.5, 12, 12)
      const coilMat = new THREE.MeshBasicMaterial({
        color: emissive,
        transparent: true,
        opacity: 0.9
      })
      const coil = new THREE.Mesh(coilGeom, coilMat)
      coil.position.y = bodyHeight + 2.2
      group.add(coil)
      
      // Tesla rings
      for (let i = 0; i < 3; i++) {
        const ringGeom = new THREE.TorusGeometry(0.6 + i * 0.3, 0.05, 8, 24)
        const ringMat = new THREE.MeshBasicMaterial({
          color: emissive,
          transparent: true,
          opacity: 0.5 - i * 0.1
        })
        const ring = new THREE.Mesh(ringGeom, ringMat)
        ring.position.y = bodyHeight + 1.6 + i * 0.3
        group.add(ring)
      }
      return
    }
    
    // Create barrels based on count
    const barrelGroup = new THREE.Group()
    
    for (let i = 0; i < barrelCount; i++) {
      const offset = barrelCount === 1 ? 0 : (i - (barrelCount - 1) / 2) * 0.4
      
      const barrelLength = style === 'beam' ? 2 : style === 'heavy' ? 1.8 : 1.4
      const barrelGeom = new THREE.CylinderGeometry(0.15, 0.2, barrelLength, 8)
      const barrelMat = new THREE.MeshStandardMaterial({
        color: 0x333344,
        metalness: 0.9,
        roughness: 0.1
      })
      const barrel = new THREE.Mesh(barrelGeom, barrelMat)
      barrel.rotation.x = Math.PI / 2
      barrel.position.set(offset, 0, barrelLength / 2 + 0.5)
      barrelGroup.add(barrel)
    }
    
    barrelGroup.position.y = bodyHeight + 1.2
    barrelGroup.name = 'barrel'
    this.barrelMesh = barrelGroup
    group.add(barrelGroup)
  }
  
  createEnergyRing(group, emissive) {
    const ringGeom = new THREE.TorusGeometry(1.8, 0.08, 8, 32)
    const ringMat = new THREE.MeshBasicMaterial({
      color: emissive,
      transparent: true,
      opacity: 0.5
    })
    this.energyRing = new THREE.Mesh(ringGeom, ringMat)
    this.energyRing.rotation.x = Math.PI / 2
    this.energyRing.position.y = 3.5
    group.add(this.energyRing)
  }
  
  createMuzzleGlow(group, emissive) {
    const glowGeom = new THREE.SphereGeometry(0.25, 8, 8)
    const glowMat = new THREE.MeshBasicMaterial({
      color: emissive,
      transparent: true,
      opacity: 0.8
    })
    this.muzzleGlow = new THREE.Mesh(glowGeom, glowMat)
    
    const zOffset = this.visuals.style === 'beam' ? 2.5 : this.visuals.style === 'heavy' ? 2.2 : 2
    this.muzzleGlow.position.set(0, 4.2, zOffset)
    group.add(this.muzzleGlow)
  }
  
  getTowerColor() {
    return this.visuals.emissive
  }
  
  canFire(currentTime) {
    const cooldownTime = 1.0 / this.fireRate
    return (currentTime - this.lastShot) >= cooldownTime
  }
  
  findTarget(enemies) {
    if (!enemies || enemies.length === 0) {
      this.target = null
      return null
    }
    
    const inRange = enemies.filter(enemy => {
      if (!enemy || enemy.isDead || !enemy.position) return false
      return this.position.distanceTo(enemy.position) <= this.range
    })
    
    if (inRange.length === 0) {
      this.target = null
      return null
    }
    
    switch (this.targetingMode) {
      case 'first':
        this.target = inRange.reduce((first, enemy) => {
          const firstProgress = first.path ? first.path.length : 999
          const enemyProgress = enemy.path ? enemy.path.length : 999
          return enemyProgress < firstProgress ? enemy : first
        })
        break
      case 'closest':
        this.target = inRange.reduce((closest, enemy) => {
          const closestDist = this.position.distanceTo(closest.position)
          const enemyDist = this.position.distanceTo(enemy.position)
          return enemyDist < closestDist ? enemy : closest
        })
        break
      case 'strongest':
        this.target = inRange.reduce((strongest, enemy) => {
          return enemy.health > strongest.health ? enemy : strongest
        })
        break
      default:
        this.target = inRange.reduce((closest, enemy) => {
          const closestDist = this.position.distanceTo(closest.position)
          const enemyDist = this.position.distanceTo(enemy.position)
          return enemyDist < closestDist ? enemy : closest
        })
    }
    
    return this.target
  }
  
  aimAtTarget() {
    if (!this.target || !this.mesh) return
    
    const targetPos = this.target.position.clone()
    const direction = new THREE.Vector3().subVectors(targetPos, this.mesh.position)
    direction.y = 0
    direction.normalize()
    
    const angle = Math.atan2(direction.x, direction.z)
    
    if (this.turretMesh) {
      this.turretMesh.rotation.y = angle
    }
    if (this.barrelMesh) {
      this.barrelMesh.rotation.y = angle
    }
    if (this.muzzleGlow) {
      const zOffset = this.visuals.style === 'beam' ? 2.5 : this.visuals.style === 'heavy' ? 2.2 : 2
      this.muzzleGlow.position.x = Math.sin(angle) * zOffset
      this.muzzleGlow.position.z = Math.cos(angle) * zOffset
    }
  }
  
  update(deltaTime) {
    this.animationTime += deltaTime
    
    // Animate energy ring
    if (this.energyRing) {
      this.energyRing.rotation.z += deltaTime * 2
    }
    
    // Pulse muzzle glow
    if (this.muzzleGlow) {
      const pulse = 0.6 + Math.sin(this.animationTime * 4) * 0.3
      this.muzzleGlow.material.opacity = pulse
    }
    
    // Pulse light
    if (this.towerLight) {
      this.towerLight.intensity = 1.5 + Math.sin(this.animationTime * 3) * 0.5
    }
  }
  
  recordKill() {
    this.kills++
  }
  
  recordDamage(amount) {
    this.totalDamage += amount
  }
  
  upgrade() {
    if (this.level >= 3) return false
    
    const upgradeConfig = this.config.upgrades?.[this.level - 1]
    if (!upgradeConfig) return false
    
    this.level++
    
    if (upgradeConfig.damage) this.damage = upgradeConfig.damage
    if (upgradeConfig.range) this.range = upgradeConfig.range
    if (upgradeConfig.cooldown) this.cooldown = upgradeConfig.cooldown
    if (upgradeConfig.fireRate) this.fireRate = upgradeConfig.fireRate
    if (upgradeConfig.splashRadius) this.splashRadius = upgradeConfig.splashRadius
    if (upgradeConfig.slowAmount) this.slowAmount = upgradeConfig.slowAmount
    if (upgradeConfig.chainCount) this.chainCount = upgradeConfig.chainCount
    if (upgradeConfig.energyCost !== undefined) this.energyCost = upgradeConfig.energyCost
    if (upgradeConfig.maxEnergy) this.maxEnergy = upgradeConfig.maxEnergy
    if (upgradeConfig.energyRegenBonus) this.energyRegenBonus = upgradeConfig.energyRegenBonus
    
    // Visual upgrade
    if (this.mesh) {
      this.mesh.scale.multiplyScalar(1.1)
    }
    
    // Increase glow
    if (this.energyRing) {
      this.energyRing.material.opacity = 0.5 + this.level * 0.15
      this.energyRing.scale.multiplyScalar(1.05)
    }
    if (this.towerLight) {
      this.towerLight.intensity += 0.5
    }
    if (this.muzzleGlow) {
      this.muzzleGlow.material.opacity = Math.min(1, this.muzzleGlow.material.opacity + 0.15)
    }
    
    return true
  }
  
  getUpgradeCost() {
    const upgradeConfig = this.config.upgrades?.[this.level - 1]
    return upgradeConfig?.cost || 100
  }
  
  showRange() {
    if (this.rangeIndicator) return
    
    const geometry = new THREE.RingGeometry(this.range - 0.5, this.range, 48)
    const material = new THREE.MeshBasicMaterial({
      color: this.visuals.emissive,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide
    })
    
    this.rangeIndicator = new THREE.Mesh(geometry, material)
    this.rangeIndicator.position.copy(this.position)
    this.rangeIndicator.position.y = 0.15
    this.rangeIndicator.rotation.x = -Math.PI / 2
    
    if (this.mesh && this.mesh.parent) {
      this.mesh.parent.add(this.rangeIndicator)
    }
  }
  
  hideRange() {
    if (this.rangeIndicator) {
      if (this.rangeIndicator.parent) {
        this.rangeIndicator.parent.remove(this.rangeIndicator)
      }
      this.rangeIndicator.geometry.dispose()
      this.rangeIndicator.material.dispose()
      this.rangeIndicator = null
    }
  }
  
  setTargetingMode(mode) {
    this.targetingMode = mode
  }
  
  getSellValue() {
    let baseValue = this.config.cost || 100
    for (let i = 0; i < this.level - 1; i++) {
      const upgradeCost = this.config.upgrades?.[i]?.cost || 0
      baseValue += upgradeCost
    }
    return Math.floor(baseValue * 0.6)
  }
  
  getStats() {
    return {
      id: this.id,
      type: this.towerType,
      name: this.config.name,
      level: this.level,
      damage: this.damage,
      range: this.range,
      fireRate: this.fireRate,
      energyCost: this.energyCost || 0,
      kills: this.kills,
      totalDamage: Math.floor(this.totalDamage),
      attackType: this.attackType,
      modelLoaded: this.modelLoaded
    }
  }
  
  destroy() {
    this.hideRange()
    
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
