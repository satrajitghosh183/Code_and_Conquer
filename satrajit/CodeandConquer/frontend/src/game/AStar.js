// A* Pathfinding Algorithm
// Integrated from dabbott/towerdefense

export function aStar(start, destination, grid, height, width) {
  const openList = []
  const closedList = []
  const cameFrom = {}
  
  const startNode = {
    x: start[1],
    y: start[0],
    g: 0,
    h: 0,
    f: 0
  }
  
  startNode.h = heuristic(startNode.x, startNode.y, destination[1], destination[0])
  startNode.f = startNode.g + startNode.h
  
  openList.push(startNode)
  
  while (openList.length > 0) {
    // Find node with lowest f score
    openList.sort((a, b) => a.f - b.f)
    const current = openList.shift()
    
    // Check if we reached the destination
    if (current.x === destination[1] && current.y === destination[0]) {
      return reconstructPath(cameFrom, current)
    }
    
    closedList.push(current)
    
    // Check neighbors
    const neighbors = getNeighbors(current, grid, height, width)
    
    for (const neighbor of neighbors) {
      // Skip if in closed list
      if (closedList.some(n => n.x === neighbor.x && n.y === neighbor.y)) {
        continue
      }
      
      const tentativeG = current.g + 1
      
      let neighborInOpen = openList.find(n => n.x === neighbor.x && n.y === neighbor.y)
      
      if (!neighborInOpen) {
        // Add to open list
        neighbor.g = tentativeG
        neighbor.h = heuristic(neighbor.x, neighbor.y, destination[1], destination[0])
        neighbor.f = neighbor.g + neighbor.h
        openList.push(neighbor)
        cameFrom[`${neighbor.x},${neighbor.y}`] = current
      } else if (tentativeG < neighborInOpen.g) {
        // Better path found
        neighborInOpen.g = tentativeG
        neighborInOpen.f = neighborInOpen.g + neighborInOpen.h
        cameFrom[`${neighbor.x},${neighbor.y}`] = current
      }
    }
  }
  
  // No path found
  return null
}

function heuristic(x1, y1, x2, y2) {
  // Manhattan distance
  return Math.abs(x1 - x2) + Math.abs(y1 - y2)
}

function getNeighbors(node, grid, height, width) {
  const neighbors = []
  const directions = [
    [0, 1],   // right
    [1, 0],   // down
    [0, -1],  // left
    [-1, 0]   // up
  ]
  
  for (const [dy, dx] of directions) {
    const nx = node.x + dx
    const ny = node.y + dy
    
    // Check bounds
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
      continue
    }
    
    // Check if walkable (no tower or wall blocking)
    const cell = grid[ny][nx]
    if (cell && !cell.tower && !cell.wall && cell.walkable !== false) {
      neighbors.push({ x: nx, y: ny, g: 0, h: 0, f: 0 })
    }
  }
  
  return neighbors
}

function reconstructPath(cameFrom, current) {
  const path = [current]
  let key = `${current.x},${current.y}`
  
  while (cameFrom[key]) {
    current = cameFrom[key]
    path.unshift(current)
    key = `${current.x},${current.y}`
  }
  
  return path
}

