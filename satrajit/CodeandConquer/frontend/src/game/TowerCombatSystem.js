// =============================================================================
// PROFESSIONAL TOWER COMBAT SYSTEM - Studio-Quality Combat AI
// =============================================================================
// Advanced tower targeting, ability system, projectile management,
// and combat effects for AAA tower defense experience.
// =============================================================================

import * as THREE from 'three'
import { TOWER_TYPES } from './structures/TowerTypes.js'
import { SoundManager } from './SoundManager.js'

// =============================================================================
// TARGETING PRIORITIES
// =============================================================================

export const TARGETING_MODES = {
  FIRST: 'first',        // Target furthest along path
  LAST: 'last',          // Target nearest to spawn
  CLOSEST: 'closest',    // Target closest to tower
  STRONGEST: 'strongest', // Target highest health
  WEAKEST: 'weakest',    // Target lowest health
  FASTEST: 'fastest',    // Target highest speed
  BOSS: 'boss'           // Prioritize boss enemies
}

// =============================================================================
// PROJECTILE TYPES
// =============================================================================

const PROJECTILE_CONFIGS = {
  bullet: {
    geometry: 'sphere',
    size: 0.25,
    speed: 35,
    trail: true,
    trailLength: 6,
    color: 0xffff00
  },
  missile: {
    geometry: 'cone',
    size: 0.5,
    speed: 18,
    trail: true,
    trailLength: 10,
    homing: true,
    homingStrength: 8,
    color: 0xff6600,
    smokeTrail: true
  },
  laser: {
    instant: true,
    beamWidth: 0.15,
    color: 0x00ffff,
    duration: 200
  },
  frost: {
    geometry: 'icosahedron',
    size: 0.35,
    speed: 25,
    trail: true,
    trailLength: 8,
    color: 0x88ddff,
    particleTrail: true
  },
  fire: {
    geometry: 'sphere',
    size: 0.3,
    speed: 28,
    trail: true,
    trailLength: 12,
    color: 0xff4400,
    flameParticles: true
  },
  tesla: {
    instant: true,
    chainCount: 3,
    chainRange: 12,
    color: 0x8888ff
  },
  sniper: {
    geometry: 'cylinder',
    size: 0.2,
    speed: 60,
    trail: true,
    trailLength: 15,
    color: 0xff0000,
    piercing: true
  }
}

// =============================================================================
// TOWER COMBAT SYSTEM CLASS
// =============================================================================

export class TowerCombatSystem {
  constructor(game) {
    this.game = game
    this.scene = game.scene
    
    // Active projectiles
    this.projectiles = []
    this.maxProjectiles = 200
    
    // Laser beams (instant hit effects)
    this.laserBeams = []
    
    // Chain lightning effects
    this.chainLightning = []
    
    // Object pooling for performance
    this.projectilePool = new Map()
    this.initializeProjectilePools()
    
    // Stats tracking
    this.totalDamageDealt = 0
    this.totalShots = 0
    this.totalHits = 0
  }
  
  initializeProjectilePools() {
    Object.keys(PROJECTILE_CONFIGS).forEach(type => {
      this.projectilePool.set(type, [])
    })
  }
  
  // ==========================================================================
  // TOWER TARGETING
  // ==========================================================================
  
  findTarget(tower, enemies, mode = TARGETING_MODES.FIRST) {
    if (!enemies || enemies.length === 0) return null
    
    const inRange = enemies.filter(enemy => {
      if (enemy.isDead || !enemy.position) return false
      const dist = tower.position.distanceTo(enemy.position)
      return dist <= tower.range
    })
    
    if (inRange.length === 0) return null
    
    switch (mode) {
      case TARGETING_MODES.FIRST:
        return this.getFirstTarget(inRange)
      
      case TARGETING_MODES.LAST:
        return this.getLastTarget(inRange)
      
      case TARGETING_MODES.CLOSEST:
        return this.getClosestTarget(tower, inRange)
      
      case TARGETING_MODES.STRONGEST:
        return this.getStrongestTarget(inRange)
      
      case TARGETING_MODES.WEAKEST:
        return this.getWeakestTarget(inRange)
      
      case TARGETING_MODES.FASTEST:
        return this.getFastestTarget(inRange)
      
      case TARGETING_MODES.BOSS:
        return this.getBossTarget(inRange) || this.getFirstTarget(inRange)
      
      default:
        return this.getFirstTarget(inRange)
    }
  }
  
