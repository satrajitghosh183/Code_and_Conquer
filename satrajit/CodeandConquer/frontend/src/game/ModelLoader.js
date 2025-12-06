import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import * as THREE from 'three'

// ============================================================
// MODEL STORAGE CONFIGURATION
// ============================================================
// In production, models are loaded from Supabase Storage
// Set VITE_MODELS_BASE_URL in .env to your Supabase Storage URL:
// Example: https://cbekdaqtdqqwzyexmfgp.supabase.co/storage/v1/object/public/models
// 
// For local development, leave it empty to load from public folder
// ============================================================

const MODELS_BASE_URL = import.meta.env.VITE_MODELS_BASE_URL || ''

// Helper to get full model path
const getModelPath = (filename) => {
  if (MODELS_BASE_URL) {
    return `${MODELS_BASE_URL}/${filename}`
  }
  return `/models/${filename}`
}

// ============================================================
// AVAILABLE MODELS (files that exist)
// ============================================================
const AVAILABLE_MODELS = {
  'aa_turret': getModelPath('aa_turret.glb'),
  'combat_turret': getModelPath('combat_turret.glb'),
  'future_architectural': getModelPath('future_architectural.glb'),
  'gun_tower': getModelPath('gun_tower.glb'),
  'hoth_turret': getModelPath('hoth_defense_turret_-_star_wars.glb'),
  'modular_wall': getModelPath('modular_wall.glb'),
  'sci_fi_wall': getModelPath('sci-fi_wall.glb'),
  'spaceship': getModelPath('spaceship.glb'),
  'spaceship_clst': getModelPath('spaceship_clst_500.glb'),
}

// ============================================================
// MODEL MAPPING - Map game keys to available models or 'PROCEDURAL'
// ============================================================
const MODEL_MAPPING = {
  // TOWER MODELS - Updated mappings
  'gatling_tower': 'gun_tower',       // Gatling → gun_tower.glb
  'missile_tower': 'aa_turret',       // Missile → aa_turret.glb
  'laser_tower': 'hoth_turret',       // Laser → hoth_defense_turret.glb
  'sniper_tower': 'combat_turret',    // Sniper → combat_turret.glb
  'tesla_tower': 'spaceship_clst',    // Tesla → spaceship_clst_500.glb
  'frost_tower': 'gun_tower',         // Frost uses gun_tower variant
  'fire_tower': 'aa_turret',          // Fire uses aa_turret variant
  
  // Legacy tower mappings for compatibility
  'medieval_towers': 'hoth_turret',
  'heavy_cannon': 'aa_turret',
  'watch_tower': 'gun_tower',
  'kickelhahn': 'hoth_turret',
  'cannon': 'combat_turret',
  'aa_turret': 'aa_turret',
  'combat_turret': 'combat_turret',
  'gun_tower': 'gun_tower',
  'hoth_turret': 'hoth_turret',
  
  // Walls & Structures  
  'castle_walls': 'modular_wall',     // Wall → modular_wall.glb
  'modular_wall': 'modular_wall',
  'sci_fi_wall': 'sci_fi_wall',
  'wall': 'modular_wall',
  
  // Barracks / Spawner
  'barracks': 'future_architectural', // Barracks → future_architectural.glb
  'future_architectural': 'future_architectural',
  'mortar': 'future_architectural',
  
  // Enemy Ships - All enemies use spaceship.glb as base
  'enemy_ship': 'spaceship',
  'spaceship': 'spaceship',
  'boss_ship': 'spaceship',
  'enemy_base': 'spaceship',
  
  // Tesla/special uses spaceship variant
  'spaceship_clst': 'spaceship_clst',
  
  // Units - procedural
  'troop': 'PROCEDURAL_TROOP',
  
  // Heroes - procedural geometric representations
  'snake': 'PROCEDURAL_SNAKE',
  'dragon': 'PROCEDURAL_DRAGON',
  
  // Special
  'astro_shedder': 'spaceship',
  'fighter_jet': 'spaceship_clst'
}

// ============================================================
// PROCEDURAL MODEL GENERATORS
// Create geometric 3D representations for missing models
// ============================================================

