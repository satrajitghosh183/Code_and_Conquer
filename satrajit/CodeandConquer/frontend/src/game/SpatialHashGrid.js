import * as THREE from 'three'

export class SpatialHashGrid {
  constructor(cellSize = 10) {
    this.cellSize = cellSize
    this.grid = new Map()
  }
  
  getCellKey(position) {
    const x = Math.floor(position.x / this.cellSize)
    const z = Math.floor(position.z / this.cellSize)
    return `${x},${z}`
  }
  
  getCellsInRadius(position, radius) {
    const cells = new Set()
    const minX = Math.floor((position.x - radius) / this.cellSize)
    const maxX = Math.floor((position.x + radius) / this.cellSize)
    const minZ = Math.floor((position.z - radius) / this.cellSize)
    const maxZ = Math.floor((position.z + radius) / this.cellSize)
    
    for (let x = minX; x <= maxX; x++) {
      for (let z = minZ; z <= maxZ; z++) {
        cells.add(`${x},${z}`)
      }
    }
    
    return Array.from(cells)
  }
  
  insert(entity) {
    if (!entity.position) return
    
    const cellKey = this.getCellKey(entity.position)
    
    if (!this.grid.has(cellKey)) {
      this.grid.set(cellKey, [])
    }
    
    const cell = this.grid.get(cellKey)
    if (!cell.includes(entity)) {
      cell.push(entity)
      entity._gridCell = cellKey
    }
  }
  
  remove(entity) {
    if (!entity._gridCell) return
    
    const cell = this.grid.get(entity._gridCell)
    if (cell) {
      const index = cell.indexOf(entity)
      if (index > -1) {
        cell.splice(index, 1)
      }
      
      // Clean up empty cells
      if (cell.length === 0) {
        this.grid.delete(entity._gridCell)
      }
    }
    
    delete entity._gridCell
  }
  
  update(entity) {
    if (!entity.position) return
    
    const newCellKey = this.getCellKey(entity.position)
    
    // Only update if cell changed
    if (entity._gridCell !== newCellKey) {
      this.remove(entity)
      this.insert(entity)
    }
  }
  
  getNearby(position, radius) {
    const nearby = []
    const cells = this.getCellsInRadius(position, radius)
    
    cells.forEach(cellKey => {
      if (this.grid.has(cellKey)) {
        const cell = this.grid.get(cellKey)
        cell.forEach(entity => {
          if (entity.position) {
            const distance = position.distanceTo(entity.position)
            if (distance <= radius) {
              nearby.push({ entity, distance })
            }
          }
        })
      }
    })
    
    return nearby
  }
  
  getEntitiesInCell(cellKey) {
    return this.grid.get(cellKey) || []
  }
  
  clear() {
    this.grid.clear()
  }
  
  getStats() {
    let totalEntities = 0
    this.grid.forEach(cell => {
      totalEntities += cell.length
    })
    
    return {
      cellCount: this.grid.size,
      totalEntities
    }
  }
}

