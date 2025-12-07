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
    
    // Make walls vertical to block enemies
    if (this.mesh) {
      // Keep walls vertical (no rotation)
      // Adjust position to sit on ground properly
      const currentScale = this.mesh.scale.x
      // Scale walls to be smaller - reduce overall size
      this.mesh.scale.set(currentScale * 0.8, currentScale * 0.8, currentScale * 0.8)
      
      // Position on ground (half of scaled height)
      this.mesh.position.y = (1.2 * currentScale * 0.8) / 2
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