function createProceduralTroop() {
  const group = new THREE.Group()
  
  // Body (capsule-like with better materials)
  const bodyGeom = new THREE.CapsuleGeometry(0.35, 0.9, 8, 16)
  const bodyMat = new THREE.MeshStandardMaterial({ 
    color: 0x4a90d9,
    metalness: 0.6,
    roughness: 0.4,
    emissive: 0x1a3050,
    emissiveIntensity: 0.2
  })
  const body = new THREE.Mesh(bodyGeom, bodyMat)
  body.position.y = 0.8
  body.castShadow = true
  body.receiveShadow = true
  group.add(body)
  
  // Armor plates (chest)
  const chestGeom = new THREE.BoxGeometry(0.45, 0.4, 0.25)
  const armorMat = new THREE.MeshStandardMaterial({ 
    color: 0x2d5a87,
    metalness: 0.9,
    roughness: 0.2
  })
  const chest = new THREE.Mesh(chestGeom, armorMat)
  chest.position.y = 0.95
  chest.position.z = 0.05
  chest.castShadow = true
  group.add(chest)
  
  // Head (sphere)
  const headGeom = new THREE.SphereGeometry(0.28, 24, 24)
  const headMat = new THREE.MeshStandardMaterial({ 
    color: 0xffcc99,
    metalness: 0.1,
    roughness: 0.9
  })
  const head = new THREE.Mesh(headGeom, headMat)
  head.position.y = 1.5
  head.castShadow = true
  group.add(head)
  
  // Helmet (half sphere with more detail)
  const helmetGeom = new THREE.SphereGeometry(0.32, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2)
  const helmetMat = new THREE.MeshStandardMaterial({ 
    color: 0x2d5a87,
    metalness: 0.8,
    roughness: 0.25,
    emissive: 0x0a1020,
    emissiveIntensity: 0.3
  })
  const helmet = new THREE.Mesh(helmetGeom, helmetMat)
  helmet.position.y = 1.52
  helmet.castShadow = true
  group.add(helmet)
  
  // Visor (glowing with more detail)
  const visorGeom = new THREE.BoxGeometry(0.4, 0.1, 0.15)
  const visorMat = new THREE.MeshStandardMaterial({ 
    color: 0x00ffff,
    emissive: 0x00ffff,
    emissiveIntensity: 1.5,
    metalness: 1.0,
    roughness: 0.1
  })
  const visor = new THREE.Mesh(visorGeom, visorMat)
  visor.position.set(0, 1.48, 0.22)
  group.add(visor)
  
  // Visor glow effect
  const visorGlowGeom = new THREE.BoxGeometry(0.45, 0.12, 0.05)
  const visorGlowMat = new THREE.MeshBasicMaterial({
    color: 0x00ffff,
    transparent: true,
    opacity: 0.5
  })
  const visorGlow = new THREE.Mesh(visorGlowGeom, visorGlowMat)
  visorGlow.position.set(0, 1.48, 0.25)
  group.add(visorGlow)
  
  // Shoulder pads
  const shoulderGeom = new THREE.BoxGeometry(0.25, 0.2, 0.2)
  const leftShoulder = new THREE.Mesh(shoulderGeom, armorMat)
  leftShoulder.position.set(-0.35, 1.15, 0)
  leftShoulder.castShadow = true
  group.add(leftShoulder)
  
  const rightShoulder = new THREE.Mesh(shoulderGeom, armorMat)
  rightShoulder.position.set(0.35, 1.15, 0)
  rightShoulder.castShadow = true
  group.add(rightShoulder)
  
  // Legs with better geometry
  const legGeom = new THREE.CylinderGeometry(0.1, 0.12, 0.6, 12)
  const legMat = new THREE.MeshStandardMaterial({ 
    color: 0x333333,
    metalness: 0.4,
    roughness: 0.6
  })
  
  const leftLeg = new THREE.Mesh(legGeom, legMat)
  leftLeg.position.set(-0.18, 0.3, 0)
  leftLeg.castShadow = true
  group.add(leftLeg)
  
  const rightLeg = new THREE.Mesh(legGeom, legMat)
  rightLeg.position.set(0.18, 0.3, 0)
  rightLeg.castShadow = true
  group.add(rightLeg)
  
  // Boots
  const bootGeom = new THREE.BoxGeometry(0.15, 0.1, 0.22)
  const bootMat = new THREE.MeshStandardMaterial({ 
    color: 0x222222,
    metalness: 0.3,
    roughness: 0.8
  })
  
  const leftBoot = new THREE.Mesh(bootGeom, bootMat)
  leftBoot.position.set(-0.18, 0.05, 0.03)
  leftBoot.castShadow = true
  group.add(leftBoot)
  
  const rightBoot = new THREE.Mesh(bootGeom, bootMat)
  rightBoot.position.set(0.18, 0.05, 0.03)
  rightBoot.castShadow = true
  group.add(rightBoot)
  
  // Weapon (rifle) with more detail
  const weaponBodyGeom = new THREE.BoxGeometry(0.1, 0.1, 0.7)
  const weaponMat = new THREE.MeshStandardMaterial({ 
    color: 0x1a1a1a,
    metalness: 0.9,
    roughness: 0.2
  })
  const weaponBody = new THREE.Mesh(weaponBodyGeom, weaponMat)
  weaponBody.position.set(0.4, 0.85, 0.25)
  weaponBody.rotation.x = -0.3
  weaponBody.castShadow = true
  group.add(weaponBody)
  
  // Weapon barrel
  const barrelGeom = new THREE.CylinderGeometry(0.03, 0.03, 0.3, 8)
  const barrel = new THREE.Mesh(barrelGeom, weaponMat)
  barrel.position.set(0.4, 0.9, 0.55)
  barrel.rotation.x = Math.PI / 2
  barrel.castShadow = true
  group.add(barrel)
  
  // Weapon scope (glowing)
  const scopeGeom = new THREE.CylinderGeometry(0.04, 0.04, 0.15, 8)
  const scopeMat = new THREE.MeshStandardMaterial({
    color: 0xff4400,
    emissive: 0xff2200,
    emissiveIntensity: 0.5,
    metalness: 0.8,
    roughness: 0.2
  })
  const scope = new THREE.Mesh(scopeGeom, scopeMat)
  scope.position.set(0.4, 1.0, 0.3)
  scope.rotation.z = Math.PI / 2
  group.add(scope)
  
  // Backpack
  const backpackGeom = new THREE.BoxGeometry(0.3, 0.35, 0.15)
  const backpack = new THREE.Mesh(backpackGeom, bodyMat)
  backpack.position.set(0, 0.9, -0.25)
  backpack.castShadow = true
  group.add(backpack)
  
  return group
}

