// Robust Multiplayer Service with Reconnection, State Sync, and Error Handling
import matchmakingService from './matchmakingService.js'
import enhancedGameService from './enhancedGameService.js'
import progressionService from './progressionService.js'
import matchHistoryService from './matchHistoryService.js'
import logger from '../utils/logger.js'

class MultiplayerService {
  constructor() {
    this.activeMatches = new Map() // matchId -> MatchState
    this.playerSessions = new Map() // playerId -> SessionInfo
    this.matchUpdateInterval = null
    this.updateRate = 60 // Updates per second (60 FPS)
    this.reconnectTimeouts = new Map() // playerId -> timeout
    this.maxReconnectTime = 30000 // 30 seconds
  }

  // Initialize match with enhanced state management
  async initializeMatch(matchId, player1Id, player2Id) {
    try {
      const match = matchmakingService.getMatch(matchId)
      if (!match) {
        throw new Error(`Match ${matchId} not found`)
      }

      // Initialize enhanced game state
      await enhancedGameService.initializeMatch(matchId, player1Id, player2Id)

      // Create match state for synchronization
      const matchState = {
        matchId,
        player1Id,
        player2Id,
        state: 'briefing',
        lastUpdate: Date.now(),
        updateSequence: 0,
        playerStates: {
          [player1Id]: {
            connected: true,
            lastPing: Date.now(),
            ready: false,
            reconnecting: false
          },
          [player2Id]: {
            connected: true,
            lastPing: Date.now(),
            ready: false,
            reconnecting: false
          }
        },
        gameState: match.gameState,
        pendingActions: []
      }

      this.activeMatches.set(matchId, matchState)

      // Track player sessions
      this.playerSessions.set(player1Id, { matchId, playerIndex: 1 })
      this.playerSessions.set(player2Id, { matchId, playerIndex: 2 })

      logger.info(`Match ${matchId} initialized for players ${player1Id} and ${player2Id}`)
      return matchState
    } catch (error) {
      logger.error(`Error initializing match ${matchId}:`, error)
      throw error
    }
  }

  // Handle player connection
  handlePlayerConnect(playerId, socketId) {
    const session = this.playerSessions.get(playerId)
    if (!session) return

    const matchState = this.activeMatches.get(session.matchId)
    if (!matchState) return

    const playerState = matchState.playerStates[playerId]
    if (playerState) {
      playerState.connected = true
      playerState.lastPing = Date.now()
      playerState.reconnecting = false
      playerState.socketId = socketId

      // Clear reconnect timeout
      if (this.reconnectTimeouts.has(playerId)) {
        clearTimeout(this.reconnectTimeouts.get(playerId))
        this.reconnectTimeouts.delete(playerId)
      }

      logger.info(`Player ${playerId} connected to match ${session.matchId}`)
    }
  }

  // Handle player disconnection
  handlePlayerDisconnect(playerId) {
    const session = this.playerSessions.get(playerId)
    if (!session) return

    const matchState = this.activeMatches.get(session.matchId)
    if (!matchState) return

    const playerState = matchState.playerStates[playerId]
    if (playerState) {
      playerState.connected = false
      playerState.reconnecting = true

      // Set reconnect timeout
      const timeout = setTimeout(() => {
        this.handlePlayerTimeout(playerId)
      }, this.maxReconnectTime)

      this.reconnectTimeouts.set(playerId, timeout)
      logger.warn(`Player ${playerId} disconnected from match ${session.matchId}`)
    }
  }

  // Handle player timeout (didn't reconnect in time)
  handlePlayerTimeout(playerId) {
    const session = this.playerSessions.get(playerId)
    if (!session) return

    const matchState = this.activeMatches.get(session.matchId)
    if (!matchState) return

    // End match - other player wins
    const opponentId = matchState.player1Id === playerId 
      ? matchState.player2Id 
      : matchState.player1Id

    this.endMatch(session.matchId, opponentId, 'timeout')
    logger.warn(`Player ${playerId} timed out in match ${session.matchId}`)
  }

  // Update match state (called at fixed intervals)
  updateMatch(matchId, deltaTime) {
    const matchState = this.activeMatches.get(matchId)
    if (!matchState || matchState.state !== 'running') return

    try {
      // Update game state (includes automatic wave spawning)
      const updatedState = enhancedGameService.updateGameState(matchId, deltaTime)
      if (updatedState) {
        matchState.gameState = updatedState
        matchState.lastUpdate = Date.now()
        matchState.updateSequence++

        // Check for match end
        const match = matchmakingService.getMatch(matchId)
        if (match && match.state === 'finished') {
          this.endMatch(matchId, match.winner, 'base_destroyed')
        }
      }
    } catch (error) {
      logger.error(`Error updating match ${matchId}:`, error)
    }
  }

