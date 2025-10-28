/**
 * Game.js - Main Game Controller
 * Manages scene, camera, lights, game loop, and coordinates all game systems
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Tower } from './Tower.js';
import { Enemy } from './Enemy.js';
import { Projectile } from './Projectile.js';
import { UI } from './UI.js';

export class Game {
  constructor() {
    // Game state
    this.health = 100;
    this.credits = 500;
    this.score = 0;
    this.wave = 1;
    this.isPlacingTower = false;
    this.gameOver = false;
    
    // Game collections
    this.towers = [];
    this.enemies = [];
    this.projectiles = [];
    
    // Enemy path waypoints (circular path around the base)
    this.enemyPath = [
      new THREE.Vector3(-15, 0.5, -15),
      new THREE.Vector3(15, 0.5, -15),
      new THREE.Vector3(15, 0.5, 15),
      new THREE.Vector3(-15, 0.5, 15),
      new THREE.Vector3(0, 0.5, 0) // End point (base)
    ];
    
    // Initialize Three.js components
    this.initScene();
    this.initCamera();
    this.initRenderer();
    this.initLights();
    this.initControls();
    this.createEnvironment();
    
    // Initialize UI
    this.ui = new UI(this);
    
    // Mouse interaction
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    
    // Preview tower for placement
    this.previewTower = null;
    
    this.setupEventListeners();
  }
  
  /**
   * Initialize the Three.js scene
   */
  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000510);
    this.scene.fog = new THREE.Fog(0x000510, 20, 60);
  }
  
  /**
   * Initialize camera with perspective view
   */
  initCamera() {
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(20, 25, 20);
    this.camera.lookAt(0, 0, 0);
  }
  
  /**
   * Initialize WebGL renderer
   */
  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    document.getElementById('game-container').appendChild(this.renderer.domElement);
  }
  
  /**
   * Setup ambient and point lights for vibrant neon atmosphere
   */
  initLights() {
    // Ambient light for overall illumination
    const ambientLight = new THREE.AmbientLight(0x0066ff, 0.3);
    this.scene.add(ambientLight);
    
    // Main directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.left = -30;
    directionalLight.shadow.camera.right = 30;
    directionalLight.shadow.camera.top = 30;
    directionalLight.shadow.camera.bottom = -30;
    this.scene.add(directionalLight);
    
    // Neon point lights for atmosphere
    const colors = [0x00ffff, 0xff00ff, 0xffff00];
    const positions = [
      [-20, 5, -20],
      [20, 5, -20],
      [20, 5, 20],
      [-20, 5, 20]
    ];
    
    positions.forEach((pos, i) => {
      const light = new THREE.PointLight(colors[i % colors.length], 1, 50);
      light.position.set(...pos);
      this.scene.add(light);
    });
  }
  
  /**
   * Initialize orbit controls for camera movement
   */
  initControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 50;
    this.controls.maxPolarAngle = Math.PI / 2.2;
  }
  
  /**
   * Create the game environment (floor, base, path visualization)
   */
  createEnvironment() {
    // Neon grid floor
    const gridSize = 40;
    const gridDivisions = 40;
    const gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0x00ffff, 0x004444);
    gridHelper.material.opacity = 0.5;
    gridHelper.material.transparent = true;
    this.scene.add(gridHelper);
    
    // Glowing floor plane
    const floorGeometry = new THREE.PlaneGeometry(gridSize, gridSize);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x001122,
      emissive: 0x002244,
      emissiveIntensity: 0.5,
      roughness: 0.8
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
    this.floor = floor; // Store reference for raycasting
    
    // Create base (player's base that enemies target)
    const baseGeometry = new THREE.CylinderGeometry(2, 3, 1, 8);
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 0.8,
      metalness: 0.7,
      roughness: 0.3
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 0.5;
    base.castShadow = true;
    this.scene.add(base);
    
    // Add pulsing glow to base
    this.base = base;
    
    // Visualize path with glowing line
    this.visualizePath();
  }
  
  /**
   * Create visual representation of enemy path
   */
  visualizePath() {
    const pathPoints = this.enemyPath.map(p => p.clone());
    const pathGeometry = new THREE.BufferGeometry().setFromPoints(pathPoints);
    const pathMaterial = new THREE.LineBasicMaterial({
      color: 0xff00ff,
      linewidth: 2,
      transparent: true,
      opacity: 0.5
    });
    const pathLine = new THREE.Line(pathGeometry, pathMaterial);
    this.scene.add(pathLine);
    
    // Add waypoint markers
    pathPoints.forEach((point, i) => {
      if (i < pathPoints.length - 1) {
        const markerGeometry = new THREE.SphereGeometry(0.3, 8, 8);
        const markerMaterial = new THREE.MeshStandardMaterial({
          color: 0xff00ff,
          emissive: 0xff00ff,
          emissiveIntensity: 1
        });
        const marker = new THREE.Mesh(markerGeometry, markerMaterial);
        marker.position.copy(point);
        this.scene.add(marker);
      }
    });
  }
  
  /**
   * Setup mouse and button event listeners
   */
  setupEventListeners() {
    // Mouse move for tower preview
    this.renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e));
    
    // Mouse click for tower placement
    this.renderer.domElement.addEventListener('click', (e) => this.onMouseClick(e));
  }
  
  /**
   * Handle mouse movement - show tower preview
   */
  onMouseMove(event) {
    if (!this.isPlacingTower) return;
    
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersectPoint = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.groundPlane, intersectPoint);
    
    if (this.previewTower) {
      // Snap to grid
      intersectPoint.x = Math.round(intersectPoint.x / 2) * 2;
      intersectPoint.z = Math.round(intersectPoint.z / 2) * 2;
      intersectPoint.y = 0;
      
      this.previewTower.position.copy(intersectPoint);
    }
  }
  
  /**
   * Handle mouse click - place tower
   */
  onMouseClick(event) {
    if (!this.isPlacingTower || this.gameOver) return;
    
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersectPoint = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.groundPlane, intersectPoint);
    
    // Snap to grid
    intersectPoint.x = Math.round(intersectPoint.x / 2) * 2;
    intersectPoint.z = Math.round(intersectPoint.z / 2) * 2;
    intersectPoint.y = 0;
    
    // Check if position is valid and affordable
    if (this.canPlaceTower(intersectPoint) && this.credits >= 100) {
      this.placeTower(intersectPoint);
    }
  }
  
  /**
   * Check if tower can be placed at position
   */
  canPlaceTower(position) {
    // Check if too close to base
    if (position.distanceTo(new THREE.Vector3(0, 0, 0)) < 4) return false;
    
    // Check if too close to path waypoints
    for (let waypoint of this.enemyPath) {
      if (position.distanceTo(waypoint) < 2) return false;
    }
    
    // Check if overlapping with existing towers
    for (let tower of this.towers) {
      if (tower.mesh.position.distanceTo(position) < 2) return false;
    }
    
    return true;
  }
  
  /**
   * Place a tower at the specified position
   */
  placeTower(position) {
    const tower = new Tower(this.scene, position);
    this.towers.push(tower);
    this.credits -= 100;
    this.ui.updateUI();
    
    // Exit placement mode
    this.isPlacingTower = false;
    if (this.previewTower) {
      this.scene.remove(this.previewTower);
      this.previewTower = null;
    }
    this.ui.exitBuildMode();
  }
  
  /**
   * Enter tower placement mode
   */
  enterBuildMode() {
    if (this.credits < 100 || this.gameOver) return;
    
    this.isPlacingTower = true;
    
    // Create preview tower
    const previewGeometry = new THREE.CylinderGeometry(0.5, 0.8, 2, 8);
    const previewMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      emissive: 0x00ffff,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.6
    });
    this.previewTower = new THREE.Mesh(previewGeometry, previewMaterial);
    this.scene.add(this.previewTower);
  }
  
  /**
   * Exit tower placement mode
   */
  exitBuildMode() {
    this.isPlacingTower = false;
    if (this.previewTower) {
      this.scene.remove(this.previewTower);
      this.previewTower = null;
    }
  }
  
  /**
   * Start a new enemy wave
   */
  startWave() {
    if (this.gameOver) return;
    
    const enemiesInWave = 5 + this.wave * 2;
    const spawnInterval = 1000; // 1 second between spawns
    
    for (let i = 0; i < enemiesInWave; i++) {
      setTimeout(() => {
        if (!this.gameOver) {
          const enemy = new Enemy(this.scene, this.enemyPath, this.wave);
          this.enemies.push(enemy);
        }
      }, i * spawnInterval);
    }
    
    this.wave++;
    this.ui.updateUI();
  }
  
  /**
   * Main game loop - updates all game systems
   */
  update(deltaTime) {
    if (this.gameOver) return;
    
    // Update orbit controls
    this.controls.update();
    
    // Animate base pulsing
    if (this.base) {
      this.base.material.emissiveIntensity = 0.8 + Math.sin(Date.now() * 0.003) * 0.2;
    }
    
    // Update all towers
    this.towers.forEach(tower => {
      tower.update(deltaTime, this.enemies);
      
      // Check if tower wants to shoot
      if (tower.canShoot() && tower.target) {
        const projectile = tower.shoot();
        if (projectile) {
          this.projectiles.push(projectile);
        }
      }
    });
    
    // Update all enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      enemy.update(deltaTime);
      
      // Check if enemy reached the end
      if (enemy.reachedEnd) {
        this.health -= 10;
        enemy.destroy();
        this.enemies.splice(i, 1);
        this.ui.updateUI();
        
        if (this.health <= 0) {
          this.endGame();
        }
      }
    }
    
    // Update all projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];
      projectile.update(deltaTime);
      
      // Check collision with target
      if (projectile.target && !projectile.target.isDead) {
        const distance = projectile.mesh.position.distanceTo(projectile.target.mesh.position);
        if (distance < 0.5) {
          // Hit the target
          projectile.target.takeDamage(projectile.damage);
          
          if (projectile.target.isDead) {
            this.score += projectile.target.scoreValue;
            this.credits += 25;
            this.ui.updateUI();
            
            // Remove dead enemy
            const enemyIndex = this.enemies.indexOf(projectile.target);
            if (enemyIndex > -1) {
              this.enemies.splice(enemyIndex, 1);
            }
          }
          
          projectile.destroy();
          this.projectiles.splice(i, 1);
        }
      }
      
      // Remove projectiles that are too far or have dead targets
      if (!projectile.mesh.parent || (projectile.target && projectile.target.isDead)) {
        projectile.destroy();
        this.projectiles.splice(i, 1);
      }
    }
  }
  
  /**
   * End the game
   */
  endGame() {
    this.gameOver = true;
    this.ui.showGameOver();
  }
  
  /**
   * Restart the game
   */
  restart() {
    // Clean up existing objects
    this.towers.forEach(tower => tower.destroy());
    this.enemies.forEach(enemy => enemy.destroy());
    this.projectiles.forEach(proj => proj.destroy());
    
    // Reset arrays
    this.towers = [];
    this.enemies = [];
    this.projectiles = [];
    
    // Reset game state
    this.health = 100;
    this.credits = 500;
    this.score = 0;
    this.wave = 1;
    this.gameOver = false;
    this.isPlacingTower = false;
    
    this.ui.hideGameOver();
    this.ui.updateUI();
  }
  
  /**
   * Handle window resize
   */
  handleResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
  
  /**
   * Start the game loop
   */
  start() {
    let lastTime = performance.now();
    
    const animate = () => {
      requestAnimationFrame(animate);
      
      const currentTime = performance.now();
      const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
      lastTime = currentTime;
      
      this.update(deltaTime);
      this.renderer.render(this.scene, this.camera);
    };
    
    animate();
  }
}