  getFirstTarget(enemies) {
    // Furthest along path (lowest pathIndex remaining)
    return enemies.reduce((first, enemy) => {
      const firstProgress = first.path ? first.path.length : 999
      const enemyProgress = enemy.path ? enemy.path.length : 999
      return enemyProgress < firstProgress ? enemy : first
    })
  }
  
  getLastTarget(enemies) {
    // Nearest to spawn (highest pathIndex remaining)
    return enemies.reduce((last, enemy) => {
      const lastProgress = last.path ? last.path.length : 0
      const enemyProgress = enemy.path ? enemy.path.length : 0
      return enemyProgress > lastProgress ? enemy : last
    })
  }
  
  getClosestTarget(tower, enemies) {
    return enemies.reduce((closest, enemy) => {
      const closestDist = tower.position.distanceTo(closest.position)
      const enemyDist = tower.position.distanceTo(enemy.position)
      return enemyDist < closestDist ? enemy : closest
    })
  }
  
  getStrongestTarget(enemies) {
    return enemies.reduce((strongest, enemy) => {
      return enemy.health > strongest.health ? enemy : strongest
    })
  }
  
  getWeakestTarget(enemies) {
    return enemies.reduce((weakest, enemy) => {
      return enemy.health < weakest.health ? enemy : weakest
    })
  }
  
  getFastestTarget(enemies) {
    return enemies.reduce((fastest, enemy) => {
      return enemy.speed > fastest.speed ? enemy : fastest
    })
  }
  
  getBossTarget(enemies) {
    return enemies.find(enemy => enemy.isBoss) || null
  }
  
  // ==========================================================================
  // TOWER FIRING
  // ==========================================================================
  
  fireTower(tower, target, currentTime) {
    if (!tower || !target || target.isDead) return false
    
    // Check cooldown
    const cooldownTime = 1.0 / tower.fireRate
    if (currentTime - tower.lastShot < cooldownTime) return false
    
    tower.lastShot = currentTime
    this.totalShots++
    
    const attackType = tower.attackType || 'bullet'
    const config = PROJECTILE_CONFIGS[attackType] || PROJECTILE_CONFIGS.bullet
    
    // Play sound
    this.playFireSound(attackType, tower.position)
    
    // Flash tower
    this.flashTower(tower)
    
    // Create muzzle flash
    if (this.game.visualEffects) {
      const direction = new THREE.Vector3()
        .subVectors(target.position, tower.position)
        .normalize()
      
      this.game.visualEffects.createMuzzleFlash(
        tower.position.clone().add(new THREE.Vector3(0, 2, 0)),
        direction,
        { color: config.color, size: 0.8, duration: 100 }
      )
    }
    
    // Handle different attack types
    if (config.instant) {
      // Instant hit (laser, tesla)
      this.handleInstantHit(tower, target, attackType, config)
    } else {
      // Projectile-based
      this.createProjectile(tower, target, attackType, config)
    }
    
    return true
  }
  
  handleInstantHit(tower, target, attackType, config) {
    if (attackType === 'laser') {
      this.createLaserBeam(tower, target, config)
      this.applyDamage(target, tower.damage, tower)
    } else if (attackType === 'tesla') {
      this.createChainLightning(tower, target, config, tower.damage)
    }
  }
  
  createProjectile(tower, target, attackType, config) {
    if (this.projectiles.length >= this.maxProjectiles) return
    
    // Get or create projectile mesh
    const mesh = this.createProjectileMesh(attackType, config)
    
    // Position at tower
    const startPos = tower.position.clone()
    startPos.y += 2.5
    mesh.position.copy(startPos)
    
    // Create projectile data
    const projectile = {
      mesh,
      position: startPos.clone(),
      target,
      damage: tower.damage,
      speed: config.speed,
      type: attackType,
      config,
      tower,
      
      // Special properties
      splashRadius: tower.splashRadius || 0,
      slowAmount: tower.slowAmount || 0,
      slowDuration: tower.slowDuration || 0,
      burnDamage: tower.burnDamage || 0,
      burnDuration: tower.burnDuration || 0,
      piercing: config.piercing || false,
      piercedTargets: [],
      
      // Homing
      homing: config.homing || false,
      homingStrength: config.homingStrength || 0,
      velocity: new THREE.Vector3(),
      
      // State
      active: true,
      distanceTraveled: 0,
      maxDistance: tower.range * 2
    }
    
    // Initialize velocity toward target
    projectile.velocity = new THREE.Vector3()
      .subVectors(target.position, startPos)
      .normalize()
      .multiplyScalar(config.speed)
    
    // Add trail effect
    if (config.trail && this.game.visualEffects) {
      projectile.trail = this.game.visualEffects.createProjectileTrail(mesh, {
        color: config.color,
        length: config.trailLength
      })
    }
    
    this.scene.add(mesh)
    this.projectiles.push(projectile)
  }
  
