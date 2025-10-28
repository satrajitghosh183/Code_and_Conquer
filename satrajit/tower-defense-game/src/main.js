/**
 * Main Entry Point - 1v1 Tower Wars
 */

import { Game } from './Game.js';

document.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  game.start();
  
  window.addEventListener('resize', () => game.handleResize());
  
  console.log('🎮 TOWER WARS 1v1 - Battle Arena Initialized!');
  console.log('⚔️ Two players compete to destroy each other\'s base');
  console.log('🗼 Build towers to defend, send enemies to attack!');
});