  // Process player action (tower placement, unit deployment, etc.)
  processPlayerAction(matchId, playerId, action) {
    const matchState = this.activeMatches.get(matchId)
    if (!matchState) {
      throw new Error(`Match ${matchId} not found`)
    }

    const playerState = matchState.playerStates[playerId]
    if (!playerState || !playerState.connected) {
      throw new Error(`Player ${playerId} not connected`)
    }

    // Validate action
    if (!this.validateAction(action, matchState, playerId)) {
      throw new Error('Invalid action')
    }

    // Add to pending actions (will be processed in next update)
    action.playerId = playerId
    action.timestamp = Date.now()
    action.sequence = matchState.updateSequence
    matchState.pendingActions.push(action)

    return { success: true, sequence: action.sequence }
  }

  // Validate player action
  validateAction(action, matchState, playerId) {
    const { type, data } = action

    switch (type) {
      case 'place_tower':
        return this.validateTowerPlacement(data, matchState, playerId)
      case 'deploy_unit':
        return this.validateUnitDeployment(data, matchState, playerId)
      case 'upgrade_tower':
        return this.validateTowerUpgrade(data, matchState, playerId)
      case 'use_ability':
        return this.validateAbilityUse(data, matchState, playerId)
      default:
        return false
    }
  }

  validateTowerPlacement(data, matchState, playerId) {
    const { position, towerType } = data
    if (!position || !towerType) return false

    // Check if player has enough gold
    const playerState = matchState.gameState[`player${this.getPlayerIndex(matchState, playerId)}`]
    if (!playerState) return false

    // Get tower cost from config
    const towerConfig = this.getTowerConfig(towerType)
    if (!towerConfig || playerState.gold < towerConfig.cost) return false

    // Check if position is valid (not overlapping, within bounds, etc.)
    return this.isValidPlacement(position, matchState, playerId)
  }

  validateUnitDeployment(data, matchState, playerId) {
    const { unitType, position } = data
    if (!unitType || !position) return false

    const playerState = matchState.gameState[`player${this.getPlayerIndex(matchState, playerId)}`]
    if (!playerState) return false

    // Check if unit type is available
    if (!playerState.availableUnits || !playerState.availableUnits.includes(unitType)) {
      return false
    }

    // Check cost
    const unitConfig = this.getUnitConfig(unitType)
    if (!unitConfig || playerState.gold < unitConfig.cost) return false

    return true
  }

  validateTowerUpgrade(data, matchState, playerId) {
    const { towerId } = data
    if (!towerId) return false

    const playerState = matchState.gameState[`player${this.getPlayerIndex(matchState, playerId)}`]
    if (!playerState || !playerState.towers) return false

    const tower = playerState.towers.find(t => t.id === towerId)
    if (!tower) return false

    // Check upgrade cost
    const upgradeCost = this.getUpgradeCost(tower)
    if (playerState.gold < upgradeCost) return false

    return true
  }

  validateAbilityUse(data, matchState, playerId) {
    const { abilityType } = data
    if (!abilityType) return false

    const playerState = matchState.gameState[`player${this.getPlayerIndex(matchState, playerId)}`]
    if (!playerState) return false

    // Check if ability is available and off cooldown
    return this.isAbilityAvailable(abilityType, playerState)
  }

  // Helper methods
  getPlayerIndex(matchState, playerId) {
    return matchState.player1Id === playerId ? 1 : 2
  }

  getTowerConfig(towerType) {
    // This should import from a shared config
    const configs = {
      gattling: { cost: 50 },
      missile: { cost: 150 },
      laser: { cost: 200 },
      sniper: { cost: 120 },
      frost: { cost: 100 },
      fire: { cost: 100 },
      tesla: { cost: 180 }
    }
    return configs[towerType]
  }

  getUnitConfig(unitType) {
    const configs = {
      soldier: { cost: 50 },
      archer: { cost: 75 },
      knight: { cost: 100 },
      mage: { cost: 125 }
    }
    return configs[unitType]
  }

  getUpgradeCost(tower) {
    return Math.floor(tower.cost * 0.5) // 50% of original cost
  }

