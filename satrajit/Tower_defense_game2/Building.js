/**
 * Building.js - Defensive Buildings (Towers, Cannons, etc.)
 * Clash Royale style buildings with lifetime and targeting
 */

import * as THREE from 'three';
import { GameConfig } from './GameConfig.js';

export class Building {
  constructor(game, owner, buildingId, position) {
    this.game = game;
    this.owner = owner;
    this.buildingId = buildingId;
    this.config = GameConfig.buildings[buildingId];
    this.isKingTower = buildingId === 'kingTower';
    this.isPrincessTower = buildingId === 'princessTower';
    
    // Building state
    this.health = this.config.health;
    this.maxHealth = this.config.health;
    this.isDead = false;
    this.isDeploying = !this.isKingTower && !this.isPrincessTower;
    this.deployTime = 1.0;
    
    // Combat
    this.target = null;
    this.lastAttackTime = 0;
    this.attackCooldown = 1 / this.config.attackSpeed;
    
    // Lifetime (for temporary buildings)
    this.lifetime = this.config.lifetime || -1;
    this.remainingLifetime = this.lifetime;
    
    // Inferno tower special
    this.infernoTarget = null;
    this.infernoDamage = this.config.damage;
    this.infernoRampTime = 0;
    
    // Tesla special (hidden)
    this.isHidden = this.config.hidden || false;
    this.hiddenYOffset = -2;
    
    this.createMesh(position);
    this.createHealthBar();
    this.createRangeIndicator();
  }
  
  createMesh(position) {
    this.group = new THREE.Group();
    
    const size = this.config.size;
    const color = this.config.color;
    
    if (this.isKingTower || this.isPrincessTower) {
      // Main tower structure
      this.createTowerMesh(size, color);
    } else {
      // Regular building
      this.createBuildingMesh(size, color);
    }
    
    this.group.position.copy(position);
    
    // Tesla starts hidden
    if (this.isHidden) {
      this.group.position.y = this.hiddenYOffset;
    }
    
    this.game.scene.add(this.group);
    this.mesh = this.group;
  }
  
