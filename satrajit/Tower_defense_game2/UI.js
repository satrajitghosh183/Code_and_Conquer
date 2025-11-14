/**
 * UI.js - Comprehensive User Interface System
 * Manages all HUD elements, deck display, timer, messages, etc.
 */

export class UI {
  constructor(game) {
    this.game = game;
    
    // Get or create UI elements
    this.initializeElements();
    this.createDeckUI();
    this.attachEventListeners();
    
    this.messageQueue = [];
    this.currentMessage = null;
  }
  
  initializeElements() {
    // Main containers
    this.startScreen = document.getElementById('start-screen');
    this.gameHUD = document.getElementById('game-hud');
    this.victoryScreen = document.getElementById('victory-screen');
    this.pauseScreen = document.getElementById('pause-screen');
    
    // Timer
    this.timerDisplay = document.getElementById('timer');
    this.matchStatus = document.getElementById('match-status');
    
    // Player 1 HUD
    this.p1Elixir = document.getElementById('p1-elixir');
    this.p1ElixirBar = document.getElementById('p1-elixir-bar');
    this.p1Credits = document.getElementById('p1-credits');
    this.p1Kills = document.getElementById('p1-kills');
    this.p1DeckContainer = document.getElementById('p1-deck');
    
    // Player 2 HUD
    this.p2Elixir = document.getElementById('p2-elixir');
    this.p2ElixirBar = document.getElementById('p2-elixir-bar');
    this.p2Credits = document.getElementById('p2-credits');
    this.p2Kills = document.getElementById('p2-kills');
    this.p2DeckContainer = document.getElementById('p2-deck');
    
    // Messages
    this.messageContainer = document.getElementById('message-container');
    
    // Buttons
    this.startButton = document.getElementById('start-btn');
    this.restartButton = document.getElementById('restart-btn');
    this.resumeButton = document.getElementById('resume-btn');
    
    // Victory elements
    this.victoryTitle = document.getElementById('victory-title');
    this.victoryStats = document.getElementById('victory-stats');
  }
  
  createDeckUI() {
    // Create card UI for both players
    this.createPlayerDeck(1);
    this.createPlayerDeck(2);
  }
  
  createPlayerDeck(playerNum) {
    const player = playerNum === 1 ? this.game.player1 : this.game.player2;
    const container = playerNum === 1 ? this.p1DeckContainer : this.p2DeckContainer;
    
    container.innerHTML = ''; // Clear existing
    
    player.deck.createUI(container, (card) => {
      player.selectCard(card);
    });
  }
  
