/**
 * Player.js - Individual Player Controller
 * Manages each player's base, resources, towers, and enemies
 */

import * as THREE from 'three';
import { Tower } from './Tower.js';
import { Enemy } from './Enemy.js';

export class Player {
  constructor(game, playerNum, basePosition) {
    this.game = game;
    this.playerNum = playerNum;
    this.basePosition = basePosition.clone();
    
    // Resources
    this.health = 1000;
    this.credits = 500;
    this.kills = 0;
    
    // Collections
    this.towers = [];
    this.enemies = [];
    this.projectiles = [];
    
    // Building state
    this.isBuilding = false;
    this.previewTower = null;
    
    // Enemy path (enemies go to opponent's base)
    const opponentBase = playerNum === 1 
      ? new THREE.Vector3(15, 0, 0)
      : new THREE.Vector3(-15, 0, 0);
    
    this.enemyPath = this.generatePath(this.basePosition, opponentBase);
    
    this.createBase();
  }
  
  generatePath(start, end) {
    // Create a curved path with waypoints
    const path = [];
    const midZ = (Math.random() - 0.5) * 20;
    
    path.push(start.clone().add(new THREE.Vector3(0, 0.5, 0)));
    path.push(new THREE.Vector3(start.x * 0.5, 0.5, midZ));
    path.push(new THREE.Vector3(0, 0.5, midZ));
    path.push(new THREE.Vector3(end.x * 0.5, 0.5, -midZ));
    path.push(end.clone().add(new THREE.Vector3(0, 0.5, 0)));
    
    return path;
  }
  
