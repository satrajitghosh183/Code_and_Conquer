/**
 * Enemy.js - Attacking Units
 * Enemies sent by players to attack opponent's base
 */

import * as THREE from 'three';

export class Enemy {
  constructor(game, targetPlayer, path) {
    this.game = game;
    this.targetPlayer = targetPlayer;
    this.path = path.map(p => p.clone());
    
    // Stats
    this.maxHealth = 100;
    this.health = this.maxHealth;
    this.speed = 4;
    this.scoreValue = 25;
    
    this.currentPathIndex = 0;
    this.isDead = false;
    this.reachedEnd = false;
    
    this.createMesh();
  }
  
  createMesh() {
    this.group = new THREE.Group();
    
    // Main body - menacing sphere
    const bodyGeo = new THREE.IcosahedronGeometry(0.6, 0);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 0.8,
      metalness: 0.7,
      roughness: 0.3
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = true;
    this.group.add(body);
    this.body = body;
    
    // Energy core
    const coreGeo = new THREE.SphereGeometry(0.4, 16, 16);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xff3333,
      emissive: 0xff0000,
      emissiveIntensity: 2,
      transparent: true,
      opacity: 0.6
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    this.group.add(core);
    this.core = core;
    
    // Spikes
    const spikeGeo = new THREE.ConeGeometry(0.15, 0.6, 4);
    const spikeMat = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 1
    });
    
    for (let i = 0; i < 8; i++) {
      const spike = new THREE.Mesh(spikeGeo, spikeMat);
      const angle = (i / 8) * Math.PI * 2;
      spike.position.x = Math.cos(angle) * 0.6;
      spike.position.z = Math.sin(angle) * 0.6;
      spike.lookAt(0, 0, 0);
      spike.rotateX(Math.PI / 2);
      this.group.add(spike);
    }
    
    // Point light
    const light = new THREE.PointLight(0xff0000, 2, 8);
    this.group.add(light);
    this.light = light;
    
    // Health bar
    this.createHealthBar();
    
    // Trail effect
    this.createTrail();
    
    // Start at first waypoint
    this.group.position.copy(this.path[0]);
    this.game.scene.add(this.group);
    this.mesh = this.group;
  }
  
  createHealthBar() {
    // Background
    const bgGeo = new THREE.PlaneGeometry(1.2, 0.15);
    const bgMat = new THREE.MeshBasicMaterial({ 
      color: 0x330000,
      side: THREE.DoubleSide
    });
    this.healthBg = new THREE.Mesh(bgGeo, bgMat);
    this.healthBg.position.y = 1.2;
    this.group.add(this.healthBg);
    
    // Foreground
    const fgGeo = new THREE.PlaneGeometry(1.2, 0.15);
    const fgMat = new THREE.MeshBasicMaterial({ 
      color: 0xff0000,
      side: THREE.DoubleSide
    });
    this.healthFg = new THREE.Mesh(fgGeo, fgMat);
    this.healthFg.position.y = 1.2;
    this.healthFg.position.z = 0.01;
    this.group.add(this.healthFg);
  }
  
  createTrail() {
    const trailGeo = new THREE.SphereGeometry(0.3, 8, 8);
    const trailMat = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.3
    });
    this.trail = new THREE.Mesh(trailGeo, trailMat);
    this.group.add(this.trail);
  }
  
  move(deltaTime) {
    if (this.currentPathIndex >= this.path.length - 1) {
      this.reachedEnd = true;
      return;
    }
    
    const target = this.path[this.currentPathIndex + 1];
    const direction = new THREE.Vector3().subVectors(target, this.mesh.position);
    const distance = direction.length();
    direction.normalize();
    
    const moveDistance = this.speed * deltaTime;
    
    if (moveDistance >= distance) {
      this.mesh.position.copy(target);
      this.currentPathIndex++;
    } else {
      this.mesh.position.add(direction.multiplyScalar(moveDistance));
    }
    
    // Face movement direction
    if (direction.length() > 0) {
      const angle = Math.atan2(direction.x, direction.z);
      this.body.rotation.y = angle;
    }
  }
  
  takeDamage(amount) {
    this.health -= amount;
    
    if (this.health <= 0) {
      this.health = 0;
      this.isDead = true;
      
      // Award kill to defender
      this.targetPlayer.addKill();
      this.targetPlayer.addCredits(25);
      
      this.destroy();
      return;
    }
    
    // Update health bar
    const healthPercent = this.health / this.maxHealth;
    this.healthFg.scale.x = healthPercent;
    this.healthFg.position.x = -(1.2 * (1 - healthPercent)) / 2;
    
    // Flash effect
    this.body.material.emissiveIntensity = 2;
    this.light.intensity = 5;
    setTimeout(() => {
      if (this.body) {
        this.body.material.emissiveIntensity = 0.8;
        this.light.intensity = 2;
      }
    }, 100);
  }
  
  update(deltaTime) {
    if (this.isDead || this.reachedEnd) return;
    
    this.move(deltaTime);
    
    // Animate body
    this.body.rotation.x += deltaTime * 3;
    this.body.rotation.z += deltaTime * 2;
    
    // Pulse core
    const pulse = 1 + Math.sin(Date.now() * 0.008) * 0.3;
    this.core.scale.set(pulse, pulse, pulse);
    
    // Animate trail
    this.trail.scale.set(1.2, 1.2, 1.2);
    this.trail.material.opacity = 0.3 + Math.sin(Date.now() * 0.005) * 0.1;
    
    // Billboarding health bar
    this.healthBg.lookAt(this.game.camera.position);
    this.healthFg.lookAt(this.game.camera.position);
  }
  
  destroy() {
    if (!this.isDead) return;
    
    // Epic death explosion
    this.game.particleSystem.createExplosion(
      this.mesh.position.clone(),
      40,
      0xff0000
    );
    
    // Shockwave ring
    const ringGeo = new THREE.RingGeometry(0.1, 3, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(this.mesh.position);
    ring.position.y = 0.1;
    ring.rotation.x = -Math.PI / 2;
    this.game.scene.add(ring);
    
    // Animate ring
    let scale = 1;
    const animateRing = () => {
      scale += 0.1;
      ring.scale.set(scale, scale, 1);
      ring.material.opacity = Math.max(0, 0.8 - scale * 0.15);
      
      if (ring.material.opacity > 0) {
        requestAnimationFrame(animateRing);
      } else {
        this.game.scene.remove(ring);
        ring.geometry.dispose();
        ring.material.dispose();
      }
    };
    animateRing();
    
    // Remove mesh
    this.game.scene.remove(this.mesh);
    this.mesh.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  }
}