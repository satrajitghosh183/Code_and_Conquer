// Enemy Class - Individual enemy unit
// Integrated from dabbott/towerdefense with enhancements

import * as THREE from 'three'
import { ENEMY_TYPES } from './EnemyTypes.js'
import { SoundManager } from './SoundManager.js'

export class Enemy {
  constructor(type, args = {}) {
    // Get default values from enemy type
    const defaults = ENEMY_TYPES[type] || ENEMY_TYPES.spider

    this.type = type
    this.name = defaults.name
    this.model = defaults.model
    this.speed = defaults.speed
    this.health = defaults.health
    this.maxHealth = defaults.health
    this.armor = defaults.armor || 0
    this.lives = defaults.lives || 1
    this.goldReward = defaults.goldReward
    this.xpReward = defaults.xpReward
    this.color = defaults.color
    this.scale = defaults.scale || 1.0
    this.description = defaults.description
    this.isBoss = defaults.isBoss || false

    // Special abilities
    this.healRadius = defaults.healRadius
    this.healAmount = defaults.healAmount
    this.splitCount = defaults.splitCount
    this.splitType = defaults.splitType

    // Visual effects reference (for damage numbers, blood splatter, etc.)
    this.visualEffects = args.visualEffects || null

    // Apply wave modifiers
    if (args.healthMultiplier) {
      this.health *= args.healthMultiplier
      this.maxHealth = this.health
    }
    
    // Apply speed multiplier for progressive difficulty
    if (args.speedMultiplier) {
      this.speed *= args.speedMultiplier
    }
    
    // Apply armor multiplier (only affects enemies with base armor)
    if (args.armorMultiplier && this.armor > 0) {
      // Increase armor effectiveness, but cap at 0.75 (75% damage reduction max)
      this.armor = Math.min(0.75, this.armor * args.armorMultiplier)
    }

    // Override with custom args
    Object.assign(this, args)

    // State
    this.path = []
    this.next = null
    this.direction = [0, 0]
    this.finished = false
    this.isDead = false
    this.id = `enemy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // 3D representation
    this.mesh = null
    this.healthBar = null

    // Animation
    this.animationTime = 0
  }
  
  // Create the 3D mesh for this enemy
  createMesh() {
    const group = new THREE.Group()
    
    // Create type-specific body and features
    this.createTypeSpecificBody(group)
    
    // Add common features (eyes, health bar)
    this.createEyes(group)
    this.createHealthBar(group)
    
    // Add special effects
    if (this.isBoss) {
      this.createBossFeatures(group)
    }
    
    if (this.healRadius) {
      this.createHealerEffects(group)
    }
    
    this.mesh = group
    return group
  }
  
  // Create type-specific body shapes and features
  createTypeSpecificBody(group) {
    const s = this.scale
    
    switch (this.type) {
      case 'spider':
        this.createSpiderBody(group, s)
        break
      case 'scout':
        this.createScoutBody(group, s)
        break
      case 'brute':
        this.createBruteBody(group, s)
        break
      case 'swarm':
        this.createSwarmBody(group, s)
        break
      case 'armored':
        this.createArmoredBody(group, s)
        break
      case 'boss':
        this.createBossBody(group, s)
        break
      case 'healer':
        this.createHealerBody(group, s)
        break
      case 'splitter':
        this.createSplitterBody(group, s)
        break
      default:
        this.createSpiderBody(group, s)
    }
  }
  
  // Spider - Classic 8-legged arachnid
  createSpiderBody(group, s) {
    // Main body (ellipsoid)
    const bodyGeometry = new THREE.SphereGeometry(0.7 * s, 12, 12)
    bodyGeometry.scale(1, 0.8, 1.2)
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: this.color,
      metalness: 0.2,
      roughness: 0.8,
      emissive: this.color,
      emissiveIntensity: 0.2
    })
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
    body.position.y = 0.8 * s
    body.castShadow = true
    group.add(body)
    
    // Add 8 legs
    const legGeometry = new THREE.CylinderGeometry(0.05 * s, 0.08 * s, 0.8 * s, 6)
    const legMaterial = new THREE.MeshStandardMaterial({
      color: this.color,
      metalness: 0.1,
      roughness: 0.9
    })
    
    const legPositions = [
      { x: -0.4, z: 0.3, angle: -0.3 },
      { x: -0.5, z: 0, angle: -0.5 },
      { x: -0.4, z: -0.3, angle: -0.3 },
      { x: 0.4, z: 0.3, angle: 0.3 },
      { x: 0.5, z: 0, angle: 0.5 },
      { x: 0.4, z: -0.3, angle: 0.3 },
      { x: -0.3, z: 0.5, angle: 0 },
      { x: 0.3, z: 0.5, angle: 0 }
    ]
    
    legPositions.forEach(pos => {
      const leg = new THREE.Mesh(legGeometry, legMaterial)
      leg.position.set(pos.x * s, 0.4 * s, pos.z * s)
      leg.rotation.z = pos.angle
      leg.castShadow = true
      group.add(leg)
    })
    
    // Fangs
    const fangGeometry = new THREE.ConeGeometry(0.05 * s, 0.15 * s, 4)
    const fangMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff })
    const leftFang = new THREE.Mesh(fangGeometry, fangMaterial)
    leftFang.position.set(-0.2 * s, 0.7 * s, 0.8 * s)
    leftFang.rotation.z = -0.3
    group.add(leftFang)
    const rightFang = new THREE.Mesh(fangGeometry, fangMaterial)
    rightFang.position.set(0.2 * s, 0.7 * s, 0.8 * s)
    rightFang.rotation.z = 0.3
    group.add(rightFang)
  }
  
  // Scout - Sleek, aerodynamic with wings
  createScoutBody(group, s) {
    // Streamlined body
    const bodyGeometry = new THREE.SphereGeometry(0.5 * s, 12, 12)
    bodyGeometry.scale(1.5, 0.7, 0.8)
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: this.color,
      metalness: 0.6,
      roughness: 0.3,
      emissive: this.color,
      emissiveIntensity: 0.4
    })
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
    body.position.y = 0.6 * s
    body.castShadow = true
    group.add(body)
    
    // Wings (4 total)
    const wingGeometry = new THREE.PlaneGeometry(0.4 * s, 0.6 * s)
    const wingMaterial = new THREE.MeshStandardMaterial({
      color: this.color,
      metalness: 0.5,
      roughness: 0.4,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide
    })
    
    const wingPositions = [
      { x: -0.3, z: 0.2, rotY: -0.5 },
      { x: 0.3, z: 0.2, rotY: 0.5 },
      { x: -0.3, z: -0.2, rotY: 0.5 },
      { x: 0.3, z: -0.2, rotY: -0.5 }
    ]
    
    wingPositions.forEach(pos => {
      const wing = new THREE.Mesh(wingGeometry, wingMaterial)
      wing.position.set(pos.x * s, 0.7 * s, pos.z * s)
      wing.rotation.y = pos.rotY
      wing.rotation.x = -0.3
      group.add(wing)
    })
    
    // Speed lines effect
    const lineGeometry = new THREE.CylinderGeometry(0.02 * s, 0.02 * s, 0.3 * s, 4)
    const lineMaterial = new THREE.MeshBasicMaterial({
      color: this.color,
      transparent: true,
      opacity: 0.5
    })
    for (let i = 0; i < 3; i++) {
      const line = new THREE.Mesh(lineGeometry, lineMaterial)
      line.position.set((i - 1) * 0.15 * s, 0.5 * s, -0.5 * s)
      line.rotation.x = Math.PI / 2
      group.add(line)
    }
  }
  
  // Brute - Large, heavily built with spikes
  createBruteBody(group, s) {
    // Large, muscular body
    const bodyGeometry = new THREE.SphereGeometry(1.0 * s, 16, 16)
    bodyGeometry.scale(1.1, 1.2, 1.0)
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: this.color,
      metalness: 0.1,
      roughness: 0.9,
      emissive: this.color,
      emissiveIntensity: 0.15
    })
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
    body.position.y = 1.2 * s
    body.castShadow = true
    group.add(body)
    
    // Shoulder plates
    const plateGeometry = new THREE.BoxGeometry(0.4 * s, 0.5 * s, 0.3 * s)
    const plateMaterial = new THREE.MeshStandardMaterial({
      color: 0x442200,
      metalness: 0.3,
      roughness: 0.7
    })
    
    const leftPlate = new THREE.Mesh(plateGeometry, plateMaterial)
    leftPlate.position.set(-0.6 * s, 1.4 * s, 0)
    leftPlate.rotation.y = -0.2
    leftPlate.castShadow = true
    group.add(leftPlate)
    
    const rightPlate = new THREE.Mesh(plateGeometry, plateMaterial)
    rightPlate.position.set(0.6 * s, 1.4 * s, 0)
    rightPlate.rotation.y = 0.2
    rightPlate.castShadow = true
    group.add(rightPlate)
    
    // Spikes on back
    const spikeGeometry = new THREE.ConeGeometry(0.08 * s, 0.3 * s, 6)
    const spikeMaterial = new THREE.MeshStandardMaterial({
      color: 0x330000,
      metalness: 0.4,
      roughness: 0.6
    })
    
    for (let i = 0; i < 5; i++) {
      const spike = new THREE.Mesh(spikeGeometry, spikeMaterial)
      spike.position.set((i - 2) * 0.2 * s, 1.6 * s, -0.4 * s)
      spike.rotation.x = -0.3
      spike.castShadow = true
      group.add(spike)
    }
    
    // Thick legs
    const legGeometry = new THREE.CylinderGeometry(0.15 * s, 0.2 * s, 0.9 * s, 8)
    const legMaterial = new THREE.MeshStandardMaterial({
      color: this.color,
      metalness: 0.1,
      roughness: 0.9
    })
    
    const legPositions = [
      { x: -0.4, z: 0.3 },
      { x: -0.4, z: -0.3 },
      { x: 0.4, z: 0.3 },
      { x: 0.4, z: -0.3 }
    ]
    
    legPositions.forEach(pos => {
      const leg = new THREE.Mesh(legGeometry, legMaterial)
      leg.position.set(pos.x * s, 0.45 * s, pos.z * s)
      leg.castShadow = true
      group.add(leg)
    })
  }
  
  // Swarm - Small, compact, multiple segments
  createSwarmBody(group, s) {
    // Small segmented body
    const segmentCount = 3
    for (let i = 0; i < segmentCount; i++) {
      const segmentGeometry = new THREE.SphereGeometry(0.25 * s, 8, 8)
      segmentGeometry.scale(1, 0.8, 1.2)
      const segmentMaterial = new THREE.MeshStandardMaterial({
        color: this.color,
        metalness: 0.3,
        roughness: 0.7,
        emissive: this.color,
        emissiveIntensity: 0.3
      })
      const segment = new THREE.Mesh(segmentGeometry, segmentMaterial)
      segment.position.set(
        (i - 1) * 0.15 * s,
        0.4 * s,
        (i - 1) * 0.1 * s
      )
      segment.castShadow = true
      group.add(segment)
    }
    
    // Tiny legs
    const legGeometry = new THREE.CylinderGeometry(0.02 * s, 0.03 * s, 0.3 * s, 4)
    const legMaterial = new THREE.MeshStandardMaterial({ color: this.color })
    
    for (let i = 0; i < 6; i++) {
      const leg = new THREE.Mesh(legGeometry, legMaterial)
      const angle = (i / 6) * Math.PI * 2
      leg.position.set(
        Math.cos(angle) * 0.2 * s,
        0.15 * s,
        Math.sin(angle) * 0.2 * s
      )
      leg.rotation.z = Math.cos(angle) * 0.3
      leg.castShadow = true
      group.add(leg)
    }
  }
  
  // Armored - Plated with metallic armor
  createArmoredBody(group, s) {
    // Core body
    const bodyGeometry = new THREE.SphereGeometry(0.7 * s, 12, 12)
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: this.color,
      metalness: 0.1,
      roughness: 0.8
    })
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
    body.position.y = 0.9 * s
    body.castShadow = true
    group.add(body)
    
    // Armor plates (hexagonal pattern)
    const plateGeometry = new THREE.CylinderGeometry(0.2 * s, 0.2 * s, 0.1 * s, 6)
    const plateMaterial = new THREE.MeshStandardMaterial({
      color: 0x555555,
      metalness: 0.8,
      roughness: 0.2,
      emissive: 0x222222,
      emissiveIntensity: 0.1
    })
    
    const platePositions = [
      { x: 0, y: 1.1, z: 0.4 },
      { x: -0.3, y: 1.0, z: 0.2 },
      { x: 0.3, y: 1.0, z: 0.2 },
      { x: -0.4, y: 0.9, z: 0 },
      { x: 0.4, y: 0.9, z: 0 },
      { x: 0, y: 0.8, z: -0.3 }
    ]
    
    platePositions.forEach(pos => {
      const plate = new THREE.Mesh(plateGeometry, plateMaterial)
      plate.position.set(pos.x * s, pos.y * s, pos.z * s)
      plate.rotation.x = Math.PI / 2
      plate.castShadow = true
      group.add(plate)
    })
    
    // Reinforced legs
    const legGeometry = new THREE.CylinderGeometry(0.08 * s, 0.12 * s, 0.7 * s, 8)
    const legMaterial = new THREE.MeshStandardMaterial({
      color: 0x666666,
      metalness: 0.7,
      roughness: 0.3
    })
    
    const legPositions = [
      { x: -0.35, z: 0.25 },
      { x: -0.35, z: -0.25 },
      { x: 0.35, z: 0.25 },
      { x: 0.35, z: -0.25 }
    ]
    
    legPositions.forEach(pos => {
      const leg = new THREE.Mesh(legGeometry, legMaterial)
      leg.position.set(pos.x * s, 0.35 * s, pos.z * s)
      leg.castShadow = true
      group.add(leg)
    })
  }
  
  // Boss - Massive, intimidating with multiple features
  createBossBody(group, s) {
    // Massive main body
    const bodyGeometry = new THREE.SphereGeometry(1.2 * s, 20, 20)
    bodyGeometry.scale(1.2, 1.3, 1.1)
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: this.color,
      metalness: 0.4,
      roughness: 0.6,
      emissive: this.color,
      emissiveIntensity: 0.3
    })
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
    body.position.y = 1.5 * s
    body.castShadow = true
    group.add(body)
    
    // Multiple eyes (6 total)
    const eyeGeometry = new THREE.SphereGeometry(0.2 * s, 8, 8)
    const eyeMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 0.8
    })
    
    const eyePositions = [
      { x: -0.4, y: 1.6, z: 0.6 },
      { x: 0.4, y: 1.6, z: 0.6 },
      { x: -0.6, y: 1.5, z: 0.4 },
      { x: 0.6, y: 1.5, z: 0.4 },
      { x: -0.3, y: 1.4, z: 0.7 },
      { x: 0.3, y: 1.4, z: 0.7 }
    ]
    
    eyePositions.forEach(pos => {
      const eye = new THREE.Mesh(eyeGeometry, eyeMaterial)
      eye.position.set(pos.x * s, pos.y * s, pos.z * s)
      group.add(eye)
    })
    
    // Massive mandibles
    const mandibleGeometry = new THREE.ConeGeometry(0.15 * s, 0.6 * s, 4)
    const mandibleMaterial = new THREE.MeshStandardMaterial({
      color: 0x330000,
      metalness: 0.6,
      roughness: 0.4
    })
    
    const leftMandible = new THREE.Mesh(mandibleGeometry, mandibleMaterial)
    leftMandible.position.set(-0.4 * s, 1.3 * s, 1.0 * s)
    leftMandible.rotation.z = -0.5
    leftMandible.castShadow = true
    group.add(leftMandible)
    
    const rightMandible = new THREE.Mesh(mandibleGeometry, mandibleMaterial)
    rightMandible.position.set(0.4 * s, 1.3 * s, 1.0 * s)
    rightMandible.rotation.z = 0.5
    rightMandible.castShadow = true
    group.add(rightMandible)
    
    // Thick armored legs (8 total)
    const legGeometry = new THREE.CylinderGeometry(0.2 * s, 0.25 * s, 1.2 * s, 10)
    const legMaterial = new THREE.MeshStandardMaterial({
      color: 0x440000,
      metalness: 0.5,
      roughness: 0.5
    })
    
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2
      const leg = new THREE.Mesh(legGeometry, legMaterial)
      leg.position.set(
        Math.cos(angle) * 0.6 * s,
        0.6 * s,
        Math.sin(angle) * 0.6 * s
      )
      leg.rotation.z = Math.cos(angle) * 0.2
      leg.castShadow = true
      group.add(leg)
    }
  }
  
  // Healer - Organic, glowing with healing aura
  createHealerBody(group, s) {
    // Soft, organic body
    const bodyGeometry = new THREE.SphereGeometry(0.6 * s, 12, 12)
    bodyGeometry.scale(1, 1.1, 1)
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: this.color,
      metalness: 0.0,
      roughness: 0.9,
      emissive: this.color,
      emissiveIntensity: 0.5
    })
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
    body.position.y = 0.8 * s
    body.castShadow = true
    group.add(body)
    
    // Glowing orbs around body
    const orbGeometry = new THREE.SphereGeometry(0.15 * s, 8, 8)
    const orbMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.7,
      emissive: 0x00ff88,
      emissiveIntensity: 1.0
    })
    
    const orbPositions = [
      { x: 0, y: 1.1, z: 0.3 },
      { x: -0.3, y: 0.9, z: 0 },
      { x: 0.3, y: 0.9, z: 0 },
      { x: 0, y: 0.7, z: -0.3 }
    ]
    
    orbPositions.forEach(pos => {
      const orb = new THREE.Mesh(orbGeometry, orbMaterial)
      orb.position.set(pos.x * s, pos.y * s, pos.z * s)
      group.add(orb)
    })
    
    // Gentle legs
    const legGeometry = new THREE.CylinderGeometry(0.04 * s, 0.06 * s, 0.6 * s, 6)
    const legMaterial = new THREE.MeshStandardMaterial({
      color: this.color,
      emissive: this.color,
      emissiveIntensity: 0.3
    })
    
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2
      const leg = new THREE.Mesh(legGeometry, legMaterial)
      leg.position.set(
        Math.cos(angle) * 0.35 * s,
        0.3 * s,
        Math.sin(angle) * 0.35 * s
      )
      leg.castShadow = true
      group.add(leg)
    }
  }
  
  // Splitter - Unstable, pulsing, segmented
  createSplitterBody(group, s) {
    // Unstable, pulsing body with segments
    const segmentCount = 4
    for (let i = 0; i < segmentCount; i++) {
      const segmentGeometry = new THREE.SphereGeometry(0.35 * s, 10, 10)
      segmentGeometry.scale(1, 0.9, 1.1)
      const segmentMaterial = new THREE.MeshStandardMaterial({
        color: this.color,
        metalness: 0.2,
        roughness: 0.8,
        emissive: this.color,
        emissiveIntensity: 0.4 + i * 0.1
      })
      const segment = new THREE.Mesh(segmentGeometry, segmentMaterial)
      segment.position.set(
        (i - 1.5) * 0.2 * s,
        0.7 * s + Math.sin(i) * 0.1 * s,
        (i - 1.5) * 0.15 * s
      )
      segment.castShadow = true
      group.add(segment)
    }
    
    // Cracks/instability lines
    const crackGeometry = new THREE.BoxGeometry(0.02 * s, 0.3 * s, 0.02 * s)
    const crackMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 0.8
    })
    
    for (let i = 0; i < 6; i++) {
      const crack = new THREE.Mesh(crackGeometry, crackMaterial)
      crack.position.set(
        (Math.random() - 0.5) * 0.6 * s,
        0.6 * s + Math.random() * 0.4 * s,
        (Math.random() - 0.5) * 0.6 * s
      )
      crack.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      )
      group.add(crack)
    }
    
    // Multiple legs
    const legGeometry = new THREE.CylinderGeometry(0.06 * s, 0.08 * s, 0.7 * s, 6)
    const legMaterial = new THREE.MeshStandardMaterial({
      color: this.color,
      emissive: this.color,
      emissiveIntensity: 0.3
    })
    
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2
      const leg = new THREE.Mesh(legGeometry, legMaterial)
      leg.position.set(
        Math.cos(angle) * 0.4 * s,
        0.35 * s,
        Math.sin(angle) * 0.4 * s
      )
      leg.castShadow = true
      group.add(leg)
    }
  }
  
  // Create eyes (common to all types)
  createEyes(group) {
    const s = this.scale
    const eyeSize = this.type === 'boss' ? 0.2 * s : 0.15 * s
    const eyeOffset = this.type === 'boss' ? 0 : 0.3 * s
    
    // Only add standard eyes if not boss (boss has custom eyes)
    if (this.type !== 'boss') {
      const eyeGeometry = new THREE.SphereGeometry(eyeSize, 8, 8)
      const eyeMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.9
      })
      
      const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
      leftEye.position.set(-eyeOffset, 1.1 * s, 0.6 * s)
      group.add(leftEye)
      
      const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
      rightEye.position.set(eyeOffset, 1.1 * s, 0.6 * s)
      group.add(rightEye)
      
      // Pupils
      const pupilGeometry = new THREE.SphereGeometry(eyeSize * 0.5, 6, 6)
      const pupilMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 })
      
      const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial)
      leftPupil.position.set(-eyeOffset, 1.1 * s, 0.7 * s)
      group.add(leftPupil)
      
      const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial)
      rightPupil.position.set(eyeOffset, 1.1 * s, 0.7 * s)
      group.add(rightPupil)
    }
  }
  
  // Boss-specific features
  createBossFeatures(group) {
    const s = this.scale
    
    // Golden crown with spikes
    const crownGeometry = new THREE.ConeGeometry(0.4 * s, 0.7 * s, 8)
    const crownMaterial = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.9,
      roughness: 0.1,
      emissive: 0xffd700,
      emissiveIntensity: 0.6
    })
    const crown = new THREE.Mesh(crownGeometry, crownMaterial)
    crown.position.y = 2.2 * s
    group.add(crown)
    
    // Crown spikes
    const spikeGeometry = new THREE.ConeGeometry(0.05 * s, 0.2 * s, 4)
    const spikeMaterial = new THREE.MeshStandardMaterial({
      color: 0xffaa00,
      metalness: 0.8,
      roughness: 0.2,
      emissive: 0xffaa00,
      emissiveIntensity: 0.5
    })
    
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2
      const spike = new THREE.Mesh(spikeGeometry, spikeMaterial)
      spike.position.set(
        Math.cos(angle) * 0.35 * s,
        2.5 * s,
        Math.sin(angle) * 0.35 * s
      )
      group.add(spike)
    }
    
    // Aura effect
    const auraGeometry = new THREE.RingGeometry(0.8 * s, 1.2 * s, 32)
    const auraMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    })
    const aura = new THREE.Mesh(auraGeometry, auraMaterial)
    aura.rotation.x = -Math.PI / 2
    aura.position.y = 0.1
    group.add(aura)
  }
  
  // Healer-specific effects
  createHealerEffects(group) {
    const s = this.scale
    
    // Healing ring
    const healRingGeometry = new THREE.TorusGeometry(this.healRadius / 2, 0.08 * s, 8, 16)
    const healRingMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.4,
      emissive: 0x00ff88,
      emissiveIntensity: 0.5
    })
    const healRing = new THREE.Mesh(healRingGeometry, healRingMaterial)
    healRing.rotation.x = Math.PI / 2
    healRing.position.y = 0.3
    group.add(healRing)
    
    // Floating particles effect
    const particleGeometry = new THREE.SphereGeometry(0.05 * s, 6, 6)
    const particleMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.6,
      emissive: 0x00ff88,
      emissiveIntensity: 1.0
    })
    
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2
      const particle = new THREE.Mesh(particleGeometry, particleMaterial)
      particle.position.set(
        Math.cos(angle) * 0.5 * s,
        0.5 * s + Math.sin(i) * 0.2 * s,
        Math.sin(angle) * 0.5 * s
      )
      group.add(particle)
    }
  }
  
  createHealthBar(parent) {
    const barWidth = 1.5 * this.scale
    const barHeight = 0.15
    
    // Background
    const bgGeometry = new THREE.PlaneGeometry(barWidth, barHeight)
    const bgMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x333333,
      side: THREE.DoubleSide
    })
    const bg = new THREE.Mesh(bgGeometry, bgMaterial)
    bg.position.y = 2 * this.scale + 0.5
    parent.add(bg)
    
    // Health fill
    const fillGeometry = new THREE.PlaneGeometry(barWidth - 0.05, barHeight - 0.05)
    const fillMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x00ff00,
      side: THREE.DoubleSide
    })
    this.healthBar = new THREE.Mesh(fillGeometry, fillMaterial)
    this.healthBar.position.y = 2 * this.scale + 0.5
    this.healthBar.position.z = 0.01
    parent.add(this.healthBar)
  }
  
  updateHealthBar() {
    if (!this.healthBar) return
    
    const ratio = this.health / this.maxHealth
    this.healthBar.scale.x = Math.max(0, ratio)
    this.healthBar.position.x = (1 - ratio) * -0.5 * this.scale
    
    // Color based on health
    if (ratio > 0.6) {
      this.healthBar.material.color.setHex(0x00ff00)
    } else if (ratio > 0.3) {
      this.healthBar.material.color.setHex(0xffff00)
    } else {
      this.healthBar.material.color.setHex(0xff0000)
    }
  }
  
  // Kill this enemy
  kill() {
    this.health = 0
    this.isDead = true

    // Play death sound with spatial audio
    if (this.mesh && this.mesh.position) {
      SoundManager.play3D('enemy_death.ogg', this.mesh.position)
    }
  }
  
  // Deal damage to this enemy
  damage(amount) {
    // Apply armor reduction
    const effectiveDamage = amount * (1 - this.armor)

    // Show floating damage number
    if (this.visualEffects && this.mesh && this.mesh.position) {
      // Critical hit if damage is > 30% of max health
      const isCritical = effectiveDamage > this.maxHealth * 0.3

      const damageNumberPos = this.mesh.position.clone()
      damageNumberPos.y += 1.5 * this.scale // Above enemy

      this.visualEffects.createDamageNumber(damageNumberPos, Math.round(effectiveDamage), {
        color: isCritical ? 0xffff00 : 0xff4444,
        size: isCritical ? 1.5 : 1.0,
        duration: isCritical ? 1200 : 1000,
        isCritical
      })
    }

    if (this.health > effectiveDamage) {
      this.health -= effectiveDamage

      // Play hit sound with spatial audio (only if still alive)
      if (this.mesh && this.mesh.position) {
        SoundManager.play3D('enemy_hit.ogg', this.mesh.position, { volume: 0.6 })
      }
    } else {
      this.health = 0
      this.isDead = true

      // Play death sound with spatial audio
      if (this.mesh && this.mesh.position) {
        SoundManager.play3D('enemy_death.ogg', this.mesh.position)
      }

      // Create blood splatter on death
      if (this.visualEffects && this.mesh && this.mesh.position) {
        this.visualEffects.createBloodSplatter(this.mesh.position, {
          count: this.isBoss ? 50 : 30,
          color: 0x8b0000,
          size: this.isBoss ? 0.4 : 0.3,
          duration: this.isBoss ? 800 : 600
        })
      }
    }

    this.updateHealthBar()

    // Visual damage feedback (flash white on all body parts)
    if (this.mesh) {
      this.mesh.traverse((child) => {
        if (child.isMesh && child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material]
          materials.forEach(material => {
            if (material.emissive) {
              const originalColor = material.emissive.getHex()
              const originalIntensity = material.emissiveIntensity || 0
              material.emissive.setHex(0xffffff)
              material.emissiveIntensity = 1.0
              setTimeout(() => {
                if (material.emissive) {
                  material.emissive.setHex(originalColor)
                  material.emissiveIntensity = originalIntensity
                }
              }, 100)
            }
          })
        }
      })
    }

    return this.isDead
  }
  
  // Advance this enemy on its path
  advance() {
    if (this.path && this.path.length >= 1) {
      const prev = this.next || (this.path[0] && { x: this.path[0].x || 0, y: this.path[0].y || 0.5, z: this.path[0].z || 0 })
      const n = this.path.shift()
      
      // Handle both world positions and grid coordinates
      if (n && typeof n.x === 'number') {
        this.next = { x: n.x, y: n.y || 0.5, z: n.z || 0 }
      } else if (Array.isArray(n)) {
        // Grid coordinate - will be converted by game
        this.next = { x: n[1] || 0, y: 0.5, z: n[0] || 0 }
      } else {
        this.finished = true
        return false
      }
      
      if (prev) {
        this.direction = [
          this.next.x - prev.x,
          this.next.y - prev.y,
          (this.next.z || 0) - (prev.z || 0)
        ]
      }
      
      return true
    }
    
    this.finished = true
    return false
  }
  
  // Set a new path (accepts both world positions and grid coordinates)
  setPath(path) {
    if (!path || path.length === 0) {
      this.finished = true
      return
    }
    
    // Convert path to world positions if needed
    if (path[0] && typeof path[0].x === 'number' && typeof path[0].y === 'number') {
      // Already world positions
      this.path = path.map(p => ({ x: p.x, y: p.y || 0.5, z: p.z || 0 }))
    } else if (Array.isArray(path[0])) {
      // Grid coordinates - convert to world (will be handled by game)
      this.path = path
    } else {
      // Assume world positions
      this.path = path.slice()
    }
    
    this.finished = false
    this.advance()
  }
  
  // Get enemies that should spawn when this enemy dies (for splitter type)
  getSpawnOnDeath() {
    if (!this.splitCount || !this.splitType) return []
    
    const spawns = []
    for (let i = 0; i < this.splitCount; i++) {
      spawns.push({
        type: this.splitType,
        position: this.mesh ? this.mesh.position.clone() : null
      })
    }
    return spawns
  }
  
  // Update enemy animation
  updateAnimation(deltaTime) {
    if (!this.mesh) return
    
    this.animationTime += deltaTime
    const s = this.scale
    const time = this.animationTime
    const idOffset = this.id.charCodeAt(0)
    
    // Type-specific animations
    switch (this.type) {
      case 'spider':
        // Leg movement simulation
        this.mesh.children.forEach((child, index) => {
          if (child.geometry && child.geometry.type === 'CylinderGeometry' && index > 0) {
            // Legs are after body
            const legIndex = index - 1
            child.rotation.z = Math.sin(time * 8 + legIndex) * 0.3
          }
        })
        // Body bobbing
        const bobOffset = Math.sin(time * 4 + idOffset) * 0.15
        this.mesh.position.y += bobOffset * deltaTime
        break
        
      case 'scout':
        // Fast wing flapping
        this.mesh.children.forEach((child) => {
          if (child.geometry && child.geometry.type === 'PlaneGeometry') {
            child.rotation.x = -0.3 + Math.sin(time * 15) * 0.2
          }
        })
        // Quick bobbing
        const scoutBob = Math.sin(time * 8 + idOffset) * 0.1
        this.mesh.position.y += scoutBob * deltaTime
        break
        
      case 'brute':
        // Heavy, slow movement
        const bruteBob = Math.sin(time * 2 + idOffset) * 0.2
        this.mesh.position.y += bruteBob * deltaTime
        // Shoulder plate movement
        this.mesh.children.forEach((child) => {
          if (child.geometry && child.geometry.type === 'BoxGeometry') {
            child.rotation.y += Math.sin(time * 1.5) * 0.05
          }
        })
        break
        
      case 'swarm':
        // Erratic, quick movement
        const swarmBob = Math.sin(time * 10 + idOffset) * 0.08
        this.mesh.position.y += swarmBob * deltaTime
        this.mesh.rotation.y += Math.sin(time * 6) * 0.02
        // Segments pulse
        this.mesh.children.forEach((child, index) => {
          if (child.geometry && child.geometry.type === 'SphereGeometry') {
            const scale = 1 + Math.sin(time * 5 + index) * 0.1
            child.scale.set(scale, scale, scale)
          }
        })
        break
        
      case 'armored':
        // Steady, mechanical movement
        const armoredBob = Math.sin(time * 3 + idOffset) * 0.1
        this.mesh.position.y += armoredBob * deltaTime
        // Armor plates slight rotation
        this.mesh.children.forEach((child) => {
          if (child.geometry && child.geometry.type === 'CylinderGeometry' && 
              child.material && child.material.metalness > 0.5) {
            child.rotation.y += deltaTime * 0.5
          }
        })
        break
        
      case 'boss':
        // Powerful, intimidating movement
        const bossBob = Math.sin(time * 1.5 + idOffset) * 0.3
        this.mesh.position.y += bossBob * deltaTime
        // Eyes pulse
        this.mesh.children.forEach((child) => {
          if (child.material && child.material.emissive && 
              child.material.emissive.getHex() === 0xff0000) {
            child.material.emissiveIntensity = 0.6 + Math.sin(time * 3) * 0.3
          }
        })
        // Mandibles open/close
        this.mesh.children.forEach((child) => {
          if (child.geometry && child.geometry.type === 'ConeGeometry' && 
              child.position.z > 0.8 * s) {
            child.rotation.z += Math.sin(time * 2) * 0.1
          }
        })
        break
        
      case 'healer':
        // Gentle, floating movement
        const healerBob = Math.sin(time * 3 + idOffset) * 0.12
        this.mesh.position.y += healerBob * deltaTime
        // Orbs pulse
        this.mesh.children.forEach((child) => {
          if (child.material && child.material.emissive && 
              child.material.emissive.getHex() === 0x00ff88) {
            child.material.opacity = 0.5 + Math.sin(time * 4) * 0.3
            child.material.emissiveIntensity = 0.8 + Math.sin(time * 4) * 0.4
          }
        })
        // Gentle rotation
        this.mesh.rotation.y += deltaTime * 0.3
        break
        
      case 'splitter':
        // Unstable, pulsing movement
        const splitterBob = Math.sin(time * 6 + idOffset) * 0.15
        this.mesh.position.y += splitterBob * deltaTime
        // Segments pulse independently
        this.mesh.children.forEach((child, index) => {
          if (child.geometry && child.geometry.type === 'SphereGeometry') {
            const pulse = 1 + Math.sin(time * 4 + index) * 0.15
            child.scale.set(pulse, pulse, pulse)
          }
        })
        // Cracks glow
        this.mesh.children.forEach((child) => {
          if (child.material && child.material.emissive && 
              child.material.emissive.getHex() === 0xff0000) {
            child.material.emissiveIntensity = 0.5 + Math.sin(time * 5) * 0.5
          }
        })
        break
        
      default:
        // Default bobbing
        const defaultBob = Math.sin(time * 5 + idOffset) * 0.2
        this.mesh.position.y += defaultBob * deltaTime
    }
    
    // Slight rotation wobble for all types
    this.mesh.rotation.y += Math.sin(time * 2) * 0.005
  }
  
  // Clean up
  destroy() {
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