  createBase() {
    // Main base structure
    const baseGeometry = new THREE.CylinderGeometry(2, 3, 3, 8);
    const color = this.playerNum === 1 ? 0x00ffff : 0xff00ff;
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.8,
      metalness: 0.8,
      roughness: 0.2
    });
    
    this.baseMesh = new THREE.Mesh(baseGeometry, baseMaterial);
    this.baseMesh.position.copy(this.basePosition);
    this.baseMesh.position.y = 1.5;
    this.baseMesh.castShadow = true;
    this.game.scene.add(this.baseMesh);
    
    // Add crystal on top
    const crystalGeometry = new THREE.OctahedronGeometry(1);
    const crystalMaterial = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 1.5,
      metalness: 1,
      roughness: 0
    });
    this.crystal = new THREE.Mesh(crystalGeometry, crystalMaterial);
    this.crystal.position.copy(this.basePosition);
    this.crystal.position.y = 4;
    this.game.scene.add(this.crystal);
    
    // Add point light to base
    const baseLight = new THREE.PointLight(color, 3, 20);
    baseLight.position.copy(this.basePosition);
    baseLight.position.y = 4;
    this.game.scene.add(baseLight);
    this.baseLight = baseLight;
  }
  
  startBuildMode() {
    if (this.credits < 100 || this.isBuilding) return;
    
    this.isBuilding = true;
    this.game.ui.setBuildMode(this.playerNum, true);
    
    // Create preview
    const color = this.playerNum === 1 ? 0x00ffff : 0xff00ff;
    const previewGeometry = new THREE.CylinderGeometry(0.5, 0.8, 2, 8);
    const previewMaterial = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.6
    });
    this.previewTower = new THREE.Mesh(previewGeometry, previewMaterial);
    this.game.scene.add(this.previewTower);
  }
  
  updatePreview(worldPos) {
    if (!this.previewTower) return;
    
    // Snap to grid
    worldPos.x = Math.round(worldPos.x / 2) * 2;
    worldPos.z = Math.round(worldPos.z / 2) * 2;
    worldPos.y = 1;
    
    // Check if valid position (on player's side)
    const validSide = this.playerNum === 1 ? worldPos.x < 0 : worldPos.x > 0;
    
    if (validSide && this.canPlaceTower(worldPos)) {
      this.previewTower.material.color.setHex(0x00ff00);
      this.previewTower.material.emissive.setHex(0x00ff00);
    } else {
      this.previewTower.material.color.setHex(0xff0000);
      this.previewTower.material.emissive.setHex(0xff0000);
    }
    
    this.previewTower.position.copy(worldPos);
  }
  
  canPlaceTower(position) {
    // Check distance from base
    if (position.distanceTo(this.basePosition) < 4) return false;
    
    // Check overlap with other towers
    for (let tower of this.towers) {
      if (tower.mesh.position.distanceTo(position) < 3) return false;
    }
    
    return true;
  }
  
  placeTower(worldPos) {
    worldPos.x = Math.round(worldPos.x / 2) * 2;
    worldPos.z = Math.round(worldPos.z / 2) * 2;
    worldPos.y = 0;
    
    const validSide = this.playerNum === 1 ? worldPos.x < 0 : worldPos.x > 0;
    
    if (!validSide || !this.canPlaceTower(worldPos) || this.credits < 100) {
      return;
    }
    
    const tower = new Tower(this.game, this, worldPos);
    this.towers.push(tower);
    this.credits -= 100;
    
    this.exitBuildMode();
    this.game.ui.updateUI();
    
    // Particle effect
    this.game.particleSystem.createExplosion(
      worldPos.clone().add(new THREE.Vector3(0, 1, 0)),
      20,
      this.playerNum === 1 ? 0x00ffff : 0xff00ff
    );
  }
  
  exitBuildMode() {
    this.isBuilding = false;
    this.game.ui.setBuildMode(this.playerNum, false);
    if (this.previewTower) {
      this.game.scene.remove(this.previewTower);
      this.previewTower = null;
    }
  }
  
  sendEnemy() {
    if (this.credits < 75) return;
    
    this.credits -= 75;
    
    // Create enemy that goes to opponent
    const opponent = this.playerNum === 1 ? this.game.player2 : this.game.player1;
    const enemy = new Enemy(this.game, opponent, this.enemyPath);
    opponent.enemies.push(enemy);
    
    this.game.ui.updateUI();
    
    // Visual feedback
    this.game.particleSystem.createExplosion(
      this.basePosition.clone().add(new THREE.Vector3(0, 2, 0)),
      15,
      0xff0000
    );
  }
  
  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount);
    this.game.ui.updateUI();
    
    // Flash base
    this.baseMesh.material.emissiveIntensity = 2;
    setTimeout(() => {
      if (this.baseMesh) {
        this.baseMesh.material.emissiveIntensity = 0.8;
      }
    }, 200);
    
    // Explosion effect
    this.game.particleSystem.createExplosion(
      this.basePosition.clone().add(new THREE.Vector3(0, 2, 0)),
      30,
      0xff0000
    );
  }
  
  addCredits(amount) {
    this.credits += amount;
    this.game.ui.updateUI();
  }
  
  addKill() {
    this.kills++;
    this.game.ui.updateUI();
  }
  
  update(deltaTime) {
    // Animate base
    if (this.crystal) {
      this.crystal.rotation.y += deltaTime;
      this.crystal.position.y = 4 + Math.sin(Date.now() * 0.002) * 0.3;
    }
    
    if (this.baseMesh) {
      const pulse = 0.8 + Math.sin(Date.now() * 0.003) * 0.2;
      this.baseMesh.material.emissiveIntensity = pulse;
      this.baseLight.intensity = 3 + pulse;
    }
    
    // Update towers
    this.towers.forEach(tower => tower.update(deltaTime, this.enemies));
    
    // Update enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      enemy.update(deltaTime);
      
      if (enemy.reachedEnd) {
        this.takeDamage(50);
        enemy.destroy();
        this.enemies.splice(i, 1);
      }
    }
  }
  
  reset() {
    // Clean up
    this.towers.forEach(t => t.destroy());
    this.enemies.forEach(e => e.destroy());
    
    this.towers = [];
    this.enemies = [];
    this.projectiles = [];
    
    // Reset stats
    this.health = 1000;
    this.credits = 500;
    this.kills = 0;
    this.isBuilding = false;
    
    if (this.previewTower) {
      this.game.scene.remove(this.previewTower);
      this.previewTower = null;
    }
    
    this.game.ui.updateUI();
  }
}