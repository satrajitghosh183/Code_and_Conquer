/**
 * Projectile.js - Tower Projectile
 * Handles projectile movement and collision with enemies
 */

import * as THREE from 'three';

export class Projectile {
  constructor(scene, startPosition, target, damage) {
    this.scene = scene;
    this.target = target;
    this.damage = damage;
    this.speed = 15;
    
    this.createMesh(startPosition);
  }
  
  /**
   * Create glowing projectile mesh
   */
  createMesh(startPosition) {
    // Main projectile sphere
    const geometry = new THREE.SphereGeometry(0.2, 8, 8);
    const material = new THREE.MeshStandardMaterial({
      color: 0xffff00,
      emissive: 0xffff00,
      emissiveIntensity: 1.5,
      metalness: 0.8,
      roughness: 0.2
    });
    
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(startPosition);
    this.mesh.castShadow = false;
    
    // Add point light for glow effect
    const light = new THREE.PointLight(0xffff00, 2, 5);
    this.mesh.add(light);
    
    // Add trail effect
    const trailGeometry = new THREE.SphereGeometry(0.15, 6, 6);
    const trailMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.4
    });
    this.trail = new THREE.Mesh(trailGeometry, trailMaterial);
    this.mesh.add(this.trail);
    
    this.scene.add(this.mesh);
  }
  
  /**
   * Update projectile position each frame
   */
  update(deltaTime) {
    if (!this.target || this.target.isDead) {
      return;
    }
    
    // Calculate direction to target
    const targetPos = this.target.mesh.position.clone();
    targetPos.y += 0.5; // Aim for center of enemy
    
    const direction = new THREE.Vector3();
    direction.subVectors(targetPos, this.mesh.position);
    direction.normalize();
    
    // Move towards target
    this.mesh.position.add(direction.multiplyScalar(this.speed * deltaTime));
    
    // Rotate projectile to face direction
    this.mesh.lookAt(targetPos);
    
    // Animate trail
    if (this.trail) {
      this.trail.scale.set(
        1 + Math.sin(Date.now() * 0.01) * 0.3,
        1 + Math.sin(Date.now() * 0.01) * 0.3,
        1 + Math.sin(Date.now() * 0.01) * 0.3
      );
    }
  }
  
  /**
   * Remove projectile from scene
   */
  destroy() {
    // Create small explosion effect
    const particleCount = 5;
    for (let i = 0; i < particleCount; i++) {
      const particle = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 4, 4),
        new THREE.MeshBasicMaterial({ color: 0xffff00 })
      );
      particle.position.copy(this.mesh.position);
      this.scene.add(particle);
      
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      );
      
      const animate = () => {
        particle.position.add(velocity.multiplyScalar(0.1));
        particle.scale.multiplyScalar(0.9);
        
        if (particle.scale.x > 0.01) {
          requestAnimationFrame(animate);
        } else {
          this.scene.remove(particle);
          particle.geometry.dispose();
          particle.material.dispose();
        }
      };
      animate();
    }
    
    this.scene.remove(this.mesh);
    this.mesh.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  }
}