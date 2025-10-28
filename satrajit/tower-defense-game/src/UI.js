/**
 * UI.js - User Interface Controller for 1v1
 * Manages all HUD elements and interactions
 */

export class UI {
  constructor(game) {
    this.game = game;
    
    // Get UI elements
    this.p1Health = document.getElementById('p1-health');
    this.p1Credits = document.getElementById('p1-credits');
    this.p1Kills = document.getElementById('p1-kills');
    this.p1BuildBtn = document.getElementById('p1-build-tower');
    this.p1SendBtn = document.getElementById('p1-send-enemy');
    
    this.p2Health = document.getElementById('p2-health');
    this.p2Credits = document.getElementById('p2-credits');
    this.p2Kills = document.getElementById('p2-kills');
    this.p2BuildBtn = document.getElementById('p2-build-tower');
    this.p2SendBtn = document.getElementById('p2-send-enemy');
    
    this.gameStatus = document.getElementById('game-status');
    this.victoryScreen = document.getElementById('victory-screen');
    this.victoryTitle = document.getElementById('victory-title');
    this.victoryPlayer = document.getElementById('victory-player');
    this.victoryStats = document.getElementById('victory-stats');
    this.restartBtn = document.getElementById('restart-btn');
    
    this.setupEventListeners();
    this.updateUI();
  }
  
  setupEventListeners() {
    // Player 1 buttons
    this.p1BuildBtn.addEventListener('click', () => {
      this.game.player1.startBuildMode();
    });
    
    this.p1SendBtn.addEventListener('click', () => {
      this.game.player1.sendEnemy();
    });
    
    // Player 2 buttons
    this.p2BuildBtn.addEventListener('click', () => {
      this.game.player2.startBuildMode();
    });
    
    this.p2SendBtn.addEventListener('click', () => {
      this.game.player2.sendEnemy();
    });
    
    // Restart button
    this.restartBtn.addEventListener('click', () => {
      this.game.restart();
    });
  }
  
  updateUI() {
    // Player 1
    this.p1Health.textContent = this.game.player1.health;
    this.p1Credits.textContent = this.game.player1.credits;
    this.p1Kills.textContent = this.game.player1.kills;
    
    this.p1BuildBtn.disabled = this.game.player1.credits < 100 || !this.game.gameStarted;
    this.p1SendBtn.disabled = this.game.player1.credits < 75 || !this.game.gameStarted;
    
    // Player 2
    this.p2Health.textContent = this.game.player2.health;
    this.p2Credits.textContent = this.game.player2.credits;
    this.p2Kills.textContent = this.game.player2.kills;
    
    this.p2BuildBtn.disabled = this.game.player2.credits < 100 || !this.game.gameStarted;
    this.p2SendBtn.disabled = this.game.player2.credits < 75 || !this.game.gameStarted;
    
    // Health warnings
    if (this.game.player1.health < 300) {
      this.p1Health.style.color = '#ff0000';
      this.p1Health.style.animation = 'pulse 0.5s infinite';
    } else {
      this.p1Health.style.color = '#fff';
      this.p1Health.style.animation = 'none';
    }
    
    if (this.game.player2.health < 300) {
      this.p2Health.style.color = '#ff0000';
      this.p2Health.style.animation = 'pulse 0.5s infinite';
    } else {
      this.p2Health.style.color = '#fff';
      this.p2Health.style.animation = 'none';
    }
  }
  
  setBuildMode(playerNum, active) {
    const btn = playerNum === 1 ? this.p1BuildBtn : this.p2BuildBtn;
    
    if (active) {
      btn.classList.add('active');
      btn.innerHTML = '<span class="btn-icon">❌</span><span class="btn-text">CANCEL</span>';
    } else {
      btn.classList.remove('active');
      btn.innerHTML = '<span class="btn-icon">🗼</span><span class="btn-text">BUILD TOWER</span><span class="btn-cost">100</span>';
    }
  }
  
  updateGameStatus(text) {
    this.gameStatus.textContent = text;
  }
  
  showVictory(winnerNum, winner) {
    this.victoryPlayer.textContent = `PLAYER ${winnerNum} WINS!`;
    this.victoryPlayer.style.color = winnerNum === 1 ? '#00ffff' : '#ff00ff';
    this.victoryPlayer.style.textShadow = winnerNum === 1 
      ? '0 0 20px #00ffff, 0 0 40px #00ffff'
      : '0 0 20px #ff00ff, 0 0 40px #ff00ff';
    
    this.victoryStats.innerHTML = `
      <div style="margin: 10px 0;">💀 Kills: ${winner.kills}</div>
      <div style="margin: 10px 0;">🗼 Towers Built: ${winner.towers.length}</div>
      <div style="margin: 10px 0;">💰 Final Credits: ${winner.credits}</div>
    `;
    
    this.victoryScreen.classList.remove('hidden');
  }
  
  hideVictory() {
    this.victoryScreen.classList.add('hidden');
  }
}