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
  // Towers - map to available turret models
  'medieval_towers': 'gun_tower',
  'heavy_cannon': 'combat_turret',
  'watch_tower': 'aa_turret',
  'kickelhahn': 'hoth_turret',
  'cannon': 'combat_turret',
  'aa_turret': 'aa_turret',
  'combat_turret': 'combat_turret',
  'gun_tower': 'gun_tower',
  'hoth_turret': 'hoth_turret',
  
  // Walls & Structures
  'castle_walls': 'modular_wall',
  'modular_wall': 'modular_wall',
  'sci_fi_wall': 'sci_fi_wall',
  'future_architectural': 'future_architectural',
  
  // Units - use spaceships or procedural
  'troop': 'PROCEDURAL_TROOP',
  'spaceship': 'spaceship',
  'spaceship_clst': 'spaceship_clst',
  
  // Heroes - procedural geometric representations
  'snake': 'PROCEDURAL_SNAKE',
  'dragon': 'PROCEDURAL_DRAGON',
  
  // Special
  'mortar': 'PROCEDURAL_MORTAR',
  'astro_shedder': 'spaceship',
  'fighter_jet': 'spaceship_clst'
}

// ============================================================
// PROCEDURAL MODEL GENERATORS
// Create geometric 3D representations for missing models
// ============================================================

function createProceduralTroop() {
  const group = new THREE.Group()
  
  // Body (capsule-like)
  const bodyGeom = new THREE.CapsuleGeometry(0.3, 0.8, 4, 8)
  const bodyMat = new THREE.MeshStandardMaterial({ 
    color: 0x4a90d9,
    metalness: 0.3,
    roughness: 0.7
  })
  const body = new THREE.Mesh(bodyGeom, bodyMat)
  body.position.y = 0.7
  body.castShadow = true
  group.add(body)
  
  // Head (sphere)
  const headGeom = new THREE.SphereGeometry(0.25, 16, 16)
  const headMat = new THREE.MeshStandardMaterial({ 
    color: 0xffcc99,
    metalness: 0.1,
    roughness: 0.8
  })
  const head = new THREE.Mesh(headGeom, headMat)
  head.position.y = 1.4
  head.castShadow = true
  group.add(head)
  
  // Helmet (half sphere)
  const helmetGeom = new THREE.SphereGeometry(0.28, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2)
  const helmetMat = new THREE.MeshStandardMaterial({ 
    color: 0x2d5a87,
    metalness: 0.6,
    roughness: 0.3
  })
  const helmet = new THREE.Mesh(helmetGeom, helmetMat)
  helmet.position.y = 1.45
  helmet.castShadow = true
  group.add(helmet)
  
  // Visor (glowing)
  const visorGeom = new THREE.BoxGeometry(0.35, 0.08, 0.1)
  const visorMat = new THREE.MeshStandardMaterial({ 
    color: 0x00ffff,
    emissive: 0x00ffff,
    emissiveIntensity: 0.5
  })
  const visor = new THREE.Mesh(visorGeom, visorMat)
  visor.position.set(0, 1.4, 0.2)
  group.add(visor)
  
  // Legs
  const legGeom = new THREE.CylinderGeometry(0.08, 0.1, 0.5, 8)
  const legMat = new THREE.MeshStandardMaterial({ color: 0x333333 })
  
  const leftLeg = new THREE.Mesh(legGeom, legMat)
  leftLeg.position.set(-0.15, 0.25, 0)
  leftLeg.castShadow = true
  group.add(leftLeg)
  
  const rightLeg = new THREE.Mesh(legGeom, legMat)
  rightLeg.position.set(0.15, 0.25, 0)
  rightLeg.castShadow = true
  group.add(rightLeg)
  
  // Weapon (rifle)
  const weaponGeom = new THREE.BoxGeometry(0.08, 0.08, 0.6)
  const weaponMat = new THREE.MeshStandardMaterial({ 
    color: 0x222222,
    metalness: 0.8,
    roughness: 0.2
  })
  const weapon = new THREE.Mesh(weaponGeom, weaponMat)
  weapon.position.set(0.35, 0.8, 0.2)
  weapon.rotation.x = -0.3
  weapon.castShadow = true
  group.add(weapon)
  
  return group
}

