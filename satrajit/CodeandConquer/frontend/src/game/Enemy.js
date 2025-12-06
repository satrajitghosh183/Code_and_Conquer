// =============================================================================
// ENEMY CLASS - Space Invader Ships
// =============================================================================

import * as THREE from 'three'
import { ENEMY_TYPES } from './EnemyTypes.js'
import { modelLoader } from './ModelLoader.js'

export class Enemy {
  constructor(type, args = {}) {
    const config = ENEMY_TYPES[type] || ENEMY_TYPES.spider
    
    this.type = type
    this.config = config
    this.name = config.name
    this.tier = config.tier || 1
    this.color = config.color || 0x00ff00
    this.glowColor = config.glowColor || config.color
    
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
    
    // Behavior & abilities
    this.behavior = config.behavior || 'standard'
    this.healRadius = config.healRadius || 0
    this.healAmount = config.healAmount || 0
    this.splitCount = config.splitCount || 0
    this.splitType = config.splitType || null
    this.hasAura = config.hasAura || false
    this.hasShield = config.hasShield || false
    this.shieldHealth = config.shieldHealth || 0
    this.maxShieldHealth = this.shieldHealth
    
    // Status effects
    this.slowAmount = 0
    this.burnDamage = 0
    this.burnEndTime = 0
    this.isStunned = false
    this.isEnraged = false
    this.isPhasing = false
    
    // State
    this.isDead = false
    this.finished = false
    this.reachedEnd = false
    
    // Path
    this.path = []
    this.pathId = args.pathId || null
    this.totalPathLength = 0
    this.pathProgress = 0
    this.next = null
    this.position = args.position ? args.position.clone() : new THREE.Vector3(0, 0.5, 45)
    
    // Mesh references
    this.mesh = null
    this.bodyMesh = null
    this.coreMesh = null
    this.healthBarFill = null
    this.shieldMesh = null
    this.auraMesh = null
    this.particles = []
    
    this.id = `enemy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    this.animationTime = Math.random() * Math.PI * 2
  }
  
  createMesh() {
    const group = new THREE.Group()
    
    // Create spaceship body
    this.createSpaceshipBody(group)
    
    // Add engine glow effects
    this.createEngineGlow(group)
    
    // Add shield if applicable
    if (this.hasShield && this.shieldHealth > 0) {
      this.createShield(group)
    }
    
    // Add healer aura if applicable
    if (this.hasAura) {
      this.createHealerAura(group)
    }
    
    // Create health bar
    this.createHealthBar(group)
    
    group.position.copy(this.position)
    this.mesh = group
    this.mesh.userData.enemy = this
    
    return group
  }
  
  createSpaceshipBody(group) {
    const s = this.scale
    
    // Create different spaceship designs based on tier
    if (this.isBoss) {
      this.createBossShip(group, s)
    } else if (this.tier >= 3) {
      this.createEliteShip(group, s)
    } else if (this.tier === 2) {
      this.createAdvancedShip(group, s)
    } else {
      this.createBasicShip(group, s)
    }
  }
  
  createBasicShip(group, s) {
    // Sleek fighter ship design
    const bodyMat = new THREE.MeshStandardMaterial({
      color: this.color,
      metalness: 0.7,
      roughness: 0.2,
      emissive: this.glowColor,
      emissiveIntensity: 0.3
    })
    
    // Main fuselage - cone shape
    const bodyGeom = new THREE.ConeGeometry(0.6 * s, 2 * s, 6)
    this.bodyMesh = new THREE.Mesh(bodyGeom, bodyMat)
    this.bodyMesh.rotation.x = Math.PI / 2
    this.bodyMesh.position.y = 1.2 * s
    group.add(this.bodyMesh)
    
    // Wings - flat triangular
    const wingGeom = new THREE.BufferGeometry()
    const wingVertices = new Float32Array([
      0, 0, 0,           // center
      -1.5 * s, 0, 0.5 * s, // left back
      -0.2 * s, 0, -0.3 * s, // left front
    ])
    wingGeom.setAttribute('position', new THREE.BufferAttribute(wingVertices, 3))
    wingGeom.computeVertexNormals()
    
    const wingMat = new THREE.MeshStandardMaterial({
      color: this.color,
      metalness: 0.8,
      roughness: 0.3,
      emissive: this.glowColor,
      emissiveIntensity: 0.2,
      side: THREE.DoubleSide
    })
    
    const leftWing = new THREE.Mesh(wingGeom, wingMat)
    leftWing.position.set(0, 1.2 * s, 0)
    group.add(leftWing)
    
    const rightWing = leftWing.clone()
    rightWing.scale.x = -1
    group.add(rightWing)
    
    // Cockpit (glowing)
    const cockpitGeom = new THREE.SphereGeometry(0.3 * s, 8, 8)
    const cockpitMat = new THREE.MeshBasicMaterial({
      color: this.glowColor,
      transparent: true,
      opacity: 0.9
    })
    this.coreMesh = new THREE.Mesh(cockpitGeom, cockpitMat)
    this.coreMesh.position.set(0, 1.2 * s, -0.4 * s)
    group.add(this.coreMesh)
  }
  
  createAdvancedShip(group, s) {
    const bodyMat = new THREE.MeshStandardMaterial({
      color: this.color,
      metalness: 0.75,
      roughness: 0.2,
      emissive: this.glowColor,
      emissiveIntensity: 0.4
    })
    
    // Main hull - elongated octahedron
    const hullGeom = new THREE.OctahedronGeometry(0.8 * s, 0)
    this.bodyMesh = new THREE.Mesh(hullGeom, bodyMat)
    this.bodyMesh.scale.set(1, 0.5, 2)
    this.bodyMesh.position.y = 1.5 * s
    group.add(this.bodyMesh)
    
    // Side pods
    const podGeom = new THREE.CylinderGeometry(0.2 * s, 0.3 * s, 1.2 * s, 6)
    const podMat = bodyMat.clone()
    
    const leftPod = new THREE.Mesh(podGeom, podMat)
    leftPod.rotation.x = Math.PI / 2
    leftPod.position.set(-0.8 * s, 1.5 * s, 0)
    group.add(leftPod)
    
    const rightPod = leftPod.clone()
    rightPod.position.x = 0.8 * s
    group.add(rightPod)
    
    // Core (glowing)
    const coreGeom = new THREE.SphereGeometry(0.35 * s, 12, 12)
    const coreMat = new THREE.MeshBasicMaterial({
      color: this.glowColor,
      transparent: true,
      opacity: 0.9
    })
    this.coreMesh = new THREE.Mesh(coreGeom, coreMat)
    this.coreMesh.position.y = 1.5 * s
    group.add(this.coreMesh)
  }
  
  createEliteShip(group, s) {
    const bodyMat = new THREE.MeshStandardMaterial({
      color: this.color,
      metalness: 0.85,
      roughness: 0.15,
      emissive: this.glowColor,
      emissiveIntensity: 0.5
    })
    
    // Main body - complex angular shape
    const bodyGeom = new THREE.DodecahedronGeometry(0.9 * s, 0)
    this.bodyMesh = new THREE.Mesh(bodyGeom, bodyMat)
    this.bodyMesh.scale.set(1.2, 0.6, 1.8)
    this.bodyMesh.position.y = 1.8 * s
    group.add(this.bodyMesh)
    
    // Forward prong
    const prongGeom = new THREE.ConeGeometry(0.3 * s, 1.5 * s, 4)
    const prong = new THREE.Mesh(prongGeom, bodyMat)
    prong.rotation.x = Math.PI / 2
    prong.position.set(0, 1.8 * s, -1.2 * s)
    group.add(prong)
    
    // Weapons arrays (side mounted)
    const weaponGeom = new THREE.BoxGeometry(0.15 * s, 0.15 * s, 0.8 * s)
    const weaponMat = new THREE.MeshStandardMaterial({
      color: 0x333344,
      metalness: 0.9,
      roughness: 0.1
    })
    
    for (let i = -1; i <= 1; i += 2) {
      const weapon = new THREE.Mesh(weaponGeom, weaponMat)
      weapon.position.set(i * 0.9 * s, 1.8 * s, -0.3 * s)
      group.add(weapon)
    }
    
    // Core
    const coreGeom = new THREE.IcosahedronGeometry(0.4 * s, 1)
    const coreMat = new THREE.MeshBasicMaterial({
      color: this.glowColor,
      transparent: true,
      opacity: 0.95
    })
    this.coreMesh = new THREE.Mesh(coreGeom, coreMat)
    this.coreMesh.position.y = 1.8 * s
    group.add(this.coreMesh)
  }
  
  createBossShip(group, s) {
    const bodyMat = new THREE.MeshStandardMaterial({
      color: this.color,
      metalness: 0.9,
      roughness: 0.1,
      emissive: this.glowColor,
      emissiveIntensity: 0.6
    })
    
    // Main capital ship hull
    const hullGeom = new THREE.BoxGeometry(2.5 * s, 0.8 * s, 4 * s)
    this.bodyMesh = new THREE.Mesh(hullGeom, bodyMat)
    this.bodyMesh.position.y = 2.5 * s
    group.add(this.bodyMesh)
    
    // Bridge tower
    const bridgeGeom = new THREE.BoxGeometry(0.8 * s, 1.2 * s, 1 * s)
    const bridge = new THREE.Mesh(bridgeGeom, bodyMat)
    bridge.position.set(0, 3.4 * s, 0.5 * s)
    group.add(bridge)
    
    // Forward weapons platform
    const weaponPlatformGeom = new THREE.CylinderGeometry(0.6 * s, 0.8 * s, 0.5 * s, 8)
    const weaponPlatform = new THREE.Mesh(weaponPlatformGeom, bodyMat)
    weaponPlatform.position.set(0, 2.5 * s, -1.8 * s)
    group.add(weaponPlatform)
    
    // Engine nacelles
    const nacelleGeom = new THREE.CylinderGeometry(0.4 * s, 0.5 * s, 2 * s, 8)
    for (let i = -1; i <= 1; i += 2) {
      const nacelle = new THREE.Mesh(nacelleGeom, bodyMat)
      nacelle.rotation.x = Math.PI / 2
      nacelle.position.set(i * 1.2 * s, 2.2 * s, 1.8 * s)
      group.add(nacelle)
    }
    
    // Crown/command spire
    const crownGeom = new THREE.ConeGeometry(0.5 * s, 1.5 * s, 6)
    const crownMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.95,
      roughness: 0.05,
      emissive: 0xffaa00,
      emissiveIntensity: 0.8
    })
    const crown = new THREE.Mesh(crownGeom, crownMat)
    crown.position.set(0, 4.5 * s, 0.5 * s)
    group.add(crown)
    
    // Core reactor (massive glowing)
    const coreGeom = new THREE.SphereGeometry(0.8 * s, 16, 16)
    const coreMat = new THREE.MeshBasicMaterial({
      color: this.glowColor,
      transparent: true,
      opacity: 0.9
    })
    this.coreMesh = new THREE.Mesh(coreGeom, coreMat)
    this.coreMesh.position.y = 2.5 * s
    group.add(this.coreMesh)
  }
  
  createEngineGlow(group) {
    const s = this.scale
    const engineCount = this.isBoss ? 4 : this.tier >= 2 ? 2 : 1
    
    // Engine glow particles
    const glowSize = this.isBoss ? 0.6 : this.tier >= 2 ? 0.35 : 0.25
    const glowGeom = new THREE.SphereGeometry(glowSize * s, 8, 8)
    const glowMat = new THREE.MeshBasicMaterial({
      color: this.glowColor,
      transparent: true,
      opacity: 0.8
    })
    
    // Position engines at the back of the ship
    const engineY = this.isBoss ? 2.2 : 1.2
    const engineZ = this.isBoss ? 2.2 : 0.8
    
    if (engineCount === 1) {
      const engine = new THREE.Mesh(glowGeom, glowMat.clone())
      engine.position.set(0, engineY * s, engineZ * s)
      group.add(engine)
      this.particles.push({ mesh: engine, type: 'engine', angle: 0 })
    } else {
      for (let i = 0; i < engineCount; i++) {
        const xOffset = (i - (engineCount - 1) / 2) * (this.isBoss ? 1.2 : 0.6)
        const engine = new THREE.Mesh(glowGeom.clone(), glowMat.clone())
        engine.position.set(xOffset * s, engineY * s, engineZ * s)
        group.add(engine)
        this.particles.push({ mesh: engine, type: 'engine', angle: i, xOffset })
      }
    }
    
    // Engine trail effect
    const trailGeom = new THREE.ConeGeometry(glowSize * 0.5 * s, glowSize * 3 * s, 6)
    const trailMat = new THREE.MeshBasicMaterial({
      color: this.glowColor,
      transparent: true,
      opacity: 0.4
    })
    
    if (engineCount === 1) {
      const trail = new THREE.Mesh(trailGeom, trailMat)
      trail.rotation.x = -Math.PI / 2
      trail.position.set(0, engineY * s, (engineZ + glowSize * 1.5) * s)
      group.add(trail)
    } else {
      for (let i = 0; i < engineCount; i++) {
        const xOffset = (i - (engineCount - 1) / 2) * (this.isBoss ? 1.2 : 0.6)
        const trail = new THREE.Mesh(trailGeom.clone(), trailMat.clone())
        trail.rotation.x = -Math.PI / 2
        trail.position.set(xOffset * s, engineY * s, (engineZ + glowSize * 1.5) * s)
        group.add(trail)
      }
    }
    
    // Point light
    const lightIntensity = this.isBoss ? 8 : this.tier >= 2 ? 4 : 2
    const light = new THREE.PointLight(this.glowColor, lightIntensity, 15 * s)
    light.position.set(0, engineY * s, 0)
    group.add(light)
    this.enemyLight = light
  }
  
  
  createShield(group) {
    const s = this.scale
    const shieldSize = this.isBoss ? 3 : 1.5
    
    const shieldGeom = new THREE.SphereGeometry(shieldSize * s, 24, 18)
    const shieldMat = new THREE.MeshBasicMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide
    })
    this.shieldMesh = new THREE.Mesh(shieldGeom, shieldMat)
    this.shieldMesh.position.y = 1.2 * s
    group.add(this.shieldMesh)
    
    // Shield wireframe
    const wireGeom = new THREE.SphereGeometry(shieldSize * s * 1.02, 12, 8)
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x4488ff,
      wireframe: true,
      transparent: true,
      opacity: 0.4
    })
    const wireShield = new THREE.Mesh(wireGeom, wireMat)
    wireShield.position.y = 1.2 * s
    group.add(wireShield)
    this.shieldWire = wireShield
  }
  
  createHealerAura(group) {
    const s = this.scale
    const healRadius = this.healRadius / 2
    
    const auraGeom = new THREE.TorusGeometry(healRadius, 0.15, 8, 32)
    const auraMat = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.4
    })
    this.auraMesh = new THREE.Mesh(auraGeom, auraMat)
    this.auraMesh.rotation.x = Math.PI / 2
    this.auraMesh.position.y = 0.2
    group.add(this.auraMesh)
  }
  
  createHealthBar(group) {
    const s = this.scale
    const barWidth = 1.5 * s
    const barHeight = 0.15
    const barY = (this.isBoss ? 4 : 2.2) * s
    
    // Background
    const bgGeom = new THREE.PlaneGeometry(barWidth + 0.1, barHeight + 0.05)
    const bgMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    })
    const bg = new THREE.Mesh(bgGeom, bgMat)
    bg.position.y = barY
    group.add(bg)
    
    // Health fill
    const fillGeom = new THREE.PlaneGeometry(barWidth, barHeight)
    const fillMat = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      side: THREE.DoubleSide
    })
    this.healthBarFill = new THREE.Mesh(fillGeom, fillMat)
    this.healthBarFill.position.y = barY
    this.healthBarFill.position.z = 0.01
    group.add(this.healthBarFill)
    
    // Shield bar if applicable
    if (this.hasShield && this.shieldHealth > 0) {
      const shieldFillGeom = new THREE.PlaneGeometry(barWidth, barHeight * 0.5)
      const shieldFillMat = new THREE.MeshBasicMaterial({
        color: 0x4488ff,
        side: THREE.DoubleSide
      })
      this.shieldBarFill = new THREE.Mesh(shieldFillGeom, shieldFillMat)
      this.shieldBarFill.position.y = barY + barHeight * 0.6
      this.shieldBarFill.position.z = 0.01
      group.add(this.shieldBarFill)
    }
  }
  
  damage(amount, source = null, damageType = 'physical') {
    if (this.isDead || this.isPhasing) return false
    
    // Shield absorbs damage first
    if (this.shieldHealth > 0) {
      const shieldDamage = Math.min(this.shieldHealth, amount)
      this.shieldHealth -= shieldDamage
      amount -= shieldDamage
      this.updateShieldBar()
      
      if (this.shieldHealth <= 0 && this.shieldMesh) {
        this.shieldMesh.visible = false
        if (this.shieldWire) this.shieldWire.visible = false
      }
    }
    
    const effectiveDamage = amount * (1 - this.armor)
    this.health -= effectiveDamage
    
    this.flashDamage()
    this.updateHealthBar()
    
    if (this.health <= 0) {
      this.health = 0
      this.isDead = true
      return true
    }
    
    return false
  }
  
  flashDamage() {
    if (!this.bodyMesh || !this.bodyMesh.material) return
    
    const original = this.color
    this.bodyMesh.material.emissive.setHex(0xffffff)
    this.bodyMesh.material.emissiveIntensity = 1.5
    
    setTimeout(() => {
      if (this.bodyMesh && this.bodyMesh.material) {
        this.bodyMesh.material.emissive.setHex(this.glowColor)
        this.bodyMesh.material.emissiveIntensity = this.isBoss ? 0.5 : 0.3
      }
    }, 100)
  }
  
  heal(amount) {
    if (this.isDead) return
    this.health = Math.min(this.maxHealth, this.health + amount)
    this.updateHealthBar()
  }
  
  updateHealthBar() {
    if (!this.healthBarFill) return
    
    const ratio = Math.max(0, this.health / this.maxHealth)
    const barWidth = 1.5 * this.scale
    
    this.healthBarFill.scale.x = ratio
    this.healthBarFill.position.x = (1 - ratio) * -barWidth / 2
    
    if (ratio > 0.6) {
      this.healthBarFill.material.color.setHex(0x00ff44)
    } else if (ratio > 0.3) {
      this.healthBarFill.material.color.setHex(0xffff00)
    } else {
      this.healthBarFill.material.color.setHex(0xff2200)
    }
  }
  
  updateShieldBar() {
    if (!this.shieldBarFill) return
    
    const ratio = Math.max(0, this.shieldHealth / this.maxShieldHealth)
    const barWidth = 1.5 * this.scale
    
    this.shieldBarFill.scale.x = ratio
    this.shieldBarFill.position.x = (1 - ratio) * -barWidth / 2
    this.shieldBarFill.visible = ratio > 0
  }
  
  setPath(path, pathId = null) {
    if (!path || path.length === 0) {
      this.finished = true
      return
    }
    
    this.pathId = pathId || this.pathId
    this.path = path.map(p => ({
      x: p.x !== undefined ? p.x : 0,
      y: p.y !== undefined ? p.y : 0.5,
      z: p.z !== undefined ? p.z : 0
    }))
    
    this.totalPathLength = this.path.length
    this.pathProgress = 0
    
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
    if (this.totalPathLength > 0) {
      const remaining = this.path.length
      this.pathProgress = 1 - (remaining / this.totalPathLength)
    }
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
    
    // Blue tint
    if (this.bodyMesh && this.bodyMesh.material) {
      this.bodyMesh.material.color.lerp(new THREE.Color(0x88ccff), 0.5)
    }
  }
  
  applyBurn(damagePerSecond, duration) {
    this.burnDamage = damagePerSecond
    this.burnEndTime = Date.now() + duration
  }
  
  update(deltaTime) {
    if (this.isDead) return
    
    this.animationTime += deltaTime
    const s = this.scale
    
    // Subtle ship hover animation
    if (this.bodyMesh) {
      // Gentle floating motion
      const hoverOffset = Math.sin(this.animationTime * 2) * 0.15
      
      // Banking effect based on movement
      if (this.mesh) {
        // Ships should tilt slightly forward
        this.mesh.rotation.x = 0.1 + Math.sin(this.animationTime * 1.5) * 0.03
      }
      
      // Pulse emissive intensity
      if (this.bodyMesh.material && this.bodyMesh.material.emissiveIntensity !== undefined) {
        const emissivePulse = 0.3 + Math.sin(this.animationTime * 3) * 0.15
        this.bodyMesh.material.emissiveIntensity = emissivePulse
      }
    }
    
    // Animate core/cockpit glow - pulsing
    if (this.coreMesh) {
      const pulse = 0.8 + Math.sin(this.animationTime * 4) * 0.2
      this.coreMesh.scale.setScalar(pulse)
      this.coreMesh.material.opacity = 0.7 + Math.sin(this.animationTime * 3) * 0.25
    }
    
    // Animate engine effects
    if (this.enemyLight) {
      const baseLightIntensity = this.isBoss ? 8 : this.tier >= 2 ? 4 : 2
      this.enemyLight.intensity = baseLightIntensity + Math.sin(this.animationTime * 5) * (baseLightIntensity * 0.4)
    }
    
    // Animate engine particles (flicker effect)
    this.particles.forEach((p, i) => {
      if (p.type === 'engine' && p.mesh) {
        const flicker = 0.7 + Math.sin(this.animationTime * 8 + i * 2) * 0.3
        p.mesh.scale.setScalar(flicker)
        if (p.mesh.material) {
          p.mesh.material.opacity = 0.6 + Math.sin(this.animationTime * 6 + i) * 0.35
        }
      }
    })
    
    // Animate shield
    if (this.shieldMesh && this.shieldMesh.visible) {
      const shieldPulse = 1 + Math.sin(this.animationTime * 2) * 0.05
      this.shieldMesh.scale.setScalar(shieldPulse)
      this.shieldMesh.material.opacity = 0.2 + Math.sin(this.animationTime * 3) * 0.1
    }
    if (this.shieldWire && this.shieldWire.visible) {
      this.shieldWire.rotation.y += deltaTime * 0.8
    }
    
    // Animate healer aura
    if (this.auraMesh) {
      this.auraMesh.rotation.z += deltaTime * 2
      const auraPulse = 1 + Math.sin(this.animationTime * 2.5) * 0.15
      this.auraMesh.scale.setScalar(auraPulse)
    }
    
    // Burn damage
    if (this.burnDamage > 0 && Date.now() < this.burnEndTime) {
      this.health -= this.burnDamage * deltaTime
      this.updateHealthBar()
      if (this.health <= 0) {
        this.health = 0
        this.isDead = true
      }
    } else if (Date.now() >= this.burnEndTime) {
      this.burnDamage = 0
    }
  }
  
  updateAnimation(deltaTime) {
    this.update(deltaTime)
  }
  
  getSpawnOnDeath() {
    if (this.splitCount > 0 && this.splitType) {
      const spawns = []
      for (let i = 0; i < this.splitCount; i++) {
        spawns.push({
          type: this.splitType,
          position: this.position.clone().add(
            new THREE.Vector3(
              (Math.random() - 0.5) * 2,
              0,
              (Math.random() - 0.5) * 2
            )
          )
        })
      }
      return spawns
    }
    return null
  }
  
  reset(config = {}) {
    const healthMult = config.healthMultiplier || 1
    const speedMult = config.speedMultiplier || 1
    
    const enemyConfig = ENEMY_TYPES[this.type] || ENEMY_TYPES.spider
    
    this.health = Math.floor((enemyConfig.health || 100) * healthMult)
    this.maxHealth = this.health
    this.speed = (enemyConfig.speed || 5) * speedMult
    this.originalSpeed = this.speed
    
    this.shieldHealth = enemyConfig.shieldHealth || 0
    this.maxShieldHealth = this.shieldHealth
    
    this.isDead = false
    this.finished = false
    this.reachedEnd = false
    this.slowAmount = 0
    this.burnDamage = 0
    this.isEnraged = false
    this.isPhasing = false
    this.path = []
    this.next = null
    
    this.updateHealthBar()
    this.updateShieldBar()
    
    if (this.shieldMesh) this.shieldMesh.visible = this.shieldHealth > 0
    if (this.shieldWire) this.shieldWire.visible = this.shieldHealth > 0
  }
  
  destroy() {
    if (this.slowTimer) clearTimeout(this.slowTimer)
    
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
