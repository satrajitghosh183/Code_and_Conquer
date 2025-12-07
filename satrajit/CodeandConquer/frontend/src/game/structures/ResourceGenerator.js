import { Structure } from './Structure.js'
import * as THREE from 'three'

// Resource generator types
export const RESOURCE_GENERATOR_TYPES = {
  gold_mine: {
    name: 'Gold Mine',
    modelKey: 'PROCEDURAL_GOLD_MINE',
    health: 50,
    cost: 200,
    goldPerSecond: 2,
    energyPerSecond: 0,
    description: 'Generates gold over time'
  },
  energy_well: {
    name: 'Energy Well',
    modelKey: 'PROCEDURAL_ENERGY_WELL',
    health: 50,
    cost: 150,
    goldPerSecond: 0,
    energyPerSecond: 1,
    description: 'Generates energy over time'
  },
  hybrid_generator: {
    name: 'Hybrid Generator',
    modelKey: 'PROCEDURAL_HYBRID_GENERATOR',
    health: 75,
    cost: 300,
    goldPerSecond: 1,
    energyPerSecond: 0.5,
    description: 'Generates both gold and energy'
  }
}

export class ResourceGenerator extends Structure {
  constructor(generatorType, position, options = {}) {
    const config = RESOURCE_GENERATOR_TYPES[generatorType]
    if (!config) {
      throw new Error(`Unknown generator type: ${generatorType}`)
    }
    
    super('resource_generator', position, config.modelKey, {
      health: config.health,
      maxHealth: config.health,
      cost: config.cost,
      rotation: options.rotation || 0
    })
    
    this.generatorType = generatorType
    this.goldPerSecond = config.goldPerSecond
    this.energyPerSecond = config.energyPerSecond
    this.lastResourceTick = Date.now()
    this.totalGoldGenerated = 0
    this.totalEnergyGenerated = 0
    this.animationTime = 0 // For smooth animations
  }
  
  async load() {
    // Use procedural model - synchronous creation
    this.mesh = this.createProceduralModel()
    this.mesh.position.copy(this.position)
    this.mesh.rotation.y = this.rotation
    this.applyRedTheme()
    this.createHealthBar()
    this.loaded = true
    
    return this.mesh
  }
  
  createProceduralModel() {
    const group = new THREE.Group()
    const s = 1.0 // Scale
    
    if (this.generatorType === 'gold_mine') {
      // Gold mine - drill-like structure
      // Base platform
      const baseGeometry = new THREE.CylinderGeometry(1.2 * s, 1.4 * s, 0.3 * s, 8)
      const baseMaterial = new THREE.MeshStandardMaterial({
        color: 0x8B4513,
        metalness: 0.3,
        roughness: 0.8
      })
      const base = new THREE.Mesh(baseGeometry, baseMaterial)
      base.position.y = 0.15 * s
      base.castShadow = true
      group.add(base)
      
      // Drill tower
      const drillGeometry = new THREE.CylinderGeometry(0.4 * s, 0.5 * s, 1.5 * s, 8)
      const drillMaterial = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        metalness: 0.8,
        roughness: 0.2,
        emissive: 0xffaa00,
        emissiveIntensity: 0.3
      })
      const drill = new THREE.Mesh(drillGeometry, drillMaterial)
      drill.position.y = 0.9 * s
      drill.castShadow = true
      drill.userData.isDrill = true // Mark for animation
      group.add(drill)
      
      // Drill bit (rotating)
      const bitGeometry = new THREE.ConeGeometry(0.3 * s, 0.6 * s, 6)
      const bitMaterial = new THREE.MeshStandardMaterial({
        color: 0xcccccc,
        metalness: 0.9,
        roughness: 0.1
      })
      const bit = new THREE.Mesh(bitGeometry, bitMaterial)
      bit.position.y = 1.8 * s
      bit.rotation.z = Math.PI
      bit.userData.isBit = true // Mark for animation
      group.add(bit)
      
