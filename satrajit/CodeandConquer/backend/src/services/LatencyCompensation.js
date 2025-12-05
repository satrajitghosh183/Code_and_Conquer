// =============================================================================
// LATENCY COMPENSATION SYSTEM
// Features: Client-side prediction, server reconciliation, lag compensation
// =============================================================================

import logger from '../utils/logger.js'

class LatencyCompensationService {
  constructor() {
    // Player latency tracking
    this.playerLatencies = new Map() // playerId -> { latency, jitter, samples }
    
    // Input history for reconciliation
    this.inputHistory = new Map() // playerId -> [ { sequence, input, timestamp } ]
    this.maxHistorySize = 120 // 2 seconds at 60 FPS
    
    // State snapshots for interpolation
    this.stateSnapshots = new Map() // matchId -> [ { timestamp, state, sequence } ]
    this.maxSnapshotCount = 60 // 1 second at 60 FPS
    
    // Configuration
    this.config = {
      minLatencyForPrediction: 50, // ms
      maxPredictionTime: 200, // ms
      interpolationDelay: 100, // ms
      snapshotRate: 60 // updates per second
    }
  }
  
  // =========================================================================
  // LATENCY MEASUREMENT
  // =========================================================================
  
  updatePlayerLatency(playerId, latency) {
    if (!this.playerLatencies.has(playerId)) {
      this.playerLatencies.set(playerId, {
        current: latency,
        average: latency,
        jitter: 0,
        samples: [latency],
        lastUpdate: Date.now()
      })
      return
    }
    
    const data = this.playerLatencies.get(playerId)
    
    // Add sample
    data.samples.push(latency)
    if (data.samples.length > 20) {
      data.samples.shift()
    }
    
    // Calculate average
    data.average = data.samples.reduce((a, b) => a + b, 0) / data.samples.length
    
    // Calculate jitter (variance in latency)
    const variance = data.samples.reduce((acc, val) => {
      return acc + Math.pow(val - data.average, 2)
    }, 0) / data.samples.length
    data.jitter = Math.sqrt(variance)
    
    data.current = latency
    data.lastUpdate = Date.now()
    
    logger.debug(`Player ${playerId} latency: ${latency}ms (avg: ${Math.round(data.average)}ms, jitter: ${Math.round(data.jitter)}ms)`)
  }
  
  getPlayerLatency(playerId) {
    const data = this.playerLatencies.get(playerId)
    return data ? data.average : 0
  }
  
  getPlayerJitter(playerId) {
    const data = this.playerLatencies.get(playerId)
    return data ? data.jitter : 0
  }
  
  // =========================================================================
  // CLIENT-SIDE PREDICTION
  // =========================================================================
  
  storePlayerInput(playerId, input, sequence, timestamp) {
    if (!this.inputHistory.has(playerId)) {
      this.inputHistory.set(playerId, [])
    }
    
    const history = this.inputHistory.get(playerId)
    
    // Store input
    history.push({
      sequence,
      input: { ...input },
      timestamp
    })
    
    // Trim old history
    if (history.length > this.maxHistorySize) {
      history.shift()
    }
  }
  
  getPlayerInputsSince(playerId, sequence) {
    const history = this.inputHistory.get(playerId)
    if (!history) return []
    
    return history.filter(entry => entry.sequence > sequence)
  }
  
  clearPlayerInputsBefore(playerId, sequence) {
    const history = this.inputHistory.get(playerId)
    if (!history) return
    
    const index = history.findIndex(entry => entry.sequence > sequence)
    if (index > 0) {
      history.splice(0, index)
    }
  }
  
  // =========================================================================
  // SERVER RECONCILIATION
  // =========================================================================
  
  reconcilePlayerState(playerId, clientState, serverState, lastAcknowledgedSequence) {
    // Get inputs that haven't been acknowledged by server
    const pendingInputs = this.getPlayerInputsSince(playerId, lastAcknowledgedSequence)
    
    if (pendingInputs.length === 0) {
      // No prediction needed, use server state
      return {
        state: serverState,
        needsCorrection: false
      }
    }
    
    // Simulate pending inputs on top of server state
    let predictedState = { ...serverState }
    
    for (const inputEntry of pendingInputs) {
      predictedState = this.simulateInput(predictedState, inputEntry.input)
    }
    
    // Check if client prediction matches
    const positionError = this.calculatePositionError(clientState, predictedState)
    const needsCorrection = positionError > 0.5 // 0.5 unit tolerance
    
    if (needsCorrection) {
      logger.debug(`Player ${playerId} prediction error: ${positionError.toFixed(2)} units`)
    }
    
    return {
      state: predictedState,
      needsCorrection,
      error: positionError
    }
  }
  
  simulateInput(state, input) {
    // Simple physics simulation for one input
    const newState = { ...state }
    
    // Apply movement
    if (input.movement) {
      const speed = 5 // units per second
      const deltaTime = 1 / 60 // assume 60 FPS
      
      if (input.movement.forward) {
        newState.position.z -= speed * deltaTime
      }
      if (input.movement.backward) {
        newState.position.z += speed * deltaTime
      }
      if (input.movement.left) {
        newState.position.x -= speed * deltaTime
      }
      if (input.movement.right) {
        newState.position.x += speed * deltaTime
      }
    }
    
    return newState
  }
  
