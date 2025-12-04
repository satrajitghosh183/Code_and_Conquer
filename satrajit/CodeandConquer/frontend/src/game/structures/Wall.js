import { Structure } from './Structure.js'
import { WALL_TYPES } from './TowerTypes.js'

export class Wall extends Structure {
  constructor(wallType, position) {
    const config = WALL_TYPES[wallType]
    if (!config) {
      throw new Error(`Unknown wall type: ${wallType}`)
    }
    
    super('wall', position, config.modelKey, {
      health: config.health,
      maxHealth: config.health === Infinity ? 1000 : config.health,
      cost: config.cost
    })
    
    this.wallType = wallType
    this.isIndestructible = config.health === Infinity
    this.blocksPath = true
    this.guidesPath = wallType === 'maze'
  }
  
  async load() {
    await super.load()
    
    // Scale is already applied by ModelLoader.createInstance()
    // Walls may need additional height adjustment
    if (this.mesh) {
      // Keep proportional scale but adjust height slightly if needed
      // The base scale from ModelLoader should be correct, but we can fine-tune here
      const currentScale = this.mesh.scale.x
      // Make walls slightly shorter relative to their width
      this.mesh.scale.set(currentScale, currentScale * 0.7, currentScale)
    }
    
    return this.mesh
  }
  
  takeDamage(amount) {
    if (this.isIndestructible) {
      return // Maze walls can't be destroyed
    }
    
    super.takeDamage(amount)
  }
  
  canBeDestroyed() {
    return !this.isIndestructible
  }
  
  getWallType() {
    return this.wallType
  }
}

