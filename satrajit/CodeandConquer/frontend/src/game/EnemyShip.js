// =============================================================================
// ENEMY SHIP SYSTEM - Main Boss Ship & Procedural Enemy Variants
// =============================================================================
// The main enemy spaceship serves as the boss/mothership that spawns
// procedurally generated enemy variants with different strengths and abilities.
// =============================================================================

import * as THREE from 'three'
import { modelLoader } from './ModelLoader.js'
import { ENEMY_TYPES } from './EnemyTypes.js'

// =============================================================================
// ENEMY SHIP VISUAL VARIANTS - Procedural modifications to base model
// =============================================================================

export const SHIP_VARIANTS = {
  // Tier 1 - Small scout ships
  scout: {
    scale: 0.3,
    colorPrimary: 0x00ff44,
    colorSecondary: 0x00aa22,
    glowColor: 0x00ff00,
    glowIntensity: 0.4,
    engineCount: 1,
    wingStyle: 'swept',
    hasShield: false
  },
  
  // Tier 1 - Fast interceptors
  interceptor: {
    scale: 0.25,
    colorPrimary: 0x00ffff,
    colorSecondary: 0x0088aa,
    glowColor: 0x00ffff,
    glowIntensity: 0.5,
    engineCount: 2,
    wingStyle: 'delta',
    hasShield: false
  },
  
  // Tier 1 - Swarm drones
  drone: {
    scale: 0.15,
    colorPrimary: 0xffff00,
    colorSecondary: 0xaaaa00,
    glowColor: 0xffdd00,
    glowIntensity: 0.3,
    engineCount: 1,
    wingStyle: 'none',
    hasShield: false
  },
  
  // Tier 2 - Heavy fighters
  fighter: {
    scale: 0.4,
    colorPrimary: 0xff6600,
    colorSecondary: 0xaa4400,
    glowColor: 0xff4400,
    glowIntensity: 0.5,
    engineCount: 2,
    wingStyle: 'angular',
    hasShield: false,
    hasWeaponPods: true
  },
  
  // Tier 2 - Armored cruisers
  cruiser: {
    scale: 0.5,
    colorPrimary: 0x888888,
    colorSecondary: 0x555555,
    glowColor: 0xaaaaaa,
    glowIntensity: 0.3,
    engineCount: 3,
    wingStyle: 'heavy',
    hasShield: true,
    hasArmorPlates: true
  },
  
  // Tier 2 - Support ships (healers)
  support: {
    scale: 0.35,
    colorPrimary: 0x00ff88,
    colorSecondary: 0x00aa55,
    glowColor: 0x00ff88,
    glowIntensity: 0.7,
    engineCount: 2,
    wingStyle: 'round',
    hasShield: false,
    hasHealingAura: true
  },
  
  // Tier 3 - Elite destroyers
  destroyer: {
    scale: 0.6,
    colorPrimary: 0xff0000,
    colorSecondary: 0xaa0000,
    glowColor: 0xff2200,
    glowIntensity: 0.6,
    engineCount: 4,
    wingStyle: 'aggressive',
    hasShield: true,
    hasWeaponPods: true
  },
  
  // Tier 3 - Stealth ships
  phantom: {
    scale: 0.35,
    colorPrimary: 0x440066,
    colorSecondary: 0x220033,
    glowColor: 0x8800ff,
    glowIntensity: 0.8,
    engineCount: 2,
    wingStyle: 'stealth',
    hasShield: false,
    isTransparent: true,
    opacity: 0.6
  },
  
  // Tier 4 - Boss capital ship
  capital: {
    scale: 1.5,
    colorPrimary: 0xcc0000,
    colorSecondary: 0x660000,
    glowColor: 0xff0044,
    glowIntensity: 1.0,
    engineCount: 6,
    wingStyle: 'capital',
    hasShield: true,
    hasArmorPlates: true,
    hasWeaponPods: true,
    hasBridge: true
  },
  
  // Tier 4 - Mega boss mothership
  mothership: {
    scale: 2.5,
    colorPrimary: 0x880000,
    colorSecondary: 0x440000,
    glowColor: 0xff0000,
    glowIntensity: 1.2,
    engineCount: 8,
    wingStyle: 'mothership',
    hasShield: true,
    hasArmorPlates: true,
    hasWeaponPods: true,
    hasBridge: true,
    hasHangarBay: true
  }
}