function createProceduralSnake() {
  const group = new THREE.Group()
  
  // Snake body segments (curved path)
  const segments = 8
  const segmentMat = new THREE.MeshStandardMaterial({ 
    color: 0x2ecc71,
    metalness: 0.2,
    roughness: 0.6
  })
  
  for (let i = 0; i < segments; i++) {
    const size = 0.3 - (i * 0.02)
    const segGeom = new THREE.SphereGeometry(size, 12, 12)
    const seg = new THREE.Mesh(segGeom, segmentMat)
    
    // Create S-curve
    const t = i / segments
    seg.position.x = Math.sin(t * Math.PI * 2) * 0.5
    seg.position.y = size
    seg.position.z = -i * 0.35
    seg.castShadow = true
    group.add(seg)
  }
  
  // Head (larger, with eyes)
  const headGeom = new THREE.SphereGeometry(0.35, 16, 16)
  const headMat = new THREE.MeshStandardMaterial({ 
    color: 0x27ae60,
    metalness: 0.2,
    roughness: 0.5
  })
  const head = new THREE.Mesh(headGeom, headMat)
  head.position.set(0, 0.35, 0.3)
  head.scale.z = 1.3
  head.castShadow = true
  group.add(head)
  
  // Eyes
  const eyeGeom = new THREE.SphereGeometry(0.08, 8, 8)
  const eyeMat = new THREE.MeshStandardMaterial({ 
    color: 0xff0000,
    emissive: 0xff0000,
    emissiveIntensity: 0.3
  })
  
  const leftEye = new THREE.Mesh(eyeGeom, eyeMat)
  leftEye.position.set(-0.15, 0.45, 0.5)
  group.add(leftEye)
  
  const rightEye = new THREE.Mesh(eyeGeom, eyeMat)
  rightEye.position.set(0.15, 0.45, 0.5)
  group.add(rightEye)
  
  // Tongue
  const tongueGeom = new THREE.BoxGeometry(0.02, 0.02, 0.3)
  const tongueMat = new THREE.MeshStandardMaterial({ color: 0xff0066 })
  const tongue = new THREE.Mesh(tongueGeom, tongueMat)
  tongue.position.set(0, 0.3, 0.6)
  group.add(tongue)
  
  return group
}