  createProjectileMesh(attackType, config) {
    let geometry
    const size = config.size || 0.3
    
    switch (config.geometry) {
      case 'cone':
        geometry = new THREE.ConeGeometry(size * 0.5, size * 1.5, 8)
        break
      case 'icosahedron':
        geometry = new THREE.IcosahedronGeometry(size, 0)
        break
      case 'cylinder':
        geometry = new THREE.CylinderGeometry(size * 0.3, size * 0.3, size * 2, 8)
        break
      default:
        geometry = new THREE.SphereGeometry(size, 12, 12)
    }
    
    const material = new THREE.MeshBasicMaterial({
      color: config.color,
      transparent: true,
      opacity: 0.9
    })
    
    const mesh = new THREE.Mesh(geometry, material)
    mesh.castShadow = false
    
    return mesh
  }
  
  // ==========================================================================
  // LASER BEAMS
  // ==========================================================================
  
  createLaserBeam(tower, target, config) {
    const startPos = tower.position.clone()
    startPos.y += 2.5
    
    const endPos = target.position.clone()
    endPos.y += target.scale * 0.8
    
    // Create beam geometry
    const direction = new THREE.Vector3().subVectors(endPos, startPos)
    const length = direction.length()
    
    const geometry = new THREE.CylinderGeometry(
      config.beamWidth,
      config.beamWidth,
      length,
      8
    )
    
    const material = new THREE.MeshBasicMaterial({
      color: config.color,
      transparent: true,
      opacity: 0.8
    })
    
    const beam = new THREE.Mesh(geometry, material)
    
    // Position and orient beam
    beam.position.copy(startPos).add(endPos).multiplyScalar(0.5)
    beam.lookAt(endPos)
    beam.rotation.x += Math.PI / 2
    
    this.scene.add(beam)
    
    // Create impact effect
    if (this.game.visualEffects) {
      this.game.visualEffects.createExplosion(endPos, {
        numParticles: 15,
        color: config.color,
        maxDist: 2,
        duration: 200
      })
    }
    
    // Store for cleanup
    this.laserBeams.push({
      mesh: beam,
      startTime: Date.now(),
      duration: config.duration
    })
    
    // Play laser sound
    SoundManager.play3D('laser.ogg', tower.position)
  }
  
  // ==========================================================================
  // CHAIN LIGHTNING
  // ==========================================================================
  
  createChainLightning(tower, primaryTarget, config, baseDamage) {
    const chainCount = config.chainCount || 3
    const chainRange = config.chainRange || 12
    
    const targets = [primaryTarget]
    const enemies = this.game.enemyManager?.enemies || this.game.enemies || []
    
    // Find chain targets
    let currentTarget = primaryTarget
    for (let i = 0; i < chainCount - 1; i++) {
      const nextTarget = this.findChainTarget(currentTarget, enemies, targets, chainRange)
      if (!nextTarget) break
      targets.push(nextTarget)
      currentTarget = nextTarget
    }
    
    // Create lightning visual between each target
    let prevPos = tower.position.clone()
    prevPos.y += 2.5
    
    targets.forEach((target, index) => {
      const targetPos = target.position.clone()
      targetPos.y += target.scale * 0.8
      
      // Create lightning effect
      if (this.game.visualEffects) {
        this.game.visualEffects.createLightning(prevPos, targetPos, {
          color: config.color,
          duration: 300,
          segments: 10,
          displacement: 1.5
        })
      }
      
      // Apply damage (reduced for each jump)
      const damageMultiplier = 1 - (index * 0.2) // 20% reduction per jump
      this.applyDamage(target, baseDamage * damageMultiplier, tower)
      
      prevPos = targetPos
    })
    
    // Play tesla sound
    SoundManager.play3D('tesla.ogg', tower.position)
  }
  
