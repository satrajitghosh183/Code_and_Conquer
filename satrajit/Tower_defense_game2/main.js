/**
 * main.js - Entry Point
 * Clash Royale Style 1v1 Tower Defense
 */

import { Game } from './Game.js';

document.addEventListener('DOMContentLoaded', () => {
  console.log('🎮 Initializing Clash Royale Style Tower Defense...');
  
  const game = new Game();
  game.start();
  
  // Make game globally accessible for debugging
  window.game = game;
  
  // Multiple attempts to ensure start button works
  function attachStartButtonListener() {
    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
      // Remove any existing listeners by cloning
      const newBtn = startBtn.cloneNode(true);
      startBtn.parentNode.replaceChild(newBtn, startBtn);
      
      // Add multiple event handlers
      newBtn.addEventListener('click', handleStartClick, true); // Use capture phase
      newBtn.addEventListener('click', handleStartClick, false); // Use bubble phase
      newBtn.addEventListener('mousedown', handleStartClick, true);
      
      // Also set onclick as backup
      newBtn.setAttribute('onclick', 'window.game.startGame(); return false;');
      
      // Make sure it's clickable
      newBtn.style.pointerEvents = 'auto';
      newBtn.style.cursor = 'pointer';
      newBtn.style.zIndex = '1001';
      
      console.log('✅ Start button event listeners attached in main.js');
      return true;
    }
    return false;
  }
  
  function handleStartClick(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    console.log('🎮 Start button clicked!', e.type);
    
    if (window.game && typeof window.game.startGame === 'function') {
      console.log('🚀 Calling game.startGame()...');
      window.game.startGame();
    } else {
      console.error('❌ Game or startGame method not available', window.game);
    }
    return false;
  }
  
  // Try immediately
  if (!attachStartButtonListener()) {
    // Try after a short delay
    setTimeout(() => {
      if (!attachStartButtonListener()) {
        // Try again after longer delay
        setTimeout(attachStartButtonListener, 500);
      }
    }, 50);
  }
  
  // Also use event delegation on the start screen
  const startScreen = document.getElementById('start-screen');
  if (startScreen) {
    startScreen.addEventListener('click', (e) => {
      if (e.target.id === 'start-btn' || e.target.closest('#start-btn')) {
        handleStartClick(e);
      }
    }, true);
  }
  
  console.log('✅ Game initialized successfully!');
  console.log('📋 Controls:');
  console.log('  - Click cards to select');
  console.log('  - Click battlefield to deploy');
  console.log('  - Hotkeys: 1-4 (Player 1), 7-0 (Player 2)');
  console.log('  - ESC: Pause/Cancel deployment');
  console.log('  - SPACE: Start game');
  console.log('');
  console.log('💡 Credit System Integration Ready!');
  console.log('   Connect your coding challenge system via GameConfig.integration');
});
