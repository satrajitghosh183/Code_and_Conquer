// Visual Effects System
// Particle explosions, lightning, projectile trails
// Integrated from dabbott/towerdefense with enhancements

import * as THREE from 'three'

export class VisualEffects {
  constructor(scene) {
    this.scene = scene
    this.activeEffects = []
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
  
  // Update all active effects
  update(deltaTime) {
    for (let i = this.activeEffects.length - 1; i >= 0; i--) {
      const effect = this.activeEffects[i]
      const shouldRemove = effect.update(deltaTime)
      
      if (shouldRemove) {
        this.activeEffects.splice(i, 1)
      }
    }
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
}

