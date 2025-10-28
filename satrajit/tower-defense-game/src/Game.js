/**
 * Game.js - Main 1v1 Game Controller
 * Two-player competitive tower defense battle system
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { Player } from './Player.js';
import { UI } from './UI.js';
import { ParticleSystem } from './ParticleSystem.js';

export class Game {
  constructor() {
    this.gameStarted = false;
    this.gameOver = false;
    this.winner = null;
    
    // Initialize Three.js
    this.initScene();
    this.initCamera();
    this.initRenderer();
    this.initPostProcessing();
    this.initLights();
    this.initControls();
    this.createEnvironment();
    
    // Create players
    this.player1 = new Player(this, 1, new THREE.Vector3(-15, 0, 0));
    this.player2 = new Player(this, 2, new THREE.Vector3(15, 0, 0));
    
    // Initialize systems
    this.particleSystem = new ParticleSystem(this.scene);
    this.ui = new UI(this);
    
    // Mouse interaction
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    
    this.setupEventListeners();
    this.clock = new THREE.Clock();
  }
  
  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000208);
    this.scene.fog = new THREE.FogExp2(0x000208, 0.015);
  }
  
  initCamera() {
    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 30, 35);
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
    this.renderer.toneMappingExposure = 1.2;
    
    document.getElementById('game-container').appendChild(this.renderer.domElement);
  }
  
  /**
   * Add bloom post-processing for beautiful glows
   */
  initPostProcessing() {
    this.composer = new EffectComposer(this.renderer);
    
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);
    
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.5,  // strength
      0.4,  // radius
      0.85  // threshold
    );
    this.composer.addPass(bloomPass);
  }
  
  initLights() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x1a1a2e, 0.4);
    this.scene.add(ambientLight);
    
    // Main directional light
    const mainLight = new THREE.DirectionalLight(0xffffff, 0.6);
    mainLight.position.set(0, 40, 20);
    mainLight.castShadow = true;
    mainLight.shadow.camera.left = -40;
    mainLight.shadow.camera.right = 40;
    mainLight.shadow.camera.top = 40;
    mainLight.shadow.camera.bottom = -40;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    this.scene.add(mainLight);
    
    // Colored accent lights
    const light1 = new THREE.PointLight(0x00ffff, 2, 50);
    light1.position.set(-20, 10, -20);
    this.scene.add(light1);
    
    const light2 = new THREE.PointLight(0xff00ff, 2, 50);
    light2.position.set(20, 10, -20);
    this.scene.add(light2);
    
    const light3 = new THREE.PointLight(0xffff00, 2, 50);
    light3.position.set(0, 10, 20);
    this.scene.add(light3);
    
    this.accentLights = [light1, light2, light3];
  }
  
  initControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 15;
    this.controls.maxDistance = 60;
    this.controls.maxPolarAngle = Math.PI / 2.2;
    this.controls.target.set(0, 0, 0);
  }
  
  createEnvironment() {
    // Beautiful gradient floor
    const floorGeometry = new THREE.PlaneGeometry(80, 60);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x0a0a1a,
      metalness: 0.9,
      roughness: 0.1,
      envMapIntensity: 1
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
    
    // Neon grid
    const gridHelper = new THREE.GridHelper(80, 80, 0x00ffff, 0x003344);
    gridHelper.material.opacity = 0.3;
    gridHelper.material.transparent = true;
    this.scene.add(gridHelper);
    
    // Center dividing line
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.1, -30),
      new THREE.Vector3(0, 0.1, 30)
    ]);
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xffff00,
      linewidth: 3,
      transparent: true,
      opacity: 0.8
    });
    const centerLine = new THREE.Line(lineGeometry, lineMaterial);
    this.scene.add(centerLine);
    
    // Add energy particles floating around
    this.createAmbientParticles();
    
    // Add boundary walls
    this.createBoundaryEffects();
  }
  
  createAmbientParticles() {
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 200;
    const positions = new Float32Array(particlesCount * 3);
    const colors = new Float32Array(particlesCount * 3);
    
    for (let i = 0; i < particlesCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 80;
      positions[i + 1] = Math.random() * 30;
      positions[i + 2] = (Math.random() - 0.5) * 60;
      
      const color = new THREE.Color();
      color.setHSL(Math.random(), 1, 0.5);
      colors[i] = color.r;
      colors[i + 1] = color.g;
      colors[i + 2] = color.b;
    }
    
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const particlesMaterial = new THREE.PointsMaterial({
      size: 0.3,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });
    
    this.ambientParticles = new THREE.Points(particlesGeometry, particlesMaterial);
    this.scene.add(this.ambientParticles);
  }
  
  createBoundaryEffects() {
    // Add glowing boundary pillars
    const pillarGeometry = new THREE.CylinderGeometry(0.5, 0.5, 30, 8);
    const positions = [
      [-40, 15, -30], [40, 15, -30],
      [-40, 15, 30], [40, 15, 30]
    ];
    const colors = [0x00ffff, 0xff00ff, 0xffff00, 0x00ff00];
    
    positions.forEach((pos, i) => {
      const material = new THREE.MeshStandardMaterial({
        color: colors[i],
        emissive: colors[i],
        emissiveIntensity: 1,
        metalness: 0.8,
        roughness: 0.2
      });
      const pillar = new THREE.Mesh(pillarGeometry, material);
      pillar.position.set(...pos);
      pillar.castShadow = true;
      this.scene.add(pillar);
    });
  }
  
  setupEventListeners() {
    // Keyboard controls
    document.addEventListener('keydown', (e) => this.handleKeyPress(e));
    
    // Mouse controls
    this.renderer.domElement.addEventListener('click', (e) => this.handleClick(e));
    this.renderer.domElement.addEventListener('mousemove', (e) => this.handleMouseMove(e));
  }
  
  handleKeyPress(event) {
    if (event.code === 'Space' && !this.gameStarted) {
      this.startGame();
      return;
    }
    
    if (!this.gameStarted || this.gameOver) return;
    
    // Player 1 controls
    if (event.key === 'q' || event.key === 'Q') {
      this.player1.startBuildMode();
    }
    if (event.key === 'w' || event.key === 'W') {
      this.player1.sendEnemy();
    }
    
    // Player 2 controls
    if (event.key === 'o' || event.key === 'O') {
      this.player2.startBuildMode();
    }
    if (event.key === 'p' || event.key === 'P') {
      this.player2.sendEnemy();
    }
  }
  
  handleClick(event) {
    if (!this.gameStarted || this.gameOver) return;
    
    this.updateMousePosition(event);
    
    if (this.player1.isBuilding) {
      this.player1.placeTower(this.getWorldPosition());
    }
    if (this.player2.isBuilding) {
      this.player2.placeTower(this.getWorldPosition());
    }
  }
  
  handleMouseMove(event) {
    if (!this.gameStarted) return;
    
    this.updateMousePosition(event);
    const worldPos = this.getWorldPosition();
    
    if (this.player1.isBuilding) {
      this.player1.updatePreview(worldPos);
    }
    if (this.player2.isBuilding) {
      this.player2.updatePreview(worldPos);
    }
  }
  
  updateMousePosition(event) {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }
  
  getWorldPosition() {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersectPoint = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.groundPlane, intersectPoint);
    return intersectPoint;
  }
  
  startGame() {
    this.gameStarted = true;
    this.ui.updateGameStatus('⚔️ BATTLE IN PROGRESS ⚔️');
    
    // Start credit generation
    this.creditInterval = setInterval(() => {
      if (!this.gameOver) {
        this.player1.addCredits(10);
        this.player2.addCredits(10);
      }
    }, 3000);
  }
  
  endGame(losingPlayer) {
    this.gameOver = true;
    this.winner = losingPlayer === 1 ? 2 : 1;
    clearInterval(this.creditInterval);
    
    this.ui.showVictory(this.winner, 
      this.winner === 1 ? this.player1 : this.player2
    );
    
    // Epic victory particle explosion
    this.particleSystem.createExplosion(
      new THREE.Vector3(0, 10, 0),
      100,
      this.winner === 1 ? 0x00ffff : 0xff00ff
    );
  }
  
  update(deltaTime) {
    if (!this.gameStarted || this.gameOver) {
      // Animate lights even before game starts
      this.animateLights(deltaTime);
      return;
    }
    
    this.controls.update();
    
    // Update players
    this.player1.update(deltaTime);
    this.player2.update(deltaTime);
    
    // Animate environment
    this.animateLights(deltaTime);
    this.animateParticles(deltaTime);
    
    // Update particle system
    this.particleSystem.update(deltaTime);
    
    // Check win conditions
    if (this.player1.health <= 0) {
      this.endGame(1);
    } else if (this.player2.health <= 0) {
      this.endGame(2);
    }
  }
  
  animateLights(deltaTime) {
    const time = this.clock.getElapsedTime();
    this.accentLights.forEach((light, i) => {
      light.intensity = 2 + Math.sin(time * 2 + i * 2) * 0.5;
    });
  }
  
  animateParticles(deltaTime) {
    if (this.ambientParticles) {
      this.ambientParticles.rotation.y += deltaTime * 0.1;
      const positions = this.ambientParticles.geometry.attributes.position.array;
      for (let i = 1; i < positions.length; i += 3) {
        positions[i] += Math.sin(this.clock.getElapsedTime() + i) * 0.01;
      }
      this.ambientParticles.geometry.attributes.position.needsUpdate = true;
    }
  }
  
  handleResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.composer.setSize(window.innerWidth, window.innerHeight);
  }
  
  restart() {
    // Reset players
    this.player1.reset();
    this.player2.reset();
    
    // Reset game state
    this.gameOver = false;
    this.gameStarted = false;
    this.winner = null;
    
    this.ui.hideVictory();
    this.ui.updateGameStatus('Press SPACE to start battle!');
  }
  
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