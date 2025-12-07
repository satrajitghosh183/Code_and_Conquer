import { Structure } from './Structure.js'
import { WALL_TYPES } from './TowerTypes.js'

export class Wall extends Structure {
  constructor(wallType, position, options = {}) {
    const config = WALL_TYPES[wallType]
    if (!config) {
      throw new Error(`Unknown wall type: ${wallType}`)
    }
    
    super('wall', position, config.modelKey, {
      health: config.health,
      maxHealth: config.health === Infinity ? 1000 : config.health,
      cost: config.cost,
      rotation: options.rotation || 0
    })
    
    this.wallType = wallType
    this.isIndestructible = config.health === Infinity
    this.blocksPath = true
    this.guidesPath = wallType === 'maze'
  }
  
  async load() {
    await super.load()
    
    // Make walls vertical to block enemies
    // The model is likely horizontal (flat), so rotate 90 degrees on X axis to stand it up
    if (this.mesh) {
      // Rotate the entire mesh to be vertical
      // If model is horizontal (lying flat), rotate -90 degrees on X axis
      if (this.mesh.isGroup) {
        // For groups, rotate the group itself
        this.mesh.rotation.x = -Math.PI / 2 // Rotate 90 degrees to stand vertical
        this.mesh.rotation.z = 0
      } else {
        // Single mesh - rotate to vertical
        this.mesh.rotation.x = -Math.PI / 2 // Rotate 90 degrees to stand vertical
        this.mesh.rotation.z = 0
      }
      
      // Apply Y rotation from placement rotation (user rotation)
      this.mesh.rotation.y = this.rotation
      
      // Scale walls to be smaller - reduce overall size
      const currentScale = this.mesh.scale.x || 1
      this.mesh.scale.set(currentScale * 0.8, currentScale * 0.8, currentScale * 0.8)
      
      // Position on ground - walls should stand vertically
      // After rotating, the "height" dimension is now along Z axis, so position accordingly
      // Estimate wall height after rotation (original depth becomes height)
      const wallHeight = 1.5 * currentScale * 0.8 // Approximate height after rotation
      this.mesh.position.y = wallHeight / 2
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

