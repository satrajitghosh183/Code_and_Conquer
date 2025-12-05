// =============================================================================
// LIGHTWEIGHT VISUAL EFFECTS - Optimized for Performance
// =============================================================================

import * as THREE from 'three'

export class VisualEffects {
  constructor(scene, camera = null) {
    this.scene = scene
    this.camera = camera
    this.activeEffects = []
    this.frostAuras = new Map()
    this.fireRings = new Map()
    this.damageVignette = { active: false, intensity: 0, fadeSpeed: 2.0 }
  }

  setCamera(camera) {
    this.camera = camera
  }

  // Simple explosion - just particles
  createExplosion(position, options = {}) {
    const { numParticles = 20, color = 0xff6600, duration = 500 } = options
    
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(numParticles * 3)
    const velocities = []
    
    for (let i = 0; i < numParticles; i++) {
      positions[i * 3] = position.x
      positions[i * 3 + 1] = position.y
      positions[i * 3 + 2] = position.z
      
      velocities.push({
        x: (Math.random() - 0.5) * 10,
        y: Math.random() * 8,
        z: (Math.random() - 0.5) * 10
      })
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    
    const material = new THREE.PointsMaterial({
      color,
      size: 0.4,
      transparent: true,
      opacity: 1.0
    })
    
    const particles = new THREE.Points(geometry, material)
    this.scene.add(particles)
    
    const startTime = Date.now()
    
    const effect = {
      type: 'explosion',
      particles,
      velocities,
      startTime,
      duration,
      update: (deltaTime) => {
        const elapsed = Date.now() - startTime
        const progress = elapsed / duration
        
        if (progress >= 1) {
          this.scene.remove(particles)
          geometry.dispose()
          material.dispose()
          return true
        }
        
        const posArray = geometry.attributes.position.array
        for (let i = 0; i < numParticles; i++) {
          posArray[i * 3] += velocities[i].x * deltaTime
          posArray[i * 3 + 1] += velocities[i].y * deltaTime
          posArray[i * 3 + 2] += velocities[i].z * deltaTime
          velocities[i].y -= 15 * deltaTime
        }
        geometry.attributes.position.needsUpdate = true
        material.opacity = 1.0 - progress
        
        return false
      }
    }
    
    this.activeEffects.push(effect)
    return effect
  }

  // Simple shockwave ring
  createShockwave(position, options = {}) {
    const { maxRadius = 8, color = 0xff6600, duration = 400 } = options
    
    const geometry = new THREE.RingGeometry(1, 1.3, 16)
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    })
    
    const ring = new THREE.Mesh(geometry, material)
    ring.position.copy(position)
    ring.position.y = 0.1
    ring.rotation.x = -Math.PI / 2
    this.scene.add(ring)
    
    const startTime = Date.now()
    
    const effect = {
      type: 'shockwave',
      mesh: ring,
      startTime,
      duration,
      update: () => {
        const elapsed = Date.now() - startTime
        const progress = elapsed / duration
        
        if (progress >= 1) {
          this.scene.remove(ring)
          geometry.dispose()
          material.dispose()
          return true
        }
        
        const scale = 1 + (maxRadius - 1) * progress
        ring.scale.set(scale, scale, 1)
        material.opacity = 0.6 * (1 - progress)
        
        return false
      }
    }
    
