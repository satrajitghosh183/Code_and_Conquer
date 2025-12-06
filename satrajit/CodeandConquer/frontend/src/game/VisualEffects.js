// Enhanced Visual Effects System
// Particle explosions, lightning, projectile trails, combat feedback
// Phase 2 enhancements: Screen shake, impact effects, element particles

import * as THREE from 'three'

export class VisualEffects {
  constructor(scene, camera = null) {
    this.scene = scene
    this.camera = camera
    this.activeEffects = []

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
  }

  // Set camera for screen effects
  setCamera(camera) {
    this.camera = camera
  }
  
  // Create particle explosion
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
    const velocities = []
    
    for (let i = 0; i < numParticles * 3; i += 3) {
      positions[i] = position.x
      positions[i + 1] = position.y
      positions[i + 2] = position.z
      
      velocities.push({
        x: (Math.random() - 0.5) * 2,
        y: (Math.random() - 0.5) * 2,
        z: (Math.random() - 0.5) * 2
      })
    }
    
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    
    const particleMaterial = new THREE.PointsMaterial({
      color,
      size,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
    
    const particleSystem = new THREE.Points(particlesGeometry, particleMaterial)
    this.scene.add(particleSystem)
    
    const startTime = Date.now()
    
    const effect = {
      type: 'explosion',
      particles: particleSystem,
      velocities,
      startTime,
      duration,
      maxDist,
      update: (deltaTime) => {
        const elapsed = Date.now() - startTime
        const progress = elapsed / duration
        
        if (progress >= 1) {
          this.scene.remove(particleSystem)
          particlesGeometry.dispose()
          particleMaterial.dispose()
          return true // Remove effect
        }
        
        const posArray = particlesGeometry.attributes.position.array
        for (let i = 0; i < numParticles; i++) {
          posArray[i * 3] += velocities[i].x * deltaTime * 20
          posArray[i * 3 + 1] += velocities[i].y * deltaTime * 20
          posArray[i * 3 + 2] += velocities[i].z * deltaTime * 20
        }
        particlesGeometry.attributes.position.needsUpdate = true
        
        particleMaterial.opacity = 0.8 * (1 - progress)
        
        return false
      }
    }
    
    this.activeEffects.push(effect)
    return effect
  }
  
  // Create lightning effect
  createLightning(source, target, options = {}) {
    const {
      color = 0xaaaaff,
      duration = 200,
      segments = 20,
      displacement = 3
    } = options
    
    const geometry = new THREE.BufferGeometry()
    const points = this.generateLightningPoints(source, target, segments, displacement)
    
    const positions = new Float32Array(points.length * 3)
    points.forEach((point, i) => {
      positions[i * 3] = point.x
      positions[i * 3 + 1] = point.y
      positions[i * 3 + 2] = point.z
    })
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    
    const material = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 1,
      linewidth: 2
    })
    
    const lightning = new THREE.Line(geometry, material)
    this.scene.add(lightning)
    
    const startTime = Date.now()
    
    const effect = {
      type: 'lightning',
      mesh: lightning,
      startTime,
      duration,
      source,
      target,
      update: () => {
        const elapsed = Date.now() - startTime
        const progress = elapsed / duration
        
        if (progress >= 1) {
          this.scene.remove(lightning)
          geometry.dispose()
          material.dispose()
          return true
        }
        
        // Flicker and regenerate points
        if (Math.random() > 0.7) {
          const newPoints = this.generateLightningPoints(source, target, segments, displacement)
          const posArray = geometry.attributes.position.array
          newPoints.forEach((point, i) => {
            posArray[i * 3] = point.x
            posArray[i * 3 + 1] = point.y
            posArray[i * 3 + 2] = point.z
          })
          geometry.attributes.position.needsUpdate = true
        }
        
        material.opacity = 1 - progress
        
        return false
      }
    }
    