  isValidPlacement(position, matchState, playerId) {
    // Check bounds, overlaps, etc.
    // Simplified for now
    return position.x >= -50 && position.x <= 50 && 
           position.z >= -50 && position.z <= 50
  }

  isAbilityAvailable(abilityType, playerState) {
    // Check cooldowns, etc.
    return true // Simplified
  }

  // Get match state for client synchronization
  getMatchState(matchId, playerId, lastSequence = -1) {
    const matchState = this.activeMatches.get(matchId)
    if (!matchState) return null

    // Only send updates if client is behind
    if (lastSequence >= matchState.updateSequence) {
      return { upToDate: true }
    }

    // Get actions since last sequence
    const newActions = matchState.pendingActions.filter(
      action => action.sequence > lastSequence && action.playerId !== playerId
    )

    return {
      gameState: matchState.gameState,
      updateSequence: matchState.updateSequence,
      newActions,
      playerStates: matchState.playerStates,
      timestamp: matchState.lastUpdate
    }
  }

  // End match and clean up
  async endMatch(matchId, winnerId, reason = 'base_destroyed') {
    const matchState = this.activeMatches.get(matchId)
    if (!matchState) return

    try {
      const match = matchmakingService.getMatch(matchId)
      if (match) {
        match.state = 'finished'
        match.winner_id = winnerId
        match.end_time = new Date().toISOString()

        // Save match history
        await matchHistoryService.saveMatchHistory(match, matchState.gameState)

        // Award rewards
        await this.awardMatchRewards(matchId, winnerId, matchState)
      }

      // Clean up
      this.activeMatches.delete(matchId)
      if (matchState.player1Id) this.playerSessions.delete(matchState.player1Id)
      if (matchState.player2Id) this.playerSessions.delete(matchState.player2Id)

      logger.info(`Match ${matchId} ended. Winner: ${winnerId}, Reason: ${reason}`)
    } catch (error) {
      logger.error(`Error ending match ${matchId}:`, error)
    }
  }

  // Award rewards to players
  async awardMatchRewards(matchId, winnerId, matchState) {
    try {
      const match = matchmakingService.getMatch(matchId)
      if (!match) return

      const winnerState = matchState.gameState[`player${this.getPlayerIndex(matchState, winnerId)}`]
      const loserId = matchState.player1Id === winnerId 
        ? matchState.player2Id 
        : matchState.player1Id

      // Calculate rewards
      const winnerRewards = {
        xp: 100 + (winnerState.problemsSolved * 20),
        gold: 50 + (winnerState.codingScore * 0.5),
        wins: 1
      }

      const loserRewards = {
        xp: 30 + (matchState.gameState[`player${this.getPlayerIndex(matchState, loserId)}`].problemsSolved * 10),
        gold: 20,
        losses: 1
      }

      // Update progression
      await progressionService.addXP(winnerId, winnerRewards.xp)
      await progressionService.addXP(loserId, loserRewards.xp)

      logger.info(`Awarded rewards: Winner ${winnerId} - ${JSON.stringify(winnerRewards)}`)
    } catch (error) {
      logger.error(`Error awarding match rewards:`, error)
    }
  }

  // Start match update loop
  startMatchUpdates() {
    if (this.matchUpdateInterval) return

    const updateInterval = 1000 / this.updateRate // ~16.67ms for 60 FPS
    this.matchUpdateInterval = setInterval(() => {
      const deltaTime = updateInterval / 1000 // Convert to seconds

      this.activeMatches.forEach((matchState, matchId) => {
        if (matchState.state === 'running') {
          this.updateMatch(matchId, deltaTime)
        }
      })
    }, updateInterval)

    logger.info('Match update loop started')
  }

  // Stop match update loop
  stopMatchUpdates() {
    if (this.matchUpdateInterval) {
      clearInterval(this.matchUpdateInterval)
      this.matchUpdateInterval = null
      logger.info('Match update loop stopped')
    }
  }

  // Get match status
  getMatchStatus(matchId) {
    const matchState = this.activeMatches.get(matchId)
    if (!matchState) return null

    return {
      matchId,
      state: matchState.state,
      playersConnected: Object.values(matchState.playerStates).filter(p => p.connected).length,
      updateSequence: matchState.updateSequence,
      lastUpdate: matchState.lastUpdate
    }
  }
}

// Export singleton
const multiplayerService = new MultiplayerService()

// Start update loop on initialization
multiplayerService.startMatchUpdates()

export default multiplayerService