  calculatePositionError(state1, state2) {
    if (!state1.position || !state2.position) return 0
    
    const dx = state1.position.x - state2.position.x
    const dy = (state1.position.y || 0) - (state2.position.y || 0)
    const dz = state1.position.z - state2.position.z
    
    return Math.sqrt(dx * dx + dy * dy + dz * dz)
  }
  
  // =========================================================================
  // STATE INTERPOLATION
  // =========================================================================
  
  storeStateSnapshot(matchId, state, sequence, timestamp) {
    if (!this.stateSnapshots.has(matchId)) {
      this.stateSnapshots.set(matchId, [])
    }
    
    const snapshots = this.stateSnapshots.get(matchId)
    
    snapshots.push({
      timestamp,
      state: this.cloneState(state),
      sequence
    })
    
    // Trim old snapshots
    if (snapshots.length > this.maxSnapshotCount) {
      snapshots.shift()
    }
  }
  
  interpolateState(matchId, renderTime) {
    const snapshots = this.stateSnapshots.get(matchId)
    if (!snapshots || snapshots.length < 2) {
      return snapshots?.[0]?.state || null
    }
    
    // Find two snapshots to interpolate between
    let from = null
    let to = null
    
    for (let i = 0; i < snapshots.length - 1; i++) {
      if (snapshots[i].timestamp <= renderTime && snapshots[i + 1].timestamp >= renderTime) {
        from = snapshots[i]
        to = snapshots[i + 1]
        break
      }
    }
    
    // If we don't have appropriate snapshots, use the latest
    if (!from || !to) {
      return snapshots[snapshots.length - 1].state
    }
    
    // Calculate interpolation factor
    const totalDelta = to.timestamp - from.timestamp
    const currentDelta = renderTime - from.timestamp
    const t = totalDelta > 0 ? currentDelta / totalDelta : 0
    
    // Interpolate state
    return this.interpolateStates(from.state, to.state, t)
  }
  
  interpolateStates(state1, state2, t) {
    // Clamp t between 0 and 1
    t = Math.max(0, Math.min(1, t))
    
    const interpolated = this.cloneState(state1)
    
    // Interpolate positions of dynamic entities
    if (state1.entities && state2.entities) {
      interpolated.entities = {}
      
      for (const entityId in state1.entities) {
        const entity1 = state1.entities[entityId]
        const entity2 = state2.entities[entityId]
        
        if (!entity2) {
          interpolated.entities[entityId] = entity1
          continue
        }
        
        interpolated.entities[entityId] = {
          ...entity1,
          position: {
            x: entity1.position.x + (entity2.position.x - entity1.position.x) * t,
            y: entity1.position.y + (entity2.position.y - entity1.position.y) * t,
            z: entity1.position.z + (entity2.position.z - entity1.position.z) * t
          },
          rotation: entity1.rotation // Don't interpolate rotation for simplicity
        }
      }
    }
    
    return interpolated
  }
  
  cloneState(state) {
    return JSON.parse(JSON.stringify(state))
  }
  
  // =========================================================================
  // LAG COMPENSATION (REWIND)
  // =========================================================================
  
  rewindToPlayerTime(matchId, playerId, action) {
    const latency = this.getPlayerLatency(playerId)
    const compensationTime = Date.now() - latency
    
    // Find snapshot closest to compensation time
    const snapshots = this.stateSnapshots.get(matchId)
    if (!snapshots || snapshots.length === 0) {
      return null
    }
    
    let closestSnapshot = snapshots[0]
    let minDiff = Math.abs(snapshots[0].timestamp - compensationTime)
    
    for (const snapshot of snapshots) {
      const diff = Math.abs(snapshot.timestamp - compensationTime)
      if (diff < minDiff) {
        minDiff = diff
        closestSnapshot = snapshot
      }
    }
    
    logger.debug(`Lag compensation for ${playerId}: rewinding ${Math.round(latency)}ms`)
    return closestSnapshot.state
  }
  
  // =========================================================================
  // ADAPTIVE SEND RATE
  // =========================================================================
  
  calculateOptimalSendRate(playerId) {
    const data = this.playerLatencies.get(playerId)
    if (!data) return this.config.snapshotRate
    
    // Reduce send rate for high latency/jitter connections
    if (data.average > 200 || data.jitter > 50) {
      return 30 // 30 updates per second
    } else if (data.average > 100 || data.jitter > 25) {
      return 45 // 45 updates per second
    }
    
    return 60 // Full 60 updates per second for good connections
  }
  
  // =========================================================================
  // CLEANUP
  // =========================================================================
  
  cleanupPlayer(playerId) {
    this.playerLatencies.delete(playerId)
    this.inputHistory.delete(playerId)
    logger.info(`Cleaned up latency compensation data for player ${playerId}`)
  }
  
  cleanupMatch(matchId) {
    this.stateSnapshots.delete(matchId)
    logger.info(`Cleaned up state snapshots for match ${matchId}`)
  }
}

// Export singleton instance
const latencyCompensation = new LatencyCompensationService()
export default latencyCompensation

