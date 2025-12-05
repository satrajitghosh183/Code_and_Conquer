// =============================================================================
// TOWER CLASS - With 3D Model Loading
// =============================================================================

import { TOWER_TYPES } from './TowerTypes.js'
import { modelLoader } from '../ModelLoader.js'
import * as THREE from 'three'

export class Tower {
  constructor(towerType, position) {
    const config = TOWER_TYPES[towerType] || TOWER_TYPES.gattling
    
    this.type = 'tower'
    this.towerType = towerType
    this.config = config
    this.position = position.clone()
    
    // Combat stats
    this.damage = config.damage || 25
    this.range = config.range || 12
    this.fireRate = config.fireRate || 1.0
    this.cooldown = config.cooldown || 1000
    this.projectileSpeed = config.projectileSpeed || 20
    this.attackType = config.attackType || 'bullet'
    
    // Special effects
    this.splashRadius = config.splashRadius || 0
    this.slowAmount = config.slowAmount || 0
    this.slowDuration = config.slowDuration || 0
    this.burnDamage = config.burnDamage || 0
    this.burnDuration = config.burnDuration || 3000
    this.chainCount = config.chainCount || 0
    this.beamDuration = config.beamDuration || 500
    
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
    
    this.id = `tower_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  async load() {
    try {
      // Try to load the 3D model
      const modelKey = this.config.modelKey || 'gatling_tower'
      const gltf = await modelLoader.load(modelKey)
      
      if (gltf && gltf.scene) {
        this.mesh = modelLoader.createInstance(modelKey)
        this.modelLoaded = true
        
        // Find turret components for aiming
        this.findTurretComponents()
        
        // Apply tower color tint
        this.applyTowerTint()
        
        // Position the model
        this.mesh.position.copy(this.position)
        
        console.log(`✅ Loaded model for ${this.towerType} tower`)
      } else {
        // Fallback to procedural mesh
        this.createFallbackMesh()
      }
    } catch (error) {
      console.warn(`⚠️ Failed to load model for ${this.towerType}, using fallback:`, error.message)
      this.createFallbackMesh()
    }
    
    return this.mesh
  }
  
  findTurretComponents() {
    if (!this.mesh) return
    
    this.mesh.traverse((child) => {
      const name = child.name?.toLowerCase() || ''
      
      // Look for turret/head/top parts
      if (name.includes('turret') || name.includes('head') || name.includes('top') || name.includes('gun')) {
        if (!this.turretMesh) {
          this.turretMesh = child
        }
      }
      
      // Look for barrel/cannon parts
      if (name.includes('barrel') || name.includes('cannon') || name.includes('muzzle')) {
        if (!this.barrelMesh) {
          this.barrelMesh = child
        }
      }
    })
    
    // If no named parts found, use the first child as turret
    if (!this.turretMesh && this.mesh.children.length > 0) {
      this.turretMesh = this.mesh.children[this.mesh.children.length - 1]
    }
  }
  
  applyTowerTint() {
    const color = this.getTowerColor()
    
    this.mesh.traverse((child) => {
      if (child.isMesh && child.material) {
        // Clone material to avoid affecting other instances
        if (!child.material._isTinted) {
          const materials = Array.isArray(child.material) ? child.material : [child.material]
          
          materials.forEach(mat => {
            // Add emissive glow based on tower type
            if (mat.emissive) {
              mat.emissive.setHex(color)
              mat.emissiveIntensity = 0.15
            }
            mat._isTinted = true
          })
        }
      }
    })
  }
  
  createFallbackMesh() {
    const group = new THREE.Group()
    const color = this.getTowerColor()
    
    // Base platform
    const baseGeom = new THREE.CylinderGeometry(1.4, 1.6, 0.6, 12)
    const baseMat = new THREE.MeshStandardMaterial({ 
      color: 0x333344,
      metalness: 0.7,
      roughness: 0.3
    })
    const base = new THREE.Mesh(baseGeom, baseMat)
    base.position.y = 0.3
    base.castShadow = true
    base.receiveShadow = true
    group.add(base)
    
    // Tower body
    const bodyGeom = new THREE.CylinderGeometry(0.9, 1.1, 2.5, 10)
    const bodyMat = new THREE.MeshStandardMaterial({ 
      color,
      metalness: 0.5,
      roughness: 0.4,
      emissive: color,
      emissiveIntensity: 0.1
    })
    const body = new THREE.Mesh(bodyGeom, bodyMat)
    body.position.y = 1.85
    body.castShadow = true
    group.add(body)
    
    // Turret head
    const turretGeom = new THREE.SphereGeometry(0.7, 12, 12)
    const turretMat = new THREE.MeshStandardMaterial({ 
      color,
      metalness: 0.6,
      roughness: 0.3,
      emissive: color,
      emissiveIntensity: 0.2
    })
    const turret = new THREE.Mesh(turretGeom, turretMat)
    turret.position.y = 3.3
    turret.name = 'turret'
    turret.castShadow = true
    this.turretMesh = turret
    group.add(turret)
    
    // Barrel
    const barrelGeom = new THREE.CylinderGeometry(0.12, 0.18, 1.2, 8)
    const barrelMat = new THREE.MeshStandardMaterial({ 
      color: 0x222222,
      metalness: 0.8,
      roughness: 0.2
    })
    const barrel = new THREE.Mesh(barrelGeom, barrelMat)
    barrel.rotation.x = Math.PI / 2
    barrel.position.set(0, 3.3, 0.8)
    barrel.name = 'barrel'
    barrel.castShadow = true
    this.barrelMesh = barrel
    group.add(barrel)
    
    // Muzzle glow
    const muzzleGeom = new THREE.SphereGeometry(0.15, 8, 8)
    const muzzleMat = new THREE.MeshBasicMaterial({ 
      color,
      transparent: true,
      opacity: 0.8
    })
    const muzzle = new THREE.Mesh(muzzleGeom, muzzleMat)
    muzzle.position.set(0, 3.3, 1.4)
    muzzle.name = 'muzzle'
    group.add(muzzle)
    
    // Tech ring details
    const ringGeom = new THREE.TorusGeometry(1.0, 0.08, 8, 24)
    const ringMat = new THREE.MeshBasicMaterial({ 
      color,
      transparent: true,
      opacity: 0.5
    })
    const ring = new THREE.Mesh(ringGeom, ringMat)
    ring.rotation.x = Math.PI / 2
    ring.position.y = 0.8
    group.add(ring)
    
    group.position.copy(this.position)
    this.mesh = group
    this.modelLoaded = false
  }
  
  getTowerColor() {
    const colors = {
      gattling: 0x888899,
      missile: 0xcc5500,
      laser: 0x00ccff,
      sniper: 0x446644,
      frost: 0x88ccff,
      fire: 0xff4400,
      tesla: 0x8844ff,
      basic: 0x777788,
      cannon: 0x885522,
      splash: 0xaa4488
    }
    return colors[this.towerType] || 0x666677
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
    
    // Targeting logic based on mode
    switch (this.targetingMode) {
      case 'first':
        // Target furthest along path
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
        
      case 'weakest':
        this.target = inRange.reduce((weakest, enemy) => {
          return enemy.health < weakest.health ? enemy : weakest
        })
        break
        
      default:
        // Default to closest
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
    const direction = new THREE.Vector3()
      .subVectors(targetPos, this.mesh.position)
    direction.y = 0
    direction.normalize()
    
    const angle = Math.atan2(direction.x, direction.z)
    
    // Rotate turret horizontally
    if (this.turretMesh) {
      this.turretMesh.rotation.y = angle
    }
    
    // Tilt barrel vertically
    if (this.barrelMesh) {
      const verticalAngle = Math.atan2(
        targetPos.y - (this.position.y + 3),
        this.position.distanceTo(targetPos)
      )
      this.barrelMesh.rotation.x = Math.PI / 2 - verticalAngle * 0.5
    }
  }
  
  recordKill() {
    this.kills++
  }
  
  recordDamage(amount) {
    this.totalDamage += amount
  }
  
  upgrade() {
    if (this.level >= 3) return false // Max level
    
    const upgradeConfig = this.config.upgrades?.[this.level - 1]
    if (!upgradeConfig) return false
    
    this.level++
    
    // Apply upgrade stats
    if (upgradeConfig.damage) this.damage = upgradeConfig.damage
    if (upgradeConfig.range) this.range = upgradeConfig.range
    if (upgradeConfig.cooldown) this.cooldown = upgradeConfig.cooldown
    if (upgradeConfig.splashRadius) this.splashRadius = upgradeConfig.splashRadius
    if (upgradeConfig.slowAmount) this.slowAmount = upgradeConfig.slowAmount
    if (upgradeConfig.chainCount) this.chainCount = upgradeConfig.chainCount
    
    // Visual upgrade effect
    if (this.mesh) {
      this.mesh.scale.multiplyScalar(1.1)
      
      // Increase glow
      this.mesh.traverse((child) => {
        if (child.isMesh && child.material && child.material.emissiveIntensity !== undefined) {
          child.material.emissiveIntensity = 0.2 + this.level * 0.1
        }
      })
    }
    
    return true
  }
  
  getUpgradeCost() {
    const upgradeConfig = this.config.upgrades?.[this.level - 1]
    return upgradeConfig?.cost || 100
  }
  
  showRange() {
    if (this.rangeIndicator) return
    
    const geometry = new THREE.RingGeometry(this.range - 0.5, this.range, 32)
    const material = new THREE.MeshBasicMaterial({
      color: this.getTowerColor(),
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide
    })
    
    this.rangeIndicator = new THREE.Mesh(geometry, material)
    this.rangeIndicator.position.copy(this.position)
    this.rangeIndicator.position.y = 0.1
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
    
    // Add upgrade costs
    for (let i = 0; i < this.level - 1; i++) {
      const upgradeCost = this.config.upgrades?.[i]?.cost || 0
      baseValue += upgradeCost
    }
    
    // 60% sell value
    return Math.floor(baseValue * 0.6)
  }
  
  getStats() {
    return {
      type: this.towerType,
      name: this.config.name,
      level: this.level,
      damage: this.damage,
      range: this.range,
      fireRate: this.fireRate,
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
