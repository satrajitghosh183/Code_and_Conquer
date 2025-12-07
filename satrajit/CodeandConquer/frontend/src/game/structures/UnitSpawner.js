import { Structure } from './Structure.js'
import { SPAWNER_TYPES } from './TowerTypes.js'

export class UnitSpawner extends Structure {
  constructor(spawnerType, position, options = {}) {
    const config = SPAWNER_TYPES[spawnerType]
    if (!config) {
      throw new Error(`Unknown spawner type: ${spawnerType}`)
    }
    
    super('spawner', position, config.modelKey, {
      health: config.health,
      maxHealth: config.health,
      cost: config.cost,
      rotation: options.rotation || 0
    })
    
    this.spawnerType = spawnerType
    this.spawnRate = config.spawnRate
    this.maxUnits = config.maxUnits
    this.unitType = config.unitType
    this.lastSpawn = 0
    this.spawnedUnits = []
    this.patrolRadius = 15
  }
  
  canSpawn(currentTime) {
    if (this.spawnedUnits.length >= this.maxUnits) return false
    return (currentTime - this.lastSpawn) >= this.spawnRate
  }
  
  spawnUnit(currentTime) {
    if (!this.canSpawn(currentTime)) return null
    
    this.lastSpawn = currentTime
    
    const unit = {
      id: Date.now() + Math.random(),
      position: this.position.clone(),
      spawner: this,
      health: 100,
      maxHealth: 100,
      damage: 20,
      speed: 3,
      patrolCenter: this.position.clone(),
      patrolRadius: this.patrolRadius,
      target: null,
      isDead: false,
      type: this.unitType
    }
    
    this.spawnedUnits.push(unit)
    
    return unit
  }
  
  removeUnit(unit) {
    const index = this.spawnedUnits.indexOf(unit)
    if (index > -1) {
      this.spawnedUnits.splice(index, 1)
    }
  }
  
  getSpawnedUnits() {
    return this.spawnedUnits.filter(u => !u.isDead)
  }
  
  getSpawnCooldown(currentTime) {
    const elapsed = currentTime - this.lastSpawn
    return Math.max(0, this.spawnRate - elapsed)
  }
  
  upgrade() {
    super.upgrade()
    this.spawnRate *= 0.9 // Faster spawning
    this.maxUnits += 1
    this.patrolRadius += 5
  }
}

