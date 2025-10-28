/**
 * Tower.js - Advanced Tower System
 * Beautiful towers with advanced targeting and effects
 */

import * as THREE from 'three';
import { Projectile } from './Projectile.js';

export class Tower {
  constructor(game, owner, position) {
    this.game = game;
    this.owner = owner;
    this.position = position.clone();
    
    // Stats
    this.range = 10;
    this.damage = 30;
    this.fireRate = 1.5;
    this.lastShotTime = 0;
    this.target = null;
    
    // Visual
    this.color = owner.playerNum === 1 ? 0x00ffff : 0xff00ff;
    
    this.createMesh();
    this.createRangeIndicator();
  }
  
  createMesh() {
    this.group = new THREE.Group();
    
    // Base platform
    const baseGeo = new THREE.CylinderGeometry(1, 1.2, 0.3, 8);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      metalness: 0.9,
      roughness: 0.3
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.15;
    base.castShadow = true;
    this.group.add(base);
    
    // Main body
    const bodyGeo = new THREE.CylinderGeometry(0.6, 0.8, 1.8, 8);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: this.color,
      emissive: this.color,
      emissiveIntensity: 0.5,
      metalness: 0.8,
      roughness: 0.2
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.2;
    body.castShadow = true;
    this.group.add(body);
    this.body = body;
    
    // Rotating ring
    const ringGeo = new THREE.TorusGeometry(0.7, 0.1, 8, 16);
    const ringMat = new THREE.MeshStandardMaterial({
      color: this.color,
      emissive: this.color,
      emissiveIntensity: 1,
      metalness: 1,
      roughness: 0
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 1.2;
    ring.rotation.x = Math.PI / 2;
    this.group.add(ring);
    this.ring = ring;
    
    // Cannon turret
    const cannonGeo = new THREE.CylinderGeometry(0.15, 0.2, 1.2, 8);
    const cannonMat = new THREE.MeshStandardMaterial({
      color: 0xffff00,
      emissive: 0xffff00,
      emissiveIntensity: 0.8,
      metalness: 0.9,
      roughness: 0.1
    });
    const cannon = new THREE.Mesh(cannonGeo, cannonMat);
    cannon.rotation.x = Math.PI / 2;
    cannon.position.y = 2;
    cannon.position.z = 0.6;
    cannon.castShadow = true;
    this.group.add(cannon);
    this.cannon = cannon;
    
    // Cannon tip glow
    const glowGeo = new THREE.SphereGeometry(0.25, 8, 8);
    const glowMat = new THREE.MeshStandardMaterial({
      color: 0xffff00,
      emissive: 0xffff00,
      emissiveIntensity: 2
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.z = 1.2;
    cannon.add(glow);
    this.cannonGlow = glow;
    
    // Energy core
    const coreGeo = new THREE.SphereGeometry(0.3, 16, 16);
    const coreMat = new THREE.MeshStandardMaterial({
      color: this.color,
      emissive: this.color,
      emissiveIntensity: 2,
      transparent: true,
      opacity: 0.8
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.y = 1.2;
    this.group.add(core);
    this.core = core;
    
    // Point light
    const light = new THREE.PointLight(this.color, 2, 15);
    light.position.y = 2;
    this.group.add(light);
    this.light = light;
    
    this.group.position.copy(this.position);
    this.game.scene.add(this.group);
    this.mesh = this.group;
  }
  
  createRangeIndicator() {
    const ringGeo = new THREE.RingGeometry(this.range - 0.2, this.range, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: this.color,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide
    });
    this.rangeRing = new THREE.Mesh(ringGeo, ringMat);
    this.rangeRing.rotation.x = -Math.PI / 2;
    this.rangeRing.position.copy(this.position);
    this.rangeRing.position.y = 0.1;
    this.game.scene.add(this.rangeRing);
  }
  
  findTarget(enemies) {
    let closestEnemy = null;
    let closestDistance = Infinity;
    
    for (let enemy of enemies) {
      if (enemy.isDead) continue;
      
      const distance = this.mesh.position.distanceTo(enemy.mesh.position);
      
      if (distance <= this.range && distance < closestDistance) {
        closestEnemy = enemy;
        closestDistance = distance;
      }
    }
    
    return closestEnemy;
  }
  
  aimAtTarget() {
    if (!this.target) return;
    
    const targetPos = this.target.mesh.position.clone();
    const direction = new THREE.Vector3().subVectors(targetPos, this.mesh.position);
    direction.y = 0;
    direction.normalize();
    
    const angle = Math.atan2(direction.x, direction.z);
    this.body.rotation.y = angle;
    this.cannon.rotation.y = angle;
    
    // Aim cannon up/down
    const heightDiff = targetPos.y - this.cannon.position.y;
    const distance = this.mesh.position.distanceTo(targetPos);
    const pitchAngle = Math.atan2(heightDiff, distance);
    this.cannon.rotation.x = Math.PI / 2 - pitchAngle;
  }
  
  canShoot() {
    const currentTime = performance.now() / 1000;
    return currentTime - this.lastShotTime >= 1 / this.fireRate;
  }
  
  shoot() {
    if (!this.target) return;
    
    this.lastShotTime = performance.now() / 1000;
    
    // Get cannon tip world position
    const cannonTip = new THREE.Vector3(0, 0, 1.2);
    this.cannon.localToWorld(cannonTip);
    
    // Create projectile
    const projectile = new Projectile(
      this.game,
      this.owner,
      cannonTip,
      this.target,
      this.damage
    );
    this.owner.projectiles.push(projectile);
    
    // Muzzle flash
    this.cannonGlow.scale.set(2, 2, 2);
    this.light.intensity = 5;
    setTimeout(() => {
      this.cannonGlow.scale.set(1, 1, 1);
      this.light.intensity = 2;
    }, 100);
    
    // Recoil effect
    const originalZ = this.cannon.position.z;
    this.cannon.position.z -= 0.2;
    setTimeout(() => {
      this.cannon.position.z = originalZ;
    }, 100);
  }
  
  update(deltaTime, enemies) {
    // Find/validate target
    if (!this.target || this.target.isDead || 
        this.mesh.position.distanceTo(this.target.mesh.position) > this.range) {
      this.target = this.findTarget(enemies);
    }
    
    // Aim and shoot
    if (this.target) {
      this.aimAtTarget();
      if (this.canShoot()) {
        this.shoot();
      }
      this.rangeRing.material.opacity = 0.25;
    } else {
      // Idle rotation
      this.body.rotation.y += deltaTime * 0.5;
      this.cannon.rotation.y += deltaTime * 0.5;
      this.rangeRing.material.opacity = 0.15;
    }
    
    // Animate ring
    this.ring.rotation.z += deltaTime * 3;
    
    // Pulse core
    const pulse = 1 + Math.sin(Date.now() * 0.005) * 0.3;
    this.core.scale.set(pulse, pulse, pulse);
    this.core.rotation.x += deltaTime * 2;
    this.core.rotation.y += deltaTime * 1.5;
    
    // Update projectiles
    for (let i = this.owner.projectiles.length - 1; i >= 0; i--) {
      const proj = this.owner.projectiles[i];
      proj.update(deltaTime);
      
      if (proj.shouldRemove) {
        proj.destroy();
        this.owner.projectiles.splice(i, 1);
      }
    }
  }
  
  destroy() {
    this.game.scene.remove(this.mesh);
    this.game.scene.remove(this.rangeRing);
    
    // Destruction particles
    this.game.particleSystem.createExplosion(
      this.position.clone().add(new THREE.Vector3(0, 1, 0)),
      30,
      this.color
    );
    
    this.mesh.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  }
}