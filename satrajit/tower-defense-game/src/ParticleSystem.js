/**
 * ParticleSystem.js - Advanced Particle Effects
 * Beautiful particle explosions and effects
 */

import * as THREE from 'three';

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
  }
  
  createExplosion(position, count, color) {
    for (let i = 0; i < count; i++) {
      const particle = this.createParticle(position, color);
      this.particles.push(particle);
    }
  }
  
  createParticle(position, color) {
    // Random size
    const size = 0.1 + Math.random() * 0.3;
    
    // Particle mesh
    const geometry = new THREE.SphereGeometry(size, 6, 6);
    const material = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 1.5,
      transparent: true,
      opacity: 1
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    this.scene.add(mesh);
    
    // Random velocity
    const velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 10,
      Math.random() * 8 + 2,
      (Math.random() - 0.5) * 10
    );
    
    // Particle data
    const particle = {
      mesh: mesh,
      velocity: velocity,
      life: 1.0,
      decay: 0.5 + Math.random() * 1.0
    };
    
    return particle;
  }
  
  update(deltaTime) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      
      // Update physics
      particle.velocity.y -= 15 * deltaTime; // Gravity
      particle.mesh.position.add(
        particle.velocity.clone().multiplyScalar(deltaTime)
      );
      
      // Update life
      particle.life -= particle.decay * deltaTime;
      
      // Update visuals
      particle.mesh.material.opacity = particle.life;
      particle.mesh.material.emissiveIntensity = 1.5 * particle.life;
      particle.mesh.scale.multiplyScalar(0.98);
      
      // Remove dead particles
      if (particle.life <= 0) {
        this.scene.remove(particle.mesh);
        particle.mesh.geometry.dispose();
        particle.mesh.material.dispose();
        this.particles.splice(i, 1);
      }
    }
  }
  
  createTrail(position, color) {
    const particle = this.createParticle(position, color);
    particle.decay = 2.0;
    particle.velocity.multiplyScalar(0.2);
    this.particles.push(particle);
  }
  
  clear() {
    this.particles.forEach(particle => {
      this.scene.remove(particle.mesh);
      particle.mesh.geometry.dispose();
      particle.mesh.material.dispose();
    });
    this.particles = [];
  }
}