function createProceduralSnake() {
  const group = new THREE.Group()
  
  // Snake body segments (curved path with better detail)
  const segments = 10
  const segmentMat = new THREE.MeshStandardMaterial({ 
    color: 0x2ecc71,
    metalness: 0.4,
    roughness: 0.5,
    emissive: 0x1a6a3a,
    emissiveIntensity: 0.2
  })
  
  const scalesMat = new THREE.MeshStandardMaterial({
    color: 0x27ae60,
    metalness: 0.6,
    roughness: 0.4
  })
  
  for (let i = 0; i < segments; i++) {
    const size = 0.35 - (i * 0.02)
    const segGeom = new THREE.SphereGeometry(size, 16, 16)
    const seg = new THREE.Mesh(segGeom, segmentMat)
    
    // Create S-curve
    const t = i / segments
    seg.position.x = Math.sin(t * Math.PI * 2.5) * 0.6
    seg.position.y = size
    seg.position.z = -i * 0.4
    seg.castShadow = true
    seg.receiveShadow = true
    group.add(seg)
    
    // Add scale details
    if (i > 0 && i < segments - 1) {
      const numScales = 6
      for (let j = 0; j < numScales; j++) {
        const angle = (j / numScales) * Math.PI * 2
        const scaleGeom = new THREE.ConeGeometry(size * 0.15, size * 0.25, 4)
        const scale = new THREE.Mesh(scaleGeom, scalesMat)
        
        scale.position.x = seg.position.x + Math.cos(angle) * size * 0.8
        scale.position.y = seg.position.y + Math.sin(angle) * size * 0.8
        scale.position.z = seg.position.z
        scale.rotation.set(0, 0, angle - Math.PI / 2)
        scale.castShadow = true
        group.add(scale)
      }
    }
  }
  
  // Head (larger, more detailed with hood)
  const headGeom = new THREE.SphereGeometry(0.4, 20, 20)
  const headMat = new THREE.MeshStandardMaterial({ 
    color: 0x27ae60,
    metalness: 0.5,
    roughness: 0.4,
    emissive: 0x1a5030,
    emissiveIntensity: 0.3
  })
  const head = new THREE.Mesh(headGeom, headMat)
  head.position.set(0, 0.4, 0.4)
  head.scale.set(1, 1, 1.4)
  head.castShadow = true
  group.add(head)
  
  // Hood (cobra-like)
  const hoodGeom = new THREE.ConeGeometry(0.6, 0.3, 6)
  const hoodMat = new THREE.MeshStandardMaterial({
    color: 0x229955,
    metalness: 0.3,
    roughness: 0.6,
    side: THREE.DoubleSide,
    emissive: 0x114422,
    emissiveIntensity: 0.2
  })
  const hood = new THREE.Mesh(hoodGeom, hoodMat)
  hood.position.set(0, 0.5, 0.3)
  hood.rotation.x = Math.PI / 2
  hood.castShadow = true
  group.add(hood)
  
  // Hood pattern
  const patternGeom = new THREE.CircleGeometry(0.15, 8)
  const patternMat = new THREE.MeshStandardMaterial({
    color: 0xffcc00,
    emissive: 0xaa8800,
    emissiveIntensity: 0.5
  })
  
  const leftPattern = new THREE.Mesh(patternGeom, patternMat)
  leftPattern.position.set(-0.25, 0.5, 0.35)
  leftPattern.rotation.y = Math.PI / 2
  group.add(leftPattern)
  
  const rightPattern = new THREE.Mesh(patternGeom, patternMat)
  rightPattern.position.set(0.25, 0.5, 0.35)
  rightPattern.rotation.y = -Math.PI / 2
  group.add(rightPattern)
  
  // Eyes (menacing red glow)
  const eyeGeom = new THREE.SphereGeometry(0.1, 12, 12)
  const eyeMat = new THREE.MeshStandardMaterial({ 
    color: 0xff0000,
    emissive: 0xff0000,
    emissiveIntensity: 2.0,
    metalness: 1.0,
    roughness: 0.1
  })
  
  const leftEye = new THREE.Mesh(eyeGeom, eyeMat)
  leftEye.position.set(-0.18, 0.5, 0.6)
  group.add(leftEye)
  
  const rightEye = new THREE.Mesh(eyeGeom, eyeMat)
  rightEye.position.set(0.18, 0.5, 0.6)
  group.add(rightEye)
  
  // Eye glow
  const eyeGlowGeom = new THREE.SphereGeometry(0.13, 12, 12)
  const eyeGlowMat = new THREE.MeshBasicMaterial({
    color: 0xff0000,
    transparent: true,
    opacity: 0.5
  })
  
  const leftEyeGlow = new THREE.Mesh(eyeGlowGeom, eyeGlowMat)
  leftEyeGlow.position.copy(leftEye.position)
  group.add(leftEyeGlow)
  
  const rightEyeGlow = new THREE.Mesh(eyeGlowGeom, eyeGlowMat)
  rightEyeGlow.position.copy(rightEye.position)
  group.add(rightEyeGlow)
  
  // Pupil slits
  const pupilGeom = new THREE.BoxGeometry(0.03, 0.15, 0.05)
  const pupilMat = new THREE.MeshBasicMaterial({ color: 0x000000 })
  
  const leftPupil = new THREE.Mesh(pupilGeom, pupilMat)
  leftPupil.position.copy(leftEye.position)
  leftPupil.position.z += 0.08
  group.add(leftPupil)
  
  const rightPupil = new THREE.Mesh(pupilGeom, pupilMat)
  rightPupil.position.copy(rightEye.position)
  rightPupil.position.z += 0.08
  group.add(rightPupil)
  
  // Tongue (forked)
  const tongueBaseGeom = new THREE.CylinderGeometry(0.02, 0.02, 0.3, 6)
  const tongueMat = new THREE.MeshStandardMaterial({ 
    color: 0xff0066,
    metalness: 0.5,
    roughness: 0.5
  })
  const tongueBase = new THREE.Mesh(tongueBaseGeom, tongueMat)
  tongueBase.position.set(0, 0.35, 0.65)
  tongueBase.rotation.x = Math.PI / 2
  group.add(tongueBase)
  
  // Forked tips
  const tipGeom = new THREE.CylinderGeometry(0.015, 0.005, 0.15, 4)
  
  const leftTip = new THREE.Mesh(tipGeom, tongueMat)
  leftTip.position.set(-0.04, 0.35, 0.77)
  leftTip.rotation.set(0.3, 0, -0.3)
  group.add(leftTip)
  
  const rightTip = new THREE.Mesh(tipGeom, tongueMat)
  rightTip.position.set(0.04, 0.35, 0.77)
  rightTip.rotation.set(0.3, 0, 0.3)
  group.add(rightTip)
  
  // Fangs
  const fangGeom = new THREE.ConeGeometry(0.04, 0.15, 6)
  const fangMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.8,
    roughness: 0.2
  })
  
  const leftFang = new THREE.Mesh(fangGeom, fangMat)
  leftFang.position.set(-0.15, 0.35, 0.55)
  leftFang.rotation.x = Math.PI
  leftFang.castShadow = true
  group.add(leftFang)
  
  const rightFang = new THREE.Mesh(fangGeom, fangMat)
  rightFang.position.set(0.15, 0.35, 0.55)
  rightFang.rotation.x = Math.PI
  rightFang.castShadow = true
  group.add(rightFang)
  
  // Venom drip effect
  const venomGeom = new THREE.SphereGeometry(0.03, 8, 8)
  const venomMat = new THREE.MeshStandardMaterial({
    color: 0x00ff00,
    emissive: 0x00aa00,
    emissiveIntensity: 1.0,
    transparent: true,
    opacity: 0.8
  })
  
  const leftVenom = new THREE.Mesh(venomGeom, venomMat)
  leftVenom.position.set(-0.15, 0.22, 0.55)
  group.add(leftVenom)
  
  const rightVenom = new THREE.Mesh(venomGeom, venomMat)
  rightVenom.position.set(0.15, 0.22, 0.55)
  group.add(rightVenom)
  
  return group
}

