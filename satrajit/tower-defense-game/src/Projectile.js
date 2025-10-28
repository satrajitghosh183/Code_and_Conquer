/**
 * Projectile.js - Homing Projectiles
 * Beautiful energy projectiles with trails and effects
 */

import * as THREE from 'three';

export class Projectile {
  constructor(game, owner, startPosition, target, damage) {
    this.game = game;
    this.owner = owner;
    this.target = target;
    this.damage = damage;
    this.speed = 20;
    this.shouldRemove = false;
    
    this.createMesh(startPosition);
  }
  
  createMesh(startPosition) {
    this.group = new THREE.Group();
    
    // Main projectile core
    const coreGeo = new THREE.SphereGeometry(0.25, 12, 12);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xffff00,
      emissive: 0xffff00,
      emissiveIntensity: 2,
      metalness: 1,
      roughness: 0
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    this.group.add(core);
    this.core = core;
    
    // Outer glow shell
    const glowGeo = new THREE.SphereGeometry(0.4, 12, 12);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    this.group.add(glow);
    this.glow = glow;
    
    // Point light
    const light = new THREE.PointLight(0xffff00, 3, 10);
    this.group.add(light);
    this.light = light;
    
    // Trail particles
    this.trailParticles = [];
    for (let i = 0; i < 5; i++) {
      const trailGeo = new THREE.SphereGeometry(0.15 - i * 0.02, 8, 8);
      const trailMat = new THREE.MeshBasicMaterial({
        color: 0xffff00,
        transparent: true,
        opacity: 0.6 - i * 0.1
      });
      const trail = new THREE.Mesh(trailGeo, trailMat);
      this.group.add(trail);
      this.trailParticles.push(trail);
    }
    
    this.group.position.copy(startPosition);
    this.game.scene.add(this.group);
    this.mesh = this.group;
  }
  
  update(deltaTime) {
    if (!this.target || this.target.isDead) {
      this.shouldRemove = true;
      return;
    }
    
    // Home towards target
    const targetPos = this.target.mesh.position.clone();
    targetPos.y += 0.5;
    
    const direction = new THREE.Vector3().subVectors(targetPos, this.mesh.position);
    const distance = direction.length();
    direction.normalize();
    
    // Move
    this.mesh.position.add(direction.multiplyScalar(this.speed * deltaTime));
    
    // Orient to direction
    this.mesh.lookAt(targetPos);
    
    // Animate
    this.core.rotation.x += deltaTime * 10;
    this.core.rotation.y += deltaTime * 8;
    
    const pulse = 1 + Math.sin(Date.now() * 0.02) * 0.3;
    this.glow.scale.set(pulse, pulse, pulse);
    
    // Update trail
    this.trailParticles.forEach((trail, i) => {
      const offset = -i * 0.3;
      trail.position.z = offset;
      trail.scale.set(
        1 - i * 0.15,
        1 - i * 0.15,
        1 - i * 0.15
      );
    });
    
    // Check collision
    if (distance < 0.5) {
      this.target.takeDamage(this.damage);
      this.shouldRemove = true;
      
      // Impact effect
      this.game.particleSystem.createExplosion(
        this.mesh.position.clone(),
        15,
        0xffff00
      );
    }
    
    // Remove if too far
    if (distance > 50) {
      this.shouldRemove = true;
    }
  }
  
  destroy() {
    this.game.scene.remove(this.mesh);
    this.mesh.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  }
}