/**
 * ParticleSystem.js - Visual Effects System
 * Explosions, trails, and particle effects
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
    const size = 0.1 + Math.random() * 0.3;
    
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
    
    const velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 12,
      Math.random() * 10 + 2,
      (Math.random() - 0.5) * 12
    );
    
    return {
      mesh: mesh,
      velocity: velocity,
      life: 1.0,
      decay: 0.5 + Math.random() * 1.0
    };
  }
  
  update(deltaTime) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      
      // Physics
      particle.velocity.y -= 18 * deltaTime;
      particle.mesh.position.add(
        particle.velocity.clone().multiplyScalar(deltaTime)
      );
      
      // Life
      particle.life -= particle.decay * deltaTime;
      
      // Visual updates
      particle.mesh.material.opacity = particle.life;
      particle.mesh.material.emissiveIntensity = 1.5 * particle.life;
      particle.mesh.scale.multiplyScalar(0.97);
      
      // Remove dead
      if (particle.life <= 0) {
        this.scene.remove(particle.mesh);
        particle.mesh.geometry.dispose();
        particle.mesh.material.dispose();
        this.particles.splice(i, 1);
      }
    }
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
