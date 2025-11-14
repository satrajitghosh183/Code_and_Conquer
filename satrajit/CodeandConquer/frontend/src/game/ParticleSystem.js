import * as THREE from 'three'

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene
    this.particles = []
  }

  createExplosion(position, count, color) {
    for (let i = 0; i < count; i++) {
      const particle = {
        position: position.clone(),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 10,
          Math.random() * 10,
          (Math.random() - 0.5) * 10
        ),
        life: 1.0,
        decay: Math.random() * 0.02 + 0.01,
        mesh: null
      }

      const geo = new THREE.SphereGeometry(0.1, 4, 4)
      const mat = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 2
      })
      particle.mesh = new THREE.Mesh(geo, mat)
      particle.mesh.position.copy(particle.position)
      this.scene.add(particle.mesh)

      this.particles.push(particle)
    }
  }

  update(deltaTime) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i]

      particle.position.add(particle.velocity.clone().multiplyScalar(deltaTime))
      particle.velocity.y -= 9.8 * deltaTime // Gravity
      particle.life -= particle.decay

      particle.mesh.position.copy(particle.position)
      particle.mesh.material.opacity = particle.life
      particle.mesh.scale.setScalar(particle.life)

      if (particle.life <= 0) {
        this.scene.remove(particle.mesh)
        particle.mesh.geometry.dispose()
        particle.mesh.material.dispose()
        this.particles.splice(i, 1)
      }
    }
  }
}

