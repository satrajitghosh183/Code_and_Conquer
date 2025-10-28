/**
 * UI.js - User Interface Controller
 * Manages DOM elements and UI interactions
 */

export class UI {
  constructor(game) {
    this.game = game;
    
    // Get UI elements
    this.healthDisplay = document.getElementById('health');
    this.creditsDisplay = document.getElementById('credits');
    this.waveDisplay = document.getElementById('wave');
    this.scoreDisplay = document.getElementById('score');
    this.buildButton = document.getElementById('build-tower');
    this.waveButton = document.getElementById('start-wave');
    this.gameOverPanel = document.getElementById('game-over');
    this.finalScoreDisplay = document.getElementById('final-score');
    this.restartButton = document.getElementById('restart-btn');
    
    this.setupEventListeners();
    this.updateUI();
  }
  
  /**
   * Setup button click handlers
   */
  setupEventListeners() {
    this.buildButton.addEventListener('click', () => {
      if (!this.game.isPlacingTower && this.game.credits >= 100) {
        this.game.enterBuildMode();
        this.buildButton.classList.add('active');
        this.buildButton.textContent = '❌ CANCEL';
      } else if (this.game.isPlacingTower) {
        this.game.exitBuildMode();
        this.exitBuildMode();
      }
    });
    
    this.waveButton.addEventListener('click', () => {
      this.game.startWave();
      this.waveButton.disabled = true;
      setTimeout(() => {
        this.waveButton.disabled = false;
      }, 5000); // Cooldown between waves
    });
    
    this.restartButton.addEventListener('click', () => {
      this.game.restart();
    });
  }
  
  /**
   * Exit build mode UI state
   */
  exitBuildMode() {
    this.buildButton.classList.remove('active');
    this.buildButton.innerHTML = '🗼 BUILD TOWER<br><span class="cost">Cost: 100</span>';
  }
  
  /**
   * Update all UI displays
   */
  updateUI() {
    this.healthDisplay.textContent = this.game.health;
    this.creditsDisplay.textContent = this.game.credits;
    this.waveDisplay.textContent = this.game.wave;
    this.scoreDisplay.textContent = this.game.score;
    
    // Disable build button if not enough credits
    if (this.game.credits < 100) {
      this.buildButton.disabled = true;
    } else {
      this.buildButton.disabled = false;
    }
    
    // Add visual feedback for low health
    if (this.game.health <= 30) {
      this.healthDisplay.style.color = '#ff0000';
      this.healthDisplay.style.textShadow = '0 0 20px #ff0000, 0 0 30px #ff0000';
    } else {
      this.healthDisplay.style.color = '#fff';
      this.healthDisplay.style.textShadow = '0 0 20px #0ff, 0 0 30px #0ff';
    }
  }
  
  /**
   * Show game over screen
   */
  showGameOver() {
    this.finalScoreDisplay.textContent = `Final Score: ${this.game.score}`;
    this.gameOverPanel.classList.remove('hidden');
  }
  
  /**
   * Hide game over screen
   */
  hideGameOver() {
    this.gameOverPanel.classList.add('hidden');
  }
}