function createProceduralDragon() {
  const group = new THREE.Group()
  
  // Body (elongated with better geometry)
  const bodyGeom = new THREE.CapsuleGeometry(0.6, 1.8, 12, 24)
  const bodyMat = new THREE.MeshStandardMaterial({ 
    color: 0x8e44ad,
    metalness: 0.5,
    roughness: 0.4,
    emissive: 0x4a1a5a,
    emissiveIntensity: 0.3
  })
  const body = new THREE.Mesh(bodyGeom, bodyMat)
  body.position.y = 1.2
  body.rotation.z = Math.PI / 5
  body.castShadow = true
  body.receiveShadow = true
  group.add(body)
  
  // Head (more detailed)
  const headGeom = new THREE.ConeGeometry(0.5, 1.0, 8)
  const headMat = new THREE.MeshStandardMaterial({ 
    color: 0x9b59b6,
    metalness: 0.6,
    roughness: 0.3,
    emissive: 0x5a2a6a,
    emissiveIntensity: 0.2
  })
  const head = new THREE.Mesh(headGeom, headMat)
  head.position.set(0.7, 2.0, 0)
  head.rotation.z = -Math.PI / 2
  head.castShadow = true
  group.add(head)
  
  // Snout detail
  const snoutGeom = new THREE.ConeGeometry(0.25, 0.4, 8)
  const snout = new THREE.Mesh(snoutGeom, headMat)
  snout.position.set(1.1, 2.0, 0)
  snout.rotation.z = -Math.PI / 2
  snout.castShadow = true
  group.add(snout)
  
  // Horn
  const hornGeom = new THREE.ConeGeometry(0.08, 0.4, 8)
  const hornMat = new THREE.MeshStandardMaterial({
    color: 0xffd700,
    metalness: 0.9,
    roughness: 0.1,
    emissive: 0x886600,
    emissiveIntensity: 0.5
  })
  
  for (let i = 0; i < 3; i++) {
    const horn = new THREE.Mesh(hornGeom, hornMat)
    horn.position.set(0.5 + i * 0.15, 2.3, -0.2 + i * 0.15)
    horn.rotation.set(0.5, 0, -0.3 + i * 0.2)
    horn.castShadow = true
    group.add(horn)
  }
  
  // Eyes (glowing with more detail)
  const eyeGeom = new THREE.SphereGeometry(0.12, 16, 16)
  const eyeMat = new THREE.MeshStandardMaterial({ 
    color: 0xf1c40f,
    emissive: 0xf1c40f,
    emissiveIntensity: 2.0,
    metalness: 1.0,
    roughness: 0.1
  })
  
  const leftEye = new THREE.Mesh(eyeGeom, eyeMat)
  leftEye.position.set(1.0, 2.1, 0.2)
  group.add(leftEye)
  
  const rightEye = new THREE.Mesh(eyeGeom, eyeMat)
  rightEye.position.set(1.0, 2.1, -0.2)
  group.add(rightEye)
  
  // Eye glow
  const eyeGlowGeom = new THREE.SphereGeometry(0.15, 16, 16)
  const eyeGlowMat = new THREE.MeshBasicMaterial({
    color: 0xf1c40f,
    transparent: true,
    opacity: 0.4
  })
  
  const leftEyeGlow = new THREE.Mesh(eyeGlowGeom, eyeGlowMat)
  leftEyeGlow.position.copy(leftEye.position)
  group.add(leftEyeGlow)
  
  const rightEyeGlow = new THREE.Mesh(eyeGlowGeom, eyeGlowMat)
  rightEyeGlow.position.copy(rightEye.position)
  group.add(rightEyeGlow)
  
  // Wings (more detailed and larger)
  const wingGeom = new THREE.ConeGeometry(1.2, 2.0, 3)
  const wingMat = new THREE.MeshStandardMaterial({ 
    color: 0x6c3483,
    metalness: 0.3,
    roughness: 0.6,
    emissive: 0x3a1a4a,
    emissiveIntensity: 0.2,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.9
  })
  
  const leftWing = new THREE.Mesh(wingGeom, wingMat)
  leftWing.position.set(0, 1.4, 1.2)
  leftWing.rotation.set(0, 0, Math.PI / 3.5)
  leftWing.castShadow = true
  group.add(leftWing)
  
  // Wing membrane details
  const membraneGeom = new THREE.ConeGeometry(1.0, 1.7, 3)
  const membraneMat = new THREE.MeshBasicMaterial({
    color: 0x8e44ad,
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide
  })
  
  const leftMembrane = new THREE.Mesh(membraneGeom, membraneMat)
  leftMembrane.position.copy(leftWing.position)
  leftMembrane.rotation.copy(leftWing.rotation)
  leftMembrane.position.z += 0.1
  group.add(leftMembrane)
  
  const rightWing = new THREE.Mesh(wingGeom, wingMat)
  rightWing.position.set(0, 1.4, -1.2)
  rightWing.rotation.set(0, 0, Math.PI / 3.5)
  rightWing.castShadow = true
  group.add(rightWing)
  
  const rightMembrane = new THREE.Mesh(membraneGeom, membraneMat)
  rightMembrane.position.copy(rightWing.position)
  rightMembrane.rotation.copy(rightWing.rotation)
  rightMembrane.position.z -= 0.1
  group.add(rightMembrane)
  
  // Tail (segmented for better look)
  const tailSegments = 5
  for (let i = 0; i < tailSegments; i++) {
    const size = 0.25 - i * 0.03
    const tailSegGeom = new THREE.ConeGeometry(size, 0.5, 8)
    const tailSeg = new THREE.Mesh(tailSegGeom, bodyMat)
    tailSeg.position.set(-1.0 - i * 0.4, 0.6 - i * 0.15, 0)
    tailSeg.rotation.z = Math.PI / 2.2 + i * 0.15
    tailSeg.castShadow = true
    group.add(tailSeg)
  }
  
  // Tail spikes
  for (let i = 0; i < 3; i++) {
    const spike = new THREE.Mesh(hornGeom.clone(), hornMat)
    spike.position.set(-1.2 - i * 0.5, 0.8 - i * 0.1, 0)
    spike.rotation.set(0, 0, -Math.PI / 4)
    spike.scale.setScalar(0.8)
    group.add(spike)
  }
  
  // Legs with more detail
  const legGeom = new THREE.CylinderGeometry(0.12, 0.18, 0.7, 12)
  const legMat = new THREE.MeshStandardMaterial({ 
    color: 0x5b2c6f,
    metalness: 0.4,
    roughness: 0.6
  })
  
  const clawGeom = new THREE.ConeGeometry(0.08, 0.15, 4)
  const clawMat = new THREE.MeshStandardMaterial({
    color: 0x2a1a3a,
    metalness: 0.7,
    roughness: 0.3
  })
  
  // Front legs
  const frontLeftLeg = new THREE.Mesh(legGeom, legMat)
  frontLeftLeg.position.set(0.4, 0.35, 0.5)
  frontLeftLeg.castShadow = true
  group.add(frontLeftLeg)
  
  const frontLeftClaw = new THREE.Mesh(clawGeom, clawMat)
  frontLeftClaw.position.set(0.4, 0, 0.5)
  frontLeftClaw.rotation.x = Math.PI
  group.add(frontLeftClaw)
  
  const frontRightLeg = new THREE.Mesh(legGeom, legMat)
  frontRightLeg.position.set(0.4, 0.35, -0.5)
  frontRightLeg.castShadow = true
  group.add(frontRightLeg)
  
  const frontRightClaw = new THREE.Mesh(clawGeom, clawMat)
  frontRightClaw.position.set(0.4, 0, -0.5)
  frontRightClaw.rotation.x = Math.PI
  group.add(frontRightClaw)
  
  // Back legs
  const backLeftLeg = new THREE.Mesh(legGeom, legMat)
  backLeftLeg.position.set(-0.4, 0.35, 0.5)
  backLeftLeg.castShadow = true
  group.add(backLeftLeg)
  
  const backLeftClaw = new THREE.Mesh(clawGeom, clawMat)
  backLeftClaw.position.set(-0.4, 0, 0.5)
  backLeftClaw.rotation.x = Math.PI
  group.add(backLeftClaw)
  
  const backRightLeg = new THREE.Mesh(legGeom, legMat)
  backRightLeg.position.set(-0.4, 0.35, -0.5)
  backRightLeg.castShadow = true
  group.add(backRightLeg)
  
  const backRightClaw = new THREE.Mesh(clawGeom, clawMat)
  backRightClaw.position.set(-0.4, 0, -0.5)
  backRightClaw.rotation.x = Math.PI
  group.add(backRightClaw)
  
  // Fire breath particles indicator (enhanced)
  const fireGeom = new THREE.ConeGeometry(0.2, 0.6, 8)
  const fireMat = new THREE.MeshStandardMaterial({ 
    color: 0xff6600,
    emissive: 0xff3300,
    emissiveIntensity: 2.0,
    transparent: true,
    opacity: 0.9
  })
  const fire = new THREE.Mesh(fireGeom, fireMat)
  fire.position.set(1.4, 2.0, 0)
  fire.rotation.z = -Math.PI / 2
  group.add(fire)
  
  // Fire glow
  const fireGlowGeom = new THREE.SphereGeometry(0.3, 16, 16)
  const fireGlowMat = new THREE.MeshBasicMaterial({
    color: 0xff4400,
    transparent: true,
    opacity: 0.5
  })
  const fireGlow = new THREE.Mesh(fireGlowGeom, fireGlowMat)
  fireGlow.position.set(1.5, 2.0, 0)
  group.add(fireGlow)
  
  // Chest glow (weak spot indicator)
  const chestGlowGeom = new THREE.SphereGeometry(0.25, 16, 16)
  const chestGlowMat = new THREE.MeshStandardMaterial({
    color: 0xff6600,
    emissive: 0xff3300,
    emissiveIntensity: 1.0,
    transparent: true,
    opacity: 0.6
  })
  const chestGlow = new THREE.Mesh(chestGlowGeom, chestGlowMat)
  chestGlow.position.set(0.3, 1.2, 0)
  group.add(chestGlow)
  
  return group
}

