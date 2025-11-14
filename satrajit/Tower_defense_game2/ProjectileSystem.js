/**
 * ProjectileSystem.js - Advanced Projectile Management
 * Handles bullets, arrows, bombs, and splash damage
 */

import * as THREE from 'three';

export class ProjectileSystem {
  constructor(game) {
    this.game = game;
    this.projectiles = [];
  }
  
  createProjectile(startPosition, target, damage, owner, splashRadius = 0) {
    const projectile = new Projectile(
      this.game,
      startPosition,
      target,
      damage,
      owner,
      splashRadius
    );
    
    this.projectiles.push(projectile);
    return projectile;
  }
  
  update(deltaTime) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];
      projectile.update(deltaTime);
      
      if (projectile.shouldRemove) {
        projectile.destroy();
        this.projectiles.splice(i, 1);
      }
    }
  }
  
  clear() {
    this.projectiles.forEach(p => p.destroy());
    this.projectiles = [];
  }
}

class Projectile {
  constructor(game, startPosition, target, damage, owner, splashRadius) {
    this.game = game;
    this.target = target;
    this.damage = damage;
    this.owner = owner;
    this.splashRadius = splashRadius || 0;
    this.speed = 20;
    this.shouldRemove = false;
    this.hasSplash = splashRadius > 0;
    
    // Arc projectile settings (for bombs, mortars)
    this.isArc = this.hasSplash;
    this.arcHeight = this.isArc ? 5 : 0;
    this.arcProgress = 0;
    
    if (this.isArc) {
      this.startPos = startPosition.clone();
      this.targetPos = target.mesh.position.clone();
      this.distance = this.startPos.distanceTo(this.targetPos);
      this.travelTime = this.distance / this.speed;
    }
    
    this.createMesh(startPosition);
  }
  
  createMesh(startPosition) {
    this.group = new THREE.Group();
    
    if (this.hasSplash) {
      // Bomb/splash projectile
      const bodyGeo = new THREE.SphereGeometry(0.3, 12, 12);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: 0xff6600,
        emissive: 0xff6600,
        emissiveIntensity: 1.5,
        metalness: 0.5,
        roughness: 0.3
      });
      this.body = new THREE.Mesh(bodyGeo, bodyMat);
      
