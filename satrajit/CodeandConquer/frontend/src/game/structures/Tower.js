// =============================================================================
// SIMPLIFIED TOWER CLASS - Lightweight for Performance
// =============================================================================

import { TOWER_TYPES } from './TowerTypes.js'
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
    this.chainCount = config.chainCount || 0
    
    // State
    this.target = null
    this.targetingMode = 'first'
    this.lastShot = 0
    this.isActive = true
    this.level = 1
    
    // Mesh
    this.mesh = null
    this.turretMesh = null
    this.id = `tower_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  async load() {
    this.createSimpleMesh()
    return this.mesh
  }
  
  createSimpleMesh() {
    const group = new THREE.Group()
    
    const color = this.getTowerColor()
    
    // Simple base cylinder
    const baseGeom = new THREE.CylinderGeometry(1.2, 1.5, 0.5, 8)
    const baseMat = new THREE.MeshLambertMaterial({ color: 0x444444 })
    const base = new THREE.Mesh(baseGeom, baseMat)
    base.position.y = 0.25
    group.add(base)
    
    // Tower body
    const bodyGeom = new THREE.CylinderGeometry(0.8, 1.0, 2, 8)
    const bodyMat = new THREE.MeshLambertMaterial({ color })
    const body = new THREE.Mesh(bodyGeom, bodyMat)
    body.position.y = 1.5
    group.add(body)
    
    // Turret top
    const turretGeom = new THREE.SphereGeometry(0.6, 8, 8)
    const turretMat = new THREE.MeshLambertMaterial({ color })
    const turret = new THREE.Mesh(turretGeom, turretMat)
    turret.position.y = 3
    turret.name = 'turret'
    this.turretMesh = turret
    group.add(turret)
    
    // Simple barrel
    const barrelGeom = new THREE.CylinderGeometry(0.12, 0.15, 1, 8)
    const barrelMat = new THREE.MeshLambertMaterial({ color: 0x333333 })
    const barrel = new THREE.Mesh(barrelGeom, barrelMat)
    barrel.rotation.x = Math.PI / 2
    barrel.position.set(0, 3, 0.6)
    group.add(barrel)
    
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
  
  canFire(currentTime) {
    return (currentTime - this.lastShot) >= (1.0 / this.fireRate)
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
    
    // Simple targeting: closest enemy
    this.target = inRange.reduce((closest, enemy) => {
      const closestDist = this.position.distanceTo(closest.position)
      const enemyDist = this.position.distanceTo(enemy.position)
      return enemyDist < closestDist ? enemy : closest
    })
    
    return this.target
  }
  
  aimAtTarget() {
    if (!this.target || !this.turretMesh) return
    
    const targetPos = this.target.position.clone()
    const direction = new THREE.Vector3()
      .subVectors(targetPos, this.mesh.position)
    direction.y = 0
    direction.normalize()
    
    const angle = Math.atan2(direction.x, direction.z)
    this.turretMesh.rotation.y = angle
  }
  
  getStats() {
    return {
      type: this.towerType,
      level: this.level,
      damage: this.damage,
      range: this.range,
      fireRate: this.fireRate
    }
  }
  
  destroy() {
    if (this.mesh) {
      this.mesh.traverse((child) => {
        if (child.geometry) child.geometry.dispose()
        if (child.material) child.material.dispose()
      })
    }
  }
}