function createProceduralMortar() {
  const group = new THREE.Group()
  
  // Base platform
  const baseGeom = new THREE.CylinderGeometry(0.6, 0.7, 0.15, 12)
  const baseMat = new THREE.MeshStandardMaterial({ 
    color: 0x3d5c5c,
    metalness: 0.7,
    roughness: 0.3
  })
  const base = new THREE.Mesh(baseGeom, baseMat)
  base.position.y = 0.075
  base.castShadow = true
  base.receiveShadow = true
  group.add(base)
  
  // Mortar tube
  const tubeGeom = new THREE.CylinderGeometry(0.15, 0.2, 1.2, 16)
  const tubeMat = new THREE.MeshStandardMaterial({ 
    color: 0x2c3e50,
    metalness: 0.8,
    roughness: 0.2
  })
  const tube = new THREE.Mesh(tubeGeom, tubeMat)
  tube.position.set(0, 0.7, 0)
  tube.rotation.x = -Math.PI / 6
  tube.castShadow = true
  group.add(tube)
  
  // Tube opening (darker)
  const openingGeom = new THREE.CylinderGeometry(0.12, 0.12, 0.05, 16)
  const openingMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
  const opening = new THREE.Mesh(openingGeom, openingMat)
  opening.position.set(0, 1.2, -0.3)
  opening.rotation.x = -Math.PI / 6
  group.add(opening)
  
  // Support legs
  const legGeom = new THREE.CylinderGeometry(0.05, 0.05, 0.8, 8)
  const legMat = new THREE.MeshStandardMaterial({ color: 0x444444 })
  
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2
    const leg = new THREE.Mesh(legGeom, legMat)
    leg.position.set(
      Math.cos(angle) * 0.4,
      0.3,
      Math.sin(angle) * 0.4
    )
    leg.rotation.z = Math.PI / 6 * (i === 0 ? -1 : 1)
    leg.castShadow = true
    group.add(leg)
  }
  
  // Ammunition box
  const ammoGeom = new THREE.BoxGeometry(0.4, 0.25, 0.3)
  const ammoMat = new THREE.MeshStandardMaterial({ color: 0x5d4e37 })
  const ammo = new THREE.Mesh(ammoGeom, ammoMat)
  ammo.position.set(0.5, 0.125, 0.3)
  ammo.castShadow = true
  group.add(ammo)
  
  return group
}

