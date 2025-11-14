/**
 * Unit.js - Space Units with Procedural Models
 * Fighter ships, mechs, drones with detailed 3D models
 */

import * as THREE from 'three';
import { GameConfig } from './GameConfig.js';
import { ProceduralShipGenerator } from './ModelLoader.js';

export class Unit {
  constructor(game, owner, unitId, position, lane) {
    this.game = game;
    this.owner = owner;
    this.unitId = unitId;
    this.config = GameConfig.units[unitId];
    this.lane = lane;
    
    // Unit state
    this.health = this.config.health;
    this.maxHealth = this.config.health;
    this.isDead = false;
    this.isDeploying = true;
    this.deployTime = 1.0;
    
    // Combat
    this.target = null;
    this.lastAttackTime = 0;
    this.isAttacking = false;
    this.attackCooldown = 1 / this.config.attackSpeed;
    
    // Movement
    this.velocity = new THREE.Vector3();
    this.desiredVelocity = new THREE.Vector3();
    this.isMoving = false;
    this.pathUpdateTime = 0;
    
    // Special abilities
    this.isCloaked = this.config.special === 'stealth';
    this.isHealer = this.config.special === 'heal';
    
    // Target waypoint
    this.targetWaypoint = this.calculateTargetWaypoint();
    
    this.createMesh(position);
    this.createHealthBar();
    this.createEffects();
  }
  
  calculateTargetWaypoint() {
    const enemyBaseZ = this.owner.playerNum === 1 ? 25 : -25;
    const lanePos = this.game.arena.getLanePosition(this.lane);
    return new THREE.Vector3(lanePos.x, 0, enemyBaseZ);
  }
  
  createMesh(position) {
    this.group = new THREE.Group();
    
    // Create procedural spaceship model based on unit type
    let model;
    const color = this.owner.playerNum === 1 ? 0x00ccff : 0xff00ff;
    
    switch(this.unitId) {
      case 'interceptor':
        model = ProceduralShipGenerator.createInterceptor(color);
        break;
        
      case 'bomber':
        model = ProceduralShipGenerator.createBomber(color);
        break;
        
      case 'sentinel':
        model = ProceduralShipGenerator.createMech(color);
        break;
        
      case 'titan':
        model = ProceduralShipGenerator.createTitan(color);
        break;
        
      case 'drones':
        model = ProceduralShipGenerator.createDrone(color);
        model.scale.set(0.7, 0.7, 0.7);
        break;
        
      case 'ranger':
        model = this.createRanger(color);
        break;
        
      case 'cloaker':
        model = this.createStealthUnit(color);
        if (this.isCloaked) {
          model.traverse(child => {
            if (child.isMesh) {
              child.material.transparent = true;
              child.material.opacity = 0.3;
            }
          });
        }
        break;
        
      case 'healer':
        model = this.createHealerDrone(color);
        break;
        
      case 'carrier':
        model = this.createCarrier(color);
        break;
        
      default:
        model = ProceduralShipGenerator.createInterceptor(color);
    }
    
    // Scale based on config
    const scale = this.config.size;
    model.scale.set(scale, scale, scale);
    
    // Add to group
    this.model = model;
    this.group.add(model);
    
    // Flying units hover
    if (this.config.flying) {
      this.group.position.y = 3 + Math.random() * 1;
    }
    
    // Add engine effects for ships
    if (this.config.flying) {
      this.createEngineEffects();
    }
    
    this.group.position.copy(position);
    this.game.scene.add(this.group);
    this.mesh = this.group;
  }
  
  createRanger(color) {
    const group = new THREE.Group();
    
    // Humanoid soldier with rifle
    const bodyGeo = new THREE.CapsuleGeometry(0.3, 0.8, 8, 16);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: color,
      metalness: 0.7,
      roughness: 0.3,
      emissive: color,
      emissiveIntensity: 0.1
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.5;
    group.add(body);
    
    // Helmet
    const helmetGeo = new THREE.SphereGeometry(0.25, 8, 8);
    const helmetMat = new THREE.MeshStandardMaterial({
      color: 0x222222,
      metalness: 0.9,
      roughness: 0.2
    });
    const helmet = new THREE.Mesh(helmetGeo, helmetMat);
    helmet.position.y = 1;
    helmet.scale.y = 0.8;
    group.add(helmet);
    
    // Plasma rifle
    const rifleGeo = new THREE.CylinderGeometry(0.05, 0.08, 0.8, 6);
    const rifleMat = new THREE.MeshStandardMaterial({
      color: 0xffaa00,
      emissive: 0xffaa00,
      emissiveIntensity: 0.5,
      metalness: 1,
      roughness: 0.1
    });
    const rifle = new THREE.Mesh(rifleGeo, rifleMat);
    rifle.position.set(0.3, 0.5, -0.2);
    rifle.rotation.x = Math.PI / 2;
    rifle.rotation.z = 0.2;
    group.add(rifle);
    
    return group;
  }
  
