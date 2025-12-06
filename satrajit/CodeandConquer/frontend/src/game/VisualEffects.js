// =============================================================================
// VISUAL EFFECTS - Optimized for Performance with Immersive Effects
// ENHANCED: Object pooling, better particles, advanced effects
// =============================================================================

import * as THREE from 'three'

export class VisualEffects {
  constructor(scene, camera = null) {
    this.scene = scene
    this.camera = camera
    this.activeEffects = []
    this.frostAuras = new Map()
    this.fireRings = new Map()
    this.projectileTrails = new Map()
    
    // Screen effects
    this.screenShake = { active: false, intensity: 0, duration: 0, startTime: 0 }
    this.damageVignette = { active: false, intensity: 0, fadeSpeed: 2.0 }
    
    // Object pooling for performance
    this.particlePool = []
    this.meshPool = {
      spheres: [],
      rings: [],
      sparks: []
    }
    this.poolMaxSize = 100
    
    // Shared geometries for performance
    this.sharedGeometries = {
      particle: new THREE.SphereGeometry(0.1, 6, 6),
      ring: new THREE.RingGeometry(1, 1.2, 24),
      spark: new THREE.SphereGeometry(0.05, 4, 4),
      cone: new THREE.ConeGeometry(0.15, 0.4, 6)
    }
    
    // Shared materials (reusable)
    this.sharedMaterials = {
      explosion: new THREE.PointsMaterial({
        size: 0.5,
        vertexColors: true,
        transparent: true,
        opacity: 1.0,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending
      }),
      glow: new THREE.MeshBasicMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    }
    
    this.initializePools()
  }
  
  initializePools() {
    // Pre-create some pooled objects
    for (let i = 0; i < 20; i++) {
      this.createPooledSphere()
      this.createPooledRing()
    }
  }
  
  createPooledSphere() {
    const mesh = new THREE.Mesh(
      this.sharedGeometries.particle,
      new THREE.MeshBasicMaterial({ transparent: true })
    )
    mesh.visible = false
    mesh.pooled = true
    this.scene.add(mesh)
    this.meshPool.spheres.push(mesh)
    return mesh
  }
  