// Procedural model registry
const PROCEDURAL_GENERATORS = {
  'PROCEDURAL_TROOP': createProceduralTroop,
  'PROCEDURAL_SNAKE': createProceduralSnake,
  'PROCEDURAL_DRAGON': createProceduralDragon,
  'PROCEDURAL_MORTAR': createProceduralMortar
}

// ============================================================
// MODEL SCALES - Reduced for better gameplay visibility
// ============================================================
const MODEL_SCALES = {
  // Towers - REDUCED scales for better placement
  'medieval_towers': 0.08,
  'heavy_cannon': 0.08,
  'watch_tower': 0.10,
  'kickelhahn': 0.08,
  'cannon': 0.08,
  'aa_turret': 0.10,
  'combat_turret': 0.09,
  'gun_tower': 0.10,
  'hoth_turret': 0.08,
  'gatling_tower': 0.10,
  'missile_tower': 0.10,
  'laser_tower': 0.08,
  'sniper_tower': 0.09,
  'tesla_tower': 0.12,
  'frost_tower': 0.10,
  'fire_tower': 0.10,
  
  // Walls - reduced
  'castle_walls': 0.15,
  'modular_wall': 0.15,
  'sci_fi_wall': 0.15,
  'wall': 0.15,
  
  // Units - sized for ground combat
  'troop': 0.8,
  
  // Enemies - reduced for better visibility
  'spaceship': 0.18,
  'spaceship_clst': 0.15,
  'enemy_ship': 0.18,
  'boss_ship': 0.30,
  
  // Heroes - larger than regular units
  'snake': 1.0,
  'dragon': 1.2,
  
  // Structures - reduced
  'barracks': 0.12,
  'future_architectural': 0.12,
  'mortar': 0.8,
  'astro_shedder': 0.18,
  'fighter_jet': 0.15
}

