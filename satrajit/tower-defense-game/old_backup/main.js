/**
 * Main Entry Point
 * Initializes the game and starts the render loop
 */

import { Game } from './Game.js';

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  // Create and initialize the game
  const game = new Game();
  
  // Start the game loop
  game.start();
  
  // Handle window resize
  window.addEventListener('resize', () => {
    game.handleResize();
  });
  
  console.log('🎮 Tower Defense Game Initialized!');
  console.log('📌 Click "BUILD TOWER" then click on the grid to place towers');
  console.log('🌊 Click "START WAVE" to begin enemy waves');
});