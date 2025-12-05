import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import * as THREE from 'three'

const MODEL_PATHS = {
  // Towers - from public/models
  'medieval_towers': '/models/3_medieval_towers.glb',
  'heavy_cannon': '/models/heavy_cannon_tower.glb',
  'watch_tower': '/models/watch_tower.glb',
  'kickelhahn': '/models/kickelhahn_tower.glb',
  'cannon': '/models/shedders_cannon.glb',
  
  // New Towers - from Models directory
  'aa_turret': '/Models/aa_turret.glb',
  'combat_turret': '/Models/combat_turret.glb',
  'gun_tower': '/Models/gun_tower.glb',
  'hoth_turret': '/Models/hoth_defense_turret_-_star_wars.glb',
  
  // Walls & Structures
  'castle_walls': '/models/tower_and_castle_walls.glb',
  'modular_wall': '/Models/modular_wall.glb',
  'sci_fi_wall': '/Models/sci-fi_wall.glb',
  
  // Units
  'troop': '/models/troop_astro_mega_v2.glb',
  'spaceship': '/Models/spaceship.glb',
  'spaceship_clst': '/Models/spaceship_clst_500.glb',
  
  // Heroes
  'snake': '/models/snake_model.glb',
  'dragon': '/models/wooden_dragon.glb',
  
  // Special
  'mortar': '/models/m1064a3_mortar_carrier.glb',
  'astro_shedder': '/models/astro_shedder_toilet.glb',
  'future_architectural': '/Models/future_architectural.glb',
  'fighter_jet': '/models/mwt_shenyang_j-35.glb'
}

// Model scales - ensures all models are properly sized relative to game world
// Game world scale: terrain is 120x120 units, grid cells are 5 units
// Towers should be ~3-5 units tall, units ~1-2 units, walls ~1-2 units tall
// 
// To adjust scales:
// - If a model is too big, decrease the scale value
// - If a model is too small, increase the scale value
// - Typical range: 0.1 (very small) to 0.5 (medium) to 1.0+ (large)
// - Towers: 0.1-0.2, Units: 0.3-0.5, Walls: 0.2-0.4
const MODEL_SCALES = {
  // Towers - scale to ~3-5 units height
  'medieval_towers': 0.1,
  'heavy_cannon': 0.15,
  'watch_tower': 0.2,
  'kickelhahn': 0.18,
  'cannon': 0.15,
  
  // New Towers
  'aa_turret': 0.2,
  'combat_turret': 0.18,
  'gun_tower': 0.2,
  'hoth_turret': 0.15,
  
  // Walls & Structures - scale to ~1-2 units height
  'castle_walls': 0.3,
  'modular_wall': 0.25,
  'sci_fi_wall': 0.25,
  
  // Units - scale to ~1-2 units height
  'troop': 0.4,
  'spaceship': 0.3,
  'spaceship_clst': 0.25,
  
  // Heroes - scale to ~2-3 units height
  'snake': 0.3,
  'dragon': 0.25,
  
  // Special - scale appropriately
  'mortar': 0.12,
  'astro_shedder': 0.3,
  'future_architectural': 0.2,
  'fighter_jet': 0.15
}