// Target sizes for auto-scaling (in world units) - REDUCED
const TARGET_SIZES = {
  // Towers - reduced for better gameplay
  'medieval_towers': 2.5,
  'heavy_cannon': 2.8,
  'watch_tower': 2.2,
  'kickelhahn': 2.2,
  'cannon': 2.5,
  'aa_turret': 2.5,
  'combat_turret': 2.5,
  'gun_tower': 2.5,
  'hoth_turret': 2.8,
  'gatling_tower': 2.5,
  'missile_tower': 2.5,
  'laser_tower': 2.8,
  'sniper_tower': 2.5,
  'tesla_tower': 2.2,
  'frost_tower': 2.5,
  'fire_tower': 2.5,
  
  // Walls - reduced
  'castle_walls': 1.2,
  'modular_wall': 1.2,
  'sci_fi_wall': 1.2,
  'wall': 1.2,
  
  // Units - soldier height
  'troop': 1.2,
  
  // Enemies - reduced for better visibility
  'spaceship': 1.5,
  'spaceship_clst': 1.3,
  'enemy_ship': 1.5,
  'boss_ship': 2.5,
  
  // Heroes - reduced
  'snake': 2.0,
  'dragon': 2.5,
  
  // Structures - reduced
  'barracks': 2.0,
  'future_architectural': 2.0,
  'mortar': 1.5,
  'astro_shedder': 1.5,
  'fighter_jet': 1.8
}

