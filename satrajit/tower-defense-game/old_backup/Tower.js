/**
 * Tower.js - Tower Defense Structure
 * Handles tower creation, targeting, and shooting mechanics
 */

import * as THREE from 'three';
import { Projectile } from './Projectile.js';

export class Tower {
  constructor(scene, position) {
    this.scene = scene;
    this.position = position.clone();
    this.range = 8;
    this.damage = 25;
    this.fireRate = 1; // Shots per second
    this.lastShotTime = 0;
    this.target = null;
    
    this.createMesh();
  }
  
  /**
   * Create the visual representation of the tower
   */
  createMesh() {
    // Tower base
    const baseGeometry = new THREE.CylinderGeometry(0.8, 1, 0.5, 8);
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      emissive: 0x00ffff,
      emissiveIntensity: 0.3,
      metalness: 0.8,
      roughness: 0.2
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 0.25;
    base.castShadow = true;
    
    // Tower body (main cylinder)
    const bodyGeometry = new THREE.CylinderGeometry(0.5, 0.6, 1.5, 8);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x0088ff,
      emissive: 0x0044ff,
      emissiveIntensity: 0.5,
      metalness: 0.7,
      roughness: 0.3
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 1.25;
    body.castShadow = true;
    
    // Tower cannon (turret)
    const cannonGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.8, 8);
    const cannonMaterial = new THREE.MeshStandardMaterial({
      color: 0xffff00,
      emissive: 0xffff00,
      emissiveIntensity: 0.6,
      metalness: 0.9,
      roughness: 0.1
    });
    const cannon = new THREE.Mesh(cannonGeometry, cannonMaterial);
    cannon.rotation.x = Math.PI / 2;
    cannon.position.y = 1.8;
    cannon.position.z = 0.4;
    cannon.castShadow = true;
    
    // Range indicator (visible circle on ground)
    const rangeGeometry = new THREE.RingGeometry(this.range - 0.1, this.range, 32);
    const rangeMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide
    });
    const rangeIndicator = new THREE.Mesh(rangeGeometry, rangeMaterial);
    rangeIndicator.rotation.x = -Math.PI / 2;
    rangeIndicator.position.y = 0.1;
    
    // Group all parts together
    this.mesh = new THREE.Group();
    this.mesh.add(base);
    this.mesh.add(body);
    this.mesh.add(cannon);
    this.mesh.add(rangeIndicator);
    this.mesh.position.copy(this.position);
    
    this.cannon = cannon;
    this.body = body;
    this.rangeIndicator = rangeIndicator;
    
    this.scene.add(this.mesh);
  }
  
  /**
   * Find the closest enemy within range
   */
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
  
  /**
   * Rotate tower to face target
   */
  aimAtTarget() {
    if (!this.target) return;
    
    const direction = new THREE.Vector3();
    direction.subVectors(this.target.mesh.position, this.mesh.position);
    direction.y = 0; // Keep rotation on horizontal plane
    direction.normalize();
    
    const angle = Math.atan2(direction.x, direction.z);
    this.body.rotation.y = angle;
    this.cannon.rotation.y = angle;
  }
  
  /**
   * Check if tower can shoot (based on fire rate)
   */
  canShoot() {
    const currentTime = performance.now() / 1000;
    return currentTime - this.lastShotTime >= 1 / this.fireRate;
  }
  
  /**
   * Create and return a projectile
   */
  shoot() {
    if (!this.target) return null;
    
    this.lastShotTime = performance.now() / 1000;
    
    // Create projectile from cannon position
    const projectileStart = this.cannon.getWorldPosition(new THREE.Vector3());
    const projectile = new Projectile(
      this.scene,
      projectileStart,
      this.target,
      this.damage
    );
    
    // Visual feedback - flash the cannon
    this.cannon.material.emissiveIntensity = 1.5;
    setTimeout(() => {
      if (this.cannon && this.cannon.material) {
        this.cannon.material.emissiveIntensity = 0.6;
      }
    }, 100);
    
    return projectile;
  }
  
  /**
   * Update tower logic each frame
   */
  update(deltaTime, enemies) {
    // Find new target if current target is invalid
    if (!this.target || this.target.isDead || 
        this.mesh.position.distanceTo(this.target.mesh.position) > this.range) {
      this.target = this.findTarget(enemies);
    }
    
    // Aim at target
    if (this.target) {
      this.aimAtTarget();
      // Pulse range indicator when targeting
      this.rangeIndicator.material.opacity = 0.2 + Math.sin(Date.now() * 0.005) * 0.1;
    } else {
      // Slowly rotate when idle
      this.body.rotation.y += deltaTime * 0.5;
      this.cannon.rotation.y += deltaTime * 0.5;
      this.rangeIndicator.material.opacity = 0.1;
    }
    
    // Pulse emissive glow
    this.body.material.emissiveIntensity = 0.5 + Math.sin(Date.now() * 0.003) * 0.2;
  }
  
  /**
   * Clean up tower when destroyed
   */
  destroy() {
    this.scene.remove(this.mesh);
    this.mesh.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  }
}