  createPooledRing() {
    const mesh = new THREE.Mesh(
      this.sharedGeometries.ring,
      new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide })
    )
    mesh.visible = false
    mesh.pooled = true
    this.scene.add(mesh)
    this.meshPool.rings.push(mesh)
    return mesh
  }
  
  getPooledMesh(type) {
    const pool = this.meshPool[type]
    if (!pool) return null
    
    let mesh = pool.find(m => !m.visible)
    if (!mesh && pool.length < this.poolMaxSize) {
      if (type === 'spheres') mesh = this.createPooledSphere()
      else if (type === 'rings') mesh = this.createPooledRing()
    }
    
    if (mesh) {
      mesh.visible = true
      mesh.scale.set(1, 1, 1)
      mesh.rotation.set(0, 0, 0)
    }
    
    return mesh
  }
  
  returnPooledMesh(mesh) {
    if (mesh && mesh.pooled) {
      mesh.visible = false
      mesh.material.opacity = 1.0
    }
  }

  setCamera(camera) {
    this.camera = camera
  }

  // =========================================================================
  // EXPLOSION EFFECT - Optimized with reduced particles
  // =========================================================================
  createExplosion(position, options = {}) {
    const { 
      numParticles = 20, // Reduced from 35
      color = 0xff6600, 
      duration = 500, // Reduced from 700
      maxDist = 4,    // Reduced from 5
      gravity = true,
      shockwave = false // Disabled by default for performance
    } = options
    
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(numParticles * 3)
    const colors = new Float32Array(numParticles * 3)
    const sizes = new Float32Array(numParticles)
    const velocities = []
    const colorObj = new THREE.Color(color)
    
    for (let i = 0; i < numParticles; i++) {
      positions[i * 3] = position.x
      positions[i * 3 + 1] = position.y + 0.5
      positions[i * 3 + 2] = position.z
      
      // Vary colors for more dynamic effect
      const variation = 0.7 + Math.random() * 0.6
      const hueShift = (Math.random() - 0.5) * 0.1
      
      const shiftedColor = colorObj.clone()
      shiftedColor.offsetHSL(hueShift, 0, (variation - 1) * 0.3)
      
      colors[i * 3] = shiftedColor.r
      colors[i * 3 + 1] = shiftedColor.g
      colors[i * 3 + 2] = shiftedColor.b
      
      // Vary particle sizes
      sizes[i] = 0.3 + Math.random() * 0.5
      
      // Random velocity with radial bias
      const angle = Math.random() * Math.PI * 2
      const upAngle = Math.random() * Math.PI * 0.7
      const speed = 4 + Math.random() * maxDist
      
      velocities.push({
        x: Math.cos(angle) * Math.sin(upAngle) * speed,
        y: Math.cos(upAngle) * speed * 1.8,
        z: Math.sin(angle) * Math.sin(upAngle) * speed
      })
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    
    const material = new THREE.PointsMaterial({
      size: 0.5,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
    
    const particles = new THREE.Points(geometry, material)
    this.scene.add(particles)
    
    // Core flash - reduced
    const flashGeom = new THREE.SphereGeometry(0.6, 8, 8)
    const flashMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
    const flash = new THREE.Mesh(flashGeom, flashMat)
    flash.position.copy(position)
    flash.position.y += 0.5
    this.scene.add(flash)
    
    // Core light - reduced intensity
    const light = new THREE.PointLight(color, 3, 10)
    light.position.copy(position)
    light.position.y += 0.5
    this.scene.add(light)
    
    const startTime = Date.now()
    
    // Create shockwave if enabled
    if (shockwave) {
      this.createShockwave(position, { maxRadius: maxDist * 1.5, color, duration: duration * 0.6 })
    }
    
    const effect = {
      type: 'explosion',
      particles,
      flash,
      light,
      velocities,
      startTime,
      duration,
      gravity,
      update: (deltaTime) => {
        const elapsed = Date.now() - startTime
        const progress = elapsed / duration
        
        if (progress >= 1) {
          this.scene.remove(particles)
          this.scene.remove(flash)
          this.scene.remove(light)
          geometry.dispose()
          material.dispose()
          flashGeom.dispose()
          flashMat.dispose()
          return true
        }
        
        // Update particles
        const posArray = geometry.attributes.position.array
        const sizeArray = geometry.attributes.size.array
        
        for (let i = 0; i < numParticles; i++) {
          posArray[i * 3] += velocities[i].x * deltaTime
          posArray[i * 3 + 1] += velocities[i].y * deltaTime
          posArray[i * 3 + 2] += velocities[i].z * deltaTime
          
          if (gravity) {
            velocities[i].y -= 20 * deltaTime
          }
          
          // Shrink particles over time
          sizeArray[i] *= 0.98
        }
        geometry.attributes.position.needsUpdate = true
        geometry.attributes.size.needsUpdate = true
        
        // Fade out
        material.opacity = 1.0 - Math.pow(progress, 1.5)
        
        // Flash expands and fades quickly
        const flashScale = 1 + progress * 3
        flash.scale.setScalar(flashScale)
        flashMat.opacity = Math.max(0, 1.0 - progress * 3)
        
        // Light fades
        light.intensity = 3 * (1 - progress * progress)
        
        return false
      }
    }
    
    this.activeEffects.push(effect)
    return effect
  }

  // =========================================================================
  // SHOCKWAVE EFFECT
  // =========================================================================
  createShockwave(position, options = {}) {
    const { maxRadius = 8, color = 0xff6600, duration = 400, thickness = 0.3 } = options
    
    const geometry = new THREE.RingGeometry(1, 1 + thickness, 24)
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide
    })
    
    const ring = new THREE.Mesh(geometry, material)
    ring.position.copy(position)
    ring.position.y = 0.15
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
        material.opacity = 0.7 * (1 - progress)
        
        return false
      }
    }
    
    this.activeEffects.push(effect)
    return effect
  }

  // =========================================================================
  // MUZZLE FLASH
  // =========================================================================
  createMuzzleFlash(position, direction, options = {}) {
    const { color = 0xffff00, size = 0.6, duration = 80 } = options
    
    // Flash core
    const flashGeom = new THREE.SphereGeometry(size, 6, 6)
    const flashMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 1.0
    })
    const flash = new THREE.Mesh(flashGeom, flashMat)
    flash.position.copy(position)
    this.scene.add(flash)
    
    // Flash rays
    const rayGeom = new THREE.ConeGeometry(size * 0.3, size * 2, 4)
    const rayMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.8
    })
    const ray = new THREE.Mesh(rayGeom, rayMat)
    ray.position.copy(position)
    ray.lookAt(position.clone().add(direction))
    ray.rotation.x += Math.PI / 2
    this.scene.add(ray)
    
    const startTime = Date.now()
    
    const effect = {
      type: 'muzzle_flash',
      flash,
      ray,
      startTime,
      duration,
      update: () => {
        const elapsed = Date.now() - startTime
        
        if (elapsed >= duration) {
          this.scene.remove(flash)
          this.scene.remove(ray)
          flashGeom.dispose()
          flashMat.dispose()
          rayGeom.dispose()
          rayMat.dispose()
          return true
        }
        
        const progress = elapsed / duration
        flashMat.opacity = 1.0 - progress
        rayMat.opacity = 0.8 - progress * 0.8
        
        return false
      }
    }
    
    this.activeEffects.push(effect)
    return effect
  }

  // =========================================================================
  // PROJECTILE TRAIL
  // =========================================================================
  createProjectileTrail(projectileMesh, options = {}) {
    const { color = 0xffff00, length = 8 } = options
    
    const trailId = Math.random().toString(36).substr(2, 9)
    const positions = []
    
    for (let i = 0; i < length; i++) {
      positions.push(projectileMesh.position.clone())
    }
    
    const geometry = new THREE.BufferGeometry()
    const posArray = new Float32Array(length * 3)
    geometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3))
    
    const material = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.6
    })
    
    const trail = new THREE.Line(geometry, material)
    this.scene.add(trail)
    
    const trailData = {
      id: trailId,
      trail,
      geometry,
      material,
      positions,
      mesh: projectileMesh,
      update: () => {
        // Shift positions
        for (let i = positions.length - 1; i > 0; i--) {
          positions[i].copy(positions[i - 1])
        }
        positions[0].copy(projectileMesh.position)
        
        // Update geometry
        const posArray = geometry.attributes.position.array
        for (let i = 0; i < positions.length; i++) {
          posArray[i * 3] = positions[i].x
          posArray[i * 3 + 1] = positions[i].y
          posArray[i * 3 + 2] = positions[i].z
        }
        geometry.attributes.position.needsUpdate = true
        
        return true
      },
      destroy: () => {
        this.scene.remove(trail)
        geometry.dispose()
        material.dispose()
        this.projectileTrails.delete(trailId)
      }
    }
    
    this.projectileTrails.set(trailId, trailData)
    return trailData
  }

  // =========================================================================
  // LIGHTNING EFFECT
  // =========================================================================
  createLightning(source, target, options = {}) {
    const { 
      color = 0x8888ff, 
      duration = 200, 
      segments = 12,
      displacement = 1.5 
    } = options
    
    const points = []
    const direction = new THREE.Vector3().subVectors(target, source)
    const length = direction.length()
    direction.normalize()
    
    // Create jagged lightning path
    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      const point = source.clone().add(direction.clone().multiplyScalar(length * t))
      
      // Add random displacement (less at endpoints)
      if (i > 0 && i < segments) {
        const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x)
        const offset = (Math.random() - 0.5) * displacement * Math.sin(t * Math.PI)
        point.add(perpendicular.multiplyScalar(offset))
        point.y += (Math.random() - 0.5) * displacement * 0.5
      }
      
      points.push(point)
    }
    
    const geometry = new THREE.BufferGeometry().setFromPoints(points)
    const material = new THREE.LineBasicMaterial({ 
      color,
      linewidth: 2
    })
    const line = new THREE.Line(geometry, material)
    this.scene.add(line)
    
    // Glow line (thicker, more transparent)
    const glowMat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.4,
      linewidth: 4
    })
    const glowLine = new THREE.Line(geometry.clone(), glowMat)
    this.scene.add(glowLine)
    
    const startTime = Date.now()
    
    const effect = {
      type: 'lightning',
      mesh: line,
      glow: glowLine,
      startTime,
      duration,
      update: () => {
        const elapsed = Date.now() - startTime
        
        if (elapsed >= duration) {
          this.scene.remove(line)
          this.scene.remove(glowLine)
          geometry.dispose()
          material.dispose()
          glowMat.dispose()
          glowLine.geometry.dispose()
          return true
        }
        
        // Flicker
        const flicker = Math.random() > 0.3
        line.visible = flicker
        glowLine.visible = flicker
        
        return false
      }
    }
    
    this.activeEffects.push(effect)
    return effect
  }

  // =========================================================================
  // DAMAGE NUMBER
  // =========================================================================
  createDamageNumber(position, damage, options = {}) {
    const { color = 0xffffff, duration = 1000, isCritical = false } = options
    
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 64
    const ctx = canvas.getContext('2d')
    
    ctx.font = isCritical ? 'bold 40px Arial' : 'bold 28px Arial'
    const colorHex = `#${color.toString(16).padStart(6, '0')}`
    ctx.fillStyle = colorHex
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 3
    ctx.textAlign = 'center'
    ctx.strokeText(String(Math.round(damage)), 64, 45)
    ctx.fillText(String(Math.round(damage)), 64, 45)
    
    const texture = new THREE.CanvasTexture(canvas)
    const material = new THREE.SpriteMaterial({ 
      map: texture, 
      transparent: true,
      depthWrite: false
    })
    const sprite = new THREE.Sprite(material)
    sprite.position.copy(position)
    sprite.position.y += 1.5
    sprite.scale.set(isCritical ? 3 : 2, isCritical ? 1.5 : 1, 1)
    
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
        
        sprite.position.y = startY + progress * 2.5
        material.opacity = 1.0 - Math.pow(progress, 2)
        
        return false
      }
    }
    
    this.activeEffects.push(effect)
    return effect
  }

  // =========================================================================
  // FROST AURA
  // =========================================================================
  createFrostAura(enemy, slowAmount = 0.3, duration = 2000) {
    this.removeFrostAura(enemy)
    
    const geometry = new THREE.RingGeometry(0.6, 1.0, 16)
    const material = new THREE.MeshBasicMaterial({
      color: 0x88ddff,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    })
    
    const ring = new THREE.Mesh(geometry, material)
    ring.rotation.x = -Math.PI / 2
    ring.position.y = 0.1
    
    // Ice particles
    const particlesGeom = new THREE.BufferGeometry()
    const particleCount = 12
    const positions = new Float32Array(particleCount * 3)
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2
      positions[i * 3] = Math.cos(angle) * 0.8
      positions[i * 3 + 1] = 0.2 + Math.random() * 0.5
      positions[i * 3 + 2] = Math.sin(angle) * 0.8
    }
    particlesGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    
    const particlesMat = new THREE.PointsMaterial({
      color: 0xaaeeff,
      size: 0.15,
      transparent: true,
      opacity: 0.7
    })
    const particles = new THREE.Points(particlesGeom, particlesMat)
    
    const group = new THREE.Group()
    group.add(ring)
    group.add(particles)
    this.scene.add(group)
    
    const startTime = Date.now()
    
    const auraData = {
      group,
      enemy,
      startTime,
      duration,
      ring,
      particles,
      particlesGeom,
      update: (deltaTime) => {
        if (!enemy.mesh || enemy.isDead || (Date.now() - startTime >= duration)) {
          return false
        }
        group.position.copy(enemy.mesh.position)
        group.rotation.y += deltaTime * 2
        
        // Animate particles up
        const posArray = particlesGeom.attributes.position.array
        for (let i = 0; i < particleCount; i++) {
          posArray[i * 3 + 1] += deltaTime * 0.5
          if (posArray[i * 3 + 1] > 1.2) {
            posArray[i * 3 + 1] = 0.2
          }
        }
        particlesGeom.attributes.position.needsUpdate = true
        
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

  // =========================================================================
  // FROST EFFECT (Area of Effect)
  // =========================================================================
  createFrostEffect(position, radius = 3, options = {}) {
    const { color = 0x88ddff, duration = 500 } = options
    
    // Frost ring
    const ringGeom = new THREE.RingGeometry(0.5, radius, 24)
    const ringMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    })
    const ring = new THREE.Mesh(ringGeom, ringMat)
    ring.position.copy(position)
    ring.position.y = 0.15
    ring.rotation.x = -Math.PI / 2
    this.scene.add(ring)
    
    // Ice particles burst
    this.createExplosion(position, {
      numParticles: 15,
      color,
      duration: duration * 0.8,
      maxDist: radius,
      gravity: false
    })
    
    const startTime = Date.now()
    
    const effect = {
      type: 'frost_effect',
      mesh: ring,
      startTime,
      duration,
      update: () => {
        const elapsed = Date.now() - startTime
        const progress = elapsed / duration
        
        if (progress >= 1) {
          this.scene.remove(ring)
          ringGeom.dispose()
          ringMat.dispose()
          return true
        }
        
        ringMat.opacity = 0.5 * (1 - progress)
        
        return false
      }
    }
    
    this.activeEffects.push(effect)
    return effect
  }

  // =========================================================================
  // FIRE RING - Enhanced with animated flames
  // =========================================================================
  createFireRing(tower, radius = 5) {
    this.removeFireRing(tower)
    
    const group = new THREE.Group()
    group.position.copy(tower.position)
    group.position.y = 0.1
    
    // Inner glow ring
    const innerRingGeom = new THREE.RingGeometry(radius * 0.7, radius * 0.8, 32)
    const innerRingMat = new THREE.MeshBasicMaterial({
      color: 0xff6600,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    })
    const innerRing = new THREE.Mesh(innerRingGeom, innerRingMat)
    innerRing.rotation.x = -Math.PI / 2
    group.add(innerRing)
    
    // Outer fire ring
    const outerRingGeom = new THREE.RingGeometry(radius - 0.3, radius, 32)
    const outerRingMat = new THREE.MeshBasicMaterial({
      color: 0xff4400,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    })
    const outerRing = new THREE.Mesh(outerRingGeom, outerRingMat)
    outerRing.rotation.x = -Math.PI / 2
    group.add(outerRing)
    
    // Animated flame pillars around the ring
    const flameCount = 16
    const flames = []
    for (let i = 0; i < flameCount; i++) {
      const angle = (i / flameCount) * Math.PI * 2
      const flameGeom = new THREE.ConeGeometry(0.25, 1.2, 6)
      const flameMat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0xff4400 : 0xff8800,
        transparent: true,
        opacity: 0.7
      })
      const flame = new THREE.Mesh(flameGeom, flameMat)
      flame.position.set(
        Math.cos(angle) * radius,
        0.6,
        Math.sin(angle) * radius
      )
      flame.userData.baseY = 0.6
      flame.userData.angle = angle
      flame.userData.phaseOffset = i * 0.4
      flames.push(flame)
      group.add(flame)
    }
    
    // Embers/particles
    const emberCount = 24
    const emberGeom = new THREE.BufferGeometry()
    const emberPositions = new Float32Array(emberCount * 3)
    for (let i = 0; i < emberCount; i++) {
      const angle = (i / emberCount) * Math.PI * 2
      emberPositions[i * 3] = Math.cos(angle) * radius
      emberPositions[i * 3 + 1] = 0.5 + Math.random() * 0.5
      emberPositions[i * 3 + 2] = Math.sin(angle) * radius
    }
    emberGeom.setAttribute('position', new THREE.BufferAttribute(emberPositions, 3))
    const emberMat = new THREE.PointsMaterial({
      color: 0xffaa00,
      size: 0.15,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    })
    const embers = new THREE.Points(emberGeom, emberMat)
    group.add(embers)
    
    this.scene.add(group)
    
    const fireData = {
      group,
      mesh: group,
      tower,
      flames,
      embers,
      emberGeom,
      innerRing,
      outerRing,
      animTime: 0,
      update: (deltaTime) => {
        if (!tower.mesh) return false
        
        fireData.animTime += deltaTime
        
        // Rotate rings in opposite directions
        innerRing.rotation.z += deltaTime * 0.3
        outerRing.rotation.z -= deltaTime * 0.5
        
        // Animate flames
        flames.forEach((flame, i) => {
          const phase = fireData.animTime * 4 + flame.userData.phaseOffset
          flame.position.y = flame.userData.baseY + Math.sin(phase) * 0.3
          flame.scale.y = 1 + Math.sin(phase * 1.5) * 0.3
          flame.material.opacity = 0.5 + Math.sin(phase) * 0.2
        })
        
        // Animate embers rising
        const posArray = emberGeom.attributes.position.array
        for (let i = 0; i < emberCount; i++) {
          posArray[i * 3 + 1] += deltaTime * 1.5
          if (posArray[i * 3 + 1] > 2) {
            posArray[i * 3 + 1] = 0.3
          }
        }
        emberGeom.attributes.position.needsUpdate = true
        
        // Pulse opacity
        const pulse = 0.4 + Math.sin(fireData.animTime * 3) * 0.1
        outerRingMat.opacity = pulse
        innerRingMat.opacity = pulse * 0.6
        
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
      this.scene.remove(fire.group || fire.mesh)
      if (fire.group) {
        fire.group.traverse(child => {
          if (child.geometry) child.geometry.dispose()
          if (child.material) child.material.dispose()
        })
      } else {
        fire.mesh.geometry?.dispose()
        fire.mesh.material?.dispose()
      }
      this.fireRings.delete(id)
    }
  }

  // =========================================================================
  // FREEZE EFFECT - Visually freezes enemy with ice crystals
  // =========================================================================
  createFreezeEffect(enemy, duration = 3000) {
    if (!enemy || !enemy.mesh) return null
    
    const group = new THREE.Group()
    
    // Ice encasement - semi-transparent ice shell around enemy
    const iceShellGeom = new THREE.IcosahedronGeometry(enemy.scale * 1.2, 1)
    const iceShellMat = new THREE.MeshStandardMaterial({
      color: 0x88ddff,
      transparent: true,
      opacity: 0.4,
      metalness: 0.9,
      roughness: 0.1,
      emissive: 0x2288cc,
      emissiveIntensity: 0.3
    })
    const iceShell = new THREE.Mesh(iceShellGeom, iceShellMat)
    group.add(iceShell)
    
    // Ice crystals protruding from the enemy
    const crystalCount = 8
    for (let i = 0; i < crystalCount; i++) {
      const crystalGeom = new THREE.ConeGeometry(0.1 + Math.random() * 0.1, 0.5 + Math.random() * 0.5, 6)
      const crystalMat = new THREE.MeshStandardMaterial({
        color: 0xaaeeff,
        transparent: true,
        opacity: 0.8,
        metalness: 0.95,
        roughness: 0.05,
        emissive: 0x4488ff,
        emissiveIntensity: 0.5
      })
      const crystal = new THREE.Mesh(crystalGeom, crystalMat)
      
      const angle = (i / crystalCount) * Math.PI * 2
      const tilt = Math.PI / 4 + Math.random() * Math.PI / 4
      crystal.position.set(
        Math.cos(angle) * enemy.scale * 0.8,
        Math.sin(tilt) * enemy.scale * 0.5,
        Math.sin(angle) * enemy.scale * 0.8
      )
      crystal.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      )
      group.add(crystal)
    }
    
    // Frost particles swirling around
    const frostParticleCount = 20
    const frostGeom = new THREE.BufferGeometry()
    const frostPositions = new Float32Array(frostParticleCount * 3)
    for (let i = 0; i < frostParticleCount; i++) {
      const angle = (i / frostParticleCount) * Math.PI * 2
      const radius = enemy.scale * 1.0
      frostPositions[i * 3] = Math.cos(angle) * radius
      frostPositions[i * 3 + 1] = Math.random() * enemy.scale
      frostPositions[i * 3 + 2] = Math.sin(angle) * radius
    }
    frostGeom.setAttribute('position', new THREE.BufferAttribute(frostPositions, 3))
    const frostMat = new THREE.PointsMaterial({
      color: 0xccffff,
      size: 0.1,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending
    })
    const frostParticles = new THREE.Points(frostGeom, frostMat)
    group.add(frostParticles)
    
    this.scene.add(group)
    
    const startTime = Date.now()
    
    const effect = {
      type: 'freeze_effect',
      group,
      enemy,
      frostGeom,
      iceShell,
      startTime,
      duration,
      animTime: 0,
      update: (deltaTime) => {
        if (!enemy.mesh || enemy.isDead || (Date.now() - startTime >= duration)) {
          this.scene.remove(group)
          group.traverse(child => {
            if (child.geometry) child.geometry.dispose()
            if (child.material) child.material.dispose()
          })
          return true
        }
        
        effect.animTime += deltaTime
        
        // Follow enemy
        group.position.copy(enemy.mesh.position)
        
        // Rotate ice shell slowly
        iceShell.rotation.y += deltaTime * 0.5
        iceShell.rotation.x += deltaTime * 0.2
        
        // Swirl frost particles
        const posArray = frostGeom.attributes.position.array
        for (let i = 0; i < frostParticleCount; i++) {
          const baseAngle = (i / frostParticleCount) * Math.PI * 2
          const currentAngle = baseAngle + effect.animTime * 2
          const radius = enemy.scale * (0.8 + Math.sin(effect.animTime * 3 + i) * 0.2)
          posArray[i * 3] = Math.cos(currentAngle) * radius
          posArray[i * 3 + 1] = (posArray[i * 3 + 1] + deltaTime * 0.5) % (enemy.scale * 1.5)
          posArray[i * 3 + 2] = Math.sin(currentAngle) * radius
        }
        frostGeom.attributes.position.needsUpdate = true
        
        // Pulse ice shell
        const pulse = 1 + Math.sin(effect.animTime * 4) * 0.05
        iceShell.scale.setScalar(pulse)
        iceShellMat.opacity = 0.3 + Math.sin(effect.animTime * 3) * 0.1
        
        return false
      }
    }
    
    this.activeEffects.push(effect)
    return effect
  }

  // =========================================================================
  // FIRE EFFECT (On enemy)
  // =========================================================================
  createFireEffect(enemy, duration = 3000) {
    // Simple fire particles around enemy
    const group = new THREE.Group()
    const fireColor = 0xff4400
    
    // Flames
    for (let i = 0; i < 5; i++) {
      const flameGeom = new THREE.ConeGeometry(0.15, 0.4, 4)
      const flameMat = new THREE.MeshBasicMaterial({
        color: fireColor,
        transparent: true,
        opacity: 0.7
      })
      const flame = new THREE.Mesh(flameGeom, flameMat)
      
      const angle = (i / 5) * Math.PI * 2
      flame.position.set(
        Math.cos(angle) * 0.4,
        0.5,
        Math.sin(angle) * 0.4
      )
      group.add(flame)
    }
    
    this.scene.add(group)
    
    const startTime = Date.now()
    
    const effect = {
      type: 'fire_effect',
      group,
      enemy,
      startTime,
      duration,
      update: (deltaTime) => {
        if (!enemy.mesh || enemy.isDead || (Date.now() - startTime >= duration)) {
          this.scene.remove(group)
          group.traverse(child => {
            if (child.geometry) child.geometry.dispose()
            if (child.material) child.material.dispose()
          })
          return true
        }
        
        group.position.copy(enemy.mesh.position)
        
        // Animate flames
        group.children.forEach((flame, i) => {
          flame.position.y = 0.5 + Math.sin((Date.now() / 100) + i) * 0.2
          flame.rotation.y += deltaTime * 3
        })
        
        return false
      }
    }
    
    this.activeEffects.push(effect)
    return effect
  }

  // =========================================================================
  // BUILD EFFECT
  // =========================================================================
  createBuildEffect(position, options = {}) {
    const { glowColor = 0x44ff44 } = options
    
    // Rising ring
    const geometry = new THREE.RingGeometry(0.5, 2, 20)
    const material = new THREE.MeshBasicMaterial({
      color: glowColor,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide
    })
    
    const ring = new THREE.Mesh(geometry, material)
    ring.position.copy(position)
    ring.position.y = 0.1
    ring.rotation.x = -Math.PI / 2
    
    this.scene.add(ring)
    
    // Particles
    this.createExplosion(position, {
      numParticles: 20,
      color: glowColor,
      duration: 600,
      maxDist: 2,
      gravity: false
    })
    
    const startTime = Date.now()
    const duration = 600
    
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
        
        ring.position.y = 0.1 + progress * 3
        ring.scale.setScalar(1 + progress * 1.5)
        material.opacity = 0.7 * (1 - progress)
        
        return false
      }
    }
    
    this.activeEffects.push(effect)
    return effect
  }

  // =========================================================================
  // UPGRADE EFFECT
  // =========================================================================
  createUpgradeEffect(position, options = {}) {
    const { color = 0xffdd00 } = options
    
    this.createBuildEffect(position, { glowColor: color })
    
    // Star burst
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2
      const starGeom = new THREE.ConeGeometry(0.1, 0.5, 3)
      const starMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.9
      })
      const star = new THREE.Mesh(starGeom, starMat)
      
      star.position.copy(position)
      star.position.y = 2
      star.rotation.z = angle
      
      this.scene.add(star)
      
      const startTime = Date.now()
      const duration = 500
      
      const starEffect = {
        type: 'upgrade_star',
        mesh: star,
        angle,
        startTime,
        update: () => {
          const elapsed = Date.now() - startTime
          const progress = elapsed / duration
          
          if (progress >= 1) {
            this.scene.remove(star)
            starGeom.dispose()
            starMat.dispose()
            return true
          }
          
          const dist = progress * 5
          star.position.x = position.x + Math.cos(angle) * dist
          star.position.z = position.z + Math.sin(angle) * dist
          star.position.y = 2 + Math.sin(progress * Math.PI) * 2
          starMat.opacity = 0.9 * (1 - progress)
          
          return false
        }
      }
      
      this.activeEffects.push(starEffect)
    }
  }

  // =========================================================================
  // IMPACT SPARKS
  // =========================================================================
  createImpactSparks(position, direction, options = {}) {
    const { color = 0xffff00, count = 10 } = options
    
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(count * 3)
    const velocities = []
    
    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x
      positions[i * 3 + 1] = position.y
      positions[i * 3 + 2] = position.z
      
      // Sparks fly in direction of impact
      const spread = 0.5
      velocities.push({
        x: -direction.x * 8 + (Math.random() - 0.5) * spread * 10,
        y: Math.random() * 6,
        z: -direction.z * 8 + (Math.random() - 0.5) * spread * 10
      })
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    
    const material = new THREE.PointsMaterial({
      color,
      size: 0.2,
      transparent: true,
      opacity: 1.0
    })
    
    const sparks = new THREE.Points(geometry, material)
    this.scene.add(sparks)
    
    const startTime = Date.now()
    const duration = 300
    
    const effect = {
      type: 'sparks',
      mesh: sparks,
      velocities,
      startTime,
      update: (deltaTime) => {
        const elapsed = Date.now() - startTime
        const progress = elapsed / duration
        
        if (progress >= 1) {
          this.scene.remove(sparks)
          geometry.dispose()
          material.dispose()
          return true
        }
        
        const posArray = geometry.attributes.position.array
        for (let i = 0; i < count; i++) {
          posArray[i * 3] += velocities[i].x * deltaTime
          posArray[i * 3 + 1] += velocities[i].y * deltaTime
          posArray[i * 3 + 2] += velocities[i].z * deltaTime
          velocities[i].y -= 25 * deltaTime
        }
        geometry.attributes.position.needsUpdate = true
        material.opacity = 1.0 - progress
        
        return false
      }
    }
    
    this.activeEffects.push(effect)
    return effect
  }

  // =========================================================================
  // BLOOD SPLATTER
  // =========================================================================
  createBloodSplatter(position, options = {}) {
    this.createExplosion(position, { 
      ...options, 
      color: options.color || 0x880000,
      numParticles: 15,
      duration: 400
    })
  }

  // =========================================================================
  // SCREEN EFFECTS
  // =========================================================================
  triggerScreenShake(intensity = 0.5, duration = 200) {
    if (!this.camera) return
    
    this.screenShake = {
      active: true,
      intensity,
      duration,
      startTime: Date.now(),
      originalPosition: this.camera.position.clone()
    }
  }
  
  updateScreenShake() {
    if (!this.screenShake.active || !this.camera) return
    
    const elapsed = Date.now() - this.screenShake.startTime
    if (elapsed >= this.screenShake.duration) {
      this.screenShake.active = false
      return
    }
    
    const progress = elapsed / this.screenShake.duration
    const decay = 1 - progress
    const intensity = this.screenShake.intensity * decay
    
    this.camera.position.x += (Math.random() - 0.5) * intensity
    this.camera.position.y += (Math.random() - 0.5) * intensity * 0.5
  }

  triggerDamageVignette(intensity = 0.5) {
    this.damageVignette.active = true
    this.damageVignette.intensity = Math.min(1.0, this.damageVignette.intensity + intensity)
  }

  getDamageVignetteIntensity() {
    return this.damageVignette.intensity
  }

  // =========================================================================
  // TOWER AURA (visual range indicator)
  // =========================================================================
  createTowerAura(tower, color = 0x4488ff) {
    this.removeTowerAura(tower)
    
    const range = tower.range || 15
    const geometry = new THREE.RingGeometry(range - 0.3, range, 32)
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide
    })
    
    const ring = new THREE.Mesh(geometry, material)
    ring.position.copy(tower.position)
    ring.position.y = 0.1
    ring.rotation.x = -Math.PI / 2
    
    this.scene.add(ring)
    
    tower._auraRing = ring
  }
  
  removeTowerAura(tower) {
    if (tower._auraRing) {
      this.scene.remove(tower._auraRing)
      tower._auraRing.geometry.dispose()
      tower._auraRing.material.dispose()
      tower._auraRing = null
    }
  }

  // =========================================================================
  // UPDATE
  // =========================================================================
  update(deltaTime) {
    // Screen shake
    this.updateScreenShake()
    
    // Fade vignette
    if (this.damageVignette.active) {
      this.damageVignette.intensity -= this.damageVignette.fadeSpeed * deltaTime
      if (this.damageVignette.intensity <= 0) {
        this.damageVignette.intensity = 0
        this.damageVignette.active = false
      }
    }
    
    // Update projectile trails
    this.projectileTrails.forEach(trail => {
      trail.update()
    })
    
    // Update all effects
    for (let i = this.activeEffects.length - 1; i >= 0; i--) {
      const effect = this.activeEffects[i]
      const result = effect.update(deltaTime)
      
      if (result === true) {
        this.activeEffects.splice(i, 1)
      } else if (result === false) {
        // Persistent effect that should stop
        if (effect.type === 'frostAura') {
          this.removeFrostAura(effect.enemy)
        }
        this.activeEffects.splice(i, 1)
      }
    }
  }
  
  // =========================================================================
  // CLEANUP
  // =========================================================================
  destroy() {
    // Clear all effects
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
      if (effect.particles) {
        this.scene.remove(effect.particles)
      }
      if (effect.flash) {
        this.scene.remove(effect.flash)
      }
      if (effect.glow) {
        this.scene.remove(effect.glow)
      }
    })
    
    // Clear trails
    this.projectileTrails.forEach(trail => {
      trail.destroy()
    })
    
    // Clear frost auras
    this.frostAuras.forEach((aura, id) => {
      this.scene.remove(aura.group)
      aura.group.traverse(child => {
        if (child.geometry) child.geometry.dispose()
        if (child.material) child.material.dispose()
      })
    })
    
    // Clear fire rings
    this.fireRings.forEach((fire, id) => {
      this.scene.remove(fire.mesh)
      fire.mesh.geometry.dispose()
      fire.mesh.material.dispose()
    })
    
    // Clear shared geometries
    Object.values(this.sharedGeometries).forEach(geom => {
      geom.dispose()
    })
    
    this.activeEffects = []
    this.projectileTrails.clear()
    this.frostAuras.clear()
    this.fireRings.clear()
  }
}