// Map enemy types to ship variants
export const ENEMY_TO_SHIP = {
  spider: 'scout',
  scout: 'interceptor',
  swarm: 'drone',
  brute: 'fighter',
  armored: 'cruiser',
  healer: 'support',
  splitter: 'fighter',
  assassin: 'phantom',
  tank: 'destroyer',
  disruptor: 'cruiser',
  berserker: 'destroyer',
  boss: 'capital',
  megaBoss: 'mothership',
  carrier: 'cruiser',
  phantom: 'phantom',
  juggernaut: 'destroyer'
}

// =============================================================================
// ENEMY SHIP CLASS
// =============================================================================

export class EnemyShip {
  constructor(enemyType, options = {}) {
    this.enemyType = enemyType
    this.config = ENEMY_TYPES[enemyType] || ENEMY_TYPES.spider
    this.shipVariant = SHIP_VARIANTS[ENEMY_TO_SHIP[enemyType]] || SHIP_VARIANTS.scout
    
    this.mesh = null
    this.modelLoaded = false
    
    // Health multipliers from options
    this.healthMultiplier = options.healthMultiplier || 1
    this.speedMultiplier = options.speedMultiplier || 1
    
    // Visual effects references
    this.glowMeshes = []
    this.engineFlames = []
    this.shieldMesh = null
  }
  
  async createMesh() {
    const group = new THREE.Group()
    
    // Try to load the spaceship model
    let baseModel = null
    try {
      baseModel = await modelLoader.loadModel('spaceship')
    } catch (e) {
      console.warn('Could not load spaceship model, using procedural')
    }
    
    if (baseModel) {
      // Clone the loaded model
      const modelClone = baseModel.clone()
      
      // Apply variant modifications
      this.applyVariantToModel(modelClone, group)
    } else {
      // Create procedural ship if model not available
      this.createProceduralShip(group)
    }
    
    // Add engines
    this.addEngines(group)
    
    // Add shield if variant has it
    if (this.shipVariant.hasShield) {
      this.addShield(group)
    }
    
    // Add weapon pods
    if (this.shipVariant.hasWeaponPods) {
      this.addWeaponPods(group)
    }
    
    // Add healing aura for support ships
    if (this.shipVariant.hasHealingAura) {
      this.addHealingAura(group)
    }
    
    // Scale based on variant
    group.scale.setScalar(this.shipVariant.scale)
    
    this.mesh = group
    return group
  }
  
  applyVariantToModel(model, group) {
    const variant = this.shipVariant
    
    model.traverse((child) => {
      if (child.isMesh) {
        // Clone material to not affect other instances
        child.material = child.material.clone()
        
        // Apply colors
        if (child.material.color) {
          child.material.color.setHex(variant.colorPrimary)
        }
        
        // Add emissive glow
        child.material.emissive = new THREE.Color(variant.glowColor)
        child.material.emissiveIntensity = variant.glowIntensity
        
        // Transparency for phantom types
        if (variant.isTransparent) {
          child.material.transparent = true
          child.material.opacity = variant.opacity
        }
        
        child.material.metalness = 0.6
        child.material.roughness = 0.3
        
        child.castShadow = true
        child.receiveShadow = true
      }
    })
    
    group.add(model)
  }
  
