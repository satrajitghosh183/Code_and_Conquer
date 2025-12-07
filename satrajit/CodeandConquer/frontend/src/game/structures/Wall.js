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
      // Ensure wall is vertical - rotate if needed
      // Check if mesh is a group and rotate all children, or rotate the mesh itself
      if (this.mesh.isGroup) {
        this.mesh.children.forEach(child => {
          if (child.isMesh) {
            // Rotate to vertical if model is horizontal
            child.rotation.x = 0 // Ensure no X rotation (vertical)
            child.rotation.z = 0 // Ensure no Z rotation
          }
        })
      } else {
        // Single mesh - ensure it's vertical
        this.mesh.rotation.x = 0
        this.mesh.rotation.z = 0
      }
      
      // Scale walls to be smaller - reduce overall size
      const currentScale = this.mesh.scale.x || 1
      this.mesh.scale.set(currentScale * 0.8, currentScale * 0.8, currentScale * 0.8)
      
      // Position on ground - walls should stand vertically
      // Height should be along Y axis, so position at half height
      const wallHeight = 1.2 * currentScale * 0.8
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

