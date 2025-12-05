import * as THREE from 'three'

/**
 * Centralizes enemy lanes and waypoint management.
 * Supports multiple spline/waypoint paths, visualizes lanes,
 * and exposes helpers for AI to reason about path coverage.
 */
export class PathManager {
  constructor(scene, basePosition, options = {}) {
    this.scene = scene
    this.basePosition = basePosition
    this.customSpawnZ = options.spawnZ
    this.paths = new Map()
    this.pathVisuals = []
    this.defaultColors = [0x5be7a9, 0x5bb2e7, 0xff8844, 0xffdd55]

    const customPaths = options.paths || null
    if (customPaths && Array.isArray(customPaths)) {
      customPaths.forEach((p, i) => this.registerPath({ ...p, color: p.color || this.defaultColors[i % this.defaultColors.length] }))
    } else {
      this._registerDefaultPaths()
    }

    if (options.visualize !== false) {
      this.createVisuals()
    }
  }

  _registerDefaultPaths() {
    const zStart = this.customSpawnZ !== undefined ? this.customSpawnZ : 45
    const zBase = this.basePosition?.z ?? -25

    const defaults = [
      {
        id: 'center',
        spawn: new THREE.Vector3(0, 0.5, zStart),
        waypoints: [
          new THREE.Vector3(0, 0.5, zStart),
          new THREE.Vector3(10, 0.5, 28),
          new THREE.Vector3(0, 0.5, 8),
          new THREE.Vector3(0, 0.5, zBase)
        ],
        color: this.defaultColors[0]
      },
      {
        id: 'left',
        spawn: new THREE.Vector3(-16, 0.5, zStart),
        waypoints: [
          new THREE.Vector3(-16, 0.5, zStart),
          new THREE.Vector3(-22, 0.5, 24),
          new THREE.Vector3(-12, 0.5, 6),
          new THREE.Vector3(-4, 0.5, zBase)
        ],
        color: this.defaultColors[1]
      },
      {
        id: 'right',
        spawn: new THREE.Vector3(16, 0.5, zStart),
        waypoints: [
          new THREE.Vector3(16, 0.5, zStart),
          new THREE.Vector3(22, 0.5, 18),
          new THREE.Vector3(12, 0.5, -2),
          new THREE.Vector3(4, 0.5, zBase)
        ],
        color: this.defaultColors[2]
      }
    ]

    defaults.forEach(p => this.registerPath(p))
  }

  registerPath({ id, waypoints, spawn, color = 0xffffff }) {
    if (!id || !waypoints || waypoints.length === 0) return
    const safeWaypoints = waypoints.map(p => new THREE.Vector3(p.x, p.y ?? 0.5, p.z))
    const spawnPoint = spawn ? new THREE.Vector3(spawn.x, spawn.y ?? 0.5, spawn.z) : safeWaypoints[0].clone()

    this.paths.set(id, {
      id,
      waypoints: safeWaypoints,
      spawn: spawnPoint,
      color
    })
  }

  getPath(id) {
    return this.paths.get(id) || null
  }

  getAllPathIds() {
    return Array.from(this.paths.keys())
  }

  getRandomPath(preferredIds = null) {
    const ids = this.getAllPathIds()
    if (preferredIds && preferredIds.length > 0) {
      const filtered = ids.filter(id => preferredIds.includes(id))
      if (filtered.length > 0) return this.paths.get(filtered[Math.floor(Math.random() * filtered.length)])
    }
    return this.paths.get(ids[Math.floor(Math.random() * ids.length)])
  }

  /**
   * Estimate coverage for each path based on nearby towers.
   * Returns lower score for weaker (less covered) lanes.
   */
  getCoverageScores(towers = []) {
    const scores = {}
    this.paths.forEach((path, id) => { scores[id] = 0 })

    towers.forEach(tower => {
      this.paths.forEach((path, id) => {
        const dist = this._distanceToPath(tower.position, path.waypoints)
        if (dist <= (tower.range || 0)) {
          const contribution = Math.max(0.1, (tower.range - dist))
          scores[id] += contribution
        }
      })
    })
    return scores
  }

  getWeakestPaths(towers = []) {
    const scores = this.getCoverageScores(towers)
    const minScore = Math.min(...Object.values(scores))
    return Object.keys(scores).filter(id => scores[id] === minScore)
  }

  isPointNearAnyPath(point, buffer = 3) {
    for (const path of this.paths.values()) {
      if (this._distanceToPath(point, path.waypoints) <= buffer) {
        return true
      }
    }
    return false
  }

  createVisuals() {
    if (!this.scene) return

    // Clear old visuals
    this.pathVisuals.forEach(obj => this.scene.remove(obj))
    this.pathVisuals = []

    this.paths.forEach((path) => {
      const points = path.waypoints.map(p => new THREE.Vector3(p.x, 0.12, p.z))
      const geometry = new THREE.BufferGeometry().setFromPoints(points)
      const material = new THREE.LineBasicMaterial({
        color: path.color,
        linewidth: 2,
        transparent: true,
        opacity: 0.7
      })
      const line = new THREE.Line(geometry, material)
      this.scene.add(line)
      this.pathVisuals.push(line)

      // Spawn ring
      const spawnGeom = new THREE.RingGeometry(2.6, 3.4, 24)
      const spawnMat = new THREE.MeshBasicMaterial({
        color: path.color,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide
      })
      const spawnRing = new THREE.Mesh(spawnGeom, spawnMat)
      spawnRing.rotation.x = -Math.PI / 2
      spawnRing.position.copy(path.spawn)
      spawnRing.position.y = 0.08
      this.scene.add(spawnRing)
      this.pathVisuals.push(spawnRing)

      // Waypoint markers
      path.waypoints.forEach((wp, i) => {
        const markerGeom = new THREE.SphereGeometry(i === path.waypoints.length - 1 ? 0.45 : 0.32, 10, 10)
        const markerMat = new THREE.MeshBasicMaterial({
          color: i === path.waypoints.length - 1 ? 0xff3344 : path.color,
          transparent: true,
          opacity: 0.55
        })
        const marker = new THREE.Mesh(markerGeom, markerMat)
        marker.position.set(wp.x, 0.18, wp.z)
        this.scene.add(marker)
        this.pathVisuals.push(marker)
      })
    })
  }

  _distanceToPath(point, waypoints) {
    let minDist = Infinity
    for (let i = 0; i < waypoints.length - 1; i++) {
      const start = waypoints[i]
      const end = waypoints[i + 1]
      const dist = this._distanceToSegment(point, start, end)
      minDist = Math.min(minDist, dist)
    }
    return minDist
  }

  _distanceToSegment(p, a, b) {
    const ab = new THREE.Vector3().subVectors(b, a)
    const ap = new THREE.Vector3().subVectors(p, a)
    const t = Math.max(0, Math.min(1, ap.dot(ab) / ab.lengthSq()))
    const projection = new THREE.Vector3().copy(a).add(ab.multiplyScalar(t))
    return p.distanceTo(projection)
  }
}

export default PathManager

