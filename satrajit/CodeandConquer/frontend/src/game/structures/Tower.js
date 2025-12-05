// =============================================================================
// PROFESSIONAL TOWER CLASS - Studio-Quality Defensive Structure
// =============================================================================
// Full-featured tower with model loading, targeting, upgrades, and abilities.
// =============================================================================

import { Structure } from './Structure.js'
import { TOWER_TYPES } from './TowerTypes.js'
import { modelLoader } from '../ModelLoader.js'
import * as THREE from 'three'

export class Tower extends Structure {
  constructor(towerType, position) {
    const config = TOWER_TYPES[towerType]
    if (!config) {
      throw new Error(`Unknown tower type: ${towerType}`)
    }
    
    super('tower', position, config.modelKey, {
      health: config.health,
      maxHealth: config.health,
      cost: config.cost
    })
    
    // Tower configuration
    this.towerType = towerType
    this.config = config
    
    // Combat stats
    this.damage = config.damage
    this.range = config.range
    this.fireRate = config.fireRate || 1.0
    this.cooldown = config.cooldown || 1000
    this.projectileSpeed = config.projectileSpeed || 20
    this.attackType = config.attackType || 'bullet'
    
    // Special abilities
    this.splashRadius = config.splashRadius || 0
    this.slowAmount = config.slowAmount || 0
    this.slowDuration = config.slowDuration || 0
    this.burnDamage = config.burnDamage || 0
    this.burnDuration = config.burnDuration || 0
    this.chainCount = config.chainCount || 0
    this.beamDuration = config.beamDuration || 0
    this.armorPiercing = config.armorPiercing || 0
    
    // Targeting
    this.target = null
    this.targetingMode = 'first' // first, closest, strongest, weakest
    
    // State
    this.lastShot = 0
    this.isActive = true
    this.isDisabled = false
    this.disableEndTime = 0
    
    // Visual components
    this.turretMesh = null
    this.barrelMesh = null
    this.rangeMesh = null
    
    // Upgrades
    this.level = 1
    this.maxLevel = 3
    this.upgrades = config.upgrades || []
    
    // Stats tracking
    this.totalDamageDealt = 0
    this.totalKills = 0
    this.totalShots = 0
  }
  
  // ==========================================================================
  // LOADING
  // ==========================================================================
  
  async load() {
    await super.load()
    
    if (!this.mesh) {
      // Create fallback mesh if model loading failed
      this.createFallbackMesh()
    }
    
    // Find turret/barrel components for aiming
    this.findTurretComponents()
    
    // Apply tower-specific modifications
    this.applyTowerModifications()
    
    return this.mesh
  }
  