  findChainTarget(fromEnemy, allEnemies, excludeTargets, range) {
    return allEnemies.find(enemy => {
      if (enemy.isDead || !enemy.position) return false
      if (excludeTargets.includes(enemy)) return false
      
      const dist = fromEnemy.position.distanceTo(enemy.position)
      return dist <= range
    })
  }
  
  // ==========================================================================
  // PROJECTILE UPDATE
  // ==========================================================================
  
  update(deltaTime) {
    // Update projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i]
      
      if (!proj.active) {
        this.removeProjectile(proj, i)
        continue
      }
      
      // Update homing
      if (proj.homing && proj.target && !proj.target.isDead) {
        const toTarget = new THREE.Vector3()
          .subVectors(proj.target.position, proj.position)
          .normalize()
        
        proj.velocity.lerp(
          toTarget.multiplyScalar(proj.speed),
          proj.homingStrength * deltaTime
        )
        proj.velocity.normalize().multiplyScalar(proj.speed)
      }
      
      // Update position
      const movement = proj.velocity.clone().multiplyScalar(deltaTime)
      proj.position.add(movement)
      proj.mesh.position.copy(proj.position)
      proj.distanceTraveled += movement.length()
      
      // Rotate projectile to face direction
      if (proj.config.geometry === 'cone' || proj.config.geometry === 'cylinder') {
        proj.mesh.lookAt(proj.position.clone().add(proj.velocity))
        proj.mesh.rotation.x += Math.PI / 2
      }
      
      // Check for hit
      if (this.checkProjectileHit(proj)) {
        this.handleProjectileHit(proj)
        if (!proj.piercing) {
          proj.active = false
        }
      }
      
      // Check max distance
      if (proj.distanceTraveled > proj.maxDistance) {
        proj.active = false
      }
    }
    