      // Gold particles/glow (limited count for performance)
      for (let i = 0; i < 4; i++) {
        const particleGeometry = new THREE.SphereGeometry(0.08 * s, 6, 6)
        const particleMaterial = new THREE.MeshBasicMaterial({
          color: 0xffd700,
          transparent: true,
          opacity: 0.7,
          emissive: 0xffd700,
          emissiveIntensity: 1.0
        })
        const particle = new THREE.Mesh(particleGeometry, particleMaterial)
        const angle = (i / 4) * Math.PI * 2
        particle.position.set(
          Math.cos(angle) * 0.6 * s,
          0.5 * s + Math.sin(i) * 0.2 * s,
          Math.sin(angle) * 0.6 * s
        )
        particle.userData.isParticle = true
        particle.userData.particleIndex = i
        group.add(particle)
      }
      
    } else if (this.generatorType === 'energy_well') {
      // Energy well - glowing crystal structure
      // Base ring
      const ringGeometry = new THREE.TorusGeometry(0.8 * s, 0.15 * s, 8, 16)
      const ringMaterial = new THREE.MeshStandardMaterial({
        color: 0x00aaff,
        metalness: 0.6,
        roughness: 0.4,
        emissive: 0x0088ff,
        emissiveIntensity: 0.5
      })
      const ring = new THREE.Mesh(ringGeometry, ringMaterial)
      ring.rotation.x = Math.PI / 2
      ring.position.y = 0.1 * s
      group.add(ring)
      
      // Central crystal
      const crystalGeometry = new THREE.OctahedronGeometry(0.6 * s, 1)
      const crystalMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x00aaff,
        emissive: 0x0088ff,
        emissiveIntensity: 1.0,
        metalness: 0.1,
        roughness: 0.05,
        transparent: true,
        opacity: 0.8,
        clearcoat: 1.0,
        transmission: 0.5
      })
      const crystal = new THREE.Mesh(crystalGeometry, crystalMaterial)
      crystal.position.y = 0.8 * s
      crystal.userData.isCrystal = true // Mark for animation
      group.add(crystal)
      
      // Energy particles (limited count)
      for (let i = 0; i < 6; i++) {
        const particleGeometry = new THREE.SphereGeometry(0.06 * s, 6, 6)
        const particleMaterial = new THREE.MeshBasicMaterial({
          color: 0x00ffff,
          transparent: true,
          opacity: 0.6,
          emissive: 0x00ffff,
          emissiveIntensity: 1.5
        })
        const particle = new THREE.Mesh(particleGeometry, particleMaterial)
        const angle = (i / 6) * Math.PI * 2
        particle.position.set(
          Math.cos(angle) * 0.7 * s,
          0.3 * s + Math.sin(i * 2) * 0.15 * s,
          Math.sin(angle) * 0.7 * s
        )
        particle.userData.isParticle = true
        particle.userData.particleIndex = i
        group.add(particle)
      }
      
    } else if (this.generatorType === 'hybrid_generator') {
      // Hybrid generator - combination of both
      // Base
      const baseGeometry = new THREE.CylinderGeometry(1.0 * s, 1.2 * s, 0.4 * s, 8)
      const baseMaterial = new THREE.MeshStandardMaterial({
        color: 0x4a4a4a,
        metalness: 0.5,
        roughness: 0.6
      })
      const base = new THREE.Mesh(baseGeometry, baseMaterial)
      base.position.y = 0.2 * s
      group.add(base)
      
      // Gold side (left)
      const goldCylinder = new THREE.CylinderGeometry(0.3 * s, 0.35 * s, 1.0 * s, 8)
      const goldMaterial = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        metalness: 0.8,
        roughness: 0.2,
        emissive: 0xffaa00,
        emissiveIntensity: 0.4
      })
      const goldPart = new THREE.Mesh(goldCylinder, goldMaterial)
      goldPart.position.set(-0.4 * s, 0.9 * s, 0)
      goldPart.userData.isRotating = true
      group.add(goldPart)
      
      // Energy side (right)
      const energyCylinder = new THREE.CylinderGeometry(0.3 * s, 0.35 * s, 1.0 * s, 8)
      const energyMaterial = new THREE.MeshStandardMaterial({
        color: 0x00aaff,
        metalness: 0.6,
        roughness: 0.3,
        emissive: 0x0088ff,
        emissiveIntensity: 0.5
      })
      const energyPart = new THREE.Mesh(energyCylinder, energyMaterial)
      energyPart.position.set(0.4 * s, 0.9 * s, 0)
      energyPart.userData.isRotating = true
      group.add(energyPart)
      
      // Central connector
      const connectorGeometry = new THREE.BoxGeometry(0.3 * s, 0.4 * s, 0.3 * s)
      const connectorMaterial = new THREE.MeshStandardMaterial({
        color: 0x666666,
        metalness: 0.7,
        roughness: 0.3
      })
      const connector = new THREE.Mesh(connectorGeometry, connectorMaterial)
      connector.position.y = 0.9 * s
      group.add(connector)
      
      // Mixed particles (limited count)
      for (let i = 0; i < 6; i++) {
        const isGold = i % 2 === 0
        const particleGeometry = new THREE.SphereGeometry(0.05 * s, 6, 6)
        const particleMaterial = new THREE.MeshBasicMaterial({
          color: isGold ? 0xffd700 : 0x00ffff,
          transparent: true,
          opacity: 0.6,
          emissive: isGold ? 0xffd700 : 0x00ffff,
          emissiveIntensity: 1.0
        })
        const particle = new THREE.Mesh(particleGeometry, particleMaterial)
        const angle = (i / 6) * Math.PI * 2
        particle.position.set(
          Math.cos(angle) * 0.8 * s,
          0.4 * s + Math.sin(i) * 0.2 * s,
          Math.sin(angle) * 0.8 * s
        )
        particle.userData.isParticle = true
        particle.userData.particleIndex = i
        group.add(particle)
      }
    }
    
    // Add shadow casting
    group.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })
    
    return group
  }
  
  // Generate resources - FIXED: Non-blocking, efficient
  generateResources(currentTime, gameInstance) {
    if (!gameInstance || this.isDestroyed) return
    
    // Only generate once per second - use simple time check
    const deltaTime = (currentTime - this.lastResourceTick) / 1000
    if (deltaTime < 1.0) return
    
    this.lastResourceTick = currentTime
    
    // Generate resources (floor to avoid floating point issues)
    if (this.goldPerSecond > 0 && gameInstance.gold !== undefined) {
      const goldGenerated = Math.floor(this.goldPerSecond * deltaTime)
      if (goldGenerated > 0) {
        gameInstance.gold += goldGenerated
        this.totalGoldGenerated += goldGenerated
        
        if (gameInstance.callbacks && gameInstance.callbacks.onGoldChange) {
          gameInstance.callbacks.onGoldChange(gameInstance.gold)
        }
      }
    }
    
    if (this.energyPerSecond > 0 && gameInstance.energy !== undefined) {
      const energyGenerated = this.energyPerSecond * deltaTime
      if (energyGenerated > 0) {
        const oldEnergy = gameInstance.energy
        gameInstance.energy = Math.min(
          gameInstance.maxEnergy || 100,
          gameInstance.energy + energyGenerated
        )
        this.totalEnergyGenerated += (gameInstance.energy - oldEnergy)
        
        if (gameInstance.callbacks && gameInstance.callbacks.onEnergyChange) {
          gameInstance.callbacks.onEnergyChange(gameInstance.energy, gameInstance.maxEnergy)
        }
      }
    }
  }
  
  // Animate the generator - FIXED: Efficient, non-blocking
  updateAnimation(deltaTime) {
    if (!this.mesh || this.isDestroyed) return
    
    this.animationTime += deltaTime
    
    if (this.generatorType === 'gold_mine') {
      // Rotate drill bit
      const bit = this.mesh.children.find(child => child.userData.isBit)
      if (bit) {
        bit.rotation.y += deltaTime * 5
      }
      
      // Pulse gold particles (only update a few per frame)
      let particleCount = 0
      this.mesh.children.forEach((child) => {
        if (child.userData.isParticle && particleCount < 2) {
          const pulse = Math.sin(this.animationTime * 3 + child.userData.particleIndex) * 0.3 + 0.7
          if (child.material) {
            child.material.opacity = pulse
            child.material.emissiveIntensity = pulse
          }
          particleCount++
        }
      })
    } else if (this.generatorType === 'energy_well') {
      // Rotate crystal
      const crystal = this.mesh.children.find(child => child.userData.isCrystal)
      if (crystal) {
        crystal.rotation.y += deltaTime * 1.5
        crystal.rotation.x += deltaTime * 0.8
      }
      
      // Pulse energy particles (limited updates)
      let particleCount = 0
      this.mesh.children.forEach((child) => {
        if (child.userData.isParticle && particleCount < 2) {
          const pulse = Math.sin(this.animationTime * 4 + child.userData.particleIndex) * 0.4 + 0.6
          if (child.material) {
            child.material.opacity = pulse
            child.material.emissiveIntensity = pulse * 1.5
          }
          particleCount++
        }
      })
    } else if (this.generatorType === 'hybrid_generator') {
      // Rotate both sides
      this.mesh.children.forEach((child) => {
        if (child.userData.isRotating) {
          child.rotation.y += deltaTime * 2
        }
      })
      
      // Pulse particles (limited updates)
      let particleCount = 0
      this.mesh.children.forEach((child) => {
        if (child.userData.isParticle && particleCount < 2) {
          const pulse = Math.sin(this.animationTime * 3 + child.userData.particleIndex) * 0.3 + 0.7
          if (child.material) {
            child.material.opacity = pulse
            child.material.emissiveIntensity = pulse
          }
          particleCount++
        }
      })
    }
  }
  
  getGeneratorType() {
    return this.generatorType
  }
  
  getStats() {
    return {
      goldPerSecond: this.goldPerSecond,
      energyPerSecond: this.energyPerSecond,
      totalGoldGenerated: Math.floor(this.totalGoldGenerated),
      totalEnergyGenerated: Math.floor(this.totalEnergyGenerated)
    }
  }
}