  attachEventListeners() {
    if (this.startButton) {
      console.log('✅ Start button found, attaching event listener');
      this.startButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('🎮 Start button clicked!');
        if (this.game && typeof this.game.startGame === 'function') {
          this.game.startGame();
        } else {
          console.error('❌ Game or startGame method not available');
        }
      });
    } else {
      console.error('❌ Start button not found!');
      // Try to find it again after a short delay
      setTimeout(() => {
        const btn = document.getElementById('start-btn');
        if (btn) {
          console.log('✅ Start button found on retry');
          this.startButton = btn;
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🎮 Start button clicked!');
            this.game.startGame();
          });
        }
      }, 100);
    }
    
    if (this.restartButton) {
      this.restartButton.addEventListener('click', () => {
        this.game.restart();
      });
    }
    
    if (this.resumeButton) {
      this.resumeButton.addEventListener('click', () => {
        this.game.togglePause();
      });
    }
  }
  
  /**
   * Show/hide screens
   */
  showStartScreen() {
    if (this.startScreen) this.startScreen.classList.remove('hidden');
    if (this.gameHUD) this.gameHUD.classList.add('hidden');
    if (this.victoryScreen) this.victoryScreen.classList.add('hidden');
  }
  
  hideStartScreen() {
    if (this.startScreen) this.startScreen.classList.add('hidden');
  }
  
  showGameHUD() {
    if (this.gameHUD) this.gameHUD.classList.remove('hidden');
  }
  
  hideGameHUD() {
    if (this.gameHUD) this.gameHUD.classList.add('hidden');
  }
  
  showVictoryScreen(winner, winnerPlayer, loserPlayer) {
    if (!this.victoryScreen) return;
    
    this.victoryScreen.classList.remove('hidden');
    
    if (this.victoryTitle) {
      this.victoryTitle.textContent = `PLAYER ${winner} WINS!`;
      this.victoryTitle.style.color = winner === 1 ? '#00ffff' : '#ff00ff';
    }
    
    if (this.victoryStats) {
      this.victoryStats.innerHTML = `
        <div class="victory-stat-row">
          <div class="victory-stat">
            <div class="stat-label">Kills</div>
            <div class="stat-value">${winnerPlayer.kills}</div>
          </div>
          <div class="victory-stat">
            <div class="stat-label">Units Deployed</div>
            <div class="stat-value">${winnerPlayer.unitsDeployed}</div>
          </div>
          <div class="victory-stat">
            <div class="stat-label">Buildings Placed</div>
            <div class="stat-value">${winnerPlayer.buildingsPlaced}</div>
          </div>
        </div>
        <div class="victory-stat-row">
          <div class="victory-stat">
            <div class="stat-label">Final Elixir</div>
            <div class="stat-value">${Math.floor(winnerPlayer.elixir)}</div>
          </div>
          <div class="victory-stat">
            <div class="stat-label">Credits Earned</div>
            <div class="stat-value">+500</div>
          </div>
        </div>
      `;
    }
  }
  
  setPaused(paused) {
    if (!this.pauseScreen) return;
    
    if (paused) {
      this.pauseScreen.classList.remove('hidden');
    } else {
      this.pauseScreen.classList.add('hidden');
    }
  }
  
  /**
   * Update timer display
   */
  updateTimer(currentTime, duration) {
    if (!this.timerDisplay) return;
    
    const remaining = Math.max(0, duration - currentTime);
    const minutes = Math.floor(remaining / 60);
    const seconds = Math.floor(remaining % 60);
    
    this.timerDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // Update match status
    if (this.matchStatus) {
      if (this.game.isSuddenDeath) {
        this.matchStatus.textContent = '💀 SUDDEN DEATH';
        this.matchStatus.className = 'match-status sudden-death';
      } else if (this.game.isOvertime) {
        this.matchStatus.textContent = '⏰ OVERTIME';
        this.matchStatus.className = 'match-status overtime';
      } else if (this.game.isDoubleElixir) {
        this.matchStatus.textContent = '⚡ DOUBLE ELIXIR';
        this.matchStatus.className = 'match-status double-elixir';
      } else {
        this.matchStatus.textContent = '';
      }
    }
  }
  
  /**
   * Update elixir display
   */
  updateElixir(playerNum, elixir) {
    const elixirText = playerNum === 1 ? this.p1Elixir : this.p2Elixir;
    const elixirBar = playerNum === 1 ? this.p1ElixirBar : this.p2ElixirBar;
    
    if (elixirText) {
      elixirText.textContent = Math.floor(elixir);
    }
    
    if (elixirBar) {
      const percent = (elixir / 10) * 100;
      elixirBar.style.width = `${percent}%`;
      
      // Color based on amount
      if (elixir >= 8) {
        elixirBar.style.background = '#ff00ff';
      } else if (elixir >= 5) {
        elixirBar.style.background = '#00ffff';
      } else {
        elixirBar.style.background = '#ffaa00';
      }
    }
  }
  
  /**
   * Update credits display
   */
  updateCredits(playerNum, credits) {
    const creditsEl = playerNum === 1 ? this.p1Credits : this.p2Credits;
    if (creditsEl) {
      creditsEl.textContent = credits;
    }
  }
  
  /**
   * Update stats
   */
  updateStats(playerNum) {
    const player = playerNum === 1 ? this.game.player1 : this.game.player2;
    const killsEl = playerNum === 1 ? this.p1Kills : this.p2Kills;
    
    if (killsEl) {
      killsEl.textContent = player.kills;
    }
  }
  
  /**
   * Update deck after cycling
   */
  updateDeck(playerNum) {
    this.createPlayerDeck(playerNum);
  }
  
  /**
   * Show temporary message
   */
  showMessage(text, type = 'info') {
    const message = document.createElement('div');
    message.className = `game-message message-${type}`;
    message.textContent = text;
    
    if (this.messageContainer) {
      this.messageContainer.appendChild(message);
      
      // Animate in
      setTimeout(() => message.classList.add('show'), 10);
      
      // Remove after duration
      setTimeout(() => {
        message.classList.remove('show');
        setTimeout(() => {
          if (message.parentNode) {
            message.parentNode.removeChild(message);
          }
        }, 300);
      }, type === 'special' ? 3000 : 2000);
    }
  }
  
  /**
   * Reset UI for new game
   */
  reset() {
    this.updateElixir(1, 5);
    this.updateElixir(2, 5);
    this.updateCredits(1, 1000);
    this.updateCredits(2, 1000);
    this.updateStats(1);
    this.updateStats(2);
    
    if (this.timerDisplay) {
      this.timerDisplay.textContent = '3:00';
    }
    
    if (this.matchStatus) {
      this.matchStatus.textContent = '';
    }
    
    if (this.messageContainer) {
      this.messageContainer.innerHTML = '';
    }
    
    this.hideGameHUD();
    if (this.victoryScreen) {
      this.victoryScreen.classList.add('hidden');
    }
    if (this.pauseScreen) {
      this.pauseScreen.classList.add('hidden');
    }
  }
}
