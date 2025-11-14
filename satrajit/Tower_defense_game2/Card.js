/**
 * Card.js - Clash Royale Style Card System
 * Represents deployable units, buildings, and spells
 */

import * as THREE from 'three';
import { GameConfig } from './GameConfig.js';

export class Card {
  constructor(type, id) {
    this.type = type; // 'unit', 'building', or 'spell'
    this.id = id;
    this.config = this.getConfig();
    
    // Card state
    this.available = true;
    this.cooldown = 0;
    this.level = 1; // For future upgrade system
  }
  
  getConfig() {
    switch(this.type) {
      case 'unit':
        return GameConfig.units[this.id];
      case 'building':
        return GameConfig.buildings[this.id];
      case 'spell':
        return GameConfig.spells[this.id];
      default:
        console.error(`Unknown card type: ${this.type}`);
        return null;
    }
  }
  
  getCost() {
    return this.config.cost;
  }
  
  getName() {
    return this.config.name;
  }
  
  getDescription() {
    return this.config.description;
  }
  
  canDeploy(elixir) {
    return this.available && elixir >= this.getCost();
  }
  
  /**
   * Create visual representation for UI
   */
  createCardUI(container, onClick) {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'game-card';
    cardDiv.dataset.cardId = this.id;
    
    // Card cost indicator
    const costBadge = document.createElement('div');
    costBadge.className = 'card-cost';
    costBadge.textContent = this.getCost();
    
    // Card image/icon (using color for now)
    const cardIcon = document.createElement('div');
    cardIcon.className = 'card-icon';
    cardIcon.style.background = `#${this.config.color.toString(16).padStart(6, '0')}`;
    
    // Card name
    const cardName = document.createElement('div');
    cardName.className = 'card-name';
    cardName.textContent = this.getName();
    
    // Card type indicator
    const cardType = document.createElement('div');
    cardType.className = 'card-type';
    cardType.textContent = this.type.toUpperCase();
    
    cardDiv.appendChild(costBadge);
    cardDiv.appendChild(cardIcon);
    cardDiv.appendChild(cardName);
    cardDiv.appendChild(cardType);
    
    // Click handler
    cardDiv.addEventListener('click', () => {
      if (!cardDiv.classList.contains('disabled')) {
        onClick(this);
      }
    });
    
    this.uiElement = cardDiv;
    container.appendChild(cardDiv);
    
    return cardDiv;
  }
  
  /**
   * Update UI state
   */
  updateUI(elixir) {
    if (!this.uiElement) return;
    
    if (this.canDeploy(elixir)) {
      this.uiElement.classList.remove('disabled');
      this.uiElement.classList.add('available');
    } else {
      this.uiElement.classList.add('disabled');
      this.uiElement.classList.remove('available');
    }
  }
  
  /**
   * Set card as selected
   */
  setSelected(selected) {
    if (!this.uiElement) return;
    
    if (selected) {
      this.uiElement.classList.add('selected');
    } else {
      this.uiElement.classList.remove('selected');
    }
  }
}

/**
 * Deck - Collection of cards for a player
 */
export class Deck {
  constructor(cardDefinitions) {
    this.cards = [];
    this.selectedCard = null;
    this.nextCards = []; // Cards in rotation queue
    
    // Initialize deck from definitions
    cardDefinitions.forEach(def => {
      this.cards.push(new Card(def.type, def.id));
    });
    
    // Initialize card rotation (4 cards in hand)
    this.initializeHand();
  }
  
  initializeHand() {
    // Shuffle and pick first 4 cards
    const shuffled = [...this.cards].sort(() => Math.random() - 0.5);
    this.nextCards = shuffled.slice(0, Math.min(4, shuffled.length));
  }
  
  /**
   * Get current hand (4 cards visible to player)
   */
  getHand() {
    return this.nextCards;
  }
  
  /**
   * Cycle to next card when one is used
   */
  cycleCard(usedCard) {
    const index = this.nextCards.indexOf(usedCard);
    if (index !== -1) {
      this.nextCards.splice(index, 1);
      
      // Add next card from deck
      const availableCards = this.cards.filter(c => !this.nextCards.includes(c));
      if (availableCards.length > 0) {
        const nextCard = availableCards[Math.floor(Math.random() * availableCards.length)];
        this.nextCards.push(nextCard);
      }
    }
  }
  
  selectCard(card) {
    if (this.selectedCard) {
      this.selectedCard.setSelected(false);
    }
    
    this.selectedCard = card;
    if (card) {
      card.setSelected(true);
    }
  }
  
  deselectCard() {
    if (this.selectedCard) {
      this.selectedCard.setSelected(false);
      this.selectedCard = null;
    }
  }
  
  getSelectedCard() {
    return this.selectedCard;
  }
  
  updateUI(elixir) {
    this.nextCards.forEach(card => card.updateUI(elixir));
  }
  
  createUI(container, onClick) {
    this.nextCards.forEach(card => {
      card.createCardUI(container, onClick);
    });
  }
}

/**
 * Default Starter Deck
 */
export function createStarterDeck() {
  return new Deck([
    { type: 'unit', id: 'knight' },
    { type: 'unit', id: 'archers' },
    { type: 'unit', id: 'giant' },
    { type: 'unit', id: 'musketeer' },
    { type: 'building', id: 'cannon' },
    { type: 'unit', id: 'miniPekka' },
    { type: 'unit', id: 'goblinGang' },
    { type: 'unit', id: 'babyDragon' }
  ]);
}
