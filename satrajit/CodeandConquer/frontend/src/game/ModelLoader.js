import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import * as THREE from 'three'

const MODEL_PATHS = {
  // Towers
  'medieval_towers': '/models/3_medieval_towers.glb',
  'heavy_cannon': '/models/heavy_cannon_tower.glb',
  'watch_tower': '/models/watch_tower.glb',
  'kickelhahn': '/models/kickelhahn_tower.glb',
  
  // Walls & Structures
  'castle_walls': '/models/tower_and_castle_walls.glb',
  
  // Units
  'troop': '/models/troop_astro_mega_v2.glb',
  
  // Heroes
  'snake': '/models/snake_model.glb',
  'dragon': '/models/wooden_dragon.glb',
  
  // Special
  'cannon': '/models/shedders_cannon.glb',
  'mortar': '/models/m1064a3_mortar_carrier.glb',
  'astro_shedder': '/models/astro_shedder_toilet.glb'
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
  'medieval_towers': 0.1,  // Scale down significantly (large model)
  'heavy_cannon': 0.15,    // Slightly larger for heavy weapons
  'watch_tower': 0.2,      // Medium towers
  'kickelhahn': 0.18,      // Similar to watch tower
  
  // Walls & Structures - scale to ~1-2 units height
  'castle_walls': 0.3,     // Walls can be a bit larger
  
  // Units - scale to ~1-2 units height
  'troop': 0.4,            // Units should be smaller
  
  // Heroes - scale to ~2-3 units height
  'snake': 0.3,            // Hero units
  'dragon': 0.25,          // Large hero units
  
  // Special - scale appropriately
  'cannon': 0.15,          // Similar to heavy cannon
  'mortar': 0.12,          // Large vehicles
  'astro_shedder': 0.3     // Special units
}

export class ModelLoader {
  constructor() {
    this.cache = new Map()
    this.loader = new GLTFLoader()
    this.loadingProgress = {}
    this.loadingPromises = new Map()
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
    
    // Apply scale if defined for this model
    const scale = MODEL_SCALES[modelKey]
    if (scale) {
      instance.scale.set(scale, scale, scale)
    } else {
      // Default scale if not defined
      console.warn(`No scale defined for model ${modelKey}, using default scale of 0.2`)
      instance.scale.set(0.2, 0.2, 0.2)
    }
    
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
    return MODEL_SCALES[modelKey] || 0.2 // Default scale if not defined
  }
}

// Export singleton instance
export const modelLoader = new ModelLoader()

// Export scales for external use if needed
export { MODEL_SCALES }