  createProceduralShip(group) {
    const variant = this.shipVariant
    const s = 1 // Base scale (variant scale applied to group)
    
    // Main hull
    const hullGeometry = this.createHullGeometry(variant.wingStyle, s)
    const hullMaterial = new THREE.MeshStandardMaterial({
      color: variant.colorPrimary,
      metalness: 0.7,
      roughness: 0.3,
      emissive: variant.glowColor,
      emissiveIntensity: variant.glowIntensity * 0.3,
      transparent: variant.isTransparent || false,
      opacity: variant.opacity || 1.0
    })
    
    const hull = new THREE.Mesh(hullGeometry, hullMaterial)
    hull.castShadow = true
    hull.receiveShadow = true
    group.add(hull)
    
    // Cockpit
    const cockpitGeometry = new THREE.SphereGeometry(0.4 * s, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2)
    const cockpitMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x111133,
      metalness: 0.1,
      roughness: 0.1,
      clearcoat: 1.0,
      transparent: true,
      opacity: 0.8
    })
    const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial)
    cockpit.position.set(0, 0.3 * s, 0.8 * s)
    cockpit.rotation.x = -Math.PI / 6
    group.add(cockpit)
    
    // Wings based on style
    this.addWings(group, variant.wingStyle, s, variant)
    
    // Armor plates for armored variants
    if (variant.hasArmorPlates) {
      this.addArmorPlates(group, s, variant)
    }
    
    // Bridge for capital ships
    if (variant.hasBridge) {
      this.addBridge(group, s, variant)
    }
    
    // Eye/sensor (gives personality)
    const eyeGeometry = new THREE.SphereGeometry(0.2 * s, 12, 12)
    const eyeMaterial = new THREE.MeshBasicMaterial({
      color: variant.glowColor,
      transparent: true,
      opacity: 0.9
    })
    const eye = new THREE.Mesh(eyeGeometry, eyeMaterial)
    eye.position.set(0, 0.2 * s, 1.2 * s)
    this.glowMeshes.push(eye)
    group.add(eye)
    
    // Inner eye (pupil effect)
    const pupilGeometry = new THREE.SphereGeometry(0.08 * s, 8, 8)
    const pupilMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 })
    const pupil = new THREE.Mesh(pupilGeometry, pupilMaterial)
    pupil.position.set(0, 0.2 * s, 1.35 * s)
    group.add(pupil)
  }
  
  createHullGeometry(wingStyle, s) {
    // Simple, optimized geometries - no cones
    switch (wingStyle) {
      case 'delta':
        return new THREE.BoxGeometry(0.8 * s, 0.3 * s, 2 * s)
      case 'heavy':
      case 'capital':
        return new THREE.BoxGeometry(1.5 * s, 0.5 * s, 2.5 * s)
      case 'stealth':
        return new THREE.BoxGeometry(0.6 * s, 0.25 * s, 1.8 * s)
      case 'mothership':
        return new THREE.BoxGeometry(2.5 * s, 0.8 * s, 4 * s)
      default:
        // Simple box hull - performant
        return new THREE.BoxGeometry(1 * s, 0.4 * s, 1.8 * s)
    }
  }
  
  addWings(group, style, s, variant) {
    const wingMaterial = new THREE.MeshStandardMaterial({
      color: variant.colorSecondary,
      metalness: 0.8,
      roughness: 0.2,
      emissive: variant.glowColor,
      emissiveIntensity: variant.glowIntensity * 0.2
    })
    
    switch (style) {
      case 'swept':
        // Swept back wings
        const sweptGeom = new THREE.BoxGeometry(2 * s, 0.08 * s, 0.6 * s)
        const leftWing = new THREE.Mesh(sweptGeom, wingMaterial)
        leftWing.position.set(-0.8 * s, 0, -0.3 * s)
        leftWing.rotation.z = -0.2
        leftWing.rotation.y = 0.3
        group.add(leftWing)
        
        const rightWing = new THREE.Mesh(sweptGeom, wingMaterial)
        rightWing.position.set(0.8 * s, 0, -0.3 * s)
        rightWing.rotation.z = 0.2
        rightWing.rotation.y = -0.3
        group.add(rightWing)
        break
        
      case 'delta':
        // Delta wings (triangular)
        const deltaShape = new THREE.Shape()
        deltaShape.moveTo(0, 0)
        deltaShape.lineTo(1.5 * s, -0.8 * s)
        deltaShape.lineTo(0.3 * s, -0.8 * s)
        deltaShape.lineTo(0, 0)
        
        const deltaGeom = new THREE.ShapeGeometry(deltaShape)
        const leftDelta = new THREE.Mesh(deltaGeom, wingMaterial)
        leftDelta.rotation.x = -Math.PI / 2
        leftDelta.position.set(-0.3 * s, 0, 0)
        group.add(leftDelta)
        
        const rightDelta = leftDelta.clone()
        rightDelta.scale.x = -1
        rightDelta.position.x = 0.3 * s
        group.add(rightDelta)
        break
        
      case 'angular':
      case 'aggressive':
        // Angular aggressive wings
        const angularGeom = new THREE.BoxGeometry(1.8 * s, 0.1 * s, 0.8 * s)
        for (let side = -1; side <= 1; side += 2) {
          const wing = new THREE.Mesh(angularGeom, wingMaterial)
          wing.position.set(side * 1 * s, -0.1 * s, -0.2 * s)
          wing.rotation.z = side * 0.15
          group.add(wing)
        }
        break
        
      case 'round':
        // Rounded support ship wings
        const roundGeom = new THREE.TorusGeometry(0.8 * s, 0.15 * s, 8, 16, Math.PI)
        for (let side = -1; side <= 1; side += 2) {
          const wing = new THREE.Mesh(roundGeom, wingMaterial)
          wing.position.set(side * 0.5 * s, 0, 0)
          wing.rotation.y = Math.PI / 2
          wing.rotation.x = side * Math.PI / 2
          group.add(wing)
        }
        break
        
      case 'capital':
      case 'mothership':
        // Massive wings for capital ships
        const capitalGeom = new THREE.BoxGeometry(3 * s, 0.15 * s, 1.5 * s)
        for (let side = -1; side <= 1; side += 2) {
          const wing = new THREE.Mesh(capitalGeom, wingMaterial)
          wing.position.set(side * 1.5 * s, 0, 0)
          group.add(wing)
        }
        break
        
      case 'none':
      default:
        // No wings (drones)
        break
    }
  }
  
  addEngines(group) {
    const variant = this.shipVariant
    const s = 1
    const engineCount = variant.engineCount
    
    // Engine housing
    const engineGeom = new THREE.CylinderGeometry(0.15 * s, 0.2 * s, 0.4 * s, 8)
    const engineMat = new THREE.MeshStandardMaterial({
      color: 0x333333,
      metalness: 0.9,
      roughness: 0.1
    })
    
    // Engine flame
    const flameGeom = new THREE.ConeGeometry(0.12 * s, 0.5 * s, 8)
    const flameMat = new THREE.MeshBasicMaterial({
      color: variant.glowColor,
      transparent: true,
      opacity: 0.8
    })
    
    const spacing = 0.4 * s
    const startX = -(engineCount - 1) * spacing / 2
    
    for (let i = 0; i < engineCount; i++) {
      const x = startX + i * spacing
      
      const engine = new THREE.Mesh(engineGeom, engineMat)
      engine.position.set(x, 0, -1.2 * s)
      engine.rotation.x = Math.PI / 2
      group.add(engine)
      
      const flame = new THREE.Mesh(flameGeom, flameMat.clone())
      flame.position.set(x, 0, -1.5 * s)
      flame.rotation.x = -Math.PI / 2
      this.engineFlames.push(flame)
      this.glowMeshes.push(flame)
      group.add(flame)
    }
  }
  
  addShield(group) {
    const variant = this.shipVariant
    const shieldGeom = new THREE.SphereGeometry(2, 24, 24)
    const shieldMat = new THREE.MeshBasicMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
      wireframe: false
    })
    
    this.shieldMesh = new THREE.Mesh(shieldGeom, shieldMat)
    group.add(this.shieldMesh)
  }
  
  addArmorPlates(group, s, variant) {
    const plateMat = new THREE.MeshStandardMaterial({
      color: 0x555555,
      metalness: 0.9,
      roughness: 0.2
    })
    
    const plateGeom = new THREE.BoxGeometry(0.3 * s, 0.5 * s, 0.1 * s)
    
    // Add plates around hull
    const positions = [
      [0.6, 0.2, 0], [-0.6, 0.2, 0],
      [0.5, -0.2, 0.3], [-0.5, -0.2, 0.3],
      [0.4, 0, -0.5], [-0.4, 0, -0.5]
    ]
    
    positions.forEach(pos => {
      const plate = new THREE.Mesh(plateGeom, plateMat)
      plate.position.set(pos[0] * s, pos[1] * s, pos[2] * s)
      plate.rotation.y = Math.random() * 0.2
      group.add(plate)
    })
  }
  
  addBridge(group, s, variant) {
    const bridgeGeom = new THREE.BoxGeometry(0.8 * s, 0.4 * s, 0.6 * s)
    const bridgeMat = new THREE.MeshStandardMaterial({
      color: variant.colorSecondary,
      metalness: 0.6,
      roughness: 0.4,
      emissive: variant.glowColor,
      emissiveIntensity: 0.3
    })
    
    const bridge = new THREE.Mesh(bridgeGeom, bridgeMat)
    bridge.position.set(0, 0.5 * s, 0.5 * s)
    group.add(bridge)
    
    // Bridge windows
    const windowMat = new THREE.MeshBasicMaterial({
      color: 0x88aaff,
      transparent: true,
      opacity: 0.8
    })
    const windowGeom = new THREE.PlaneGeometry(0.15 * s, 0.1 * s)
    
    for (let i = -2; i <= 2; i++) {
      const window = new THREE.Mesh(windowGeom, windowMat)
      window.position.set(i * 0.15 * s, 0.55 * s, 0.81 * s)
      group.add(window)
    }
  }
  
  addWeaponPods(group, s, variant) {
    const podMat = new THREE.MeshStandardMaterial({
      color: 0x222222,
      metalness: 0.8,
      roughness: 0.2
    })
    
    const podGeom = new THREE.CylinderGeometry(0.1 * s, 0.15 * s, 0.5 * s, 6)
    
    // Weapon pods under wings
    const positions = [
      [0.8, -0.15, 0.2], [-0.8, -0.15, 0.2]
    ]
    
    positions.forEach(pos => {
      const pod = new THREE.Mesh(podGeom, podMat)
      pod.position.set(pos[0], pos[1], pos[2])
      pod.rotation.x = Math.PI / 2
      group.add(pod)
    })
  }
  
  addHealingAura(group) {
    const variant = this.shipVariant
    const auraGeom = new THREE.TorusGeometry(1.5, 0.08, 8, 32)
    const auraMat = new THREE.MeshBasicMaterial({
      color: variant.glowColor,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide
    })
    
    const aura = new THREE.Mesh(auraGeom, auraMat)
    aura.rotation.x = Math.PI / 2
    aura.position.y = -0.2
    aura.name = 'healAura'
    this.glowMeshes.push(aura)
    group.add(aura)
  }
  
  // Animation update
  updateAnimation(deltaTime, animTime) {
    if (!this.mesh) return
    
    // Animate engine flames
    this.engineFlames.forEach((flame, i) => {
      flame.scale.y = 0.8 + Math.sin(animTime * 15 + i) * 0.3
      flame.material.opacity = 0.6 + Math.sin(animTime * 10 + i * 0.5) * 0.3
    })
    
    // Pulse glow meshes
    this.glowMeshes.forEach((glow, i) => {
      if (glow.material && glow.name !== 'healAura') {
        glow.material.opacity = 0.7 + Math.sin(animTime * 3 + i) * 0.2
      }
    })
    
    // Animate shield
    if (this.shieldMesh) {
      this.shieldMesh.rotation.y += deltaTime * 0.3
      this.shieldMesh.rotation.x = Math.sin(animTime * 0.5) * 0.1
      this.shieldMesh.material.opacity = 0.1 + Math.sin(animTime * 2) * 0.05
    }
    
    // Animate healing aura
    const healAura = this.mesh.getObjectByName('healAura')
    if (healAura) {
      healAura.rotation.z += deltaTime * 0.5
      healAura.material.opacity = 0.3 + Math.sin(animTime * 2) * 0.15
    }
  }
  
  // Flash effect when hit
  flashDamage() {
    if (!this.mesh) return
    
    this.mesh.traverse(child => {
      if (child.isMesh && child.material && child.material.emissive) {
        const originalIntensity = child.material.emissiveIntensity
        child.material.emissive.setHex(0xffffff)
        child.material.emissiveIntensity = 1.0
        
        setTimeout(() => {
          if (child.material) {
            child.material.emissive.setHex(this.shipVariant.glowColor)
            child.material.emissiveIntensity = originalIntensity
          }
        }, 80)
      }
    })
  }
  
  destroy() {
    if (this.mesh) {
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

// =============================================================================
// MAIN BOSS SHIP - Just loads spaceship.glb model directly
// =============================================================================

export class MainBossShip {
  constructor(position, options = {}) {
    this.position = position.clone()
    this.health = options.health || 10000
    this.maxHealth = this.health
    
    this.mesh = null
    this.shipModel = null
    this.scene = null
    
    // State
    this.isActive = true
    this.lastSpawnTime = 0
    this.spawnCooldown = 5
    this.animationTime = 0
    
    // Events
    this.onSpawnEnemy = options.onSpawnEnemy || null
    this.onDamage = options.onDamage || null
    this.onDestroyed = options.onDestroyed || null
  }
  
  async create(scene) {
    this.scene = scene
    
    const group = new THREE.Group()
    
    // Load the spaceship model directly
    try {
      const loadedModel = await modelLoader.loadModel('spaceship')
      if (loadedModel) {
        this.shipModel = loadedModel.clone()
        this.shipModel.scale.setScalar(4) // Make it big
        
        // Apply red emissive color to make it glow
        this.shipModel.traverse((child) => {
          if (child.isMesh && child.material) {
            child.material = child.material.clone()
            child.material.emissive = new THREE.Color(0xff0000)
            child.material.emissiveIntensity = 0.5
            child.castShadow = true
          }
        })
        
        group.add(this.shipModel)
      }
    } catch (e) {
      console.warn('Could not load boss ship model:', e)
      // Simple fallback box
      const fallbackGeom = new THREE.BoxGeometry(8, 2, 12)
      const fallbackMat = new THREE.MeshBasicMaterial({ color: 0xff0000 })
      const fallback = new THREE.Mesh(fallbackGeom, fallbackMat)
      group.add(fallback)
    }
    
    // Add health bar
    this.createHealthBar(group)
    
    // Add lighting
    const mainLight = new THREE.PointLight(0xff0000, 4, 40)
    group.add(mainLight)
    
    group.position.copy(this.position)
    
    this.mesh = group
    scene.add(group)
    
    return group
  }
  
  createHealthBar(group) {
    const barWidth = 12
    const barHeight = 0.8
    
    // Background
    const bgGeom = new THREE.PlaneGeometry(barWidth + 0.4, barHeight + 0.2)
    const bgMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    })
    const bg = new THREE.Mesh(bgGeom, bgMat)
    bg.position.y = 6
    group.add(bg)
    
    // Health fill
    const fillGeom = new THREE.PlaneGeometry(barWidth, barHeight)
    const fillMat = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      side: THREE.DoubleSide
    })
    this.healthBarFill = new THREE.Mesh(fillGeom, fillMat)
    this.healthBarFill.position.y = 6
    this.healthBarFill.position.z = 0.01
    group.add(this.healthBarFill)
    
    // Boss name
    const nameCanvas = document.createElement('canvas')
    nameCanvas.width = 256
    nameCanvas.height = 32
    const ctx = nameCanvas.getContext('2d')
    ctx.font = 'bold 24px Arial'
    ctx.fillStyle = '#ff4444'
    ctx.textAlign = 'center'
    ctx.fillText('MOTHERSHIP', 128, 24)
    
    const nameTexture = new THREE.CanvasTexture(nameCanvas)
    const nameMat = new THREE.SpriteMaterial({ map: nameTexture, transparent: true })
    const nameSprite = new THREE.Sprite(nameMat)
    nameSprite.position.y = 7.5
    nameSprite.scale.set(8, 1, 1)
    group.add(nameSprite)
  }
  
  damage(amount) {
    this.health = Math.max(0, this.health - amount)
    this.updateHealthBar()
    
    if (this.onDamage) {
      this.onDamage(this.health, this.maxHealth)
    }
    
    // Flash effect
    if (this.shipModel) {
      this.shipModel.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material.emissiveIntensity = 1.5
          setTimeout(() => {
            if (child.material) child.material.emissiveIntensity = 0.5
          }, 100)
        }
      })
    }
    
    if (this.health <= 0) {
      this.isActive = false
      if (this.onDestroyed) {
        this.onDestroyed()
      }
    }
  }
  
  updateHealthBar() {
    if (!this.healthBarFill) return
    
    const ratio = this.health / this.maxHealth
    this.healthBarFill.scale.x = ratio
    this.healthBarFill.position.x = (1 - ratio) * -6
  }
  
  update(deltaTime, currentTime) {
    if (!this.isActive) return
    
    this.animationTime += deltaTime
    
    // Hover animation
    if (this.mesh) {
      this.mesh.position.y = this.position.y + Math.sin(this.animationTime * 0.5) * 1
      this.mesh.rotation.z = Math.sin(this.animationTime * 0.3) * 0.01
    }
    
    // Rotate ship slowly
    if (this.shipModel) {
      this.shipModel.rotation.y += deltaTime * 0.1
    }
    
    // Spawn enemies periodically
    if (this.onSpawnEnemy && currentTime - this.lastSpawnTime > this.spawnCooldown) {
      this.spawnEnemy()
      this.lastSpawnTime = currentTime
    }
  }
  
  spawnEnemy() {
    if (!this.onSpawnEnemy) return
    
    // Spawn from ship position
    const spawnPos = this.mesh.position.clone()
    spawnPos.y = 0.5
    spawnPos.z -= 5
    
    const enemyTypes = ['spider', 'scout', 'swarm', 'brute']
    const type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)]
    
    this.onSpawnEnemy(type, spawnPos)
  }
  
  destroy() {
    if (this.mesh && this.scene) {
      this.scene.remove(this.mesh)
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

export default { EnemyShip, MainBossShip, SHIP_VARIANTS, ENEMY_TO_SHIP }