function createProceduralDragon() {
  const group = new THREE.Group()
  
  // Body (elongated)
  const bodyGeom = new THREE.CapsuleGeometry(0.5, 1.5, 8, 16)
  const bodyMat = new THREE.MeshStandardMaterial({ 
    color: 0x8e44ad,
    metalness: 0.3,
    roughness: 0.5
  })
  const body = new THREE.Mesh(bodyGeom, bodyMat)
  body.position.y = 1
  body.rotation.z = Math.PI / 6
  body.castShadow = true
  group.add(body)
  
  // Head
  const headGeom = new THREE.ConeGeometry(0.4, 0.8, 6)
  const headMat = new THREE.MeshStandardMaterial({ 
    color: 0x9b59b6,
    metalness: 0.3,
    roughness: 0.5
  })
  const head = new THREE.Mesh(headGeom, headMat)
  head.position.set(0.6, 1.8, 0)
  head.rotation.z = -Math.PI / 2
  head.castShadow = true
  group.add(head)
  
  // Eyes (glowing)
  const eyeGeom = new THREE.SphereGeometry(0.1, 8, 8)
  const eyeMat = new THREE.MeshStandardMaterial({ 
    color: 0xf1c40f,
    emissive: 0xf1c40f,
    emissiveIntensity: 0.8
  })
  
  const leftEye = new THREE.Mesh(eyeGeom, eyeMat)
  leftEye.position.set(0.9, 1.9, 0.15)
  group.add(leftEye)
  
  const rightEye = new THREE.Mesh(eyeGeom, eyeMat)
  rightEye.position.set(0.9, 1.9, -0.15)
  group.add(rightEye)
  
  // Wings
  const wingGeom = new THREE.ConeGeometry(0.8, 1.5, 3)
  const wingMat = new THREE.MeshStandardMaterial({ 
    color: 0x6c3483,
    metalness: 0.2,
    roughness: 0.7,
    side: THREE.DoubleSide
  })
  
  const leftWing = new THREE.Mesh(wingGeom, wingMat)
  leftWing.position.set(0, 1.2, 0.8)
  leftWing.rotation.set(0, 0, Math.PI / 4)
  leftWing.castShadow = true
  group.add(leftWing)
  
  const rightWing = new THREE.Mesh(wingGeom, wingMat)
  rightWing.position.set(0, 1.2, -0.8)
  rightWing.rotation.set(0, 0, Math.PI / 4)
  rightWing.castShadow = true
  group.add(rightWing)
  
  // Tail
  const tailGeom = new THREE.ConeGeometry(0.2, 1.2, 8)
  const tail = new THREE.Mesh(tailGeom, bodyMat)
  tail.position.set(-0.8, 0.5, 0)
  tail.rotation.z = Math.PI / 2.5
  tail.castShadow = true
  group.add(tail)
  
  // Legs
  const legGeom = new THREE.CylinderGeometry(0.1, 0.15, 0.6, 8)
  const legMat = new THREE.MeshStandardMaterial({ color: 0x5b2c6f })
  
  const frontLeftLeg = new THREE.Mesh(legGeom, legMat)
  frontLeftLeg.position.set(0.3, 0.3, 0.4)
  frontLeftLeg.castShadow = true
  group.add(frontLeftLeg)
  
  const frontRightLeg = new THREE.Mesh(legGeom, legMat)
  frontRightLeg.position.set(0.3, 0.3, -0.4)
  frontRightLeg.castShadow = true
  group.add(frontRightLeg)
  
  const backLeftLeg = new THREE.Mesh(legGeom, legMat)
  backLeftLeg.position.set(-0.3, 0.3, 0.4)
  backLeftLeg.castShadow = true
  group.add(backLeftLeg)
  
  const backRightLeg = new THREE.Mesh(legGeom, legMat)
  backRightLeg.position.set(-0.3, 0.3, -0.4)
  backRightLeg.castShadow = true
  group.add(backRightLeg)
  
  // Fire breath particles indicator
  const fireGeom = new THREE.ConeGeometry(0.15, 0.4, 8)
  const fireMat = new THREE.MeshStandardMaterial({ 
    color: 0xff6600,
    emissive: 0xff3300,
    emissiveIntensity: 1,
    transparent: true,
    opacity: 0.8
  })
  const fire = new THREE.Mesh(fireGeom, fireMat)
  fire.position.set(1.2, 1.8, 0)
  fire.rotation.z = -Math.PI / 2
  group.add(fire)
  
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
// MODEL SCALES
// ============================================================
const MODEL_SCALES = {
  'medieval_towers': 0.15,
  'heavy_cannon': 0.15,
  'watch_tower': 0.2,
  'kickelhahn': 0.15,
  'cannon': 0.15,
  'aa_turret': 0.2,
  'combat_turret': 0.18,
  'gun_tower': 0.2,
  'hoth_turret': 0.15,
  'castle_walls': 0.25,
  'modular_wall': 0.25,
  'sci_fi_wall': 0.25,
  'troop': 1.0,
  'spaceship': 0.3,
  'spaceship_clst': 0.25,
  'snake': 1.0,
  'dragon': 1.0,
  'mortar': 1.0,
  'astro_shedder': 0.3,
  'future_architectural': 0.2,
  'fighter_jet': 0.25
}

const TARGET_SIZES = {
  'medieval_towers': 4.0,
  'heavy_cannon': 4.5,
  'watch_tower': 3.5,
  'kickelhahn': 3.5,
  'cannon': 4.0,
  'aa_turret': 3.5,
  'combat_turret': 3.8,
  'gun_tower': 4.0,
  'hoth_turret': 4.2,
  'castle_walls': 1.5,
  'modular_wall': 1.5,
  'sci_fi_wall': 1.5,
  'troop': 1.5,
  'spaceship': 2.0,
  'spaceship_clst': 1.8,
  'snake': 2.5,
  'dragon': 3.0,
  'mortar': 2.0,
  'astro_shedder': 2.0,
  'future_architectural': 3.0,
  'fighter_jet': 2.5
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
