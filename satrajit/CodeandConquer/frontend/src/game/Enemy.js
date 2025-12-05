// =============================================================================
// SIMPLIFIED ENEMY CLASS - Lightweight for Performance
// =============================================================================

import * as THREE from 'three'
import { ENEMY_TYPES } from './EnemyTypes.js'

export class Enemy {
  constructor(type, args = {}) {
    const config = ENEMY_TYPES[type] || ENEMY_TYPES.spider
    
    this.type = type
    this.name = config.name
    this.color = config.color || 0x00ff00
    
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
    
    // Healer abilities (simplified)
    this.healRadius = config.healRadius || 0
    this.healAmount = config.healAmount || 0
    
    // Splitter
    this.splitCount = config.splitCount || 0
    this.splitType = config.splitType || null
    
    // Status
    this.slowAmount = 0
    this.isDead = false
    this.finished = false
    this.reachedEnd = false
    
    // Path
    this.path = []
    this.next = null
    this.position = args.position ? args.position.clone() : new THREE.Vector3(0, 0.5, 45)
    
    // Mesh
    this.mesh = null
    this.healthBarFill = null
    
    this.id = `enemy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    this.animationTime = 0
  }
  
  createMesh() {
    const group = new THREE.Group()
    
    // Simple body - sphere or box
    let bodyGeom
    if (this.isBoss) {
      bodyGeom = new THREE.OctahedronGeometry(1.5 * this.scale, 0)
    } else if (this.type === 'armored') {
      bodyGeom = new THREE.BoxGeometry(1 * this.scale, 0.7 * this.scale, 1 * this.scale)
    } else {
      bodyGeom = new THREE.SphereGeometry(0.5 * this.scale, 8, 8)
    }
    
    const bodyMat = new THREE.MeshLambertMaterial({ color: this.color })
    const body = new THREE.Mesh(bodyGeom, bodyMat)
    body.position.y = 0.7 * this.scale
    group.add(body)
    this.bodyMesh = body
    
    // Simple eyes
    const eyeGeom = new THREE.SphereGeometry(0.1 * this.scale, 6, 6)
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff })
    
    const leftEye = new THREE.Mesh(eyeGeom, eyeMat)
    leftEye.position.set(-0.2 * this.scale, 0.8 * this.scale, 0.4 * this.scale)
    group.add(leftEye)
    
    const rightEye = new THREE.Mesh(eyeGeom, eyeMat)
    rightEye.position.set(0.2 * this.scale, 0.8 * this.scale, 0.4 * this.scale)
    group.add(rightEye)
    
    // Health bar
    this.createHealthBar(group)
    
    group.position.copy(this.position)
    this.mesh = group
    this.mesh.userData.enemy = this
    
    return group
  }
  
  createHealthBar(group) {
    const barWidth = 1.0 * this.scale
    const barHeight = 0.1
    const barY = 1.5 * this.scale
    
    // Background
    const bgGeom = new THREE.PlaneGeometry(barWidth, barHeight)
    const bgMat = new THREE.MeshBasicMaterial({
      color: 0x333333,
      side: THREE.DoubleSide
    })
    const bg = new THREE.Mesh(bgGeom, bgMat)
    bg.position.y = barY
    bg.name = 'healthBarBg'
    group.add(bg)
    
    // Fill
    const fillGeom = new THREE.PlaneGeometry(barWidth - 0.05, barHeight - 0.02)
    const fillMat = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      side: THREE.DoubleSide
    })
    this.healthBarFill = new THREE.Mesh(fillGeom, fillMat)
    this.healthBarFill.position.y = barY
    this.healthBarFill.position.z = 0.01
    this.healthBarFill.name = 'healthBarFill'
    group.add(this.healthBarFill)
  }
  
  damage(amount) {
    if (this.isDead) return false
    
    const effectiveDamage = amount * (1 - this.armor)
    this.health -= effectiveDamage
    
    // Flash effect
    if (this.bodyMesh) {
      this.bodyMesh.material.color.setHex(0xffffff)
      setTimeout(() => {
        if (this.bodyMesh) this.bodyMesh.material.color.setHex(this.color)
      }, 80)
    }
    
    this.updateHealthBar()
    
    if (this.health <= 0) {
      this.health = 0
      this.isDead = true
      return true
    }
    
    return false
  }
  
  heal(amount) {
    if (this.isDead) return
    this.health = Math.min(this.maxHealth, this.health + amount)
    this.updateHealthBar()
  }
  
  updateHealthBar() {
    if (!this.healthBarFill) return
    
    const ratio = Math.max(0, this.health / this.maxHealth)
    this.healthBarFill.scale.x = ratio
    this.healthBarFill.position.x = (1 - ratio) * -0.45 * this.scale
    
    if (ratio > 0.6) {
      this.healthBarFill.material.color.setHex(0x00ff00)
    } else if (ratio > 0.3) {
      this.healthBarFill.material.color.setHex(0xffff00)
    } else {
      this.healthBarFill.material.color.setHex(0xff0000)
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
    
    if (this.slowTimer) clearTimeout(this.slowTimer)
    
    this.slowTimer = setTimeout(() => {
      this.slowAmount = 0
      this.speed = this.originalSpeed
    }, duration)
    
    // Blue tint for frozen
    if (this.bodyMesh) {
      this.bodyMesh.material.color.setHex(0x8888ff)
    }
  }
  
  update(deltaTime) {
    if (this.isDead) return
    
    this.animationTime += deltaTime
    
    // Simple bob animation
    if (this.bodyMesh) {
      this.bodyMesh.position.y = 0.7 * this.scale + Math.sin(this.animationTime * 4) * 0.05
    }
  }
  
  updateAnimation(deltaTime) {
    this.update(deltaTime)
  }
  
  reset(config = {}) {
    const healthMult = config.healthMultiplier || 1
    const speedMult = config.speedMultiplier || 1
    
    this.health = Math.floor((ENEMY_TYPES[this.type]?.health || 100) * healthMult)
    this.maxHealth = this.health
    this.speed = (ENEMY_TYPES[this.type]?.speed || 5) * speedMult
    this.originalSpeed = this.speed
    
    this.isDead = false
    this.finished = false
    this.reachedEnd = false
    this.slowAmount = 0
    this.path = []
    this.next = null
    
    this.updateHealthBar()
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