    this.activeEffects.push(effect)
    return lightning
  }
  
  generateLightningPoints(source, target, segments, displacement) {
    const points = []
    const direction = new THREE.Vector3().subVectors(target, source)
    const length = direction.length()
    direction.normalize()
    
    // Get perpendicular vectors for displacement
    const up = new THREE.Vector3(0, 1, 0)
    const right = new THREE.Vector3().crossVectors(direction, up).normalize()
    const perpUp = new THREE.Vector3().crossVectors(right, direction).normalize()
    
    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      const point = new THREE.Vector3().lerpVectors(source, target, t)
      
      // Add random displacement (less at start and end)
      const displaceFactor = Math.sin(t * Math.PI) // Max in middle
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
  
  // Create projectile trail
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
        // Shift positions and add new one
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
  
  // Create muzzle flash
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
    
    // Point flash in direction
    flash.lookAt(position.clone().add(direction))
    flash.rotation.x += Math.PI / 2
    
    this.scene.add(flash)
    
    const startTime = Date.now()
    
    const effect = {
      type: 'muzzleFlash',
      mesh: flash,
      startTime,
      duration,
      update: () => {
        const elapsed = Date.now() - startTime
        const progress = elapsed / duration
        
        if (progress >= 1) {
          this.scene.remove(flash)
          flashGeometry.dispose()
          flashMaterial.dispose()
          return true
        }
        
        flashMaterial.opacity = 0.9 * (1 - progress)
        flash.scale.setScalar(1 + progress)
        
        return false
      }
    }
    
    this.activeEffects.push(effect)
    return effect
  }
  
  // Create frost effect
  createFrostEffect(position, radius, options = {}) {
    const {
      color = 0x88ddff,
      duration = 500
    } = options
    
    const ringGeometry = new THREE.TorusGeometry(radius, 0.1, 8, 32)
    const ringMaterial = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.6
    })
    
    const ring = new THREE.Mesh(ringGeometry, ringMaterial)
    ring.position.copy(position)
    ring.rotation.x = Math.PI / 2
    
    this.scene.add(ring)
    
    const startTime = Date.now()
    
    const effect = {
      type: 'frost',
      mesh: ring,
      startTime,
      duration,
      update: () => {
        const elapsed = Date.now() - startTime
        const progress = elapsed / duration
        
        if (progress >= 1) {
          this.scene.remove(ring)
          ringGeometry.dispose()
          ringMaterial.dispose()
          return true
        }
        
        ring.scale.setScalar(1 + progress * 0.5)
        ringMaterial.opacity = 0.6 * (1 - progress)
        
        return false
      }
    }
    
    this.activeEffects.push(effect)
    return effect
  }
  
  // Create fire effect (DOT visual)
  createFireEffect(enemy, duration) {
    const particleCount = 20
    const particlesGeometry = new THREE.BufferGeometry()
    const positions = new Float32Array(particleCount * 3)
    
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    
    const material = new THREE.PointsMaterial({
      color: 0xff6600,
      size: 0.3,
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
      update: () => {
        const elapsed = Date.now() - startTime
        if (elapsed >= duration || !enemy.mesh) {
          this.scene.remove(particles)
          particlesGeometry.dispose()
          material.dispose()
          return true
        }
        
        // Update particle positions around enemy
        const posArray = particlesGeometry.attributes.position.array
        for (let i = 0; i < particleCount * 3; i += 3) {
          posArray[i] = enemy.mesh.position.x + (Math.random() - 0.5) * 2
          posArray[i + 1] = enemy.mesh.position.y + Math.random() * 2
          posArray[i + 2] = enemy.mesh.position.z + (Math.random() - 0.5) * 2
        }
        particlesGeometry.attributes.position.needsUpdate = true
        
        return false
      }
    }
    
    this.activeEffects.push(effect)
    return effect
  }
  
  // Screen shake effect
  triggerScreenShake(intensity = 1.0, duration = 300) {
    if (!this.camera) return

    this.screenShake.active = true
    this.screenShake.intensity = intensity
    this.screenShake.duration = duration
    this.screenShake.elapsed = 0

    // Store original camera transform
    this.screenShake.originalPosition.copy(this.camera.position)
    this.screenShake.originalRotation.copy(this.camera.rotation)
  }

  // Damage vignette effect (red edges when taking damage)
  triggerDamageVignette(intensity = 0.5) {
    this.damageVignette.active = true
    this.damageVignette.intensity = Math.min(1.0, this.damageVignette.intensity + intensity)
  }

  // Create impact sparks
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

    // Normalize direction
    const dir = new THREE.Vector3(direction.x, direction.y, direction.z).normalize()

    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x
      positions[i * 3 + 1] = position.y
      positions[i * 3 + 2] = position.z

      // Spread sparks in hemisphere opposite to impact direction
      const theta = Math.random() * Math.PI
      const phi = Math.random() * Math.PI * 2
      const spreadX = Math.sin(theta) * Math.cos(phi)
      const spreadY = Math.abs(Math.sin(theta) * Math.sin(phi)) // Always upward
      const spreadZ = Math.cos(theta)

      velocities.push({
        x: (-dir.x + spreadX * 0.5) * speed,
        y: (-dir.y + spreadY * 0.5) * speed + 5, // Add upward bias
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
          // Update velocity with gravity
          velocities[i].y += gravity * deltaTime

          // Update positions
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

  // Create shockwave ring
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
      side: THREE.DoubleSide
    })

    const ring = new THREE.Mesh(ringGeometry, ringMaterial)
    ring.position.copy(position)
    ring.position.y = 0.5 // Slightly above ground
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

        // Expand ring
        const currentRadius = 1 + (maxRadius - 1) * progress
        ring.scale.set(currentRadius, currentRadius, 1)

        // Fade out
        ringMaterial.opacity = 0.8 * (1 - progress)

        return false
      }
    }

    this.activeEffects.push(effect)
    return effect
  }

  // Create damage number (floating text effect)
  createDamageNumber(position, damage, options = {}) {
    const {
      color = 0xff0000,
      size = 1.0,
      duration = 1000,
      isCritical = false
    } = options

    // Create sprite for number
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    canvas.width = 128
    canvas.height = 64

    // Draw text
    context.font = isCritical ? 'bold 48px Arial' : 'bold 32px Arial'
    context.fillStyle = isCritical ? '#ffff00' : `#${color.toString(16).padStart(6, '0')}`
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText(Math.round(damage).toString(), 64, 32)

    // Add outline
    context.strokeStyle = '#000000'
    context.lineWidth = 3
    context.strokeText(Math.round(damage).toString(), 64, 32)

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

        // Float upward
        sprite.position.y = startY + progress * 3

        // Fade out
        material.opacity = 1.0 * (1 - progress)

        return false
      }
    }

    this.activeEffects.push(effect)
    return effect
  }

  // Create blood splatter particles (for enemy death)
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

      // Random spray pattern
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

          // Stop at ground
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

  // Update all active effects and screen shake
  update(deltaTime) {
    // Update screen shake
    if (this.screenShake.active && this.camera) {
      this.screenShake.elapsed += deltaTime * 1000

      if (this.screenShake.elapsed >= this.screenShake.duration) {
        // Reset camera to original position
        this.camera.position.copy(this.screenShake.originalPosition)
        this.camera.rotation.copy(this.screenShake.originalRotation)
        this.screenShake.active = false
      } else {
        // Apply shake
        const progress = this.screenShake.elapsed / this.screenShake.duration
        const intensity = this.screenShake.intensity * (1 - progress) // Decay over time

        const shakeX = (Math.random() - 0.5) * intensity * 2
        const shakeY = (Math.random() - 0.5) * intensity * 2
        const shakeZ = (Math.random() - 0.5) * intensity * 2

        this.camera.position.copy(this.screenShake.originalPosition)
        this.camera.position.x += shakeX
        this.camera.position.y += shakeY
        this.camera.position.z += shakeZ

        // Slight rotation shake
        const shakeRotation = (Math.random() - 0.5) * intensity * 0.02
        this.camera.rotation.copy(this.screenShake.originalRotation)
        this.camera.rotation.z += shakeRotation
      }
    }

    // Update damage vignette (fade out)
    if (this.damageVignette.active) {
      this.damageVignette.intensity -= this.damageVignette.fadeSpeed * deltaTime
      if (this.damageVignette.intensity <= 0) {
        this.damageVignette.intensity = 0
        this.damageVignette.active = false
      }
    }

    // Update particle effects
    for (let i = this.activeEffects.length - 1; i >= 0; i--) {
      const effect = this.activeEffects[i]
      const shouldRemove = effect.update(deltaTime)

      if (shouldRemove) {
        this.activeEffects.splice(i, 1)
      }
    }
  }

  // Get damage vignette intensity (for renderer overlay)
  getDamageVignetteIntensity() {
    return this.damageVignette.intensity
  }
  
  // Clean up all effects
  destroy() {
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
    })
    this.activeEffects = []
  }

  /**
   * Create tower build effect (rising tower with dust particles)
   * @param {THREE.Vector3} position - Tower build position
   * @param {Object} options - Effect options
   */
  createBuildEffect(position, options = {}) {
    const {
      particleCount = 30,
      dustColor = 0x8b7355,
      glowColor = 0x44ff44,
      duration = 800
    } = options

    // Dust cloud particles
    const particlesGeometry = new THREE.BufferGeometry()
    const positions = new Float32Array(particleCount * 3)
    const velocities = []
    const lifetimes = []

    for (let i = 0; i < particleCount; i++) {
      // Start at ground level, spread horizontally
      const angle = (i / particleCount) * Math.PI * 2
      const radius = Math.random() * 2
      positions[i * 3] = position.x + Math.cos(angle) * radius
      positions[i * 3 + 1] = position.y + 0.1
      positions[i * 3 + 2] = position.z + Math.sin(angle) * radius

      // Upward and outward velocity
      velocities.push({
        x: Math.cos(angle) * 3,
        y: 5 + Math.random() * 3,
        z: Math.sin(angle) * 3
      })
      lifetimes.push(Math.random() * 0.5 + 0.5) // 0.5-1.0
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

    // Glow ring at base
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
          return false
        }

        // Update particles
        const posArray = particlesGeometry.attributes.position.array
        for (let i = 0; i < particleCount; i++) {
          if (progress < lifetimes[i]) {
            velocities[i].y += gravity * deltaTime
            posArray[i * 3] += velocities[i].x * deltaTime
            posArray[i * 3 + 1] += velocities[i].y * deltaTime
            posArray[i * 3 + 2] += velocities[i].z * deltaTime
          }
        }
        particlesGeometry.attributes.position.needsUpdate = true

        // Fade out particles
        particlesMaterial.opacity = 0.8 * (1 - progress)

        // Expand and fade ring
        ring.scale.setScalar(1 + progress * 2)
        ringMaterial.opacity = 0.6 * (1 - progress)

        return true
      }
    })
  }

  /**
   * Create tower upgrade effect (flash and particle burst)
   * @param {THREE.Vector3} position - Tower position
   * @param {Object} options - Effect options
   */
  createUpgradeEffect(position, options = {}) {
    const {
      particleCount = 40,
      color = 0xffdd00,
      burstSpeed = 10,
      duration = 1000
    } = options

    // Particle burst
    const particlesGeometry = new THREE.BufferGeometry()
    const positions = new Float32Array(particleCount * 3)
    const velocities = []

    for (let i = 0; i < particleCount; i++) {
      // Start at tower center
      positions[i * 3] = position.x
      positions[i * 3 + 1] = position.y + 2
      positions[i * 3 + 2] = position.z

      // Spherical burst pattern
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

    // Expanding flash ring
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
          return false
        }

        // Update particle positions
        const posArray = particlesGeometry.attributes.position.array
        for (let i = 0; i < particleCount; i++) {
          posArray[i * 3] += velocities[i].x * deltaTime
          posArray[i * 3 + 1] += velocities[i].y * deltaTime
          posArray[i * 3 + 2] += velocities[i].z * deltaTime
        }
        particlesGeometry.attributes.position.needsUpdate = true

        // Fade particles
        particlesMaterial.opacity = 1.0 - progress

        // Expand and fade flash
        flash.scale.setScalar(1 + progress * 3)
        flashMaterial.opacity = 1.0 - progress

        return true
      }
    })
  }
}