  createStealthUnit(color) {
    const group = new THREE.Group();
    
    // Sleek assassin design
    const bodyGeo = new THREE.ConeGeometry(0.3, 1.2, 6);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      metalness: 0.95,
      roughness: 0.1,
      emissive: color,
      emissiveIntensity: 0.05
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.6;
    group.add(body);
    
    // Energy blades
    const bladeGeo = new THREE.BoxGeometry(0.05, 0.8, 0.2);
    const bladeMat = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 2,
      transparent: true,
      opacity: 0.8
    });
    
    const blade1 = new THREE.Mesh(bladeGeo, bladeMat);
    blade1.position.set(0.3, 0.4, 0);
    blade1.rotation.z = 0.3;
    group.add(blade1);
    
    const blade2 = new THREE.Mesh(bladeGeo, bladeMat);
    blade2.position.set(-0.3, 0.4, 0);
    blade2.rotation.z = -0.3;
    group.add(blade2);
    
    return group;
  }
  
  createHealerDrone(color) {
    const group = new THREE.Group();
    
    // Medical drone design
    const coreGeo = new THREE.OctahedronGeometry(0.4);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x00ff00,
      metalness: 0.8,
      roughness: 0.2,
      emissive: 0x00ff00,
      emissiveIntensity: 0.8
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    group.add(core);
    
    // Healing beam emitters
    const emitterGeo = new THREE.SphereGeometry(0.15, 8, 8);
    const emitterMat = new THREE.MeshStandardMaterial({
      color: 0x00ff00,
      emissive: 0x00ff00,
      emissiveIntensity: 2,
      transparent: true,
      opacity: 0.8
    });
    
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const emitter = new THREE.Mesh(emitterGeo, emitterMat);
      emitter.position.set(
        Math.cos(angle) * 0.6,
        0,
        Math.sin(angle) * 0.6
      );
      group.add(emitter);
    }
    
    // Medical cross symbol
    const crossGeo = new THREE.BoxGeometry(0.1, 0.4, 0.05);
    const crossMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 1
    });
    
    const cross1 = new THREE.Mesh(crossGeo, crossMat);
    group.add(cross1);
    
    const cross2 = new THREE.Mesh(crossGeo, crossMat);
    cross2.rotation.z = Math.PI / 2;
    group.add(cross2);
    
    return group;
  }
  
  createCarrier(color) {
    const group = new THREE.Group();
    
    // Massive carrier ship
    const hullGeo = new THREE.BoxGeometry(2.5, 0.8, 3.5);
    const hullMat = new THREE.MeshStandardMaterial({
      color: color,
      metalness: 0.8,
      roughness: 0.3,
      emissive: color,
      emissiveIntensity: 0.05
    });
    const hull = new THREE.Mesh(hullGeo, hullMat);
    group.add(hull);
    
    // Flight deck
    const deckGeo = new THREE.BoxGeometry(3, 0.1, 4);
    const deckMat = new THREE.MeshStandardMaterial({
      color: 0x333333,
      metalness: 0.9,
      roughness: 0.4
    });
    const deck = new THREE.Mesh(deckGeo, deckMat);
    deck.position.y = 0.45;
    group.add(deck);
    
    // Command tower
    const towerGeo = new THREE.BoxGeometry(0.5, 1, 0.5);
    const tower = new THREE.Mesh(towerGeo, hullMat);
    tower.position.set(1, 0.9, 0);
    group.add(tower);
    
    // Hangar bays (glowing)
    const hangarGeo = new THREE.BoxGeometry(0.8, 0.3, 0.2);
    const hangarMat = new THREE.MeshStandardMaterial({
      color: 0xffaa00,
      emissive: 0xffaa00,
      emissiveIntensity: 1.5
    });
    
    for (let i = 0; i < 3; i++) {
      const hangar = new THREE.Mesh(hangarGeo, hangarMat);
      hangar.position.set(-0.8 + i * 0.8, 0, -1.8);
      group.add(hangar);
    }
    
    return group;
  }
  
  createEngineEffects() {
    // Engine glow particles
    const particleGeo = new THREE.BufferGeometry();
    const particleCount = 20;
    const positions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 0.5;
      positions[i + 1] = (Math.random() - 0.5) * 0.5;
      positions[i + 2] = 0.5 + Math.random() * 0.5;
    }
    
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const particleMat = new THREE.PointsMaterial({
      size: 0.15,
      color: 0xff6600,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    
    this.engineParticles = new THREE.Points(particleGeo, particleMat);
    this.group.add(this.engineParticles);
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
    this.healthBg.position.y = this.config.size * 2;
    this.group.add(this.healthBg);
    
    const fgGeo = new THREE.PlaneGeometry(width, height);
    const fgMat = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      side: THREE.DoubleSide
    });
    this.healthFg = new THREE.Mesh(fgGeo, fgMat);
    this.healthFg.position.y = this.config.size * 2;
    this.healthFg.position.z = 0.01;
    this.group.add(this.healthFg);
  }
  
  createEffects() {
    // Shield effect for shielded units
    if (this.config.shield) {
      const shieldGeo = new THREE.SphereGeometry(this.config.size * 1.5, 16, 16);
      const shieldMat = new THREE.MeshStandardMaterial({
        color: 0x00ffff,
        emissive: 0x00ffff,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.2,
        side: THREE.DoubleSide
      });
      this.shield = new THREE.Mesh(shieldGeo, shieldMat);
      this.group.add(this.shield);
    }
  }
  
  findTarget() {
    if (this.isHealer) {
      return this.findHealTarget();
    }
    
    let targets = [];
    const enemy = this.owner.enemy;
    
    if (this.config.targetBuildings) {
      targets = [...enemy.buildings];
    }
    
    targets = targets.concat(enemy.units);
    
    targets = targets.filter(target => {
      if (target.isDead) return false;
      
      if (target.config && target.config.flying) {
        return this.config.targetAir;
      } else {
        return this.config.targetGround;
      }
    });
    
    let closest = null;
    let closestDist = Infinity;
    
    targets.forEach(target => {
      const dist = this.mesh.position.distanceTo(target.mesh.position);
      if (dist < closestDist) {
        closestDist = dist;
        closest = target;
      }
    });
    
    return closest;
  }
  
  findHealTarget() {
    const allies = this.owner.units.filter(u => 
      !u.isDead && u !== this && u.health < u.maxHealth
    );
    
    let mostDamaged = null;
    let lowestHealthPercent = 1;
    
    allies.forEach(ally => {
      const healthPercent = ally.health / ally.maxHealth;
      if (healthPercent < lowestHealthPercent) {
        lowestHealthPercent = healthPercent;
        mostDamaged = ally;
      }
    });
    
    return mostDamaged;
  }
  
  isInRange(target) {
    if (!target || target.isDead) return false;
    const distance = this.mesh.position.distanceTo(target.mesh.position);
    return distance <= this.config.range;
  }
  
  move(deltaTime) {
    if (this.isAttacking && this.target && this.isInRange(this.target)) {
      this.isMoving = false;
      return;
    }
    
    this.isMoving = true;
    
    let moveTarget;
    if (this.target && !this.isInRange(this.target)) {
      moveTarget = this.target.mesh.position;
    } else {
      moveTarget = this.targetWaypoint;
    }
    
    const direction = new THREE.Vector3()
      .subVectors(moveTarget, this.mesh.position);
    direction.y = 0;
    
    const distance = direction.length();
    
    if (distance > 0.5) {
      direction.normalize();
      
      const speed = this.config.moveSpeed;
      this.desiredVelocity.copy(direction).multiplyScalar(speed);
      
      this.velocity.lerp(this.desiredVelocity, deltaTime * 5);
      
      const movement = this.velocity.clone().multiplyScalar(deltaTime);
      this.mesh.position.add(movement);
      
      // Rotate to face movement
      if (this.velocity.length() > 0.1) {
        const angle = Math.atan2(this.velocity.x, this.velocity.z);
        if (this.model) {
          this.model.rotation.y = angle;
        }
      }
    } else {
      this.isMoving = false;
    }
  }
  
  attack(deltaTime) {
    if (this.isHealer) {
      this.heal(deltaTime);
      return;
    }
    
    if (!this.target || this.target.isDead) {
      this.isAttacking = false;
      return;
    }
    
    if (!this.isInRange(this.target)) {
      this.isAttacking = false;
      return;
    }
    
    this.isAttacking = true;
    
    const currentTime = performance.now() / 1000;
    if (currentTime - this.lastAttackTime >= this.attackCooldown) {
      this.performAttack();
      this.lastAttackTime = currentTime;
    }
    
    // Face target
    const direction = new THREE.Vector3()
      .subVectors(this.target.mesh.position, this.mesh.position);
    direction.y = 0;
    
    if (direction.length() > 0 && this.model) {
      const angle = Math.atan2(direction.x, direction.z);
      this.model.rotation.y = angle;
    }
  }
  
  heal(deltaTime) {
    if (!this.target || this.target.isDead || this.target.health >= this.target.maxHealth) {
      this.isAttacking = false;
      return;
    }
    
    if (!this.isInRange(this.target)) {
      this.isAttacking = false;
      return;
    }
    
    this.isAttacking = true;
    
    // Continuous healing
    this.target.health = Math.min(
      this.target.maxHealth,
      this.target.health + this.config.healAmount * deltaTime
    );
    
    // Update target's health bar
    if (this.target.updateHealthBar) {
      this.target.updateHealthBar();
    }
    
    // Healing beam effect
    this.createHealBeam();
  }
  
  createHealBeam() {
    if (!this.target) return;
    
    const beamGeo = new THREE.BufferGeometry().setFromPoints([
      this.mesh.position.clone().add(new THREE.Vector3(0, 1, 0)),
      this.target.mesh.position.clone().add(new THREE.Vector3(0, 1, 0))
    ]);
    
    const beamMat = new THREE.LineBasicMaterial({
      color: 0x00ff00,
      linewidth: 3,
      transparent: true,
      opacity: 0.6
    });
    
    const beam = new THREE.Line(beamGeo, beamMat);
    this.game.scene.add(beam);
    
    setTimeout(() => {
      this.game.scene.remove(beam);
      beam.geometry.dispose();
      beam.material.dispose();
    }, 100);
  }
  
  performAttack() {
    if (!this.target || this.target.isDead) return;
    
    // Attack animation
    if (this.model) {
      const originalScale = this.model.scale.x;
      this.model.scale.set(originalScale * 1.2, originalScale * 1.2, originalScale * 1.2);
      setTimeout(() => {
        if (this.model) {
          this.model.scale.set(originalScale, originalScale, originalScale);
        }
      }, 100);
    }
    
    // Uncloak if stealthed
    if (this.isCloaked) {
      this.uncloak();
    }
    
    // Create projectile
    if (this.config.range > 2) {
      const projectileType = this.unitId === 'bomber' ? 'bomb' : 'plasma';
      this.game.projectileSystem.createProjectile(
        this.mesh.position.clone().add(new THREE.Vector3(0, this.config.flying ? 0 : 1, 0)),
        this.target,
        this.config.damage,
        this.owner,
        this.config.splashRadius,
        projectileType
      );
    } else {
      // Melee attack
      this.target.takeDamage(this.config.damage, this);
    }
  }
  
  uncloak() {
    this.isCloaked = false;
    if (this.model) {
      this.model.traverse(child => {
        if (child.isMesh && child.material) {
          child.material.opacity = 1;
        }
      });
    }
    
    // Can't recloak for 3 seconds
    setTimeout(() => {
      if (!this.isDead && this.config.special === 'stealth') {
        this.cloak();
      }
    }, 3000);
  }
  
  cloak() {
    this.isCloaked = true;
    if (this.model) {
      this.model.traverse(child => {
        if (child.isMesh && child.material) {
          child.material.transparent = true;
          child.material.opacity = 0.3;
        }
      });
    }
  }
  
  takeDamage(amount, attacker) {
    this.health -= amount;
    
    if (this.health <= 0) {
      this.health = 0;
      this.die();
      return;
    }
    
    this.updateHealthBar();
    
    // Flash effect
    if (this.model) {
      this.model.traverse(child => {
        if (child.isMesh && child.material && child.material.emissive) {
          const original = child.material.emissiveIntensity;
          child.material.emissiveIntensity = 2;
          setTimeout(() => {
            if (child.material) {
              child.material.emissiveIntensity = original;
            }
          }, 100);
        }
      });
    }
  }
  
  updateHealthBar() {
    const healthPercent = this.health / this.maxHealth;
    this.healthFg.scale.x = healthPercent;
    this.healthFg.position.x = -(this.config.size * 2 * (1 - healthPercent)) / 2;
    
    if (healthPercent > 0.6) {
      this.healthFg.material.color.setHex(0x00ff00);
    } else if (healthPercent > 0.3) {
      this.healthFg.material.color.setHex(0xffff00);
    } else {
      this.healthFg.material.color.setHex(0xff0000);
    }
  }
  
  die() {
    this.isDead = true;
    
    // Epic explosion for large units
    const explosionSize = this.unitId === 'titan' || this.unitId === 'carrier' ? 60 : 30;
    this.game.particleSystem.createExplosion(
      this.mesh.position.clone(),
      explosionSize,
      this.config.color
    );
    
    // Award kill
    this.owner.enemy.addKill();
    
    // Carrier spawns fighters on death
    if (this.unitId === 'carrier' && this.config.special === 'spawn_fighters') {
      this.spawnFighters();
    }
    
    this.destroy();
  }
  
  spawnFighters() {
    // Spawn 3 interceptors when carrier dies
    for (let i = 0; i < 3; i++) {
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * 3,
        0,
        (Math.random() - 0.5) * 3
      );
      const spawnPos = this.mesh.position.clone().add(offset);
      const fighter = new Unit(this.game, this.owner, 'interceptor', spawnPos, this.lane);
      this.owner.units.push(fighter);
    }
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
      const targetScale = this.config.size;
      this.model.scale.set(targetScale * scale, targetScale * scale, targetScale * scale);
      return;
    }
    
    // Find target
    if (!this.target || this.target.isDead || 
        (this.isHealer && this.target.health >= this.target.maxHealth) ||
        !this.isInRange(this.target)) {
      this.target = this.findTarget();
    }
    
    // Behavior
    if (this.target && this.isInRange(this.target)) {
      this.attack(deltaTime);
    } else {
      this.move(deltaTime);
    }
    
    // Animations
    this.animate(deltaTime);
    
    // Billboard health bar
    this.healthBg.lookAt(this.game.camera.position);
    this.healthFg.lookAt(this.game.camera.position);
  }
  
  animate(deltaTime) {
    // Ship hovering
    if (this.config.flying && this.group) {
      const baseHeight = 3;
      const hover = Math.sin(performance.now() * 0.002 + this.mesh.position.x) * 0.3;
      this.group.position.y = baseHeight + hover;
      
      // Banking on turns
      if (this.isMoving && this.model) {
        const bankAngle = this.velocity.x * 0.1;
        this.model.rotation.z = THREE.MathUtils.lerp(
          this.model.rotation.z,
          bankAngle,
          deltaTime * 3
        );
      }
    }
    
    // Mech walking animation
    if ((this.unitId === 'sentinel' || this.unitId === 'titan') && this.isMoving) {
      const walkCycle = Math.sin(performance.now() * 0.01) * 0.1;
      if (this.model) {
        this.model.position.y = Math.abs(walkCycle);
        this.model.rotation.x = walkCycle * 0.2;
      }
    }
    
    // Drone propeller spin
    if (this.unitId === 'drones' && this.model) {
      this.model.rotation.y += deltaTime * 10;
    }
    
    // Engine particles
    if (this.engineParticles) {
      this.engineParticles.rotation.z += deltaTime * 5;
      const positions = this.engineParticles.geometry.attributes.position.array;
      for (let i = 2; i < positions.length; i += 3) {
        positions[i] += deltaTime * 2;
        if (positions[i] > 2) {
          positions[i] = 0.5;
        }
      }
      this.engineParticles.geometry.attributes.position.needsUpdate = true;
    }
    
    // Shield rotation
    if (this.shield) {
      this.shield.rotation.x += deltaTime * 0.5;
      this.shield.rotation.y += deltaTime * 0.7;
    }
  }
  
  destroy() {
    this.game.scene.remove(this.mesh);
    this.mesh.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(mat => mat.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }
}
