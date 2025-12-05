// =============================================================================
// MAIN BASE - Simple, Lightweight Central Tower
// =============================================================================
// Optimized for performance with basic geometry
// =============================================================================

import * as THREE from 'three'

export const BASE_LEVELS = {
  1: { name: 'Outpost', maxHealth: 1000, healthRegen: 0, range: 15, damage: 0, upgradeCost: 500 },
  2: { name: 'Fortress', maxHealth: 1500, healthRegen: 2, range: 18, damage: 10, upgradeCost: 1200 },
  3: { name: 'Citadel', maxHealth: 2500, healthRegen: 5, range: 22, damage: 25, upgradeCost: 2500 },
  4: { name: 'Bastion', maxHealth: 4000, healthRegen: 10, range: 26, damage: 50, upgradeCost: 5000 },
  5: { name: 'Nexus', maxHealth: 6000, healthRegen: 20, range: 30, damage: 100, upgradeCost: Infinity }
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
    this.healthBarBg = null
    this.healthBarFill = null
    this.levelSprite = null
    this.aura = null
    
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
    
    // Simple platform - just a cylinder
    const platformGeom = new THREE.CylinderGeometry(6, 7, 3, 8)
    const platformMat = new THREE.MeshLambertMaterial({ color: 0x660000 })
    const platform = new THREE.Mesh(platformGeom, platformMat)
    platform.position.y = 1.5
    this.mesh.add(platform)
    
    // Inner platform
    const innerPlatformGeom = new THREE.CylinderGeometry(4, 5, 2, 8)
    const innerPlatformMat = new THREE.MeshLambertMaterial({ color: 0x880000 })
    const innerPlatform = new THREE.Mesh(innerPlatformGeom, innerPlatformMat)
    innerPlatform.position.y = 4
    this.mesh.add(innerPlatform)
    
    // Crystal - simple octahedron with glow
    const crystalGeom = new THREE.OctahedronGeometry(2.5, 0)
    const crystalMat = new THREE.MeshBasicMaterial({ 
      color: 0xff4400,
      transparent: true,
      opacity: 0.9
    })
    this.crystal = new THREE.Mesh(crystalGeom, crystalMat)
    this.crystal.position.y = 8
    this.mesh.add(this.crystal)
    
    // Crystal glow light
    this.crystalLight = new THREE.PointLight(0xff4400, 3, 30)
    this.crystalLight.position.y = 8
    this.mesh.add(this.crystalLight)
    
    // Range indicator ring
    const rangeGeom = new THREE.RingGeometry(this.config.range - 0.5, this.config.range, 32)
    const rangeMat = new THREE.MeshBasicMaterial({ 
      color: 0xff0000,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide
    })
    this.aura = new THREE.Mesh(rangeGeom, rangeMat)
    this.aura.rotation.x = -Math.PI / 2
    this.aura.position.y = 0.05
    this.mesh.add(this.aura)
    
    // Health bar
    this.createHealthBar()
    
    this.mesh.position.copy(this.position)
    this.scene.add(this.mesh)
    
    return this.mesh
  }
  
  createHealthBar() {
    const barWidth = 10
    const barHeight = 0.8
    const barY = 14
    
    // Background
    const bgGeom = new THREE.PlaneGeometry(barWidth + 0.4, barHeight + 0.2)
    const bgMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide
    })
    this.healthBarBg = new THREE.Mesh(bgGeom, bgMat)
    this.healthBarBg.position.y = barY
    this.healthBarBg.name = 'healthBarBg'
    this.mesh.add(this.healthBarBg)
    
    // Health fill
    const fillGeom = new THREE.PlaneGeometry(barWidth, barHeight)
    const fillMat = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      side: THREE.DoubleSide
    })
    this.healthBarFill = new THREE.Mesh(fillGeom, fillMat)
    this.healthBarFill.position.y = barY
    this.healthBarFill.position.z = 0.01
    this.healthBarFill.name = 'healthBarFill'
    this.mesh.add(this.healthBarFill)
    
    // Level text
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 64
    const ctx = canvas.getContext('2d')
    ctx.font = 'bold 40px Arial'
    ctx.fillStyle = '#ffdd00'
    ctx.textAlign = 'center'
    ctx.fillText(`Lv.${this.level}`, 64, 45)
    
    const texture = new THREE.CanvasTexture(canvas)
    const spriteMat = new THREE.SpriteMaterial({ map: texture })
    this.levelSprite = new THREE.Sprite(spriteMat)
    this.levelSprite.position.y = barY + 2
    this.levelSprite.scale.set(4, 2, 1)
    this.mesh.add(this.levelSprite)
  }
  
  damage(amount) {
    if (this.health <= 0) return true
    
    this.health = Math.max(0, this.health - amount)
    this.updateHealthBar()
    
    // Flash crystal on damage
    if (this.crystal) {
      this.crystal.material.color.setHex(0xffffff)
      setTimeout(() => {
        if (this.crystal) this.crystal.material.color.setHex(0xff4400)
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
    this.healthBarFill.position.x = (1 - ratio) * -5
    
    // Color based on health
    if (ratio > 0.6) {
      this.healthBarFill.material.color.setHex(0x00ff00)
    } else if (ratio > 0.3) {
      this.healthBarFill.material.color.setHex(0xffff00)
    } else {
      this.healthBarFill.material.color.setHex(0xff0000)
    }
  }
  
  getUpgradeCost() {
    return this.config.upgradeCost
  }
  
  canUpgrade(gold) {
    const nextLevel = this.level + 1
    if (!BASE_LEVELS[nextLevel]) return false
    return gold >= BASE_LEVELS[nextLevel].upgradeCost
  }
  
  upgrade() {
    const nextLevel = this.level + 1
    if (!BASE_LEVELS[nextLevel]) return false
    
    this.level = nextLevel
    this.config = BASE_LEVELS[this.level]
    
    const healthRatio = this.health / this.maxHealth
    this.maxHealth = this.config.maxHealth
    this.health = Math.floor(this.maxHealth * healthRatio)
    
    this.updateHealthBar()
    
    if (this.onUpgrade) {
      this.onUpgrade(this.level, this.config)
    }
    
    return true
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
    target.damage(this.config.damage)
    
    return true
  }
  
  update(deltaTime, enemies, visualEffects) {
    this.animationTime += deltaTime
    
    // Animate crystal
    if (this.crystal) {
      this.crystal.rotation.y += deltaTime * 0.5
      this.crystal.position.y = 8 + Math.sin(this.animationTime * 1.5) * 0.3
    }
    
    // Pulse crystal light
    if (this.crystalLight) {
      this.crystalLight.intensity = 3 + Math.sin(this.animationTime * 2) * 1
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
      health: this.health,
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
