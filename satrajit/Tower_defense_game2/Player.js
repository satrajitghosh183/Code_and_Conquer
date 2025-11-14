/**
 * Player.js - Clash Royale Style Player Controller
 * Manages resources, deck, units, buildings, and towers
 */

import * as THREE from 'three';
import { Building } from './Building.js';
import { Unit } from './Unit.js';
import { createStarterDeck } from './Card.js';
import { GameConfig } from './GameConfig.js';

export class Player {
  constructor(game, playerNum) {
    this.game = game;
    this.playerNum = playerNum;
    this.enemy = null; // Set after both players created
    
    // Resources
    this.elixir = GameConfig.economy.startingElixir;
    this.maxElixir = GameConfig.economy.maxElixir;
    this.elixirRegenRate = GameConfig.economy.elixirRegenRate;
    
    // Credit system for coding challenges
    this.credits = GameConfig.economy.creditSystem.startingCredits;
    this.creditMultiplier = GameConfig.economy.creditSystem.creditMultiplier;
    
    // Stats
    this.kills = 0;
    this.unitsDeployed = 0;
    this.buildingsPlaced = 0;
    this.damageDealt = 0;
    
    // Collections
    this.buildings = [];
    this.units = [];
    this.towers = [];
    
    // Deck system
    this.deck = createStarterDeck();
    this.selectedCard = null;
    
    // Deployment
    this.isDeploying = false;
    this.deploymentPreview = null;
    
    // Determine side (player 1 = left, player 2 = right)
    this.side = playerNum === 1 ? -1 : 1;
    this.baseZ = playerNum === 1 ? -20 : 20;
    
    this.setupTowers();
  }
  
  setupTowers() {
    // King Tower (center)
    const kingPos = new THREE.Vector3(0 * this.side, 0, this.baseZ);
    const kingTower = new Building(this.game, this, 'kingTower', kingPos);
    this.buildings.push(kingTower);
    this.towers.push(kingTower);
    this.kingTower = kingTower;
    
    // Princess Towers (left and right)
    const leftPos = new THREE.Vector3(-6 * this.side, 0, this.baseZ + 5 * -this.side);
    const leftTower = new Building(this.game, this, 'princessTower', leftPos);
    this.buildings.push(leftTower);
    this.towers.push(leftTower);
    this.leftTower = leftTower;
    
    const rightPos = new THREE.Vector3(6 * this.side, 0, this.baseZ + 5 * -this.side);
    const rightTower = new Building(this.game, this, 'princessTower', rightPos);
    this.buildings.push(rightTower);
    this.towers.push(rightTower);
    this.rightTower = rightTower;
  }
  
  /**
   * Start card selection for deployment
   */
  selectCard(card) {
    if (!card.canDeploy(this.elixir)) {
      this.game.ui.showMessage('Not enough elixir!', 'error');
      return;
    }
    
    // Deselect previous
    if (this.selectedCard) {
      this.deck.deselectCard();
    }
    
    this.selectedCard = card;
    this.deck.selectCard(card);
    this.isDeploying = true;
    
    // Show deployment zone
    this.game.arena.setDeploymentZoneActive(this.playerNum, true);
    
    // Create preview
    this.createDeploymentPreview(card);
    
    this.game.ui.showMessage(`Place ${card.getName()}`, 'info');
  }
  
