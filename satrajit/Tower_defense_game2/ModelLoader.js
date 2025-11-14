/**
 * ModelLoader.js - Advanced 3D Model Loading System
 * Loads GLTF/GLB models with procedural fallbacks
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class ModelLoader {
  constructor() {
    this.loader = new GLTFLoader();
    this.models = new Map();
    this.loading = new Map();
    
    // Model base path
    this.basePath = '/models/';
    
    // Cache for loaded models
    this.modelCache = new Map();
  }
  
  /**
   * Load a 3D model with fallback
   */
  async loadModel(modelName, fallbackCreator) {
    // Check cache first
    if (this.modelCache.has(modelName)) {
      return this.modelCache.get(modelName).clone();
    }
    
    // Check if already loading
    if (this.loading.has(modelName)) {
      return this.loading.get(modelName);
    }
    
    // Start loading
    const loadPromise = this.loadGLTF(modelName)
      .catch(() => {
        console.warn(`Model ${modelName} not found, using procedural fallback`);
        return fallbackCreator ? fallbackCreator() : this.createDefaultFallback();
      });
    
    this.loading.set(modelName, loadPromise);
    
    const model = await loadPromise;
    this.modelCache.set(modelName, model);
    this.loading.delete(modelName);
    
    return model.clone();
  }
  
  /**
   * Load GLTF/GLB model
   */
  loadGLTF(modelName) {
    return new Promise((resolve, reject) => {
      this.loader.load(
        `${this.basePath}${modelName}`,
        (gltf) => {
          const model = gltf.scene;
          
          // Apply optimizations
          model.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              
              // Enable emissive for space feel
              if (child.material) {
                child.material.emissiveIntensity = 0.2;
              }
            }
          });
          
          resolve(model);
        },
        (progress) => {
          // Progress callback
          const percent = (progress.loaded / progress.total) * 100;
          console.log(`Loading ${modelName}: ${percent.toFixed(0)}%`);
        },
        (error) => {
          reject(error);
        }
      );
    });
  }
  
  /**
   * Create default fallback model
   */
  createDefaultFallback() {
    const group = new THREE.Group();
    
    const geometry = new THREE.BoxGeometry(1, 0.5, 1.5);
    const material = new THREE.MeshStandardMaterial({
      color: 0x666666,
      metalness: 0.8,
      roughness: 0.2
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    group.add(mesh);
    
    return group;
  }
}

/**
 * Procedural Spaceship Generator
 * Creates detailed spaceship models procedurally
 */
export class ProceduralShipGenerator {
  
  /**
   * Create an interceptor fighter
   */
  static createInterceptor(color = 0x00ccff) {
    const group = new THREE.Group();
    
    // Main fuselage
    const bodyGeo = new THREE.ConeGeometry(0.3, 2, 8);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: color,
      metalness: 0.9,
      roughness: 0.1,
      emissive: color,
      emissiveIntensity: 0.1
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.rotation.x = Math.PI / 2;
    group.add(body);
    
    // Wings
    const wingGeo = new THREE.BoxGeometry(2, 0.05, 0.8);
    const wing = new THREE.Mesh(wingGeo, bodyMat);
    wing.position.z = 0.3;
    group.add(wing);
    
    // Engines
    const engineGeo = new THREE.CylinderGeometry(0.15, 0.1, 0.8, 8);
    const engineMat = new THREE.MeshStandardMaterial({
      color: 0xff6600,
      emissive: 0xff6600,
      emissiveIntensity: 2
    });
    
    const engine1 = new THREE.Mesh(engineGeo, engineMat);
    engine1.position.set(0.5, 0, 0.8);
    engine1.rotation.x = Math.PI / 2;
    group.add(engine1);
    
    const engine2 = new THREE.Mesh(engineGeo, engineMat);
    engine2.position.set(-0.5, 0, 0.8);
    engine2.rotation.x = Math.PI / 2;
    group.add(engine2);
    
    // Cockpit
    const cockpitGeo = new THREE.SphereGeometry(0.2, 8, 8);
    const cockpitMat = new THREE.MeshStandardMaterial({
      color: 0x001122,
      metalness: 1,
      roughness: 0,
      emissive: 0x00ffff,
      emissiveIntensity: 0.5
    });
    const cockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
    cockpit.position.z = -0.5;
    group.add(cockpit);
    
    return group;
  }
  
  /**
   * Create a bomber ship
   */
  static createBomber(color = 0xff9900) {
    const group = new THREE.Group();
    
    // Main body - wider and heavier looking
    const bodyGeo = new THREE.BoxGeometry(1.2, 0.4, 2);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: color,
      metalness: 0.8,
      roughness: 0.3,
      emissive: color,
      emissiveIntensity: 0.05
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    group.add(body);
    
    // Bomb bay
    const bayGeo = new THREE.BoxGeometry(0.8, 0.3, 1.2);
    const bayMat = new THREE.MeshStandardMaterial({
      color: 0x333333,
      metalness: 0.9,
      roughness: 0.4
    });
    const bay = new THREE.Mesh(bayGeo, bayMat);
    bay.position.y = -0.3;
    group.add(bay);
    
    // Wings - swept back
    const wingGeo = new THREE.BoxGeometry(3, 0.1, 1.5);
    const wing = new THREE.Mesh(wingGeo, bodyMat);
    wing.position.z = 0.2;
    wing.rotation.y = -0.2;
    group.add(wing);
    
    // Engines - 4 large engines
    const engineGeo = new THREE.CylinderGeometry(0.2, 0.15, 1, 8);
    const engineMat = new THREE.MeshStandardMaterial({
      color: 0xff3300,
      emissive: 0xff6600,
      emissiveIntensity: 1.5
    });
    
    const enginePositions = [
      [0.8, -0.1, 0.8],
      [-0.8, -0.1, 0.8],
      [0.4, -0.1, 0.8],
      [-0.4, -0.1, 0.8]
    ];
    
    enginePositions.forEach(pos => {
      const engine = new THREE.Mesh(engineGeo, engineMat);
      engine.position.set(...pos);
      engine.rotation.x = Math.PI / 2;
      group.add(engine);
    });
    
    return group;
  }
  
  /**
   * Create a mech walker
   */
  static createMech(color = 0x666666) {
    const group = new THREE.Group();
    
    // Body/Torso
    const bodyGeo = new THREE.BoxGeometry(0.8, 1.2, 0.6);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: color,
      metalness: 0.9,
      roughness: 0.2,
      emissive: color,
      emissiveIntensity: 0.05
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.5;
    group.add(body);
    
    // Cockpit
    const cockpitGeo = new THREE.SphereGeometry(0.3, 8, 8);
    const cockpitMat = new THREE.MeshStandardMaterial({
      color: 0x001133,
      metalness: 1,
      roughness: 0,
      emissive: 0x0066ff,
      emissiveIntensity: 0.8
    });
    const cockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
    cockpit.position.y = 2;
    group.add(cockpit);
    
    // Arms with weapons
    const armGeo = new THREE.BoxGeometry(0.3, 0.8, 0.3);
    const weaponGeo = new THREE.CylinderGeometry(0.1, 0.15, 0.8, 8);
    
    // Left arm
    const leftArm = new THREE.Mesh(armGeo, bodyMat);
    leftArm.position.set(-0.7, 1.5, 0);
    group.add(leftArm);
    
    const leftWeapon = new THREE.Mesh(weaponGeo, cockpitMat);
    leftWeapon.position.set(-0.7, 1.5, -0.5);
    leftWeapon.rotation.x = Math.PI / 2;
    group.add(leftWeapon);
    
    // Right arm
    const rightArm = new THREE.Mesh(armGeo, bodyMat);
    rightArm.position.set(0.7, 1.5, 0);
    group.add(rightArm);
    
    const rightWeapon = new THREE.Mesh(weaponGeo, cockpitMat);
    rightWeapon.position.set(0.7, 1.5, -0.5);
    rightWeapon.rotation.x = Math.PI / 2;
    group.add(rightWeapon);
    
    // Legs
    const legGeo = new THREE.BoxGeometry(0.4, 1.5, 0.4);
    
    const leftLeg = new THREE.Mesh(legGeo, bodyMat);
    leftLeg.position.set(-0.3, 0.75, 0);
    group.add(leftLeg);
    
    const rightLeg = new THREE.Mesh(legGeo, bodyMat);
    rightLeg.position.set(0.3, 0.75, 0);
    group.add(rightLeg);
    
    // Feet
    const footGeo = new THREE.BoxGeometry(0.5, 0.2, 0.8);
    
    const leftFoot = new THREE.Mesh(footGeo, bodyMat);
    leftFoot.position.set(-0.3, 0.1, 0);
    group.add(leftFoot);
    
    const rightFoot = new THREE.Mesh(footGeo, bodyMat);
    rightFoot.position.set(0.3, 0.1, 0);
    group.add(rightFoot);
    
    return group;
  }
  
  /**
   * Create a space station/turret
   */
  static createSpaceTurret(color = 0xff0000) {
    const group = new THREE.Group();
    
    // Base platform
    const baseGeo = new THREE.CylinderGeometry(1.5, 1.8, 0.5, 12);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x444444,
      metalness: 0.9,
      roughness: 0.3
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    group.add(base);
    
    // Rotating turret mount
    const mountGeo = new THREE.CylinderGeometry(0.8, 1, 0.8, 8);
    const mountMat = new THREE.MeshStandardMaterial({
      color: color,
      metalness: 0.8,
      roughness: 0.2,
      emissive: color,
      emissiveIntensity: 0.1
    });
    const mount = new THREE.Mesh(mountGeo, mountMat);
    mount.position.y = 0.6;
    group.add(mount);
    
    // Dual cannons
    const cannonGeo = new THREE.CylinderGeometry(0.15, 0.2, 2, 8);
    const cannonMat = new THREE.MeshStandardMaterial({
      color: 0xffaa00,
      metalness: 1,
      roughness: 0.1,
      emissive: 0xffaa00,
      emissiveIntensity: 0.5
    });
    
    const cannon1 = new THREE.Mesh(cannonGeo, cannonMat);
    cannon1.position.set(0.4, 0.8, -0.8);
    cannon1.rotation.x = Math.PI / 2;
    group.add(cannon1);
    
    const cannon2 = new THREE.Mesh(cannonGeo, cannonMat);
    cannon2.position.set(-0.4, 0.8, -0.8);
    cannon2.rotation.x = Math.PI / 2;
    group.add(cannon2);
    
    // Sensor array
    const sensorGeo = new THREE.OctahedronGeometry(0.3);
    const sensorMat = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      emissive: 0x00ffff,
      emissiveIntensity: 2,
      transparent: true,
      opacity: 0.8
    });
    const sensor = new THREE.Mesh(sensorGeo, sensorMat);
    sensor.position.y = 1.5;
    group.add(sensor);
    
    return group;
  }
  
  /**
   * Create a drone
   */
  static createDrone(color = 0xffff00) {
    const group = new THREE.Group();
    
    // Central core
    const coreGeo = new THREE.SphereGeometry(0.3, 8, 8);
    const coreMat = new THREE.MeshStandardMaterial({
      color: color,
      metalness: 0.8,
      roughness: 0.2,
      emissive: color,
      emissiveIntensity: 0.5
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    group.add(core);
    
    // Rotor arms
    const armGeo = new THREE.BoxGeometry(1, 0.05, 0.05);
    const arm1 = new THREE.Mesh(armGeo, coreMat);
    group.add(arm1);
    
    const arm2 = new THREE.Mesh(armGeo, coreMat);
    arm2.rotation.y = Math.PI / 2;
    group.add(arm2);
    
    // Rotors
    const rotorGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.05, 16);
    const rotorMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.3
    });
    
    const rotorPositions = [
      [0.5, 0.1, 0],
      [-0.5, 0.1, 0],
      [0, 0.1, 0.5],
      [0, 0.1, -0.5]
    ];
    
    rotorPositions.forEach(pos => {
      const rotor = new THREE.Mesh(rotorGeo, rotorMat);
      rotor.position.set(...pos);
      group.add(rotor);
    });
    
    return group;
  }
  
  /**
   * Create a titan walker
   */
  static createTitan(color = 0xff0000) {
    const group = new THREE.Group();
    
    // Main body - massive
    const bodyGeo = new THREE.BoxGeometry(2, 2.5, 1.5);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: color,
      metalness: 0.9,
      roughness: 0.3,
      emissive: color,
      emissiveIntensity: 0.05
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 3;
    group.add(body);
    
    // Armor plates
    const plateGeo = new THREE.BoxGeometry(2.2, 0.3, 1.6);
    const plate1 = new THREE.Mesh(plateGeo, bodyMat);
    plate1.position.y = 4.5;
    group.add(plate1);
    
    const plate2 = new THREE.Mesh(plateGeo, bodyMat);
    plate2.position.y = 1.5;
    group.add(plate2);
    
    // Weapon arms
    const weaponGeo = new THREE.CylinderGeometry(0.3, 0.4, 2, 8);
    const weaponMat = new THREE.MeshStandardMaterial({
      color: 0xffaa00,
      metalness: 1,
      roughness: 0.1,
      emissive: 0xff6600,
      emissiveIntensity: 1
    });
    
    const leftWeapon = new THREE.Mesh(weaponGeo, weaponMat);
    leftWeapon.position.set(-1.5, 3, -0.5);
    leftWeapon.rotation.x = Math.PI / 2;
    leftWeapon.scale.set(1, 1.5, 1);
    group.add(leftWeapon);
    
    const rightWeapon = new THREE.Mesh(weaponGeo, weaponMat);
    rightWeapon.position.set(1.5, 3, -0.5);
    rightWeapon.rotation.x = Math.PI / 2;
    rightWeapon.scale.set(1, 1.5, 1);
    group.add(rightWeapon);
    
    // Massive legs
    const legGeo = new THREE.BoxGeometry(0.8, 3, 0.8);
    
    for (let i = 0; i < 4; i++) {
      const leg = new THREE.Mesh(legGeo, bodyMat);
      const x = (i % 2 === 0 ? -1 : 1) * 0.8;
      const z = (i < 2 ? -0.5 : 0.5);
      leg.position.set(x, 1.5, z);
      group.add(leg);
      
      // Feet
      const footGeo = new THREE.BoxGeometry(1, 0.3, 1.2);
      const foot = new THREE.Mesh(footGeo, bodyMat);
      foot.position.set(x, 0.15, z);
      group.add(foot);
    }
    
    return group;
  }
  
  /**
   * Create a mothership
   */
  static createMothership(color = 0x00ffff) {
    const group = new THREE.Group();
    
    // Main hull
    const hullGeo = new THREE.CylinderGeometry(2, 3, 5, 8);
    const hullMat = new THREE.MeshStandardMaterial({
      color: color,
      metalness: 0.8,
      roughness: 0.2,
      emissive: color,
      emissiveIntensity: 0.1
    });
    const hull = new THREE.Mesh(hullGeo, hullMat);
    hull.position.y = 2;
    group.add(hull);
    
    // Command deck
    const deckGeo = new THREE.CylinderGeometry(1.5, 2, 1.5, 8);
    const deck = new THREE.Mesh(deckGeo, hullMat);
    deck.position.y = 5;
    group.add(deck);
    
    // Hangar bays
    const hangarGeo = new THREE.BoxGeometry(4, 1, 2);
    const hangarMat = new THREE.MeshStandardMaterial({
      color: 0x222222,
      metalness: 0.9,
      roughness: 0.4
    });
    const hangar = new THREE.Mesh(hangarGeo, hangarMat);
    hangar.position.y = 1;
    group.add(hangar);
    
    // Shield generators (glowing rings)
    const ringGeo = new THREE.TorusGeometry(3.5, 0.2, 8, 16);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      emissive: 0x00ffff,
      emissiveIntensity: 2,
      transparent: true,
      opacity: 0.6
    });
    
    const ring1 = new THREE.Mesh(ringGeo, ringMat);
    ring1.position.y = 3;
    ring1.rotation.x = Math.PI / 2;
    group.add(ring1);
    
    const ring2 = new THREE.Mesh(ringGeo, ringMat);
    ring2.position.y = 1;
    ring2.rotation.x = Math.PI / 2;
    ring2.scale.set(0.8, 0.8, 0.8);
    group.add(ring2);
    
    // Weapon arrays
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const weaponGeo = new THREE.CylinderGeometry(0.1, 0.15, 1, 6);
      const weapon = new THREE.Mesh(weaponGeo, hullMat);
      weapon.position.set(
        Math.cos(angle) * 2.5,
        2,
        Math.sin(angle) * 2.5
      );
      weapon.lookAt(new THREE.Vector3(
        Math.cos(angle) * 5,
        2,
        Math.sin(angle) * 5
      ));
      group.add(weapon);
    }
    
    return group;
  }
}

export default ModelLoader;
