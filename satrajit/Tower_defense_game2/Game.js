/**
 * Game.js - Main Clash Royale Style Game Controller
 * Manages match flow, timer, double elixir, win conditions
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

import { GameConfig } from './GameConfig.js';
import { Arena } from './Arena.js';
import { Player } from './Player.js';
import { ProjectileSystem } from './ProjectileSystem.js';
import { ParticleSystem } from './ParticleSystem.js';
import { UI } from './UI.js';

export class Game {
  constructor() {
    // Game state
    this.gameStarted = false;
    this.gameOver = false;
    this.gamePaused = false;
    this.winner = null;
    
    // Match timer
    this.matchTime = 0;
    this.matchDuration = GameConfig.match.duration;
    this.isOvertime = false;
    this.isDoubleElixir = false;
    this.isSuddenDeath = false;
    
    // Initialize Three.js
    this.initScene();
    this.initCamera();
    this.initRenderer();
    this.initPostProcessing();
    this.initLights();
    this.initControls();
    
    // Create game systems
    this.arena = new Arena(this);
    this.projectileSystem = new ProjectileSystem(this);
    this.particleSystem = new ParticleSystem(this.scene);
    
    // Create players
    this.player1 = new Player(this, 1);
    this.player2 = new Player(this, 2);
    
    // Set enemy references
    this.player1.enemy = this.player2;
    this.player2.enemy = this.player1;
    
    // UI
    this.ui = new UI(this);
    
    // Input handling
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    
    this.setupEventListeners();
    this.clock = new THREE.Clock();
    
    console.log('🎮 Clash Royale Style Tower Defense - Initialized!');
    console.log('⚔️ Ready for 1v1 battle with coding challenge integration');
  }
  
  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000510);
    this.scene.fog = new THREE.FogExp2(0x000510, 0.012);
  }
  
  initCamera() {
    this.camera = new THREE.PerspectiveCamera(
      65,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 35, 40);
    this.camera.lookAt(0, 0, 0);
  }
  
  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.3;
    
    const container = document.getElementById('game-container');
    container.appendChild(this.renderer.domElement);
    
    // Disable pointer events on canvas initially (start screen should be clickable)
    this.renderer.domElement.style.pointerEvents = 'none';
  }
  
  initPostProcessing() {
    this.composer = new EffectComposer(this.renderer);
    
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);
    
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      GameConfig.effects.lighting.bloom.strength,
      GameConfig.effects.lighting.bloom.radius,
      GameConfig.effects.lighting.bloom.threshold
    );
    this.composer.addPass(bloomPass);
  }
  
  initLights() {
    // Ambient
    const ambientLight = new THREE.AmbientLight(0x1a1a2e, 0.5);
    this.scene.add(ambientLight);
    
    // Main directional light (sun)
    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
    mainLight.position.set(0, 50, 20);
    mainLight.castShadow = true;
    mainLight.shadow.camera.left = -50;
    mainLight.shadow.camera.right = 50;
    mainLight.shadow.camera.top = 50;
    mainLight.shadow.camera.bottom = -50;
    mainLight.shadow.mapSize.width = 4096;
    mainLight.shadow.mapSize.height = 4096;
    mainLight.shadow.bias = -0.0001;
    this.scene.add(mainLight);
    
    // Accent lights for atmosphere
    const accentColors = [0x00ffff, 0xff00ff, 0xffff00, 0x00ff00];
    const accentPositions = [
      [-25, 15, -30],
      [25, 15, -30],
      [-25, 15, 30],
      [25, 15, 30]
    ];
    
    this.accentLights = [];
    accentPositions.forEach((pos, i) => {
      const light = new THREE.PointLight(accentColors[i], 2, 60);
      light.position.set(...pos);
      this.scene.add(light);
      this.accentLights.push(light);
    });
  }
  
  initControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 20;
    this.controls.maxDistance = 70;
    this.controls.maxPolarAngle = Math.PI / 2.1;
    this.controls.target.set(0, 0, 0);
    this.controls.mouseButtons = {
      LEFT: null, // Disable left click camera rotation
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.ROTATE
    };
  }
  
  setupEventListeners() {
    // Mouse events - only attach to canvas, not to buttons
    this.renderer.domElement.addEventListener('click', (e) => {
      // Don't handle clicks on UI elements
      const target = e.target;
      if (target.closest('#start-screen') || 
          target.closest('#game-hud') || 
          target.closest('#victory-screen') || 
          target.closest('#pause-screen') ||
          target.tagName === 'BUTTON') {
        return; // Let UI handle these clicks
      }
      this.handleClick(e);
    });
    this.renderer.domElement.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
    
    // Keyboard events
    document.addEventListener('keydown', (e) => this.handleKeyPress(e));
    
    // Window resize
    window.addEventListener('resize', () => this.handleResize());
  }
  
  handleClick(event) {
    if (!this.gameStarted || this.gameOver || this.gamePaused) return;
    
    // Left click only
    if (event.button !== 0) return;
    
    this.updateMousePosition(event);
    const worldPos = this.getWorldPosition();
    
    if (!worldPos) return;
    
    // Check which player is deploying
    if (this.player1.isDeploying) {
      this.player1.deploy(worldPos);
    } else if (this.player2.isDeploying) {
      this.player2.deploy(worldPos);
    }
  }
  
  handleMouseMove(event) {
    if (!this.gameStarted) return;
    
    this.updateMousePosition(event);
    const worldPos = this.getWorldPosition();
    
    if (!worldPos) return;
    
    // Update deployment preview
    if (this.player1.isDeploying) {
      this.player1.updateDeploymentPreview(worldPos);
    } else if (this.player2.isDeploying) {
      this.player2.updateDeploymentPreview(worldPos);
    }
  }
  
  handleKeyPress(event) {
    // Start game
    if (event.code === 'Space' && !this.gameStarted) {
      this.startGame();
      return;
    }
    
    if (!this.gameStarted || this.gameOver) return;
    
    // Pause
    if (event.code === 'Escape') {
      this.togglePause();
      return;
    }
    
    // Cancel deployment
    if (event.code === 'Escape' || event.key === 'c' || event.key === 'C') {
      if (this.player1.isDeploying) {
        this.player1.cancelDeployment();
      }
      if (this.player2.isDeploying) {
        this.player2.cancelDeployment();
      }
    }
    
    // Player 1 hotkeys (1-4 for cards)
    if (event.key >= '1' && event.key <= '4') {
      const index = parseInt(event.key) - 1;
      const cards = this.player1.deck.getHand();
      if (cards[index]) {
        this.player1.selectCard(cards[index]);
      }
    }
    
    // Player 2 hotkeys (7-0 for cards)
    if (event.key >= '7' && event.key <= '9') {
      const index = parseInt(event.key) - 7;
      const cards = this.player2.deck.getHand();
      if (cards[index]) {
        this.player2.selectCard(cards[index]);
      }
    }
    if (event.key === '0') {
      const cards = this.player2.deck.getHand();
      if (cards[3]) {
        this.player2.selectCard(cards[3]);
      }
    }
  }
  
  updateMousePosition(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }
  
  getWorldPosition() {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersectPoint = new THREE.Vector3();
    const intersects = this.raycaster.ray.intersectPlane(this.groundPlane, intersectPoint);
    return intersects ? intersectPoint : null;
  }
  
  /**
   * Start the match
   */
  startGame() {
    console.log('🚀 startGame() called!');
    this.gameStarted = true;
    this.matchTime = 0;
    this.isOvertime = false;
    this.isDoubleElixir = false;
    this.isSuddenDeath = false;
    
    // Enable pointer events on canvas now that game has started
    if (this.renderer && this.renderer.domElement) {
      this.renderer.domElement.style.pointerEvents = 'auto';
    }
    
    this.ui.hideStartScreen();
    this.ui.showGameHUD();
    this.ui.updateTimer(this.matchTime, this.matchDuration);
    
    console.log('⚔️ Battle Started!');
  }
  
  /**
   * Toggle pause
   */
  togglePause() {
    this.gamePaused = !this.gamePaused;
    this.ui.setPaused(this.gamePaused);
  }
  
  /**
   * Update match timer and check special conditions
   */
  updateMatchTimer(deltaTime) {
    this.matchTime += deltaTime;
    
    // Check for double elixir time
    const timeRemaining = this.matchDuration - this.matchTime;
    if (!this.isDoubleElixir && timeRemaining <= GameConfig.match.doubleElixirTime) {
      this.isDoubleElixir = true;
      this.ui.showMessage('⚡ DOUBLE ELIXIR! ⚡', 'special');
      console.log('⚡ Double Elixir activated!');
    }
    
    // Check for overtime
    if (!this.isOvertime && this.matchTime >= this.matchDuration) {
      const p1Health = this.player1.getTotalHealth();
      const p2Health = this.player2.getTotalHealth();
      
      if (p1Health === p2Health) {
        // Tie - start overtime
        this.isOvertime = true;
        this.matchTime = this.matchDuration;
        this.ui.showMessage('⏰ OVERTIME! ⏰', 'special');
        console.log('⏰ Overtime!');
      } else {
        // Winner based on health
        this.endGame(p1Health > p2Health ? 2 : 1);
      }
    }
    
    // Check for sudden death
    if (this.isOvertime) {
      const overtimeElapsed = this.matchTime - this.matchDuration;
      if (!this.isSuddenDeath && overtimeElapsed >= GameConfig.match.overtimeDuration) {
        this.isSuddenDeath = true;
        this.ui.showMessage('💀 SUDDEN DEATH! 💀', 'special');
        console.log('💀 Sudden Death! Next tower destroyed wins!');
      }
    }
    
    this.ui.updateTimer(this.matchTime, this.matchDuration);
  }
  
  /**
   * Check win conditions each frame
   */
  checkWinConditions() {
    // King tower destroyed
    if (this.player1.hasLost()) {
      this.endGame(1); // Player 1 lost, Player 2 wins
    } else if (this.player2.hasLost()) {
      this.endGame(2); // Player 2 lost, Player 1 wins
    }
    
    // Sudden death - any tower destroyed
    if (this.isSuddenDeath) {
      const p1TowerDestroyed = this.player1.towers.some(t => t.isDead);
      const p2TowerDestroyed = this.player2.towers.some(t => t.isDead);
      
      if (p1TowerDestroyed && !p2TowerDestroyed) {
        this.endGame(1); // Player 1 lost
      } else if (p2TowerDestroyed && !p1TowerDestroyed) {
        this.endGame(2); // Player 2 lost
      }
    }
  }
  
  /**
   * End game with winner
   */
  endGame(losingPlayer) {
    if (this.gameOver) return;
    
    this.gameOver = true;
    this.winner = losingPlayer === 1 ? 2 : 1;
    
    const winnerPlayer = this.winner === 1 ? this.player1 : this.player2;
    const loserPlayer = this.winner === 1 ? this.player2 : this.player1;
    
    console.log(`🏆 Player ${this.winner} Wins!`);
    
    // Victory screen
    this.ui.showVictoryScreen(this.winner, winnerPlayer, loserPlayer);
    
    // Epic victory effect
    this.particleSystem.createExplosion(
      new THREE.Vector3(0, 15, 0),
      150,
      this.winner === 1 ? 0x00ffff : 0xff00ff
    );
    
    // Award victory credits
    winnerPlayer.addCredits(500);
  }
  
  /**
   * Restart match
   */
  restart() {
    console.log('🔄 Restarting match...');
    
    // Reset game state
    this.gameOver = false;
    this.gameStarted = false;
    this.gamePaused = false;
    this.winner = null;
    this.matchTime = 0;
    this.isOvertime = false;
    this.isDoubleElixir = false;
    this.isSuddenDeath = false;
    
    // Reset players
    this.player1.reset();
    this.player2.reset();
    
    // Clear systems
    this.projectileSystem.clear();
    this.particleSystem.clear();
    
    // Reset UI
    this.ui.reset();
    this.ui.showStartScreen();
  }
  
  /**
   * Main game loop
   */
  update(deltaTime) {
    // Always update controls and arena
    this.controls.update();
    this.arena.update(deltaTime);
    this.animateLights(deltaTime);
    
    if (!this.gameStarted || this.gameOver || this.gamePaused) {
      return;
    }
    
    // Update match timer
    this.updateMatchTimer(deltaTime);
    
    // Update players
    this.player1.update(deltaTime);
    this.player2.update(deltaTime);
    
    // Update systems
    this.projectileSystem.update(deltaTime);
    this.particleSystem.update(deltaTime);
    
    // Check win conditions
    this.checkWinConditions();
  }
  
  animateLights(deltaTime) {
    const time = this.clock.getElapsedTime();
    this.accentLights.forEach((light, i) => {
      light.intensity = 2 + Math.sin(time * 1.5 + i * 2) * 0.5;
    });
  }
  
  handleResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.composer.setSize(window.innerWidth, window.innerHeight);
  }
  
  /**
   * Start render loop
   */
  start() {
    const animate = () => {
      requestAnimationFrame(animate);
      
      const deltaTime = Math.min(this.clock.getDelta(), 0.1);
      
      this.update(deltaTime);
      this.composer.render();
    };
    
    animate();
  }
}