    // Update laser beams
    const now = Date.now()
    for (let i = this.laserBeams.length - 1; i >= 0; i--) {
      const beam = this.laserBeams[i]
      if (now - beam.startTime >= beam.duration) {
        this.scene.remove(beam.mesh)
        beam.mesh.geometry.dispose()
        beam.mesh.material.dispose()
        this.laserBeams.splice(i, 1)
      } else {
        // Fade out
        const progress = (now - beam.startTime) / beam.duration
        beam.mesh.material.opacity = 0.8 * (1 - progress)
      }
    }
  }
  
  checkProjectileHit(proj) {
    if (!proj.target || proj.target.isDead) {
      // Re-target if piercing
      if (proj.piercing) {
        const newTarget = this.findNearestEnemy(proj.position, proj.tower?.range || 20)
        if (newTarget && !proj.piercedTargets.includes(newTarget)) {
          proj.target = newTarget
          return false
        }
      }
      proj.active = false
      return false
    }
    
    const hitDistance = proj.target.scale * 1.2
    return proj.position.distanceTo(proj.target.position) < hitDistance
  }
  
  handleProjectileHit(proj) {
    const target = proj.target
    
    // Track pierced targets
    if (proj.piercing) {
      proj.piercedTargets.push(target)
    }
    
    // Apply damage
    this.applyDamage(target, proj.damage, proj.tower)
    
    // Splash damage
    if (proj.splashRadius > 0) {
      this.applySplashDamage(proj.position, proj.splashRadius, proj.damage * 0.5, proj.tower)
    }
    
    // Slow effect
    if (proj.slowAmount > 0) {
      target.applySlow(proj.slowAmount, proj.slowDuration)
      
      // Frost visual
      if (this.game.visualEffects) {
        this.game.visualEffects.createFrostEffect(target.position, 3, {
          color: 0x88ddff,
          duration: 500
        })
      }
    }
    
    // Burn effect
    if (proj.burnDamage > 0) {
      target.applyBurn(proj.burnDamage, proj.burnDuration)
      
      // Fire visual
      if (this.game.visualEffects) {
        this.game.visualEffects.createFireEffect(target, proj.burnDuration)
      }
    }
    
    // Impact effect
    if (this.game.visualEffects) {
      this.game.visualEffects.createExplosion(proj.position, {
        numParticles: proj.splashRadius > 0 ? 35 : 15,
        color: proj.config.color,
        maxDist: proj.splashRadius > 0 ? proj.splashRadius : 3,
        duration: 300
      })
      
      // Shockwave for splash
      if (proj.splashRadius > 0) {
        this.game.visualEffects.createShockwave(proj.position, {
          maxRadius: proj.splashRadius,
          color: proj.config.color,
          duration: 400
        })
        
        // Screen shake for big explosions
        const distToCamera = proj.position.distanceTo(this.game.camera.position)
        if (distToCamera < 40) {
          this.game.visualEffects.triggerScreenShake(0.5, 150)
        }
      }
    }
    
    // Play impact sound
    SoundManager.play3D('explosion.ogg', proj.position, { volume: 0.6 })
    
    this.totalHits++
  }
  
  findNearestEnemy(position, range) {
    const enemies = this.game.enemyManager?.enemies || this.game.enemies || []
    let nearest = null
    let nearestDist = range
    
    enemies.forEach(enemy => {
      if (enemy.isDead || !enemy.position) return
      const dist = position.distanceTo(enemy.position)
      if (dist < nearestDist) {
        nearest = enemy
        nearestDist = dist
      }
    })
    
    return nearest
  }
  
  applySplashDamage(position, radius, damage, tower) {
    const enemies = this.game.enemyManager?.enemies || this.game.enemies || []
    
    enemies.forEach(enemy => {
      if (enemy.isDead || !enemy.position) return
      
      const dist = position.distanceTo(enemy.position)
      if (dist <= radius) {
        // Damage falloff with distance
        const falloff = 1 - (dist / radius) * 0.5
        this.applyDamage(enemy, damage * falloff, tower)
      }
    })
  }
  
  applyDamage(enemy, damage, tower = null) {
    if (!enemy || enemy.isDead) return
    
    enemy.damage(damage, tower, tower?.attackType || 'physical')
    this.totalDamageDealt += damage
  }
  
  removeProjectile(proj, index) {
    // Clean up trail
    if (proj.trail && proj.trail.destroy) {
      proj.trail.destroy()
    }
    
    // Remove mesh
    this.scene.remove(proj.mesh)
    proj.mesh.geometry.dispose()
    proj.mesh.material.dispose()
    
    this.projectiles.splice(index, 1)
  }
  
  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================
  
  flashTower(tower) {
    if (!tower.mesh) return
    
    tower.mesh.traverse(child => {
      if (child.isMesh && child.material) {
        const mat = child.material
        const originalEmissive = mat.emissiveIntensity || 0
        
        mat.emissiveIntensity = 1.0
        
        setTimeout(() => {
          mat.emissiveIntensity = originalEmissive
        }, 80)
      }
    })
  }
  
  playFireSound(attackType, position) {
    const soundMap = {
      bullet: 'gattling.ogg',
      missile: 'missile.ogg',
      laser: 'laser.ogg',
      frost: 'frost.ogg',
      fire: 'fire.ogg',
      tesla: 'tesla.ogg',
      sniper: 'sniper.ogg'
    }
    
    const sound = soundMap[attackType] || 'gattling.ogg'
    SoundManager.play3D(sound, position, { volume: 0.5 })
  }
  
  getStats() {
    return {
      totalDamage: this.totalDamageDealt,
      totalShots: this.totalShots,
      totalHits: this.totalHits,
      accuracy: this.totalShots > 0 ? (this.totalHits / this.totalShots * 100).toFixed(1) : 0,
      activeProjectiles: this.projectiles.length
    }
  }
  
  clearAll() {
    // Remove all projectiles
    this.projectiles.forEach(proj => {
      if (proj.trail && proj.trail.destroy) {
        proj.trail.destroy()
      }
      this.scene.remove(proj.mesh)
      proj.mesh.geometry.dispose()
      proj.mesh.material.dispose()
    })
    this.projectiles = []
    
    // Remove laser beams
    this.laserBeams.forEach(beam => {
      this.scene.remove(beam.mesh)
      beam.mesh.geometry.dispose()
      beam.mesh.material.dispose()
    })
    this.laserBeams = []
  }
  
  destroy() {
    this.clearAll()
    this.projectilePool.clear()
  }
}

export { PROJECTILE_CONFIGS }

