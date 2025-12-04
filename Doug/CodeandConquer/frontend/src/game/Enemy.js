import * as THREE from 'three'

export class Enemy {
  constructor(scene, startPos, targetPos) {
    this.scene = scene
    this.startPos = startPos.clone()
    this.targetPos = targetPos.clone()
    this.health = 100
    this.maxHealth = 100
    this.speed = 2
    this.isDead = false
    this.reachedEnd = false
    this.position = startPos.clone()

    this.createMesh()
  }

  createMesh() {
    // Enemy body
    const bodyGeo = new THREE.BoxGeometry(1, 1, 1)
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 0.5
    })
    this.mesh = new THREE.Mesh(bodyGeo, bodyMat)
    this.mesh.position.copy(this.position)
    this.mesh.castShadow = true
    this.scene.add(this.mesh)

    // Health bar
    const barGeo = new THREE.PlaneGeometry(1, 0.2)
    const barMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    this.healthBar = new THREE.Mesh(barGeo, barMat)
    this.healthBar.position.copy(this.position)
    this.healthBar.position.y = 1.5
    this.healthBar.lookAt(this.healthBar.position.clone().add(new THREE.Vector3(0, 0, -1)))
    this.scene.add(this.healthBar)
  }

  update(deltaTime) {
    if (this.isDead || this.reachedEnd) return

    // Move towards target
    const direction = new THREE.Vector3().subVectors(this.targetPos, this.position)
    const distance = direction.length()

    if (distance < 1) {
      this.reachedEnd = true
      return
    }

    direction.normalize()
    this.position.add(direction.multiplyScalar(this.speed * deltaTime))
    this.mesh.position.copy(this.position)
    this.healthBar.position.copy(this.position)
    this.healthBar.position.y = 1.5

    // Update health bar
    const healthPercent = this.health / this.maxHealth
    this.healthBar.scale.x = healthPercent
    this.healthBar.material.color.setHex(healthPercent > 0.5 ? 0x00ff00 : 0xff0000)
  }

  takeDamage(amount) {
    this.health -= amount
    if (this.health <= 0) {
      this.isDead = true
    }
  }

  destroy() {
    this.scene.remove(this.mesh)
    this.scene.remove(this.healthBar)
    this.mesh.geometry.dispose()
    this.mesh.material.dispose()
    this.healthBar.geometry.dispose()
    this.healthBar.material.dispose()
  }
}