// Load user scale preferences from localStorage
function loadUserScales() {
  try {
    const saved = localStorage.getItem('modelScales')
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (e) {
    console.warn('Failed to load user scales:', e)
  }
  return {}
}

function saveUserScales(scales) {
  try {
    localStorage.setItem('modelScales', JSON.stringify(scales))
  } catch (e) {
    console.warn('Failed to save user scales:', e)
  }
}

// ============================================================
// MODEL LOADER CLASS
// ============================================================
export class ModelLoader {
  constructor() {
    this.cache = new Map()
    this.proceduralCache = new Map()
    this.loader = new GLTFLoader()
    this.loadingProgress = {}
    this.loadingPromises = new Map()
    this.userScales = loadUserScales()
    this.autoScaleEnabled = true
    this.modelBoundingBoxes = new Map()
  }
  
  async preloadEssentialModels() {
    // Preload the GLB models we actually have
    const essential = ['aa_turret', 'gun_tower', 'modular_wall']
    await Promise.all(essential.map(key => this.load(key)))
  }
  
  async load(modelKey) {
    // Get the mapped model or procedural type
    const mapping = MODEL_MAPPING[modelKey]
    
    if (!mapping) {
      console.warn(`Model key "${modelKey}" not found in MODEL_MAPPING`)
      return null
    }
    
    // Check if it's a procedural model
    if (mapping.startsWith('PROCEDURAL_')) {
      // Generate and cache procedural model
      if (!this.proceduralCache.has(mapping)) {
        const generator = PROCEDURAL_GENERATORS[mapping]
        if (generator) {
          const proceduralModel = generator()
          this.proceduralCache.set(mapping, proceduralModel)
        }
      }
      return { scene: this.proceduralCache.get(mapping), isProcedural: true }
    }
    
    // It's a real GLB model - check cache
    if (this.cache.has(mapping)) {
      return this.cache.get(mapping)
    }
    
    if (this.loadingPromises.has(mapping)) {
      return this.loadingPromises.get(mapping)
    }
    
    const modelPath = AVAILABLE_MODELS[mapping]
    if (!modelPath) {
      console.warn(`Model path for "${mapping}" not found`)
      return null
    }
    
    const promise = this.loader.loadAsync(
      modelPath,
      (progress) => {
        if (progress.total > 0) {
          this.loadingProgress[modelKey] = progress.loaded / progress.total
        }
      }
    ).then(gltf => {
      this.optimizeModel(gltf)
      if (this.autoScaleEnabled) {
        this.calculateBoundingBox(gltf.scene, mapping)
      }
      this.cache.set(mapping, gltf)
      this.loadingPromises.delete(mapping)
      return gltf
    }).catch(error => {
      console.error(`Error loading model ${mapping}:`, error)
      this.loadingPromises.delete(mapping)
      // Return a fallback procedural cube
      return this.createFallbackModel(modelKey)
    })
    
    this.loadingPromises.set(mapping, promise)
    return promise
  }
  
  createFallbackModel(modelKey) {
    // Create a simple colored cube as ultimate fallback
    const geometry = new THREE.BoxGeometry(1, 1, 1)
    const material = new THREE.MeshStandardMaterial({ 
      color: 0xff6600,
      metalness: 0.5,
      roughness: 0.5
    })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.castShadow = true
    mesh.receiveShadow = true
    
    const group = new THREE.Group()
    group.add(mesh)
    
    return { scene: group, isProcedural: true }
  }
  
  createInstance(modelKey) {
    const mapping = MODEL_MAPPING[modelKey]
    
    if (!mapping) {
      console.warn(`Model key "${modelKey}" not found in MODEL_MAPPING`)
      return this.createFallbackInstance()
    }
    
    let instance
    
    // Check if it's procedural
    if (mapping.startsWith('PROCEDURAL_')) {
      const cached = this.proceduralCache.get(mapping)
      if (cached) {
        instance = cached.clone()
      } else {
        // Generate on-the-fly if not cached
        const generator = PROCEDURAL_GENERATORS[mapping]
        if (generator) {
          instance = generator()
          this.proceduralCache.set(mapping, instance.clone())
        } else {
          return this.createFallbackInstance()
        }
      }
    } else {
      // Real GLB model
      const cached = this.cache.get(mapping)
      if (!cached) {
        console.warn(`Model ${mapping} not cached, creating fallback`)
        return this.createFallbackInstance()
      }
      instance = cached.scene.clone()
    }
    
    // Apply scaling
    let scale = this.userScales[modelKey]
    
    if (scale === undefined && this.autoScaleEnabled && TARGET_SIZES[modelKey]) {
      const boundingBox = this.modelBoundingBoxes.get(mapping)
      if (boundingBox) {
        const currentHeight = boundingBox.max.y - boundingBox.min.y
        const targetHeight = TARGET_SIZES[modelKey]
        if (currentHeight > 0) {
          scale = targetHeight / currentHeight
        }
      }
    }
    
    if (scale === undefined) {
      scale = MODEL_SCALES[modelKey] || 0.2
    }
    
    instance.scale.set(scale, scale, scale)
    
    // Clone materials
    instance.traverse((child) => {
      if (child.isMesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material = child.material.map(mat => mat.clone())
        } else {
          child.material = child.material.clone()
        }
      }
    })
    
    return instance
  }
  
  createFallbackInstance() {
    const geometry = new THREE.BoxGeometry(1, 2, 1)
    const material = new THREE.MeshStandardMaterial({ 
      color: 0x888888,
      metalness: 0.3,
      roughness: 0.7
    })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.position.y = 1
    
    const group = new THREE.Group()
    group.add(mesh)
    return group
  }
  
  calculateBoundingBox(scene, modelKey) {
    const box = new THREE.Box3()
    box.setFromObject(scene)
    this.modelBoundingBoxes.set(modelKey, box)
    return box
  }
  
  setUserScale(modelKey, scale) {
    this.userScales[modelKey] = scale
    saveUserScales(this.userScales)
  }
  
  getUserScale(modelKey) {
    return this.userScales[modelKey]
  }
  
  resetUserScales() {
    this.userScales = {}
    saveUserScales(this.userScales)
  }
  
  setAutoScaleEnabled(enabled) {
    this.autoScaleEnabled = enabled
    try {
      localStorage.setItem('autoScaleEnabled', enabled.toString())
    } catch (e) {
      console.warn('Failed to save auto-scale setting:', e)
    }
  }
  
  getAllUserScales() {
    return { ...this.userScales }
  }
  
  optimizeModel(gltf) {
    gltf.scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
        
        if (child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material]
          materials.forEach(material => {
            material.needsUpdate = false
            if (material.map) {
              material.map.generateMipmaps = true
              material.map.minFilter = THREE.LinearMipmapLinearFilter
            }
            if (!material.shadowSide) {
              material.shadowSide = THREE.FrontSide
            }
          })
        }
        
        if (child.geometry) {
          child.geometry.computeBoundingBox()
          child.geometry.computeBoundingSphere()
        }
      }
    })
  }
  
  getLoadingProgress(modelKey) {
    return this.loadingProgress[modelKey] || 0
  }
  
  isLoaded(modelKey) {
    const mapping = MODEL_MAPPING[modelKey]
    if (mapping?.startsWith('PROCEDURAL_')) {
      return true // Procedural models are always "loaded"
    }
    return this.cache.has(mapping)
  }
  
  clearCache() {
    this.cache.forEach(gltf => {
      gltf.scene.traverse((child) => {
        if (child.geometry) child.geometry.dispose()
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => mat.dispose())
          } else {
            child.material.dispose()
          }
        }
      })
    })
    
    this.cache.clear()
    this.proceduralCache.clear()
    this.loadingProgress = {}
  }
  
  getAvailableModels() {
    return Object.keys(MODEL_MAPPING)
  }
  
  getModelScale(modelKey) {
    if (this.userScales[modelKey] !== undefined) {
      return this.userScales[modelKey]
    }
    return MODEL_SCALES[modelKey] || 0.2
  }
  
  getTargetSize(modelKey) {
    return TARGET_SIZES[modelKey] || null
  }
  
  getCurrentSize(modelKey) {
    const mapping = MODEL_MAPPING[modelKey]
    const boundingBox = this.modelBoundingBoxes.get(mapping)
    if (!boundingBox) return null
    
    const scale = this.getModelScale(modelKey)
    const height = (boundingBox.max.y - boundingBox.min.y) * scale
    return height
  }
}

// Export singleton instance
export const modelLoader = new ModelLoader()

// Load auto-scale setting
try {
  const saved = localStorage.getItem('autoScaleEnabled')
  if (saved !== null) {
    modelLoader.setAutoScaleEnabled(saved === 'true')
  }
} catch (e) {
  // Ignore
}

export { MODEL_SCALES, TARGET_SIZES, MODEL_MAPPING, AVAILABLE_MODELS }
