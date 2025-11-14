/**
 * Arena.js - Clash Royale Style Battle Arena
 * Manages the battlefield, deployment zones, towers, and environment
 */

import * as THREE from 'three';
import { GameConfig } from './GameConfig.js';

export class Arena {
  constructor(game) {
    this.game = game;
    this.config = GameConfig.arena;
    
    this.deploymentZones = {
      player1: null,
      player2: null
    };
    
    this.create();
  }
  
  create() {
    this.createGround();
    this.createBridge();
    this.createDeploymentZones();
    this.createLaneMarkers();
    this.createBoundaries();
    this.createAmbientEffects();
  }
  
  createGround() {
    // Main arena floor with beautiful gradient
    const floorGeometry = new THREE.PlaneGeometry(
      this.config.width,
      this.config.length
    );
    
    // Create custom shader material for animated ground
    const floorMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color1: { value: new THREE.Color(0x0a0a1a) },
        color2: { value: new THREE.Color(0x1a1a2e) }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 color1;
        uniform vec3 color2;
        varying vec2 vUv;
        
        void main() {
          float pattern = sin(vUv.x * 20.0 + time) * sin(vUv.y * 20.0 + time);
          vec3 color = mix(color1, color2, pattern * 0.1 + 0.5);
          gl_FragColor = vec4(color, 1.0);
        }
      `
    });
    
    this.floor = new THREE.Mesh(floorGeometry, floorMaterial);
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.receiveShadow = true;
    this.game.scene.add(this.floor);
    
    // Grid overlay
    const gridHelper = new THREE.GridHelper(
      this.config.width,
      40,
      0x00ffff,
      0x003344
    );
    gridHelper.material.opacity = 0.2;
    gridHelper.material.transparent = true;
    this.game.scene.add(gridHelper);
  }
  
  createBridge() {
    // Central bridge/river area (neutral zone)
    // Use neutralZone if it exists, otherwise calculate from player zones
    const bridgeWidth = this.config.width;
    let bridgeZone;
    
    if (this.config.neutralZone && this.config.neutralZone.z) {
      bridgeZone = this.config.neutralZone;
    } else {
      // Fallback: calculate neutral zone between player zones
      const p1Z = this.config.player1Zone.z;
      const p2Z = this.config.player2Zone.z;
      bridgeZone = {
        x: [-this.config.width/2, this.config.width/2],
        z: [Math.max(p1Z[0], p1Z[1]) + 5, Math.min(p2Z[0], p2Z[1]) - 5]
      };
    }
    
    const bridgeLength = bridgeZone.z[1] - bridgeZone.z[0];
    
    const bridgeGeometry = new THREE.PlaneGeometry(bridgeWidth, bridgeLength);
    const bridgeMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a3a5a,
      metalness: 0.7,
      roughness: 0.3,
      emissive: 0x0066aa,
      emissiveIntensity: 0.2
    });
    
    this.bridge = new THREE.Mesh(bridgeGeometry, bridgeMaterial);
    this.bridge.rotation.x = -Math.PI / 2;
    this.bridge.position.y = 0.05;
    this.bridge.position.z = (bridgeZone.z[0] + bridgeZone.z[1]) / 2;
    this.bridge.receiveShadow = true;
    this.game.scene.add(this.bridge);
    
    // Store bridge zone for later use
    this.bridgeZone = bridgeZone;
    
    // Bridge edge glow lines
    this.createBridgeEdges();
  }
  
  createBridgeEdges() {
    const bridgeZone = this.bridgeZone || (this.config.neutralZone && this.config.neutralZone.z ? this.config.neutralZone : {
      z: [-10, 10] // Fallback
    });
    
    const edgePositions = [
      bridgeZone.z[0],
      bridgeZone.z[1]
    ];
    
    edgePositions.forEach((z, i) => {
      const lineGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-this.config.width/2, 0.2, z),
        new THREE.Vector3(this.config.width/2, 0.2, z)
      ]);
      
      const lineMaterial = new THREE.LineBasicMaterial({
        color: i === 0 ? 0x00ffff : 0xff00ff,
        linewidth: 3,
        transparent: true,
        opacity: 0.8
      });
      
      const line = new THREE.Line(lineGeometry, lineMaterial);
      this.game.scene.add(line);
    });
    
    // Center line
    const centerLineGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.2, -this.config.length/2),
      new THREE.Vector3(0, 0.2, this.config.length/2)
    ]);
    
    const centerLineMaterial = new THREE.LineBasicMaterial({
      color: 0xffff00,
      linewidth: 2,
      transparent: true,
      opacity: 0.4
    });
    
    const centerLine = new THREE.Line(centerLineGeometry, centerLineMaterial);
    this.game.scene.add(centerLine);
  }
  
  createDeploymentZones() {
    const zones = [
      { name: 'player1', config: this.config.player1Zone, color: 0x00ffff },
      { name: 'player2', config: this.config.player2Zone, color: 0xff00ff }
    ];
    
    zones.forEach(zone => {
      const width = zone.config.x[1] - zone.config.x[0];
      const length = zone.config.z[1] - zone.config.z[0];
      const centerX = (zone.config.x[0] + zone.config.x[1]) / 2;
      const centerZ = (zone.config.z[0] + zone.config.z[1]) / 2;
      
      // Visual deployment zone indicator (hidden by default)
      const zoneGeometry = new THREE.PlaneGeometry(width, length);
      const zoneMaterial = new THREE.MeshBasicMaterial({
        color: zone.color,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide
      });
      
      const zoneMesh = new THREE.Mesh(zoneGeometry, zoneMaterial);
      zoneMesh.rotation.x = -Math.PI / 2;
      zoneMesh.position.set(centerX, 0.1, centerZ);
      this.game.scene.add(zoneMesh);
      
      this.deploymentZones[zone.name] = {
        mesh: zoneMesh,
        bounds: zone.config,
        active: false
      };
    });
  }
  
  createLaneMarkers() {
    // Visual markers for the three lanes
    const lanes = Object.values(this.config.lanes);
    
    lanes.forEach((lane, i) => {
      // Lane indicator (subtle)
      const markerGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 16);
      const markerMaterial = new THREE.MeshStandardMaterial({
        color: 0xffff00,
        emissive: 0xffff00,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.3
      });
      
      const marker = new THREE.Mesh(markerGeometry, markerMaterial);
      marker.position.set(lane.x, 0.05, lane.z);
      this.game.scene.add(marker);
    });
  }
  
  createBoundaries() {
    // Create glowing boundary pillars at corners
    const corners = [
      [-this.config.width/2, -this.config.length/2],
      [this.config.width/2, -this.config.length/2],
      [-this.config.width/2, this.config.length/2],
      [this.config.width/2, this.config.length/2]
    ];
    
    const pillarGeometry = new THREE.CylinderGeometry(0.5, 0.5, 30, 8);
    const colors = [0x00ffff, 0xff00ff, 0xffff00, 0x00ff00];
    
    corners.forEach(([x, z], i) => {
      const material = new THREE.MeshStandardMaterial({
        color: colors[i],
        emissive: colors[i],
        emissiveIntensity: 1,
        metalness: 0.8,
        roughness: 0.2
      });
      
      const pillar = new THREE.Mesh(pillarGeometry, material);
      pillar.position.set(x, 15, z);
      pillar.castShadow = true;
      this.game.scene.add(pillar);
      
      // Add point light to pillar
      const light = new THREE.PointLight(colors[i], 2, 20);
      light.position.set(x, 15, z);
      this.game.scene.add(light);
    });
  }
  
  createAmbientEffects() {
    // Floating particles throughout the arena
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 300;
    const positions = new Float32Array(particlesCount * 3);
    const colors = new Float32Array(particlesCount * 3);
    
    for (let i = 0; i < particlesCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * this.config.width;
      positions[i + 1] = Math.random() * 30;
      positions[i + 2] = (Math.random() - 0.5) * this.config.length;
      
      const color = new THREE.Color();
      color.setHSL(Math.random(), 1, 0.5);
      colors[i] = color.r;
      colors[i + 1] = color.g;
      colors[i + 2] = color.b;
    }
    
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const particlesMaterial = new THREE.PointsMaterial({
      size: 0.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });
    
    this.ambientParticles = new THREE.Points(particlesGeometry, particlesMaterial);
    this.game.scene.add(this.ambientParticles);
  }
  
  /**
   * Show/hide deployment zone for a player
   */
  setDeploymentZoneActive(playerNum, active) {
    const zone = this.deploymentZones[`player${playerNum}`];
    if (zone) {
      zone.active = active;
      zone.mesh.material.opacity = active ? 0.2 : 0;
    }
  }
  
  /**
   * Check if a position is in a player's deployment zone
   */
  isInDeploymentZone(position, playerNum) {
    const zone = this.config[`player${playerNum}Zone`];
    return (
      position.x >= zone.x[0] && position.x <= zone.x[1] &&
      position.z >= zone.z[0] && position.z <= zone.z[1]
    );
  }
  
  /**
   * Get nearest lane to a position
   */
  getNearestLane(position) {
    let nearestLane = 'center';
    let minDistance = Infinity;
    
    Object.entries(this.config.lanes).forEach(([name, lanePos]) => {
      const distance = Math.abs(position.x - lanePos.x);
      if (distance < minDistance) {
        minDistance = distance;
        nearestLane = name;
      }
    });
    
    return nearestLane;
  }
  
  /**
   * Get lane position by name
   */
  getLanePosition(laneName) {
    return this.config.lanes[laneName];
  }
  
  update(deltaTime) {
    // Animate floor shader
    if (this.floor.material.uniforms) {
      this.floor.material.uniforms.time.value += deltaTime;
    }
    
    // Animate ambient particles
    if (this.ambientParticles) {
      this.ambientParticles.rotation.y += deltaTime * 0.05;
      const positions = this.ambientParticles.geometry.attributes.position.array;
      const time = performance.now() * 0.001;
      
      for (let i = 1; i < positions.length; i += 3) {
        positions[i] += Math.sin(time + i) * 0.01;
      }
      
      this.ambientParticles.geometry.attributes.position.needsUpdate = true;
    }
    
    // Pulse deployment zones if active
    Object.values(this.deploymentZones).forEach(zone => {
      if (zone.active) {
        const pulse = 0.15 + Math.sin(performance.now() * 0.003) * 0.05;
        zone.mesh.material.opacity = pulse;
      }
    });
  }
}