// Target sizes for automatic scaling (in game units)
const TARGET_SIZES = {
  // Towers should be 3-5 units tall
  'medieval_towers': 4.0,
  'heavy_cannon': 4.5,
  'watch_tower': 3.5,
  'kickelhahn': 3.5,
  'cannon': 4.0,
  'aa_turret': 3.5,
  'combat_turret': 3.8,
  'gun_tower': 4.0,
  'hoth_turret': 4.2,
  
  // Walls should be 1-2 units tall
  'castle_walls': 1.5,
  'modular_wall': 1.5,
  'sci_fi_wall': 1.5,
  
  // Units should be 1-2 units tall
  'troop': 1.5,
  'spaceship': 2.0,
  'spaceship_clst': 1.8,
  
  // Heroes should be 2-3 units tall
  'snake': 2.5,
  'dragon': 3.0,
  
  // Special
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

// Save user scale preferences to localStorage
function saveUserScales(scales) {
  try {
    localStorage.setItem('modelScales', JSON.stringify(scales))
  } catch (e) {
    console.warn('Failed to save user scales:', e)
  }
}

export class ModelLoader {
  constructor() {
    this.cache = new Map()
    this.loader = new GLTFLoader()
    this.loadingProgress = {}
    this.loadingPromises = new Map()
    this.userScales = loadUserScales() // Load user preferences
    this.autoScaleEnabled = true // Enable automatic scaling by default
    this.modelBoundingBoxes = new Map() // Cache bounding boxes for auto-scaling
  }
  
  async preloadEssentialModels() {
    // Load only what's needed for first wave
    const essential = ['watch_tower', 'castle_walls', 'troop']
    await Promise.all(essential.map(key => this.load(key)))
  }
  
  async load(modelKey) {
    // Return cached if available
    if (this.cache.has(modelKey)) {
      return this.cache.get(modelKey)
    }
    
    // Return existing promise if already loading
    if (this.loadingPromises.has(modelKey)) {
      return this.loadingPromises.get(modelKey)
    }
    
    // Check if model path exists
    if (!MODEL_PATHS[modelKey]) {
      console.warn(`Model key "${modelKey}" not found in MODEL_PATHS`)
      return null
    }
    
    // Create loading promise
    const promise = this.loader.loadAsync(
      MODEL_PATHS[modelKey],
      (progress) => {
        if (progress.total > 0) {
          this.loadingProgress[modelKey] = progress.loaded / progress.total
        }
      }
    ).then(gltf => {
      // Optimize loaded model
      this.optimizeModel(gltf)
      
      // Calculate and cache bounding box for auto-scaling
      if (this.autoScaleEnabled) {
        this.calculateBoundingBox(gltf.scene, modelKey)
      }
      
      // Cache the model
      this.cache.set(modelKey, gltf)
      this.loadingPromises.delete(modelKey)
      
      return gltf
    }).catch(error => {
      console.error(`Error loading model ${modelKey}:`, error)
      this.loadingPromises.delete(modelKey)
      return null
    })
    
    this.loadingPromises.set(modelKey, promise)
    return promise
  }
  
  createInstance(modelKey) {
    const cached = this.cache.get(modelKey)
    if (!cached) {
      console.warn(`Model ${modelKey} not cached, cannot create instance`)
      return null
    }
    
    // Clone the scene
    const instance = cached.scene.clone()
    
    // Determine scale to apply
    let scale = null
    
    // 1. Check if user has custom scale
    if (this.userScales[modelKey] !== undefined) {
      scale = this.userScales[modelKey]
    }
    // 2. Use automatic scaling if enabled
    else if (this.autoScaleEnabled && TARGET_SIZES[modelKey]) {
      const boundingBox = this.modelBoundingBoxes.get(modelKey)
      if (boundingBox) {
        const currentHeight = boundingBox.max.y - boundingBox.min.y
        const targetHeight = TARGET_SIZES[modelKey]
        if (currentHeight > 0) {
          scale = targetHeight / currentHeight
        }
      }
    }
    // 3. Fall back to manual scales
    if (scale === null) {
      scale = MODEL_SCALES[modelKey]
    }
    // 4. Default if nothing defined
    if (scale === null || scale === undefined) {
      console.warn(`No scale defined for model ${modelKey}, using default scale of 0.2`)
      scale = 0.2
    }
    
    // Apply scale
    instance.scale.set(scale, scale, scale)
    
    // Deep clone materials to avoid sharing
    instance.traverse((child) => {
      if (child.isMesh) {
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material = child.material.map(mat => mat.clone())
          } else {
            child.material = child.material.clone()
          }
        }
      }
    })
    
    return instance
  }
  
  // Calculate bounding box for a model
  calculateBoundingBox(scene, modelKey) {
    const box = new THREE.Box3()
    box.setFromObject(scene)
    this.modelBoundingBoxes.set(modelKey, box)
    return box
  }
  
  // Set user scale for a model
  setUserScale(modelKey, scale) {
    this.userScales[modelKey] = scale
    saveUserScales(this.userScales)
  }
  
  // Get user scale for a model
  getUserScale(modelKey) {
    return this.userScales[modelKey]
  }
  
  // Reset user scales to defaults
  resetUserScales() {
    this.userScales = {}
    saveUserScales(this.userScales)
  }
  
  // Enable/disable automatic scaling
  setAutoScaleEnabled(enabled) {
    this.autoScaleEnabled = enabled
    try {
      localStorage.setItem('autoScaleEnabled', enabled.toString())
    } catch (e) {
      console.warn('Failed to save auto-scale setting:', e)
    }
  }
  
  // Get all user scales
  getAllUserScales() {
    return { ...this.userScales }
  }
  
  optimizeModel(gltf) {
    gltf.scene.traverse((child) => {
      if (child.isMesh) {
        // Enable shadows
        child.castShadow = true
        child.receiveShadow = true
        
        // Optimize materials
        if (child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material]
          
          materials.forEach(material => {
            // Mark as not needing update
            material.needsUpdate = false
            
            // Optimize texture settings
            if (material.map) {
              material.map.generateMipmaps = true
              material.map.minFilter = THREE.LinearMipmapLinearFilter
            }
            
            // Set reasonable defaults
            if (!material.shadowSide) {
              material.shadowSide = THREE.FrontSide
            }
          })
        }
        
        // Optimize geometry
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
    return this.cache.has(modelKey)
  }
  
  clearCache() {
    // Dispose of all cached models
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
        if (child.texture) child.texture.dispose()
      })
    })
    
    this.cache.clear()
    this.loadingProgress = {}
  }
  
  getAvailableModels() {
    return Object.keys(MODEL_PATHS)
  }
  
  getModelScale(modelKey) {
    // Return user scale if set, otherwise return default
    if (this.userScales[modelKey] !== undefined) {
      return this.userScales[modelKey]
    }
    return MODEL_SCALES[modelKey] || 0.2 // Default scale if not defined
  }
  
  // Get target size for a model (for UI display)
  getTargetSize(modelKey) {
    return TARGET_SIZES[modelKey] || null
  }
  
  // Get current bounding box size (after scaling)
  getCurrentSize(modelKey) {
    const boundingBox = this.modelBoundingBoxes.get(modelKey)
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

// Export scales for external use if needed
export { MODEL_SCALES, TARGET_SIZES }

