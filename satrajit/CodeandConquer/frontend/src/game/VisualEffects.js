// =============================================================================
// ENHANCED VISUAL EFFECTS SYSTEM - Studio-Quality Animations & Effects
// =============================================================================
// Professional particle systems, elemental effects, combat feedback,
// frost auras, fire rings, screen shake, and immersive visual polish
// =============================================================================

import * as THREE from 'three'

export class VisualEffects {
  constructor(scene, camera = null) {
    this.scene = scene
    this.camera = camera
    this.activeEffects = []
    
    // Frost aura tracking (enemies being frozen)
    this.frostAuras = new Map()
    
    // Fire ring tracking (fire towers)
    this.fireRings = new Map()
    
    // Persistent effects (tower auras, etc.)
    this.persistentEffects = new Map()

    // Screen shake state
    this.screenShake = {
      active: false,
      intensity: 0,
      duration: 0,
      elapsed: 0,
      originalPosition: new THREE.Vector3(),
      originalRotation: new THREE.Euler()
    }

    // Damage vignette state
    this.damageVignette = {
      active: false,
      intensity: 0,
      fadeSpeed: 2.0
    }
    
    // Shared geometries for performance
    this.sharedGeometries = {
      particle: new THREE.SphereGeometry(0.1, 8, 8),
      ring: new THREE.TorusGeometry(1, 0.1, 8, 32),
      cone: new THREE.ConeGeometry(0.3, 1, 8),
      iceCrystal: new THREE.OctahedronGeometry(0.3, 0)
    }
  }

  setCamera(camera) {
    this.camera = camera
  }

  // ===========================================================================
  // FROST AURA SYSTEM - Persistent ice effect on frozen enemies
  // ===========================================================================

  createFrostAura(enemy, slowAmount = 0.3, duration = 2000) {
    // Remove existing frost aura if any
    this.removeFrostAura(enemy)
    
    const auraGroup = new THREE.Group()
    const enemyScale = enemy.scale || 1
    
    // Simple ice ring - optimized (fewer crystals)
    const crystalCount = 4
    const crystals = []
    
    // Reusable geometry and material
    const crystalGeom = new THREE.OctahedronGeometry(0.2 * enemyScale, 0)
    const crystalMat = new THREE.MeshBasicMaterial({
      color: 0x88ddff,
      transparent: true,
      opacity: 0.8
    })
    
    for (let i = 0; i < crystalCount; i++) {
      const crystal = new THREE.Mesh(crystalGeom, crystalMat.clone())
      const angle = (i / crystalCount) * Math.PI * 2
      crystal.position.set(
        Math.cos(angle) * 1 * enemyScale,
        0.5 * enemyScale,
        Math.sin(angle) * 1 * enemyScale
      )
      crystals.push(crystal)
      auraGroup.add(crystal)
    }
    
    // Simple ground ring
    const groundRingGeom = new THREE.RingGeometry(0.8 * enemyScale, 1.2 * enemyScale, 16)
    const groundRingMat = new THREE.MeshBasicMaterial({
      color: 0x44aaff,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    })
    const groundRing = new THREE.Mesh(groundRingGeom, groundRingMat)
    groundRing.rotation.x = -Math.PI / 2
    groundRing.position.y = 0.05
    auraGroup.add(groundRing)
    
    this.scene.add(auraGroup)
    
    const startTime = Date.now()
    
    const auraData = {
      group: auraGroup,
      crystals,
      groundRing,
      enemy,
      startTime,
      duration,
      update: (deltaTime) => {
        const elapsed = Date.now() - startTime
        
        if (!enemy.mesh || enemy.isDead || elapsed >= duration) {
          return false
        }
        
        // Follow enemy
        auraGroup.position.copy(enemy.mesh.position)
        
        // Simple rotation
        auraGroup.rotation.y += deltaTime * 2
        
        return true
      }
    }
    
    this.frostAuras.set(enemy.id, auraData)
    this.activeEffects.push(auraData)
    
    return auraData
  }
  
  removeFrostAura(enemy) {
    const aura = this.frostAuras.get(enemy.id)
    if (aura) {
      this.scene.remove(aura.group)
      aura.group.traverse(child => {
        if (child.geometry) child.geometry.dispose()
        if (child.material) child.material.dispose()
      })
      this.frostAuras.delete(enemy.id)
      
      // Remove from active effects
      const idx = this.activeEffects.indexOf(aura)
      if (idx > -1) this.activeEffects.splice(idx, 1)
    }
  }

  // ===========================================================================
  // FIRE RING SYSTEM - Persistent fire aura around fire towers
  // ===========================================================================

