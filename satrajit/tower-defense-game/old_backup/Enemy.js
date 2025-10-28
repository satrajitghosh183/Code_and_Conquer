/**
 * Enemy.js - Enemy Unit
 * Handles enemy movement along path, health, and visual representation
 */

import * as THREE from 'three';

export class Enemy {
  constructor(scene, path, wave) {
    this.scene = scene;
    this.path = path.map(p => p.clone());
    this.wave = wave;
    
    // Enemy stats scale with wave
    this.maxHealth = 50 + (wave - 1) * 20;
    this.health = this.maxHealth;
    this.speed = 2 + wave * 0.2;
    this.scoreValue = 10 * wave;
    
    this.currentPathIndex = 0;
    this.isDead = false;
    this.reachedEnd = false;
    
    this.createMesh();
  }
  
  /**
   * Create visual representation of the enemy
   */
  createMesh() {
    // Enemy body (sphere with spikes for alien look)
    const bodyGeometry = new THREE.SphereGeometry(0.5, 8, 8);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 0.5,
      metalness: 0.3,
      roughness: 0.7
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    
    // Add spikes for menacing look
    const spikeGeometry = new THREE.ConeGeometry(0.15, 0.5, 4);
    const spikeMaterial = new THREE.MeshStandardMaterial({
      color: 0xff3333,
      emissive: 0xff0000,
      emissiveIntensity: 0.7
    });
    
    const spikePositions = [
      [0.5, 0, 0],
      [-0.5, 0, 0],
      [0, 0.5, 0],
      [0, -0.5, 0],
      [0, 0, 0.5],
      [0, 0, -0.5]
    ];
    
    spikePositions.forEach(pos => {
      const spike = new THREE.Mesh(spikeGeometry, spikeMaterial);
      spike.position.set(...pos);
      spike.lookAt(0, 0, 0);
      body.add(spike);
    });
    
    // Health bar background
    const healthBarBg = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 0.1),
      new THREE.MeshBasicMaterial({ color: 0x330000 })
    );
    healthBarBg.position.y = 1;
    
    // Health bar foreground
    const healthBarFg = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 0.1),
      new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );
    healthBarFg.position.y = 1;
    healthBarFg.position.z = 0.01;
    
    this.mesh = new THREE.Group();
    this.mesh.add(body);
    this.mesh.add(healthBarBg);
    this.mesh.add(healthBarFg);
    
    this.body = body;
    this.healthBarFg = healthBarFg;
    
    // Start at first path point
    this.mesh.position.copy(this.path[0]);
    this.scene.add(this.mesh);
  }
  
  /**
   * Move enemy along the path
   */
  move(deltaTime) {
    if (this.currentPathIndex >= this.path.length - 1) {
      this.reachedEnd = true;
      return;
    }
    
    const target = this.path[this.currentPathIndex + 1];
    const direction = new THREE.Vector3();
    direction.subVectors(target, this.mesh.position);
    
    const distance = direction.length();
    direction.normalize();
    
    const moveDistance = this.speed * deltaTime;
    
    if (moveDistance >= distance) {
      // Reached waypoint, move to next
      this.mesh.position.copy(target);
      this.currentPathIndex++;
    } else {
      // Move towards waypoint
      this.mesh.position.add(direction.multiplyScalar(moveDistance));
    }
    
    // Rotate to face movement direction
    if (direction.length() > 0) {
      const angle = Math.atan2(direction.x, direction.z);
      this.mesh.rotation.y = angle;
    }
  }
  
  /**
   * Take damage and update health bar
   */
  takeDamage(amount) {
    this.health -= amount;
    
    if (this.health <= 0) {
      this.health = 0;
      this.isDead = true;
      this.destroy();
    }
    
    // Update health bar
    const healthPercent = this.health / this.maxHealth;
    this.healthBarFg.scale.x = healthPercent;
    this.healthBarFg.position.x = -(1 - healthPercent) / 2;
    
    // Flash red when hit
    this.body.material.emissiveIntensity = 1.2;
    setTimeout(() => {
      if (this.body && this.body.material) {
        this.body.material.emissiveIntensity = 0.5;
      }
    }, 100);
  }
  
  /**
   * Update enemy each frame
   */
  update(deltaTime) {
    if (this.isDead || this.reachedEnd) return;
    
    this.move(deltaTime);
    
    // Rotate body for effect
    this.body.rotation.y += deltaTime * 2;
    
    // Pulse health bar
    this.healthBarBg.lookAt(this.scene.children[0].position); // Look at camera
    this.healthBarFg.lookAt(this.scene.children[0].position);
  }
  
  /**
   * Remove enemy from scene
   */
  destroy() {
    // Death animation - explode into particles
    const particleCount = 10;
    for (let i = 0; i < particleCount; i++) {
      const particle = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 4, 4),
        new THREE.MeshBasicMaterial({ color: 0xff0000 })
      );
      particle.position.copy(this.mesh.position);
      this.scene.add(particle);
      
      // Animate particles
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 5,
        Math.random() * 5,
        (Math.random() - 0.5) * 5
      );
      
      const animate = () => {
        particle.position.add(velocity.multiplyScalar(0.05));
        velocity.y -= 0.2; // Gravity
        particle.scale.multiplyScalar(0.95);
        
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