  createTowerMesh(size, color) {
    // Base platform
    const baseGeo = new THREE.CylinderGeometry(size * 1.2, size * 1.4, size * 0.5, 8);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x333333,
      metalness: 0.8,
      roughness: 0.3
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = size * 0.25;
    base.castShadow = true;
    this.group.add(base);
    
    // Main tower body
    const bodyGeo = new THREE.CylinderGeometry(size, size * 1.1, size * 2, 8);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.5,
      metalness: 0.7,
      roughness: 0.3
    });
    this.body = new THREE.Mesh(bodyGeo, bodyMat);
    this.body.position.y = size * 1.25;
    this.body.castShadow = true;
    this.group.add(this.body);
    
    // Crystal/core on top
    const crystalGeo = new THREE.OctahedronGeometry(size * 0.6);
    const crystalMat = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 1.5,
      metalness: 1,
      roughness: 0
    });
    this.crystal = new THREE.Mesh(crystalGeo, crystalMat);
    this.crystal.position.y = size * 2.5;
    this.group.add(this.crystal);
    
    // Cannon turret
    this.createCannonTurret(size);
    
    // Point light
    const light = new THREE.PointLight(color, 3, 20);
    light.position.y = size * 2.5;
    this.group.add(light);
    this.light = light;
  }
  
  createBuildingMesh(size, color) {
    // Base
    const baseGeo = new THREE.CylinderGeometry(size, size * 1.2, 0.3, 8);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x222222,
      metalness: 0.9,
      roughness: 0.2
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.15;
    base.castShadow = true;
    this.group.add(base);
    
    // Main body
    let bodyGeo;
    if (this.buildingId === 'infernoTower') {
      bodyGeo = new THREE.ConeGeometry(size * 0.7, size * 2, 8);
    } else if (this.buildingId === 'tesla') {
      bodyGeo = new THREE.CylinderGeometry(size * 0.6, size * 0.8, size * 1.5, 8);
    } else {
      bodyGeo = new THREE.CylinderGeometry(size * 0.6, size * 0.8, size * 1.8, 8);
    }
    
    const bodyMat = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.5,
      metalness: 0.8,
      roughness: 0.3
    });
    this.body = new THREE.Mesh(bodyGeo, bodyMat);
    this.body.position.y = size;
    this.body.castShadow = true;
    this.group.add(this.body);
    
    // Create specific features
    if (this.config.targetAir && this.config.targetGround) {
      this.createCannonTurret(size);
    }
    
    // Energy core
    const coreGeo = new THREE.SphereGeometry(size * 0.4, 16, 16);
    const coreMat = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 2,
      transparent: true,
      opacity: 0.7
    });
    this.core = new THREE.Mesh(coreGeo, coreMat);
    this.core.position.y = size;
    this.group.add(this.core);
    
    // Point light
    const light = new THREE.PointLight(color, 2, 15);
    light.position.y = size * 1.5;
    this.group.add(light);
    this.light = light;
  }
  
  createCannonTurret(size) {
    const cannonGeo = new THREE.CylinderGeometry(0.15, 0.2, size, 8);
    const cannonMat = new THREE.MeshStandardMaterial({
      color: 0xffaa00,
      emissive: 0xffaa00,
      emissiveIntensity: 0.6,
      metalness: 0.9,
      roughness: 0.2
    });
    this.cannon = new THREE.Mesh(cannonGeo, cannonMat);
    this.cannon.rotation.x = Math.PI / 2;
    this.cannon.position.y = size * 1.5;
    this.cannon.position.z = size * 0.5;
    this.cannon.castShadow = true;
    this.group.add(this.cannon);
    
    // Cannon tip glow
    const glowGeo = new THREE.SphereGeometry(0.25, 8, 8);
    const glowMat = new THREE.MeshStandardMaterial({
      color: 0xffff00,
      emissive: 0xffff00,
      emissiveIntensity: 2
    });
    this.cannonGlow = new THREE.Mesh(glowGeo, glowMat);
    this.cannonGlow.position.z = size * 0.6;
    this.cannon.add(this.cannonGlow);
  }
  
  createHealthBar() {
    const width = this.config.size * 2;
    const height = 0.2;
    
    const bgGeo = new THREE.PlaneGeometry(width, height);
    const bgMat = new THREE.MeshBasicMaterial({
      color: 0x330000,
      side: THREE.DoubleSide
    });
    this.healthBg = new THREE.Mesh(bgGeo, bgMat);
    this.healthBg.position.y = this.config.size * 2.5;
    this.group.add(this.healthBg);
    
    const fgGeo = new THREE.PlaneGeometry(width, height);
    const fgMat = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      side: THREE.DoubleSide
    });
    this.healthFg = new THREE.Mesh(fgGeo, fgMat);
    this.healthFg.position.y = this.config.size * 2.5;
    this.healthFg.position.z = 0.01;
    this.group.add(this.healthFg);
  }
  
  createRangeIndicator() {
    const ringGeo = new THREE.RingGeometry(
      this.config.range - 0.2,
      this.config.range,
      64
    );
    const ringMat = new THREE.MeshBasicMaterial({
      color: this.config.color,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide
    });
    this.rangeRing = new THREE.Mesh(ringGeo, ringMat);
    this.rangeRing.rotation.x = -Math.PI / 2;
    this.rangeRing.position.copy(this.mesh.position);
    this.rangeRing.position.y = 0.1;
    this.game.scene.add(this.rangeRing);
  }
  
  findTarget() {
    let targets = this.owner.enemy.units.filter(unit => !unit.isDead);
    
    // Filter by targeting capabilities
    targets = targets.filter(unit => {
      if (unit.isFlying) {
        return this.config.targetAir;
      } else {
        return this.config.targetGround;
      }
    });
    
    // Find closest in range
    let closest = null;
    let closestDist = Infinity;
    
    targets.forEach(target => {
      const dist = this.mesh.position.distanceTo(target.mesh.position);
      if (dist <= this.config.range && dist < closestDist) {
        closestDist = dist;
        closest = target;
      }
    });
    
    return closest;
  }
  
  aimAtTarget() {
    if (!this.target || !this.cannon) return;
    
    const targetPos = this.target.mesh.position.clone();
    const direction = new THREE.Vector3()
      .subVectors(targetPos, this.mesh.position);
    direction.y = 0;
    
    if (direction.length() > 0) {
      const angle = Math.atan2(direction.x, direction.z);
      this.cannon.rotation.y = angle;
      
      if (this.body) {
        this.body.rotation.y = angle;
      }
    }
  }
  
  attack() {
    if (!this.target || this.target.isDead) return;
    
    const currentTime = performance.now() / 1000;
    if (currentTime - this.lastAttackTime < this.attackCooldown) return;
    
    this.lastAttackTime = currentTime;
    
    // Special inferno tower behavior
    if (this.buildingId === 'infernoTower') {
      this.infernoAttack();
      return;
    }
    
    // Muzzle flash
    if (this.cannonGlow) {
      this.cannonGlow.scale.set(2, 2, 2);
      this.light.intensity = 5;
      setTimeout(() => {
        if (this.cannonGlow) {
          this.cannonGlow.scale.set(1, 1, 1);
          this.light.intensity = 2;
        }
      }, 100);
    }
    
    // Create projectile
    const spawnPos = this.mesh.position.clone();
    spawnPos.y += this.config.size * 1.5;
    
    this.game.projectileSystem.createProjectile(
      spawnPos,
      this.target,
      this.config.damage,
      this.owner,
      this.config.splashRadius
    );
  }
  
  infernoAttack() {
    // Inferno tower ramps up damage on same target
    if (this.infernoTarget !== this.target) {
      this.infernoTarget = this.target;
      this.infernoRampTime = 0;
      this.infernoDamage = this.config.damage;
    } else {
      this.infernoRampTime += this.attackCooldown;
      const rampProgress = Math.min(1, this.infernoRampTime / this.config.damageRampTime);
      this.infernoDamage = this.config.damage + (this.config.maxDamage - this.config.damage) * rampProgress;
    }
    
    // Continuous beam damage
    this.target.takeDamage(this.infernoDamage * this.attackCooldown, this);
    
    // Visual beam
    this.createInfernoBeam();
  }
  
  createInfernoBeam() {
    if (!this.target) return;
    
    const beamGeo = new THREE.BufferGeometry().setFromPoints([
      this.mesh.position.clone().add(new THREE.Vector3(0, this.config.size, 0)),
      this.target.mesh.position.clone()
    ]);
    
    const intensity = this.infernoDamage / this.config.maxDamage;
    const beamMat = new THREE.LineBasicMaterial({
      color: new THREE.Color().setHSL(0.1 - intensity * 0.1, 1, 0.5),
      linewidth: 3,
      transparent: true,
      opacity: 0.8
    });
    
    const beam = new THREE.Line(beamGeo, beamMat);
    this.game.scene.add(beam);
    
    setTimeout(() => {
      this.game.scene.remove(beam);
      beam.geometry.dispose();
      beam.material.dispose();
    }, 50);
  }
  
  takeDamage(amount, attacker) {
    this.health -= amount;
    
    if (this.health <= 0) {
      this.health = 0;
      this.die();
      return;
    }
    
    // Update health bar
    const healthPercent = this.health / this.maxHealth;
    this.healthFg.scale.x = healthPercent;
    this.healthFg.position.x = -(this.config.size * 2 * (1 - healthPercent)) / 2;
    
    // Color based on health
    if (healthPercent > 0.6) {
      this.healthFg.material.color.setHex(0x00ff00);
    } else if (healthPercent > 0.3) {
      this.healthFg.material.color.setHex(0xffff00);
    } else {
      this.healthFg.material.color.setHex(0xff0000);
    }
    
    // Flash
    if (this.body) {
      this.body.material.emissiveIntensity = 2;
      setTimeout(() => {
        if (this.body) {
          this.body.material.emissiveIntensity = 0.5;
        }
      }, 100);
    }
  }
  
  die() {
    this.isDead = true;
    
    // Explosion
    this.game.particleSystem.createExplosion(
      this.mesh.position.clone().add(new THREE.Vector3(0, this.config.size, 0)),
      40,
      this.config.color
    );
    
    // King tower destruction = game over
    if (this.isKingTower) {
      this.game.endGame(this.owner.playerNum);
    }
    
    this.destroy();
  }
  
  update(deltaTime) {
    if (this.isDead) return;
    
    // Deploy animation
    if (this.isDeploying) {
      this.deployTime -= deltaTime;
      if (this.deployTime <= 0) {
        this.isDeploying = false;
      }
      const scale = 1 - (this.deployTime / 1.0) * 0.5;
      this.group.scale.set(scale, scale, scale);
      return;
    }
    
    // Lifetime countdown
    if (this.lifetime > 0) {
      this.remainingLifetime -= deltaTime;
      if (this.remainingLifetime <= 0) {
        this.die();
        return;
      }
    }
    
    // Tesla hiding logic
    if (this.isHidden) {
      const enemiesNearby = this.owner.enemy.units.some(unit => 
        !unit.isDead && this.mesh.position.distanceTo(unit.mesh.position) < this.config.range
      );
      
      const targetY = enemiesNearby ? 0 : this.hiddenYOffset;
      this.group.position.y += (targetY - this.group.position.y) * deltaTime * 3;
    }
    
    // Find and attack target
    if (!this.target || this.target.isDead || 
        this.mesh.position.distanceTo(this.target.mesh.position) > this.config.range) {
      this.target = this.findTarget();
      
      // Reset inferno ramp
      if (this.buildingId === 'infernoTower') {
        this.infernoTarget = null;
        this.infernoRampTime = 0;
      }
    }
    
    if (this.target) {
      this.aimAtTarget();
      this.attack();
      this.rangeRing.material.opacity = 0.25;
    } else {
      this.rangeRing.material.opacity = 0.15;
      
      // Idle animation
      if (this.cannon) {
        this.cannon.rotation.y += deltaTime * 0.5;
      }
    }
    
    // Animations
    if (this.crystal) {
      this.crystal.rotation.y += deltaTime;
      this.crystal.position.y = this.config.size * 2.5 + Math.sin(performance.now() * 0.002) * 0.3;
    }
    
    if (this.core) {
      const pulse = 1 + Math.sin(performance.now() * 0.005) * 0.3;
      this.core.scale.set(pulse, pulse, pulse);
      this.core.rotation.x += deltaTime * 2;
      this.core.rotation.y += deltaTime * 1.5;
    }
    
    // Billboard health bar
    this.healthBg.lookAt(this.game.camera.position);
    this.healthFg.lookAt(this.game.camera.position);
  }
  
  destroy() {
    this.game.scene.remove(this.mesh);
    if (this.rangeRing) {
      this.game.scene.remove(this.rangeRing);
    }
    
    this.mesh.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  }
}