  createFireRing(tower, radius = 5) {
    this.removeFireRing(tower)
    
    const fireGroup = new THREE.Group()
    
    // Simple fire ring - optimized
    const ringGeom = new THREE.TorusGeometry(radius, 0.2, 8, 24)
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xff4400,
      transparent: true,
      opacity: 0.7
    })
    const ring = new THREE.Mesh(ringGeom, ringMat)
    ring.rotation.x = Math.PI / 2
    ring.position.y = 0.1
    fireGroup.add(ring)
    
    // Inner glow ring
    const innerRingGeom = new THREE.TorusGeometry(radius - 0.4, 0.15, 8, 24)
    const innerRingMat = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0.5
    })
    const innerRing = new THREE.Mesh(innerRingGeom, innerRingMat)
    innerRing.rotation.x = Math.PI / 2
    innerRing.position.y = 0.15
    fireGroup.add(innerRing)
    
    // Simplified fire particles - fewer for performance
    const particleCount = 30
    const particleGeom = new THREE.BufferGeometry()
    const positions = new Float32Array(particleCount * 3)
    const velocities = []
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2
      const r = radius - 0.3
      positions[i * 3] = Math.cos(angle) * r
      positions[i * 3 + 1] = Math.random() * 2
      positions[i * 3 + 2] = Math.sin(angle) * r
      
      velocities.push({
        y: 2 + Math.random() * 2,
        angle: angle
      })
    }
    
    particleGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    
    const particleMat = new THREE.PointsMaterial({
      color: 0xff6600,
      size: 0.4,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
    
    const particles = new THREE.Points(particleGeom, particleMat)
    fireGroup.add(particles)
    
    fireGroup.position.copy(tower.position)
    this.scene.add(fireGroup)
    
    const fireData = {
      group: fireGroup,
      ring,
      innerRing,
      particles,
      particleGeom,
      velocities,
      radius,
      tower,
      update: (deltaTime) => {
        if (!tower.mesh) return false
        
        // Rotate rings
        ring.rotation.z += deltaTime * 0.5
        innerRing.rotation.z -= deltaTime * 0.3
        
        // Simple particle animation
        const posArray = particleGeom.attributes.position.array
        for (let i = 0; i < particleCount; i++) {
          posArray[i * 3 + 1] += velocities[i].y * deltaTime
          
          if (posArray[i * 3 + 1] > 3) {
            posArray[i * 3 + 1] = 0
          }
        }
        particleGeom.attributes.position.needsUpdate = true
        
        return true
      }
    }
    
    this.fireRings.set(tower.id || tower, fireData)
    this.activeEffects.push(fireData)
    
    return fireData
  }
  
  removeFireRing(tower) {
    const id = tower.id || tower
    const fire = this.fireRings.get(id)
    if (fire) {
      this.scene.remove(fire.group)
      fire.group.traverse(child => {
        if (child.geometry) child.geometry.dispose()
        if (child.material) child.material.dispose()
      })
      this.fireRings.delete(id)
      
      const idx = this.activeEffects.indexOf(fire)
      if (idx > -1) this.activeEffects.splice(idx, 1)
    }
  }

  // ===========================================================================
  // ENEMY FREEZE VISUAL - Ice encasement effect
  // ===========================================================================

  createFreezeEffect(enemy, duration = 1000) {
    if (!enemy.mesh) return
    
    const scale = enemy.scale || 1
    
    // Ice shell around enemy
    const shellGeom = new THREE.IcosahedronGeometry(1.2 * scale, 1)
    const shellMat = new THREE.MeshPhysicalMaterial({
      color: 0x88ddff,
      emissive: 0x226699,
      emissiveIntensity: 0.3,
      metalness: 0.2,
      roughness: 0.1,
      transparent: true,
      opacity: 0.5,
      clearcoat: 1.0,
      side: THREE.DoubleSide
    })
    
    const shell = new THREE.Mesh(shellGeom, shellMat)
    shell.position.copy(enemy.mesh.position)
    shell.position.y += 0.8 * scale
    this.scene.add(shell)
    
    // Ice spikes
    const spikes = []
    for (let i = 0; i < 6; i++) {
      const spikeGeom = new THREE.ConeGeometry(0.15 * scale, 0.8 * scale, 4)
      const spikeMat = new THREE.MeshPhysicalMaterial({
        color: 0xaaeeff,
        emissive: 0x4488aa,
        emissiveIntensity: 0.4,
        transparent: true,
        opacity: 0.7,
        clearcoat: 1.0
      })
      
      const spike = new THREE.Mesh(spikeGeom, spikeMat)
      const angle = (i / 6) * Math.PI * 2
      spike.position.copy(enemy.mesh.position)
      spike.position.x += Math.cos(angle) * 1.0 * scale
      spike.position.z += Math.sin(angle) * 1.0 * scale
      spike.position.y += 0.4 * scale
      spike.rotation.z = (Math.random() - 0.5) * 0.5
      spike.rotation.x = (Math.random() - 0.5) * 0.3
      spikes.push(spike)
      this.scene.add(spike)
    }
    
    const startTime = Date.now()
    
    const effect = {
      type: 'freeze',
      shell,
      spikes,
      enemy,
      startTime,
      duration,
      update: (deltaTime) => {
        const elapsed = Date.now() - startTime
        const progress = elapsed / duration
        
        if (progress >= 1 || enemy.isDead) {
          this.scene.remove(shell)
          shellGeom.dispose()
          shellMat.dispose()
          spikes.forEach(spike => {
            this.scene.remove(spike)
            spike.geometry.dispose()
            spike.material.dispose()
          })
          return true
        }
        
        // Follow enemy
        if (enemy.mesh) {
          shell.position.copy(enemy.mesh.position)
          shell.position.y += 0.8 * scale
          
          spikes.forEach((spike, i) => {
            const angle = (i / 6) * Math.PI * 2
            spike.position.copy(enemy.mesh.position)
            spike.position.x += Math.cos(angle) * 1.0 * scale
            spike.position.z += Math.sin(angle) * 1.0 * scale
            spike.position.y += 0.4 * scale
          })
        }
        
        // Crack and fade at end
        if (progress > 0.7) {
          const fadeProgress = (progress - 0.7) / 0.3
          shellMat.opacity = 0.5 * (1 - fadeProgress)
          spikes.forEach(spike => {
            spike.material.opacity = 0.7 * (1 - fadeProgress)
          })
        }
        
        // Pulse effect
        const pulse = 1 + Math.sin(elapsed * 0.01) * 0.05
        shell.scale.setScalar(pulse)
        
        return false
      }
    }
    
    this.activeEffects.push(effect)
    return effect
  }

  // ===========================================================================
  // TOWER AURA EFFECTS
  // ===========================================================================

  createTowerAura(tower, options = {}) {
    const {
      color = 0x4488ff,
      radius = 3,
      pulseSpeed = 2,
      type = 'default'
    } = options
    
    const id = tower.id || `tower_${Date.now()}`
    this.removeTowerAura(tower)
    
    const auraGroup = new THREE.Group()
    
    // Base ring
    const ringGeom = new THREE.RingGeometry(radius - 0.3, radius, 32)
    const ringMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    })
    const ring = new THREE.Mesh(ringGeom, ringMat)
    ring.rotation.x = -Math.PI / 2
    ring.position.y = 0.1
    auraGroup.add(ring)
    
    // Particle ring
    const particleCount = 30
    const particleGeom = new THREE.BufferGeometry()
    const positions = new Float32Array(particleCount * 3)
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2
      positions[i * 3] = Math.cos(angle) * radius
      positions[i * 3 + 1] = 0.5 + Math.random() * 0.5
      positions[i * 3 + 2] = Math.sin(angle) * radius
    }
    
    particleGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    
    const particleMat = new THREE.PointsMaterial({
      color,
      size: 0.2,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    })
    
    const particles = new THREE.Points(particleGeom, particleMat)
    auraGroup.add(particles)
    
    auraGroup.position.copy(tower.position)
    this.scene.add(auraGroup)
    
    const startTime = Date.now()
    
    const auraData = {
      group: auraGroup,
      ring,
      particles,
      particleGeom,
      tower,
      radius,
      update: (deltaTime) => {
        if (!tower.mesh) return false
        
        const elapsed = Date.now() - startTime
        
        // Rotate particles
        particles.rotation.y += deltaTime * 0.5
        
        // Pulse ring
        const pulse = 1 + Math.sin(elapsed * 0.001 * pulseSpeed) * 0.1
        ring.scale.set(pulse, pulse, 1)
        ringMat.opacity = 0.2 + Math.sin(elapsed * 0.002 * pulseSpeed) * 0.1
        
        // Animate particle heights
        const posArray = particleGeom.attributes.position.array
        for (let i = 0; i < particleCount; i++) {
          posArray[i * 3 + 1] = 0.5 + Math.sin(elapsed * 0.003 + i) * 0.3
        }
        particleGeom.attributes.position.needsUpdate = true
        
        return true
      }
    }
    
    this.persistentEffects.set(id, auraData)
    this.activeEffects.push(auraData)
    
    return auraData
  }
  
  removeTowerAura(tower) {
    const id = tower.id || tower
    const aura = this.persistentEffects.get(id)
    if (aura) {
      this.scene.remove(aura.group)
      aura.group.traverse(child => {
        if (child.geometry) child.geometry.dispose()
        if (child.material) child.material.dispose()
      })
      this.persistentEffects.delete(id)
      
      const idx = this.activeEffects.indexOf(aura)
      if (idx > -1) this.activeEffects.splice(idx, 1)
    }
  }

  // ===========================================================================
  // EXPLOSION & COMBAT EFFECTS
  // ===========================================================================
  
  createExplosion(position, options = {}) {
    const {
      numParticles = 100,
      color = 0xff6600,
      maxDist = 12,
      size = 0.5,
      duration = 1000
    } = options
    
    const particlesGeometry = new THREE.BufferGeometry()
    const positions = new Float32Array(numParticles * 3)
    const colors = new Float32Array(numParticles * 3)
    const velocities = []
    
    const baseColor = new THREE.Color(color)
    
    for (let i = 0; i < numParticles * 3; i += 3) {
      positions[i] = position.x
      positions[i + 1] = position.y
      positions[i + 2] = position.z
      
      // Color variation
      const colorVar = 0.8 + Math.random() * 0.4
      colors[i] = Math.min(1, baseColor.r * colorVar)
      colors[i + 1] = Math.min(1, baseColor.g * colorVar)
      colors[i + 2] = Math.min(1, baseColor.b * colorVar)
      
      velocities.push({
        x: (Math.random() - 0.5) * 2,
        y: (Math.random() - 0.5) * 2 + 0.5,
        z: (Math.random() - 0.5) * 2
      })
    }
    
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    
    const particleMaterial = new THREE.PointsMaterial({
      size,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
    
    const particleSystem = new THREE.Points(particlesGeometry, particleMaterial)
    this.scene.add(particleSystem)
    
    // Flash light
    const flash = new THREE.PointLight(color, 3, maxDist * 2)
    flash.position.copy(position)
    this.scene.add(flash)
    
    const startTime = Date.now()
    
    const effect = {
      type: 'explosion',
      particles: particleSystem,
      flash,
      velocities,
      startTime,
      duration,
      maxDist,
      update: (deltaTime) => {
        const elapsed = Date.now() - startTime
        const progress = elapsed / duration
        
        if (progress >= 1) {
          this.scene.remove(particleSystem)
          this.scene.remove(flash)
          particlesGeometry.dispose()
          particleMaterial.dispose()
          return true
        }
        
        const posArray = particlesGeometry.attributes.position.array
        for (let i = 0; i < numParticles; i++) {
          posArray[i * 3] += velocities[i].x * deltaTime * 20
          posArray[i * 3 + 1] += velocities[i].y * deltaTime * 20
          posArray[i * 3 + 2] += velocities[i].z * deltaTime * 20
          
          // Gravity
          velocities[i].y -= deltaTime * 10
        }
        particlesGeometry.attributes.position.needsUpdate = true
        
        particleMaterial.opacity = 0.8 * (1 - progress)
        flash.intensity = 3 * (1 - progress)
        
        return false
      }
    }
    
    this.activeEffects.push(effect)
    return effect
  }
  
  createLightning(source, target, options = {}) {
    const {
      color = 0xaaaaff,
      duration = 200,
      segments = 20,
      displacement = 3,
      branches = 2
    } = options
    
    const lightningGroup = new THREE.Group()
    
    // Main bolt
    const mainPoints = this.generateLightningPoints(source, target, segments, displacement)
    const mainGeom = new THREE.BufferGeometry().setFromPoints(mainPoints)
    const mainMat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 1,
      linewidth: 2
    })
    const mainBolt = new THREE.Line(mainGeom, mainMat)
    lightningGroup.add(mainBolt)
    
    // Branch bolts
    for (let b = 0; b < branches; b++) {
      const branchStart = mainPoints[Math.floor(mainPoints.length * 0.3 + Math.random() * 0.4)]
      const branchEnd = new THREE.Vector3(
        branchStart.x + (Math.random() - 0.5) * 5,
        branchStart.y + (Math.random() - 0.5) * 3,
        branchStart.z + (Math.random() - 0.5) * 5
      )
      
      const branchPoints = this.generateLightningPoints(branchStart, branchEnd, 8, displacement * 0.5)
      const branchGeom = new THREE.BufferGeometry().setFromPoints(branchPoints)
      const branchMat = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.6
      })
      const branchBolt = new THREE.Line(branchGeom, branchMat)
      lightningGroup.add(branchBolt)
    }
    
    this.scene.add(lightningGroup)
    
    // Impact flash
    const flash = new THREE.PointLight(color, 2, 10)
    flash.position.copy(target)
    this.scene.add(flash)
    
    const startTime = Date.now()
    
    const effect = {
      type: 'lightning',
      mesh: lightningGroup,
      flash,
      startTime,
      duration,
      source,
      target,
      update: () => {
        const elapsed = Date.now() - startTime
        const progress = elapsed / duration
        
        if (progress >= 1) {
          this.scene.remove(lightningGroup)
          this.scene.remove(flash)
          lightningGroup.traverse(child => {
            if (child.geometry) child.geometry.dispose()
            if (child.material) child.material.dispose()
          })
          return true
        }
        
        // Flicker
        const flicker = Math.random() > 0.5 ? 1 : 0.5
        lightningGroup.traverse(child => {
          if (child.material) child.material.opacity = flicker * (1 - progress)
        })
        
        flash.intensity = 2 * (1 - progress) * flicker
        
        return false
      }
    }
    
    this.activeEffects.push(effect)
    return lightningGroup
  }
  
  generateLightningPoints(source, target, segments, displacement) {
    const points = []
    const direction = new THREE.Vector3().subVectors(target, source)
    
    const up = new THREE.Vector3(0, 1, 0)
    const right = new THREE.Vector3().crossVectors(direction.clone().normalize(), up).normalize()
    const perpUp = new THREE.Vector3().crossVectors(right, direction.clone().normalize()).normalize()
    
    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      const point = new THREE.Vector3().lerpVectors(source, target, t)
      
      const displaceFactor = Math.sin(t * Math.PI)
      if (i > 0 && i < segments) {
        const randX = (Math.random() - 0.5) * displacement * displaceFactor
        const randY = (Math.random() - 0.5) * displacement * displaceFactor
        point.add(right.clone().multiplyScalar(randX))
        point.add(perpUp.clone().multiplyScalar(randY))
      }
      
      points.push(point)
    }
    
    return points
  }

  // ===========================================================================
  // PROJECTILE & TRAIL EFFECTS
  // ===========================================================================
  
  createProjectileTrail(projectileMesh, options = {}) {
    const {
      color = 0xff3333,
      length = 10,
      width = 0.1
    } = options
    
    const trailPositions = []
    for (let i = 0; i < length; i++) {
      trailPositions.push(projectileMesh.position.clone())
    }
    
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(length * 3)
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    
    const material = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.6
    })
    
    const trail = new THREE.Line(geometry, material)
    this.scene.add(trail)
    
    const effect = {
      type: 'trail',
      mesh: trail,
      trailPositions,
      projectileMesh,
      update: () => {
        trailPositions.pop()
        trailPositions.unshift(projectileMesh.position.clone())
        
        const posArray = geometry.attributes.position.array
        trailPositions.forEach((pos, i) => {
          posArray[i * 3] = pos.x
          posArray[i * 3 + 1] = pos.y
          posArray[i * 3 + 2] = pos.z
        })
        geometry.attributes.position.needsUpdate = true
        
        return false
      },
      destroy: () => {
        this.scene.remove(trail)
        geometry.dispose()
        material.dispose()
      }
    }
    
    this.activeEffects.push(effect)
    return effect
  }
  
  createMuzzleFlash(position, direction, options = {}) {
    const {
      color = 0xff6600,
      size = 1,
      duration = 100
    } = options
    
    const flashGeometry = new THREE.ConeGeometry(size * 0.3, size, 6)
    const flashMaterial = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.9
    })
    
    const flash = new THREE.Mesh(flashGeometry, flashMaterial)
    flash.position.copy(position)
    flash.lookAt(position.clone().add(direction))
    flash.rotation.x += Math.PI / 2
    
    this.scene.add(flash)
    
    // Point light
    const light = new THREE.PointLight(color, 2, 10)
    light.position.copy(position)
    this.scene.add(light)
    
    const startTime = Date.now()
    
    const effect = {
      type: 'muzzleFlash',
      mesh: flash,
      light,
      startTime,
      duration,
      update: () => {
        const elapsed = Date.now() - startTime
        const progress = elapsed / duration
        
        if (progress >= 1) {
          this.scene.remove(flash)
          this.scene.remove(light)
          flashGeometry.dispose()
          flashMaterial.dispose()
          return true
        }
        
        flashMaterial.opacity = 0.9 * (1 - progress)
        flash.scale.setScalar(1 + progress)
        light.intensity = 2 * (1 - progress)
        
        return false
      }
    }
    
    this.activeEffects.push(effect)
    return effect
  }

  // ===========================================================================
  // FROST IMPACT EFFECT (When frost projectile hits)
  // ===========================================================================
  
  createFrostEffect(position, radius, options = {}) {
    const {
      color = 0x88ddff,
      duration = 500
    } = options
    
    // Expanding frost ring
    const ringGeometry = new THREE.TorusGeometry(radius * 0.5, 0.15, 8, 32)
    const ringMaterial = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending
    })
    
    const ring = new THREE.Mesh(ringGeometry, ringMaterial)
    ring.position.copy(position)
    ring.rotation.x = Math.PI / 2
    this.scene.add(ring)
    
    // Ice crystals burst
    const crystalCount = 12
    const crystals = []
    
    for (let i = 0; i < crystalCount; i++) {
      const crystalGeom = new THREE.OctahedronGeometry(0.2, 0)
      const crystalMat = new THREE.MeshBasicMaterial({
        color: 0xaaeeff,
        transparent: true,
        opacity: 0.8
      })
      
      const crystal = new THREE.Mesh(crystalGeom, crystalMat)
      const angle = (i / crystalCount) * Math.PI * 2
      crystal.position.copy(position)
      crystal.velocity = {
        x: Math.cos(angle) * 5,
        y: 3 + Math.random() * 2,
        z: Math.sin(angle) * 5
      }
      crystals.push(crystal)
      this.scene.add(crystal)
    }
    
    const startTime = Date.now()
    
    const effect = {
      type: 'frost',
      mesh: ring,
      crystals,
      startTime,
      duration,
      update: (deltaTime) => {
        const elapsed = Date.now() - startTime
        const progress = elapsed / duration
        
        if (progress >= 1) {
          this.scene.remove(ring)
          ringGeometry.dispose()
          ringMaterial.dispose()
          crystals.forEach(c => {
            this.scene.remove(c)
            c.geometry.dispose()
            c.material.dispose()
          })
          return true
        }
        
        // Expand ring
        ring.scale.setScalar(1 + progress * 2)
        ringMaterial.opacity = 0.7 * (1 - progress)
        
        // Animate crystals
        crystals.forEach(crystal => {
          crystal.position.x += crystal.velocity.x * deltaTime
          crystal.position.y += crystal.velocity.y * deltaTime
          crystal.position.z += crystal.velocity.z * deltaTime
          crystal.velocity.y -= 15 * deltaTime
          crystal.rotation.x += deltaTime * 5
          crystal.rotation.y += deltaTime * 3
          crystal.material.opacity = 0.8 * (1 - progress)
        })
        
        return false
      }
    }
    
    this.activeEffects.push(effect)
    return effect
  }
  
  // Fire effect on enemy
  createFireEffect(enemy, duration) {
    const particleCount = 30
    const particlesGeometry = new THREE.BufferGeometry()
    const positions = new Float32Array(particleCount * 3)
    const colors = new Float32Array(particleCount * 3)
    
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    
    const material = new THREE.PointsMaterial({
      size: 0.4,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    })
    
    const particles = new THREE.Points(particlesGeometry, material)
    this.scene.add(particles)
    
    const startTime = Date.now()
    
    const effect = {
      type: 'fire',
      mesh: particles,
      enemy,
      startTime,
      duration,
      update: (deltaTime) => {
        const elapsed = Date.now() - startTime
        if (elapsed >= duration || !enemy.mesh || enemy.isDead) {
          this.scene.remove(particles)
          particlesGeometry.dispose()
          material.dispose()
          return true
        }
        
        const posArray = particlesGeometry.attributes.position.array
        const colorArray = particlesGeometry.attributes.color.array
        
        for (let i = 0; i < particleCount; i++) {
          posArray[i * 3] = enemy.mesh.position.x + (Math.random() - 0.5) * 1.5
          posArray[i * 3 + 1] = enemy.mesh.position.y + Math.random() * 2.5
          posArray[i * 3 + 2] = enemy.mesh.position.z + (Math.random() - 0.5) * 1.5
          
          // Color gradient
          const t = Math.random()
          colorArray[i * 3] = 1.0
          colorArray[i * 3 + 1] = 0.2 + t * 0.5
          colorArray[i * 3 + 2] = t * 0.1
        }
        
        particlesGeometry.attributes.position.needsUpdate = true
        particlesGeometry.attributes.color.needsUpdate = true
        
        return false
      }
    }
    
    this.activeEffects.push(effect)
    return effect
  }

  // ===========================================================================
  // SCREEN EFFECTS
  // ===========================================================================

  triggerScreenShake(intensity = 1.0, duration = 300) {
    if (!this.camera) return

    this.screenShake.active = true
    this.screenShake.intensity = intensity
    this.screenShake.duration = duration
    this.screenShake.elapsed = 0
    this.screenShake.originalPosition.copy(this.camera.position)
    this.screenShake.originalRotation.copy(this.camera.rotation)
  }

  triggerDamageVignette(intensity = 0.5) {
    this.damageVignette.active = true
    this.damageVignette.intensity = Math.min(1.0, this.damageVignette.intensity + intensity)
  }

  // ===========================================================================
  // IMPACT & COMBAT FEEDBACK
  // ===========================================================================

  createImpactSparks(position, direction, options = {}) {
    const {
      count = 20,
      color = 0xffaa00,
      speed = 15,
      size = 0.2,
      duration = 400
    } = options

    const particlesGeometry = new THREE.BufferGeometry()
    const positions = new Float32Array(count * 3)
    const velocities = []

    const dir = new THREE.Vector3(direction.x, direction.y, direction.z).normalize()

    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x
      positions[i * 3 + 1] = position.y
      positions[i * 3 + 2] = position.z

      const theta = Math.random() * Math.PI
      const phi = Math.random() * Math.PI * 2
      const spreadX = Math.sin(theta) * Math.cos(phi)
      const spreadY = Math.abs(Math.sin(theta) * Math.sin(phi))
      const spreadZ = Math.cos(theta)

      velocities.push({
        x: (-dir.x + spreadX * 0.5) * speed,
        y: (-dir.y + spreadY * 0.5) * speed + 5,
        z: (-dir.z + spreadZ * 0.5) * speed
      })
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

    const material = new THREE.PointsMaterial({
      color,
      size,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })

    const particles = new THREE.Points(particlesGeometry, material)
    this.scene.add(particles)

    const startTime = Date.now()
    const gravity = -20

    const effect = {
      type: 'impact_sparks',
      particles,
      velocities,
      startTime,
      duration,
      update: (deltaTime) => {
        const elapsed = Date.now() - startTime
        const progress = elapsed / duration

        if (progress >= 1) {
          this.scene.remove(particles)
          particlesGeometry.dispose()
          material.dispose()
          return true
        }

        const posArray = particlesGeometry.attributes.position.array
        for (let i = 0; i < count; i++) {
          velocities[i].y += gravity * deltaTime
          posArray[i * 3] += velocities[i].x * deltaTime
          posArray[i * 3 + 1] += velocities[i].y * deltaTime
          posArray[i * 3 + 2] += velocities[i].z * deltaTime
        }
        particlesGeometry.attributes.position.needsUpdate = true

        material.opacity = 1.0 * (1 - progress)

        return false
      }
    }

    this.activeEffects.push(effect)
    return effect
  }

  createShockwave(position, options = {}) {
    const {
      maxRadius = 15,
      color = 0xff6600,
      duration = 800,
      thickness = 0.3
    } = options

    const ringGeometry = new THREE.TorusGeometry(1, thickness, 8, 32)
    const ringMaterial = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    })

    const ring = new THREE.Mesh(ringGeometry, ringMaterial)
    ring.position.copy(position)
    ring.position.y = 0.5
    ring.rotation.x = Math.PI / 2

    this.scene.add(ring)

    const startTime = Date.now()

    const effect = {
      type: 'shockwave',
      mesh: ring,
      startTime,
      duration,
      maxRadius,
      update: () => {
        const elapsed = Date.now() - startTime
        const progress = elapsed / duration

        if (progress >= 1) {
          this.scene.remove(ring)
          ringGeometry.dispose()
          ringMaterial.dispose()
          return true
        }

        const currentRadius = 1 + (maxRadius - 1) * progress
        ring.scale.set(currentRadius, currentRadius, 1)
        ringMaterial.opacity = 0.8 * (1 - progress)

        return false
      }
    }

    this.activeEffects.push(effect)
    return effect
  }

  createDamageNumber(position, damage, options = {}) {
    const {
      color = 0xff0000,
      size = 1.0,
      duration = 1000,
      isCritical = false
    } = options

    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    canvas.width = 128
    canvas.height = 64

    context.font = isCritical ? 'bold 48px Arial' : 'bold 32px Arial'
    context.fillStyle = isCritical ? '#ffff00' : `#${color.toString(16).padStart(6, '0')}`
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    
    const text = typeof damage === 'number' ? Math.round(damage).toString() : damage
    context.fillText(text, 64, 32)

    context.strokeStyle = '#000000'
    context.lineWidth = 3
    context.strokeText(text, 64, 32)

    const texture = new THREE.CanvasTexture(canvas)
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 1.0,
      depthWrite: false
    })

    const sprite = new THREE.Sprite(material)
    sprite.position.copy(position)
    sprite.position.y += 2
    sprite.scale.set(size * 2, size, 1)

    this.scene.add(sprite)

    const startTime = Date.now()
    const startY = sprite.position.y

    const effect = {
      type: 'damage_number',
      mesh: sprite,
      startTime,
      duration,
      startY,
      update: () => {
        const elapsed = Date.now() - startTime
        const progress = elapsed / duration

        if (progress >= 1) {
          this.scene.remove(sprite)
          material.dispose()
          texture.dispose()
          return true
        }

        sprite.position.y = startY + progress * 3
        material.opacity = 1.0 * (1 - progress)

        return false
      }
    }

    this.activeEffects.push(effect)
    return effect
  }

  createBloodSplatter(position, options = {}) {
    const {
      count = 30,
      color = 0x8b0000,
      size = 0.3,
      duration = 600
    } = options

    const particlesGeometry = new THREE.BufferGeometry()
    const positions = new Float32Array(count * 3)
    const velocities = []

    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x
      positions[i * 3 + 1] = position.y
      positions[i * 3 + 2] = position.z

      velocities.push({
        x: (Math.random() - 0.5) * 15,
        y: Math.random() * 10,
        z: (Math.random() - 0.5) * 15
      })
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

    const material = new THREE.PointsMaterial({
      color,
      size,
      transparent: true,
      opacity: 0.8
    })

    const particles = new THREE.Points(particlesGeometry, material)
    this.scene.add(particles)

    const startTime = Date.now()
    const gravity = -25

    const effect = {
      type: 'blood_splatter',
      particles,
      velocities,
      startTime,
      duration,
      update: (deltaTime) => {
        const elapsed = Date.now() - startTime
        const progress = elapsed / duration

        if (progress >= 1) {
          this.scene.remove(particles)
          particlesGeometry.dispose()
          material.dispose()
          return true
        }

        const posArray = particlesGeometry.attributes.position.array
        for (let i = 0; i < count; i++) {
          velocities[i].y += gravity * deltaTime

          posArray[i * 3] += velocities[i].x * deltaTime
          posArray[i * 3 + 1] += velocities[i].y * deltaTime
          posArray[i * 3 + 2] += velocities[i].z * deltaTime

          if (posArray[i * 3 + 1] < 0) {
            posArray[i * 3 + 1] = 0
            velocities[i].x *= 0.5
            velocities[i].y = 0
            velocities[i].z *= 0.5
          }
        }
        particlesGeometry.attributes.position.needsUpdate = true

        material.opacity = 0.8 * (1 - progress * 0.5)

        return false
      }
    }

    this.activeEffects.push(effect)
    return effect
  }

  // ===========================================================================
  // BUILD EFFECTS
  // ===========================================================================

  createBuildEffect(position, options = {}) {
    const {
      particleCount = 30,
      dustColor = 0x8b7355,
      glowColor = 0x44ff44,
      duration = 800
    } = options

    const particlesGeometry = new THREE.BufferGeometry()
    const positions = new Float32Array(particleCount * 3)
    const velocities = []

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2
      const radius = Math.random() * 2
      positions[i * 3] = position.x + Math.cos(angle) * radius
      positions[i * 3 + 1] = position.y + 0.1
      positions[i * 3 + 2] = position.z + Math.sin(angle) * radius

      velocities.push({
        x: Math.cos(angle) * 3,
        y: 5 + Math.random() * 3,
        z: Math.sin(angle) * 3
      })
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

    const particlesMaterial = new THREE.PointsMaterial({
      color: dustColor,
      size: 0.4,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })

    const particles = new THREE.Points(particlesGeometry, particlesMaterial)
    this.scene.add(particles)

    const ringGeometry = new THREE.RingGeometry(1, 2, 32)
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: glowColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    })
    const ring = new THREE.Mesh(ringGeometry, ringMaterial)
    ring.position.copy(position)
    ring.position.y += 0.1
    ring.rotation.x = -Math.PI / 2
    this.scene.add(ring)

    const startTime = Date.now()
    const gravity = -9.8

    this.activeEffects.push({
      mesh: particles,
      update: (deltaTime) => {
        const elapsed = Date.now() - startTime
        const progress = elapsed / duration

        if (progress >= 1) {
          this.scene.remove(particles)
          this.scene.remove(ring)
          particlesGeometry.dispose()
          particlesMaterial.dispose()
          ringGeometry.dispose()
          ringMaterial.dispose()
          return true
        }

        const posArray = particlesGeometry.attributes.position.array
        for (let i = 0; i < particleCount; i++) {
          velocities[i].y += gravity * deltaTime
          posArray[i * 3] += velocities[i].x * deltaTime
          posArray[i * 3 + 1] += velocities[i].y * deltaTime
          posArray[i * 3 + 2] += velocities[i].z * deltaTime
        }
        particlesGeometry.attributes.position.needsUpdate = true

        particlesMaterial.opacity = 0.8 * (1 - progress)
        ring.scale.setScalar(1 + progress * 2)
        ringMaterial.opacity = 0.6 * (1 - progress)

        return false
      }
    })
  }

  createUpgradeEffect(position, options = {}) {
    const {
      particleCount = 40,
      color = 0xffdd00,
      burstSpeed = 10,
      duration = 1000
    } = options

    const particlesGeometry = new THREE.BufferGeometry()
    const positions = new Float32Array(particleCount * 3)
    const velocities = []

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = position.x
      positions[i * 3 + 1] = position.y + 2
      positions[i * 3 + 2] = position.z

      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI
      velocities.push({
        x: Math.sin(phi) * Math.cos(theta) * burstSpeed,
        y: Math.sin(phi) * Math.sin(theta) * burstSpeed,
        z: Math.cos(phi) * burstSpeed
      })
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

    const particlesMaterial = new THREE.PointsMaterial({
      color: color,
      size: 0.5,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })

    const particles = new THREE.Points(particlesGeometry, particlesMaterial)
    this.scene.add(particles)

    const flashGeometry = new THREE.RingGeometry(0.5, 1.5, 32)
    const flashMaterial = new THREE.MeshBasicMaterial({
      color: color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending
    })
    const flash = new THREE.Mesh(flashGeometry, flashMaterial)
    flash.position.copy(position)
    flash.position.y += 2
    flash.rotation.x = -Math.PI / 2
    this.scene.add(flash)

    const startTime = Date.now()

    this.activeEffects.push({
      mesh: particles,
      update: (deltaTime) => {
        const elapsed = Date.now() - startTime
        const progress = elapsed / duration

        if (progress >= 1) {
          this.scene.remove(particles)
          this.scene.remove(flash)
          particlesGeometry.dispose()
          particlesMaterial.dispose()
          flashGeometry.dispose()
          flashMaterial.dispose()
          return true
        }

        const posArray = particlesGeometry.attributes.position.array
        for (let i = 0; i < particleCount; i++) {
          posArray[i * 3] += velocities[i].x * deltaTime
          posArray[i * 3 + 1] += velocities[i].y * deltaTime
          posArray[i * 3 + 2] += velocities[i].z * deltaTime
        }
        particlesGeometry.attributes.position.needsUpdate = true

        particlesMaterial.opacity = 1.0 - progress
        flash.scale.setScalar(1 + progress * 3)
        flashMaterial.opacity = 1.0 - progress

        return false
      }
    })
  }

  // ===========================================================================
  // UPDATE LOOP
  // ===========================================================================

  update(deltaTime) {
    // Screen shake
    if (this.screenShake.active && this.camera) {
      this.screenShake.elapsed += deltaTime * 1000

      if (this.screenShake.elapsed >= this.screenShake.duration) {
        this.camera.position.copy(this.screenShake.originalPosition)
        this.camera.rotation.copy(this.screenShake.originalRotation)
        this.screenShake.active = false
      } else {
        const progress = this.screenShake.elapsed / this.screenShake.duration
        const intensity = this.screenShake.intensity * (1 - progress)

        const shakeX = (Math.random() - 0.5) * intensity * 2
        const shakeY = (Math.random() - 0.5) * intensity * 2
        const shakeZ = (Math.random() - 0.5) * intensity * 2

        this.camera.position.copy(this.screenShake.originalPosition)
        this.camera.position.x += shakeX
        this.camera.position.y += shakeY
        this.camera.position.z += shakeZ

        const shakeRotation = (Math.random() - 0.5) * intensity * 0.02
        this.camera.rotation.copy(this.screenShake.originalRotation)
        this.camera.rotation.z += shakeRotation
      }
    }

    // Damage vignette fade
    if (this.damageVignette.active) {
      this.damageVignette.intensity -= this.damageVignette.fadeSpeed * deltaTime
      if (this.damageVignette.intensity <= 0) {
        this.damageVignette.intensity = 0
        this.damageVignette.active = false
      }
    }

    // Update all effects
    for (let i = this.activeEffects.length - 1; i >= 0; i--) {
      const effect = this.activeEffects[i]
      const result = effect.update(deltaTime)

      // Remove completed effects (return true = keep, false/true based on type)
      if (result === true && effect.type !== 'trail') {
        this.activeEffects.splice(i, 1)
      } else if (result === false && (
        effect.type === 'frostAura' || 
        effect.type === 'fireRing' || 
        effect.type === 'towerAura'
      )) {
        this.activeEffects.splice(i, 1)
      }
    }
  }

  getDamageVignetteIntensity() {
    return this.damageVignette.intensity
  }
  
  destroy() {
    // Clean up all effects
    this.activeEffects.forEach(effect => {
      if (effect.mesh) {
        this.scene.remove(effect.mesh)
        if (effect.mesh.geometry) effect.mesh.geometry.dispose()
        if (effect.mesh.material) {
          if (Array.isArray(effect.mesh.material)) {
            effect.mesh.material.forEach(m => m.dispose())
          } else {
            effect.mesh.material.dispose()
          }
        }
      }
      if (effect.group) {
        this.scene.remove(effect.group)
        effect.group.traverse(child => {
          if (child.geometry) child.geometry.dispose()
          if (child.material) child.material.dispose()
        })
      }
    })
    
    this.activeEffects = []
    this.frostAuras.clear()
    this.fireRings.clear()
    this.persistentEffects.clear()
    
    // Dispose shared geometries
    Object.values(this.sharedGeometries).forEach(geom => geom.dispose())
  }
}