  createFallbackMesh() {
    const group = new THREE.Group()
    
    // Base
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x444444,
      metalness: 0.7,
      roughness: 0.3
    })
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.5, 2, 0.5, 8),
      baseMat
    )
    base.position.y = 0.25
    base.castShadow = true
    base.receiveShadow = true
    group.add(base)
    
    // Body
    const bodyMat = new THREE.MeshStandardMaterial({
      color: this.getTowerColor(),
      metalness: 0.6,
      roughness: 0.4,
      emissive: this.getTowerColor(),
      emissiveIntensity: 0.2
    })
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(1, 1.3, 2.5, 8),
      bodyMat
    )
    body.position.y = 1.75
    body.castShadow = true
    group.add(body)
    
    // Turret head
    const turretMat = new THREE.MeshStandardMaterial({
      color: this.getTowerColor(),
      metalness: 0.8,
      roughness: 0.2,
      emissive: this.getTowerColor(),
      emissiveIntensity: 0.3
    })
    const turret = new THREE.Mesh(
      new THREE.SphereGeometry(0.8, 12, 12),
      turretMat
    )
    turret.position.y = 3.5
    turret.castShadow = true
    turret.name = 'turret'
    this.turretMesh = turret
    group.add(turret)
    
    // Barrel
    const barrelMat = new THREE.MeshStandardMaterial({
      color: 0x222222,
      metalness: 0.9,
      roughness: 0.1
    })
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.2, 1.2, 8),
      barrelMat
    )
    barrel.rotation.x = Math.PI / 2
    barrel.position.set(0, 3.5, 0.8)
    barrel.castShadow = true
    barrel.name = 'barrel'
    this.barrelMesh = barrel
    group.add(barrel)
    
    // Muzzle glow
    const glowMat = new THREE.MeshBasicMaterial({
      color: this.getMuzzleColor(),
      transparent: true,
      opacity: 0.8
    })
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 8, 8),
      glowMat
    )
    glow.position.set(0, 3.5, 1.4)
    glow.name = 'muzzleGlow'
    group.add(glow)
    
    group.position.copy(this.position)
    this.mesh = group
  }
  
  getTowerColor() {
    const colors = {
      gattling: 0x888888,
      missile: 0xaa4400,
      laser: 0x00aaff,
      sniper: 0x446644,
      frost: 0x88ccff,
      fire: 0xff4400,
      tesla: 0x8844ff,
      basic: 0x666666
    }
    return colors[this.towerType] || 0x666666
  }
  
  getMuzzleColor() {
    const colors = {
      gattling: 0xffff00,
      missile: 0xff6600,
      laser: 0x00ffff,
      sniper: 0xff0000,
      frost: 0x88ddff,
      fire: 0xff8800,
      tesla: 0xaa88ff,
      basic: 0xffff00
    }
    return colors[this.towerType] || 0xffff00
  }
  
  findTurretComponents() {
    if (!this.mesh) return
    
    this.mesh.traverse((child) => {
      // Look for turret-like parts (top section)
      if (child.isMesh) {
        if (child.name.toLowerCase().includes('turret') ||
            child.name.toLowerCase().includes('head')) {
          this.turretMesh = child
        }
        if (child.name.toLowerCase().includes('barrel') ||
            child.name.toLowerCase().includes('gun')) {
          this.barrelMesh = child
        }
        // Fallback: use highest positioned mesh
        if (!this.turretMesh && child.position.y > 2) {
          this.turretMesh = child
        }
      }
    })
    
    // If no turret found, use the whole mesh
    if (!this.turretMesh) {
      this.turretMesh = this.mesh
    }
  }
  
  applyTowerModifications() {
    if (!this.mesh) return
    
    // Add glowing effect to emissive materials
    this.mesh.traverse((child) => {
      if (child.isMesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material]
        mats.forEach(mat => {
          if (!mat.emissive) {
            mat.emissive = new THREE.Color(this.getTowerColor())
          }
          mat.emissiveIntensity = 0.15
        })
      }
    })
  }
  
  // ==========================================================================
  // COMBAT
  // ==========================================================================
  
  canFire(currentTime) {
    if (this.isDisabled && Date.now() < this.disableEndTime) {
      return false
    }
    
    const timeSinceLastShot = currentTime - this.lastShot
    return timeSinceLastShot >= (1.0 / this.fireRate)
  }
  
  findTarget(enemies) {
    if (!enemies || enemies.length === 0) {
      this.target = null
      return null
    }
    
    // Filter enemies in range
    const inRange = enemies.filter(enemy => {
      if (!enemy || enemy.isDead || !enemy.position) return false
      const dist = this.position.distanceTo(enemy.position)
      return dist <= this.range
    })
    
    if (inRange.length === 0) {
      this.target = null
      return null
    }
    
    // Select based on targeting mode
    let selectedTarget
    
    switch (this.targetingMode) {
      case 'first':
        // Furthest along path
        selectedTarget = inRange.reduce((first, enemy) => {
          const firstPath = first.path ? first.path.length : 999
          const enemyPath = enemy.path ? enemy.path.length : 999
          return enemyPath < firstPath ? enemy : first
        })
        break
        
      case 'closest':
        selectedTarget = inRange.reduce((closest, enemy) => {
          const closestDist = this.position.distanceTo(closest.position)
          const enemyDist = this.position.distanceTo(enemy.position)
          return enemyDist < closestDist ? enemy : closest
        })
        break
        
      case 'strongest':
        selectedTarget = inRange.reduce((strongest, enemy) => {
          return enemy.health > strongest.health ? enemy : strongest
        })
        break
        
      case 'weakest':
        selectedTarget = inRange.reduce((weakest, enemy) => {
          return enemy.health < weakest.health ? enemy : weakest
        })
        break
        
      default:
        selectedTarget = inRange[0]
    }
    
    this.target = selectedTarget
    return selectedTarget
  }
  
  aimAtTarget() {
    if (!this.target || !this.turretMesh) return
    
    const targetPos = this.target.position.clone()
    targetPos.y = this.position.y + 3 // Aim at center height
    
    // Rotate turret to face target
    const direction = new THREE.Vector3()
      .subVectors(targetPos, this.mesh.position)
    direction.y = 0
    direction.normalize()
    
    const angle = Math.atan2(direction.x, direction.z)
    
    if (this.turretMesh !== this.mesh) {
      this.turretMesh.rotation.y = angle
    }
    
    if (this.barrelMesh) {
      this.barrelMesh.rotation.y = angle
      
      // Vertical aim
      const verticalDir = new THREE.Vector3()
        .subVectors(targetPos, this.mesh.position)
      const pitch = Math.atan2(
        verticalDir.y - 3,
        Math.sqrt(verticalDir.x ** 2 + verticalDir.z ** 2)
      )
      this.barrelMesh.rotation.x = Math.PI / 2 - pitch
    }
  }
  
  recordShot() {
    this.totalShots++
  }
  
  recordKill() {
    this.totalKills++
  }
  
  recordDamage(amount) {
    this.totalDamageDealt += amount
  }
  
  // ==========================================================================
  // STATUS EFFECTS
  // ==========================================================================
  
  disable(duration) {
    this.isDisabled = true
    this.disableEndTime = Date.now() + duration
    
    // Visual feedback
    if (this.mesh) {
      this.mesh.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material.emissive?.setHex(0x000066)
        }
      })
    }
    
    setTimeout(() => {
      this.isDisabled = false
      if (this.mesh) {
        this.mesh.traverse((child) => {
          if (child.isMesh && child.material) {
            child.material.emissive?.setHex(this.getTowerColor())
          }
        })
      }
    }, duration)
  }
  
  // ==========================================================================
  // UPGRADES
  // ==========================================================================
  
  canUpgrade() {
    return this.level < this.maxLevel && this.upgrades.length >= this.level
  }
  
  getUpgradeCost() {
    if (!this.canUpgrade()) return Infinity
    return this.upgrades[this.level - 1]?.cost || 100
  }
  
  upgrade() {
    if (!this.canUpgrade()) return false
    
    const upgradeData = this.upgrades[this.level - 1]
    if (!upgradeData) return false
    
    // Apply upgrade stats
    if (upgradeData.damage) this.damage = upgradeData.damage
    if (upgradeData.range) this.range = upgradeData.range
    if (upgradeData.cooldown) {
      this.cooldown = upgradeData.cooldown
      this.fireRate = 1000 / upgradeData.cooldown
    }
    if (upgradeData.splashRadius) this.splashRadius = upgradeData.splashRadius
    if (upgradeData.slowAmount) this.slowAmount = upgradeData.slowAmount
    if (upgradeData.burnDamage) this.burnDamage = upgradeData.burnDamage
    if (upgradeData.chainCount) this.chainCount = upgradeData.chainCount
    if (upgradeData.armorPiercing) this.armorPiercing = upgradeData.armorPiercing
    
    this.level++
    
    // Visual upgrade effect
    if (this.mesh) {
      this.mesh.traverse((child) => {
        if (child.isMesh && child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material]
          mats.forEach(mat => {
            mat.emissiveIntensity = 0.15 + (this.level - 1) * 0.1
          })
        }
      })
      
      // Scale slightly
      const scale = 1 + (this.level - 1) * 0.05
      this.mesh.scale.setScalar(scale)
    }
    
    return true
  }
  
  // ==========================================================================
  // RANGE INDICATOR
  // ==========================================================================
  
  showRange() {
    if (this.rangeMesh) return
    
    const rangeGeom = new THREE.RingGeometry(this.range - 0.2, this.range, 32)
    const rangeMat = new THREE.MeshBasicMaterial({
      color: this.getTowerColor(),
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    })
    
    this.rangeMesh = new THREE.Mesh(rangeGeom, rangeMat)
    this.rangeMesh.rotation.x = -Math.PI / 2
    this.rangeMesh.position.copy(this.position)
    this.rangeMesh.position.y = 0.1
    
    if (this.mesh.parent) {
      this.mesh.parent.add(this.rangeMesh)
    }
  }
  
  hideRange() {
    if (!this.rangeMesh) return
    
    if (this.rangeMesh.parent) {
      this.rangeMesh.parent.remove(this.rangeMesh)
    }
    this.rangeMesh.geometry.dispose()
    this.rangeMesh.material.dispose()
    this.rangeMesh = null
  }
  
  // ==========================================================================
  // UTILITY
  // ==========================================================================
  
  setTargetingMode(mode) {
    const validModes = ['first', 'closest', 'strongest', 'weakest']
    if (validModes.includes(mode)) {
      this.targetingMode = mode
    }
  }
  
  getStats() {
    return {
      type: this.towerType,
      level: this.level,
      damage: this.damage,
      range: this.range,
      fireRate: this.fireRate,
      attackType: this.attackType,
      health: this.health,
      maxHealth: this.maxHealth,
      totalDamage: this.totalDamageDealt,
      totalKills: this.totalKills,
      totalShots: this.totalShots,
      upgradeCost: this.getUpgradeCost(),
      canUpgrade: this.canUpgrade()
    }
  }
  
  getSellValue() {
    // Return 60% of total investment
    let totalCost = this.config.cost
    for (let i = 0; i < this.level - 1; i++) {
      totalCost += this.upgrades[i]?.cost || 0
    }
    return Math.floor(totalCost * 0.6)
  }
  
  // ==========================================================================
  // CLEANUP
  // ==========================================================================
  
  destroy() {
    this.hideRange()
    super.destroy()
  }
}
