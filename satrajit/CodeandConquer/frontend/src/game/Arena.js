// Arena System - Grid-based map with A* pathfinding
// Integrated from dabbott/towerdefense

import { aStar } from './AStar.js'

export class Arena {
  constructor(width = 24, height = 16, buildableWidth = 20, buildableHeight = 10) {
    this.fullW = width
    this.fullH = height
    this.w = buildableWidth
    this.h = buildableHeight
    
    this.cellSize = 5 // World units per cell
    
    // Initialize buildable grid
    this.grid = []
    for (let r = 0; r < this.h; r++) {
      this.grid[r] = []
      for (let c = 0; c < this.w; c++) {
        this.grid[r][c] = {
          tower: null,
          wall: null,
          coord: [r, c],
          walkable: true
        }
      }
    }
    
    // Initialize full grid (including borders)
    this.full = []
    for (let r = 0; r < this.fullH; r++) {
      this.full[r] = []
      for (let c = 0; c < this.fullW; c++) {
        const ref = this.fullToNormal([r, c])
        if (ref !== null) {
          this.full[r][c] = this.grid[ref[0]][ref[1]]
        } else {
          // Border cells - only allow path at spawn/destination
          const isPath = (r === 7 || r === 8) && (c === 0 || c === 1 || c === 22 || c === 23)
          this.full[r][c] = {
            tower: isPath ? null : true, // true means blocked
            wall: null,
            walkable: isPath
          }
        }
      }
    }
    
    // Define spawn and destination points
    this.start = [7, 0]
    this.destination = [7, 23]
  }
  
  // Convert coordinates from the full arena to the buildable area
  fullToNormal(coord) {
    const r = coord[0]
    const c = coord[1]
    
    if (r < 3 || r > 12 || c < 2 || c > 21) {
      return null
    }
    
    return [r - 3, c - 2]
  }
  
  // Converts coordinates from the buildable area to the full arena
  normalToFull(coord) {
    return [coord[0] + 3, coord[1] + 2]
  }
  
  // Get square at coordinate
  square(coord) {
    return this.grid[coord[0]][coord[1]]
  }
  
  // Get tower at coordinate
  tower(coord) {
    return this.square(coord)?.tower
  }
  
  // Convert grid coordinate to world position
  gridToWorld(coord) {
    // Center of the cell in world coordinates
    const offsetX = -(this.fullW * this.cellSize) / 2
    const offsetZ = -(this.fullH * this.cellSize) / 2
    
    return {
      x: coord[1] * this.cellSize + offsetX + this.cellSize / 2,
      z: coord[0] * this.cellSize + offsetZ + this.cellSize / 2,
      y: 0
    }
  }
  
  // Convert world position to grid coordinate
  worldToGrid(position) {
    const offsetX = -(this.fullW * this.cellSize) / 2
    const offsetZ = -(this.fullH * this.cellSize) / 2
    
    return [
      Math.floor((position.z - offsetZ) / this.cellSize),
      Math.floor((position.x - offsetX) / this.cellSize)
    ]
  }
  
  // Check if a coordinate is valid for building
  canBuild(coord) {
    if (coord[0] < 0 || coord[0] >= this.h || coord[1] < 0 || coord[1] >= this.w) {
      return false
    }
    
    const cell = this.grid[coord[0]][coord[1]]
    return cell && !cell.tower && !cell.wall
  }
  
  // Place a structure
  placeStructure(coord, structure) {
    if (!this.canBuild(coord)) return false
    
    const cell = this.grid[coord[0]][coord[1]]
    if (structure.type === 'tower') {
      cell.tower = structure
    } else if (structure.type === 'wall') {
      cell.wall = structure
    }
    cell.walkable = false
    
    return true
  }
  
  // Remove a structure
  removeStructure(coord) {
    if (coord[0] < 0 || coord[0] >= this.h || coord[1] < 0 || coord[1] >= this.w) {
      return false
    }
    
    const cell = this.grid[coord[0]][coord[1]]
    cell.tower = null
    cell.wall = null
    cell.walkable = true
    
    return true
  }
  
  // A* pathfinding on the full arena
  findPath(start = this.start, destination = this.destination, testCoord = null) {
    // Normal case
    if (testCoord === null) {
      return aStar(start, destination, this.full, this.fullH, this.fullW)
    }
    
    // Test what would happen if a tower were added at square test
    let tested = false
    const testFull = this.normalToFull(testCoord)
    const square = this.full[testFull[0]][testFull[1]]
    
    // Temporarily alter the square
    if (!square.tower) {
      tested = true
      square.tower = true
    }
    
    const result = aStar(start, destination, this.full, this.fullH, this.fullW)
    
    // Restore square to null if it was tested
    if (tested) {
      square.tower = null
    }
    
    return result
  }
  
  // Check if building would block the path
  wouldBlockPath(coord) {
    const path = this.findPath(this.start, this.destination, coord)
    return !path || path.length === 0
  }
  
  // Get world path from grid path
  getWorldPath(gridPath) {
    if (!gridPath) return []
    
    return gridPath.map(node => {
      const world = this.gridToWorld([node.y, node.x])
      return {
        x: world.x,
        y: 0.5,
        z: world.z
      }
    })
  }
  
  // Recompute path for an enemy
  computeEnemyPath(enemy) {
    const currentGrid = enemy.next || this.start
    const path = this.findPath(currentGrid, this.destination)
    enemy.setPath(path)
  }
}

