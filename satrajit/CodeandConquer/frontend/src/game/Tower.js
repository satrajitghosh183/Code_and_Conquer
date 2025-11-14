import * as THREE from 'three'

export class Tower {
  constructor(scene, position) {
    this.scene = scene
    this.position = position.clone()
    this.range = 10
    this.damage = 30
    this.fireRate = 1.5
    this.lastShotTime = 0
    this.target = null

    this.createMesh()
  }

  createMesh() {
    this.group = new THREE.Group()
    
    // Base
    const baseGeo = new THREE.CylinderGeometry(1, 1.2, 0.3, 8)
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      metalness: 0.9,
      roughness: 0.3
    })
    const base = new THREE.Mesh(baseGeo, baseMat)
    base.position.y = 0.15
    base.castShadow = true
    this.group.add(base)
    
    // Body
    const bodyGeo = new THREE.CylinderGeometry(0.6, 0.8, 1.8, 8)
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      emissive: 0x00ffff,
      emissiveIntensity: 0.5,
      metalness: 0.8,
      roughness: 0.2
    })
    const body = new THREE.Mesh(bodyGeo, bodyMat)
    body.position.y = 1.2
    body.castShadow = true
    this.group.add(body)
    this.body = body
    
    // Cannon
    const cannonGeo = new THREE.CylinderGeometry(0.15, 0.2, 1.2, 8)
    const cannonMat = new THREE.MeshStandardMaterial({
      color: 0xffff00,
      emissive: 0xffff00,
      emissiveIntensity: 0.8
    })
    const cannon = new THREE.Mesh(cannonGeo, cannonMat)
    cannon.rotation.x = Math.PI / 2
    cannon.position.y = 2
    cannon.position.z = 0.6
    cannon.castShadow = true
    this.group.add(cannon)
    this.cannon = cannon
    
    // Core
    const coreGeo = new THREE.SphereGeometry(0.3, 16, 16)
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      emissive: 0x00ffff,
      emissiveIntensity: 2,
      transparent: true,
      opacity: 0.8
    })
    const core = new THREE.Mesh(coreGeo, coreMat)
    core.position.y = 1.2
    this.group.add(core)
    this.core = core
    
    this.group.position.copy(this.position)
    this.scene.add(this.group)
    this.mesh = this.group
  }

  findTarget(enemies) {
    let closest = null
    let closestDist = Infinity

    for (let enemy of enemies) {
      if (enemy.isDead) continue
      const dist = this.mesh.position.distanceTo(enemy.mesh.position)
      if (dist <= this.range && dist < closestDist) {
        closest = enemy
        closestDist = dist
      }
    }

    return closest
  }

  update(deltaTime, enemies, scene, projectiles) {
    // Find target
    if (!this.target || this.target.isDead || 
        this.mesh.position.distanceTo(this.target.mesh.position) > this.range) {
      this.target = this.findTarget(enemies)
    }

    // Aim and shoot
    if (this.target) {
      const direction = new THREE.Vector3().subVectors(
        this.target.mesh.position,
        this.mesh.position
      )
      direction.y = 0
      direction.normalize()
      const angle = Math.atan2(direction.x, direction.z)
      this.body.rotation.y = angle
      this.cannon.rotation.y = angle

      const currentTime = performance.now() / 1000
      if (currentTime - this.lastShotTime >= 1 / this.fireRate) {
        this.shoot(scene, projectiles)
        this.lastShotTime = currentTime
      }
    } else {
      // Idle rotation
      this.body.rotation.y += deltaTime * 0.5
      this.cannon.rotation.y += deltaTime * 0.5
    }

    // Animate core
    const pulse = 1 + Math.sin(Date.now() * 0.005) * 0.3
    this.core.scale.set(pulse, pulse, pulse)
    this.core.rotation.x += deltaTime * 2
    this.core.rotation.y += deltaTime * 1.5
  }

  shoot(scene, projectiles) {
    if (!this.target) return

    const cannonTip = new THREE.Vector3(0, 0, 1.2)
    this.cannon.localToWorld(cannonTip)

    const projectile = {
      position: cannonTip.clone(),
      target: this.target,
      damage: this.damage,
      speed: 20,
      mesh: null
    }

    // Create projectile mesh
    const projGeo = new THREE.SphereGeometry(0.2, 8, 8)
    const projMat = new THREE.MeshStandardMaterial({
      color: 0xffff00,
      emissive: 0xffff00,
      emissiveIntensity: 2
    })
    projectile.mesh = new THREE.Mesh(projGeo, projMat)
    projectile.mesh.position.copy(cannonTip)
    scene.add(projectile.mesh)

    projectile.update = (deltaTime) => {
      if (!projectile.target || projectile.target.isDead) {
        projectile.shouldRemove = true
        return
      }

      const direction = new THREE.Vector3().subVectors(
        projectile.target.mesh.position,
        projectile.position
      )
      const distance = direction.length()

      if (distance < 0.5) {
        // Hit target
        projectile.target.takeDamage(projectile.damage)
        projectile.shouldRemove = true
        return
      }

      direction.normalize()
      projectile.position.add(direction.multiplyScalar(projectile.speed * deltaTime))
      projectile.mesh.position.copy(projectile.position)
    }

    projectile.destroy = () => {
      if (projectile.mesh) {
        scene.remove(projectile.mesh)
        projectile.mesh.geometry.dispose()
        projectile.mesh.material.dispose()
      }
    }

    projectiles.push(projectile)
  }

  destroy() {
    this.scene.remove(this.mesh)
    this.mesh.traverse(child => {
      if (child.geometry) child.geometry.dispose()
      if (child.material) child.material.dispose()
    })
  }
}