      // Fuse effect
      const fuseGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.3, 8);
      const fuseMat = new THREE.MeshStandardMaterial({
        color: 0x333333,
        emissive: 0xff0000,
        emissiveIntensity: 2
      });
      this.fuse = new THREE.Mesh(fuseGeo, fuseMat);
      this.fuse.position.y = 0.3;
      this.group.add(this.fuse);
    } else {
      // Regular projectile (arrow, bullet)
      const bodyGeo = new THREE.SphereGeometry(0.2, 8, 8);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: 0xffff00,
        emissive: 0xffff00,
        emissiveIntensity: 2,
        metalness: 1,
        roughness: 0
      });
      this.body = new THREE.Mesh(bodyGeo, bodyMat);
    }
    
    this.group.add(this.body);
    
    // Glow
    const glowGeo = new THREE.SphereGeometry(0.35, 8, 8);
    const glowMat = new THREE.MeshBasicMaterial({
      color: this.hasSplash ? 0xff6600 : 0xffff00,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending
    });
    this.glow = new THREE.Mesh(glowGeo, glowMat);
    this.group.add(this.glow);
    
    // Point light
    const light = new THREE.PointLight(
      this.hasSplash ? 0xff6600 : 0xffff00,
      2,
      8
    );
    this.group.add(light);
    this.light = light;
    
    // Trail
    this.createTrail();
    
    this.group.position.copy(startPosition);
    this.game.scene.add(this.group);
    this.mesh = this.group;
  }
  
  createTrail() {
    this.trailParticles = [];
    for (let i = 0; i < 5; i++) {
      const trailGeo = new THREE.SphereGeometry(0.12 - i * 0.02, 6, 6);
      const trailMat = new THREE.MeshBasicMaterial({
        color: this.hasSplash ? 0xff6600 : 0xffff00,
        transparent: true,
        opacity: 0.5 - i * 0.08
      });
      const trail = new THREE.Mesh(trailGeo, trailMat);
      trail.position.z = -i * 0.2;
      this.group.add(trail);
      this.trailParticles.push(trail);
    }
  }
  
  update(deltaTime) {
    if (!this.target || this.target.isDead) {
      this.shouldRemove = true;
      return;
    }
    
    if (this.isArc) {
      this.updateArcMovement(deltaTime);
    } else {
      this.updateHomingMovement(deltaTime);
    }
    
    // Animate
    this.body.rotation.x += deltaTime * 10;
    this.body.rotation.y += deltaTime * 8;
    
    const pulse = 1 + Math.sin(performance.now() * 0.02) * 0.3;
    this.glow.scale.set(pulse, pulse, pulse);
    
    // Fuse spark
    if (this.fuse) {
      this.fuse.material.emissiveIntensity = 2 + Math.sin(performance.now() * 0.05) * 1;
    }
  }
  
  updateHomingMovement(deltaTime) {
    // Home towards target
    const targetPos = this.target.mesh.position.clone();
    targetPos.y += 0.5;
    
    const direction = new THREE.Vector3()
      .subVectors(targetPos, this.mesh.position);
    const distance = direction.length();
    direction.normalize();
    
    // Move
    this.mesh.position.add(direction.multiplyScalar(this.speed * deltaTime));
    
    // Orient
    this.mesh.lookAt(targetPos);
    
    // Check collision
    if (distance < 0.5) {
      this.hit();
    }
    
    // Remove if too far
    if (distance > 60) {
      this.shouldRemove = true;
    }
  }
  
  updateArcMovement(deltaTime) {
    this.arcProgress += (deltaTime / this.travelTime);
    
    if (this.arcProgress >= 1.0) {
      this.hit();
      return;
    }
    
    // Calculate arc position
    const t = this.arcProgress;
    const pos = new THREE.Vector3().lerpVectors(this.startPos, this.targetPos, t);
    
    // Add arc height (parabola)
    pos.y += Math.sin(t * Math.PI) * this.arcHeight;
    
    this.mesh.position.copy(pos);
    
    // Rotate based on velocity
    const nextT = Math.min(1, t + 0.01);
    const nextPos = new THREE.Vector3().lerpVectors(this.startPos, this.targetPos, nextT);
    nextPos.y += Math.sin(nextT * Math.PI) * this.arcHeight;
    
    this.mesh.lookAt(nextPos);
  }
  
  hit() {
    if (this.hasSplash) {
      this.splashDamage();
    } else {
      this.target.takeDamage(this.damage, this.owner);
    }
    
    // Impact effect
    this.game.particleSystem.createExplosion(
      this.mesh.position.clone(),
      this.hasSplash ? 25 : 10,
      this.hasSplash ? 0xff6600 : 0xffff00
    );
    
    // Splash radius indicator
    if (this.hasSplash) {
      this.showSplashRadius();
    }
    
    this.shouldRemove = true;
  }
  
  splashDamage() {
    const position = this.mesh.position;
    const enemy = this.owner.enemy;
    
    // Damage all units in splash radius
    enemy.units.forEach(unit => {
      if (unit.isDead) return;
      
      const distance = unit.mesh.position.distanceTo(position);
      if (distance <= this.splashRadius) {
        // Damage falloff based on distance
        const falloff = 1 - (distance / this.splashRadius) * 0.5;
        unit.takeDamage(this.damage * falloff, this.owner);
      }
    });
    
    // Also damage buildings if any in range
    enemy.buildings.forEach(building => {
      if (building.isDead) return;
      
      const distance = building.mesh.position.distanceTo(position);
      if (distance <= this.splashRadius) {
        const falloff = 1 - (distance / this.splashRadius) * 0.5;
        building.takeDamage(this.damage * falloff, this.owner);
      }
    });
  }
  
  showSplashRadius() {
    const ringGeo = new THREE.RingGeometry(
      this.splashRadius - 0.2,
      this.splashRadius,
      32
    );
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xff6600,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(this.mesh.position);
    ring.position.y = 0.1;
    ring.rotation.x = -Math.PI / 2;
    this.game.scene.add(ring);
    
    // Animate and remove
    let scale = 1;
    const animate = () => {
      scale += 0.15;
      ring.scale.set(scale, scale, 1);
      ring.material.opacity = Math.max(0, 0.8 - scale * 0.2);
      
      if (ring.material.opacity > 0) {
        requestAnimationFrame(animate);
      } else {
        this.game.scene.remove(ring);
        ring.geometry.dispose();
        ring.material.dispose();
      }
    };
    animate();
  }
  
  destroy() {
    this.game.scene.remove(this.mesh);
    this.mesh.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  }
}