  createDeploymentPreview(card) {
    const config = card.config;
    const color = config.color;
    
    let geometry;
    if (card.type === 'building') {
      geometry = new THREE.CylinderGeometry(
        config.size * 0.6,
        config.size * 0.8,
        config.size * 1.5,
        8
      );
    } else {
      geometry = new THREE.CapsuleGeometry(
        config.size * 0.4,
        config.size * 0.8,
        8,
        16
      );
    }
    
    const material = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.5
    });
    
    this.deploymentPreview = new THREE.Mesh(geometry, material);
    this.game.scene.add(this.deploymentPreview);
  }
  
  updateDeploymentPreview(worldPos) {
    if (!this.deploymentPreview || !this.selectedCard) return;
    
    // Snap to grid
    worldPos.x = Math.round(worldPos.x);
    worldPos.z = Math.round(worldPos.z);
    worldPos.y = 0.5;
    
    // Check if in valid deployment zone
    const inZone = this.game.arena.isInDeploymentZone(worldPos, this.playerNum);
    
    // Check overlap for buildings
    let canPlace = inZone;
    if (this.selectedCard.type === 'building') {
      canPlace = canPlace && this.canPlaceBuilding(worldPos);
    }
    
    // Color preview based on validity
    if (canPlace) {
      this.deploymentPreview.material.color.setHex(0x00ff00);
      this.deploymentPreview.material.emissive.setHex(0x00ff00);
    } else {
      this.deploymentPreview.material.color.setHex(0xff0000);
      this.deploymentPreview.material.emissive.setHex(0xff0000);
    }
    
    this.deploymentPreview.position.copy(worldPos);
  }
  
  canPlaceBuilding(position) {
    // Check distance from own towers
    for (let tower of this.towers) {
      if (tower.mesh.position.distanceTo(position) < 3) {
        return false;
      }
    }
    
    // Check overlap with existing buildings
    for (let building of this.buildings) {
      if (!building.isKingTower && !building.isPrincessTower) {
        if (building.mesh.position.distanceTo(position) < 2.5) {
          return false;
        }
      }
    }
    
    return true;
  }
  
  /**
   * Deploy selected card at position
   */
  deploy(worldPos) {
    if (!this.selectedCard || !this.isDeploying) return;
    
    worldPos.x = Math.round(worldPos.x);
    worldPos.z = Math.round(worldPos.z);
    worldPos.y = 0;
    
    // Validate deployment
    const inZone = this.game.arena.isInDeploymentZone(worldPos, this.playerNum);
    if (!inZone) {
      this.game.ui.showMessage('Cannot deploy there!', 'error');
      return;
    }
    
    const card = this.selectedCard;
    const cost = card.getCost();
    
    if (this.elixir < cost) {
      this.game.ui.showMessage('Not enough elixir!', 'error');
      return;
    }
    
    // Deploy based on card type
    if (card.type === 'unit') {
      this.deployUnit(card, worldPos);
    } else if (card.type === 'building') {
      if (!this.canPlaceBuilding(worldPos)) {
        this.game.ui.showMessage('Cannot place building there!', 'error');
        return;
      }
      this.deployBuilding(card, worldPos);
    }
    
    // Deduct elixir
    this.elixir -= cost;
    
    // Cycle deck
    this.deck.cycleCard(card);
    
    // Update UI
    this.game.ui.updateDeck(this.playerNum);
    
    // Cancel deployment mode
    this.cancelDeployment();
    
    // Deploy effect
    this.game.particleSystem.createExplosion(
      worldPos.clone().add(new THREE.Vector3(0, 1, 0)),
      20,
      card.config.color
    );
  }
  
  deployUnit(card, position) {
    const config = card.config;
    const lane = this.game.arena.getNearestLane(position);
    
    // Spawn multiple units if card specifies count > 1
    const count = config.count || 1;
    const spread = count > 1 ? 1.5 : 0;
    
    for (let i = 0; i < count; i++) {
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * spread,
        0,
        (Math.random() - 0.5) * spread
      );
      
      const spawnPos = position.clone().add(offset);
      const unit = new Unit(this.game, this, card.id, spawnPos, lane);
      this.units.push(unit);
    }
    
    this.unitsDeployed += count;
    this.game.ui.showMessage(`Deployed ${card.getName()}!`, 'success');
  }
  
  deployBuilding(card, position) {
    const building = new Building(this.game, this, card.id, position);
    this.buildings.push(building);
    this.buildingsPlaced++;
    
    this.game.ui.showMessage(`Placed ${card.getName()}!`, 'success');
  }
  
  cancelDeployment() {
    this.isDeploying = false;
    this.selectedCard = null;
    this.deck.deselectCard();
    
    if (this.deploymentPreview) {
      this.game.scene.remove(this.deploymentPreview);
      this.deploymentPreview.geometry.dispose();
      this.deploymentPreview.material.dispose();
      this.deploymentPreview = null;
    }
    
    this.game.arena.setDeploymentZoneActive(this.playerNum, false);
  }
  
  /**
   * Coding Challenge Integration
   */
  awardCreditsForProblem(difficulty) {
    const reward = GameConfig.economy.creditSystem.problemRewards[difficulty];
    this.addCredits(reward);
    
    this.game.ui.showMessage(
      `Solved ${difficulty} problem! +${reward} credits`,
      'success'
    );
    
    // Callback for external integration
    if (GameConfig.integration.onProblemSolved) {
      GameConfig.integration.onProblemSolved(difficulty, reward);
    }
  }
  
  addCredits(amount) {
    this.credits += amount * this.creditMultiplier;
    this.game.ui.updateCredits(this.playerNum, this.credits);
    
    if (GameConfig.integration.onCreditEarned) {
      GameConfig.integration.onCreditEarned(amount);
    }
  }
  
  purchaseUpgrade(upgradeId) {
    const upgrade = GameConfig.economy.creditSystem.permanentUpgrades[upgradeId];
    
    if (this.credits < upgrade) {
      this.game.ui.showMessage('Not enough credits!', 'error');
      return false;
    }
    
    this.credits -= upgrade;
    this.applyUpgrade(upgradeId);
    
    if (GameConfig.integration.onUpgradePurchased) {
      GameConfig.integration.onUpgradePurchased(upgradeId, upgrade);
    }
    
    return true;
  }
  
  applyUpgrade(upgradeId) {
    switch(upgradeId) {
      case 'elixirRegenBoost':
        this.elixirRegenRate *= 1.1;
        break;
      case 'towerDamageBoost':
        this.towers.forEach(t => t.config.damage *= 1.15);
        break;
      case 'unitHealthBoost':
        this.creditMultiplier *= 1.15;
        break;
    }
  }
  
  addKill() {
    this.kills++;
    this.game.ui.updateStats(this.playerNum);
  }
  
  /**
   * Get total tower health (for damage calculation)
   */
  getTotalHealth() {
    return this.buildings
      .filter(b => b.isKingTower || b.isPrincessTower)
      .reduce((sum, b) => sum + b.health, 0);
  }
  
  /**
   * Check if player has lost
   */
  hasLost() {
    return this.kingTower.isDead;
  }
  
  /**
   * Update player state
   */
  update(deltaTime) {
    // Regenerate elixir
    const doubleElixir = this.game.isDoubleElixir;
    const regenRate = this.elixirRegenRate * (doubleElixir ? 2 : 1);
    
    this.elixir = Math.min(this.maxElixir, this.elixir + regenRate * deltaTime);
    
    // Update deck UI
    this.deck.updateUI(this.elixir);
    
    // Update buildings
    for (let i = this.buildings.length - 1; i >= 0; i--) {
      const building = this.buildings[i];
      building.update(deltaTime);
      
      if (building.isDead) {
        this.buildings.splice(i, 1);
      }
    }
    
    // Update units
    for (let i = this.units.length - 1; i >= 0; i--) {
      const unit = this.units[i];
      unit.update(deltaTime);
      
      if (unit.isDead) {
        this.units.splice(i, 1);
      }
    }
    
    // Update UI
    this.game.ui.updateElixir(this.playerNum, this.elixir);
  }
  
  /**
   * Reset for new game
   */
  reset() {
    // Clean up
    this.units.forEach(u => u.destroy());
    this.buildings.forEach(b => {
      if (!b.isKingTower && !b.isPrincessTower) {
        b.destroy();
      }
    });
    
    this.units = [];
    this.buildings = this.towers.slice(); // Keep only towers
    
    // Reset towers
    this.towers.forEach(tower => {
      tower.health = tower.maxHealth;
      tower.isDead = false;
    });
    
    // Reset resources
    this.elixir = GameConfig.economy.startingElixir;
    
    // Reset stats
    this.kills = 0;
    this.unitsDeployed = 0;
    this.buildingsPlaced = 0;
    this.damageDealt = 0;
    
    // Reset deck
    this.deck = createStarterDeck();
    this.selectedCard = null;
    this.isDeploying = false;
    
    if (this.deploymentPreview) {
      this.game.scene.remove(this.deploymentPreview);
      this.deploymentPreview = null;
    }
  }
}