    this.activeEffects.push(effect)
    return effect
  }

  // Simple damage number
  createDamageNumber(position, damage, options = {}) {
    const { color = 0xff0000, duration = 800 } = options
    
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 64
    const ctx = canvas.getContext('2d')
    
    ctx.font = 'bold 32px Arial'
    ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`
    ctx.textAlign = 'center'
    ctx.fillText(String(Math.round(damage)), 64, 40)
    
    const texture = new THREE.CanvasTexture(canvas)
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true })
    const sprite = new THREE.Sprite(material)
    sprite.position.copy(position)
    sprite.position.y += 2
    sprite.scale.set(2, 1, 1)
    
    this.scene.add(sprite)
    
    const startTime = Date.now()
    const startY = sprite.position.y
    
    const effect = {
      type: 'damage_number',
      mesh: sprite,
      startTime,
      duration,
      update: () => {
        const elapsed = Date.now() - startTime
        const progress = elapsed / duration
        
        if (progress >= 1) {
          this.scene.remove(sprite)
          material.dispose()
          texture.dispose()
          return true
        }
        
        sprite.position.y = startY + progress * 2
        material.opacity = 1.0 - progress
        
        return false
      }
    }
    
    this.activeEffects.push(effect)
    return effect
  }

  // Simple frost aura (just a ring)
  createFrostAura(enemy, slowAmount = 0.3, duration = 2000) {
    this.removeFrostAura(enemy)
    
    const geometry = new THREE.RingGeometry(0.8, 1.2, 16)
    const material = new THREE.MeshBasicMaterial({
      color: 0x88ddff,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    })
    
    const ring = new THREE.Mesh(geometry, material)
    ring.rotation.x = -Math.PI / 2
    ring.position.y = 0.1
    
    const group = new THREE.Group()
    group.add(ring)
    this.scene.add(group)
    
    const startTime = Date.now()
    
    const auraData = {
      group,
      enemy,
      startTime,
      duration,
      update: (deltaTime) => {
        if (!enemy.mesh || enemy.isDead || (Date.now() - startTime >= duration)) {
          return false
        }
        group.position.copy(enemy.mesh.position)
        group.rotation.y += deltaTime * 2
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
    }
  }

  // Simple fire ring
  createFireRing(tower, radius = 5) {
    this.removeFireRing(tower)
    
    const geometry = new THREE.RingGeometry(radius - 0.3, radius, 24)
    const material = new THREE.MeshBasicMaterial({
      color: 0xff4400,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide
    })
    
    const ring = new THREE.Mesh(geometry, material)
    ring.position.copy(tower.position)
    ring.position.y = 0.1
    ring.rotation.x = -Math.PI / 2
    
    this.scene.add(ring)
    
    const fireData = {
      mesh: ring,
      tower,
      update: (deltaTime) => {
        if (!tower.mesh) return false
        ring.rotation.z += deltaTime * 0.5
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
      this.scene.remove(fire.mesh)
      fire.mesh.geometry.dispose()
      fire.mesh.material.dispose()
      this.fireRings.delete(id)
    }
  }

  // Simple lightning
  createLightning(source, target, options = {}) {
    const { color = 0xaaaaff, duration = 150 } = options
    
    const points = [source.clone(), target.clone()]
    const geometry = new THREE.BufferGeometry().setFromPoints(points)
    const material = new THREE.LineBasicMaterial({ color })
    const line = new THREE.Line(geometry, material)
    
    this.scene.add(line)
    
    const startTime = Date.now()
    
    const effect = {
      type: 'lightning',
      mesh: line,
      startTime,
      duration,
      update: () => {
        if (Date.now() - startTime >= duration) {
          this.scene.remove(line)
          geometry.dispose()
          material.dispose()
          return true
        }
        return false
      }
    }
    
    this.activeEffects.push(effect)
    return line
  }

  // Simple build effect
  createBuildEffect(position, options = {}) {
    const { glowColor = 0x44ff44 } = options
    
    const geometry = new THREE.RingGeometry(1, 2, 16)
    const material = new THREE.MeshBasicMaterial({
      color: glowColor,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    })
    
    const ring = new THREE.Mesh(geometry, material)
    ring.position.copy(position)
    ring.position.y = 0.1
    ring.rotation.x = -Math.PI / 2
    
    this.scene.add(ring)
    
    const startTime = Date.now()
    const duration = 500
    
    const effect = {
      type: 'build',
      mesh: ring,
      startTime,
      update: () => {
        const elapsed = Date.now() - startTime
        const progress = elapsed / duration
        
        if (progress >= 1) {
          this.scene.remove(ring)
          geometry.dispose()
          material.dispose()
          return true
        }
        
        ring.scale.setScalar(1 + progress * 2)
        material.opacity = 0.6 * (1 - progress)
        
        return false
      }
    }
    
    this.activeEffects.push(effect)
  }

  createUpgradeEffect(position, options = {}) {
    this.createBuildEffect(position, { glowColor: options.color || 0xffdd00 })
  }

  // Stubs for compatibility
  triggerScreenShake() {}
  triggerDamageVignette(intensity = 0.5) {
    this.damageVignette.active = true
    this.damageVignette.intensity = Math.min(1.0, this.damageVignette.intensity + intensity)
  }
  createBloodSplatter(position, options = {}) {
    this.createExplosion(position, { ...options, color: options.color || 0x880000 })
  }
  createFreezeEffect() {}
  createFireEffect() {}
  createFrostEffect(position, radius, options = {}) {
    this.createExplosion(position, { color: 0x88ddff, ...options })
  }
  createMuzzleFlash() {}
  createProjectileTrail() { return { destroy: () => {} } }
  createImpactSparks(position, direction, options = {}) {
    this.createExplosion(position, options)
  }
  createTowerAura() {}
  removeTowerAura() {}

  getDamageVignetteIntensity() {
    return this.damageVignette.intensity
  }

  update(deltaTime) {
    // Fade vignette
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
      
      if (result === true || result === false) {
        // For persistent effects that return false when they should stop
        if (result === false && (effect.type === 'frostAura' || effect.type === 'fireRing')) {
          this.activeEffects.splice(i, 1)
        } else if (result === true) {
          this.activeEffects.splice(i, 1)
        }
      }
    }
  }
  
  destroy() {
    this.activeEffects.forEach(effect => {
      if (effect.mesh) {
        this.scene.remove(effect.mesh)
        if (effect.mesh.geometry) effect.mesh.geometry.dispose()
        if (effect.mesh.material) effect.mesh.material.dispose()
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
  }
}
