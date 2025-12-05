// In-memory matchmaking queue and match management
import taskService from './taskService.js';
import publicDatabaseService from './publicDatabaseService.js';
import matchHistoryService from './matchHistoryService.js';
import { v4 as uuidv4 } from 'uuid';

class MatchmakingService {
  constructor() {
    this.queue = []
    this.matches = new Map() // matchId -> Match (in-memory cache)
    this.playerToMatch = new Map() // playerId -> matchId
  }

  // Validate that a user exists in the database
  async validateUser(userId) {
    if (!publicDatabaseService.isAvailable()) {
      console.warn('Database not available, skipping user validation')
      return true
    }
    
    try {
      // Use getProfile to check if user exists
      const profile = await publicDatabaseService.getProfile(userId)
      if (!profile) {
        console.warn(`User profile ${userId} not found in database`)
        return false
      }
      return true
    } catch (error) {
      console.error(`Error validating user ${userId}:`, error)
      // If error is "not found", user doesn't exist
      if (error.message?.includes('not found') || error.code === 'PGRST116') {
        return false
      }
      // For other errors, allow the match to proceed
      return true
    }
  }

  // Add player to queue
  async joinQueue(playerId, playerData) {
    // Validate user exists in database
    const isValidUser = await this.validateUser(playerId)
    if (!isValidUser) {
      console.warn(`Rejected queue join - user ${playerId} not found in database`)
      return { matched: false, error: 'User not found in database' }
    }
    
    // Remove from queue if already there
    this.queue = this.queue.filter(p => p.id !== playerId)
    
    this.queue.push({
      id: playerId,
      ...playerData,
      queuedAt: Date.now(),
      validated: true
    })

    console.log(`Player ${playerId} joined queue. Queue size: ${this.queue.length}`)
    
    // Try to match
    return await this.tryMatch()
  }

  // Remove player from queue
  leaveQueue(playerId) {
    this.queue = this.queue.filter(p => p.id !== playerId)
    console.log(`Player ${playerId} left queue. Queue size: ${this.queue.length}`)
  }

  // Try to create a match if 2+ players in queue
  async tryMatch() {
    if (this.queue.length >= 2) {
      const player1 = this.queue.shift()
      const player2 = this.queue.shift()

      const match = await this.createMatch(player1, player2)
      return { matched: true, match }
    }
    return { matched: false }
  }

  // Create a new match
  async createMatch(player1, player2) {
    const matchId = uuidv4()
    
    // Calculate task buffs for each player
    const player1Buffs = await taskService.calculateTaskBuffs(player1.id)
    const player2Buffs = await taskService.calculateTaskBuffs(player2.id)
    
    const initialBaseHp1 = 1000 * (1 + (player1Buffs.baseHpBonusPercent / 100))
    const initialBaseHp2 = 1000 * (1 + (player2Buffs.baseHpBonusPercent / 100))
    const initialEnergy1 = 50 + player1Buffs.startingEnergyBonus
    const initialEnergy2 = 50 + player2Buffs.startingEnergyBonus
    
    const matchData = {
      id: matchId,
      player1_id: player1.id,
      player2_id: player2.id,
      status: 'waiting', // waiting -> briefing -> running -> finished
      start_time: null,
      end_time: null,
      winner_id: null,
      match_type: '1v1',
      game_state: {
        mapSeed: Math.floor(Math.random() * 1000000),
        player1: {
          baseHp: initialBaseHp1,
          energy: initialEnergy1,
          towers: [],
          consecutivePassCount: 0,
          codingScore: 0,
          taskBuffs: player1Buffs,
          bonusTowerSlots: player1Buffs.bonusTowerSlots
        },
        player2: {
          baseHp: initialBaseHp2,
          energy: initialEnergy2,
          towers: [],
          consecutivePassCount: 0,
          codingScore: 0,
          taskBuffs: player2Buffs,
          bonusTowerSlots: player2Buffs.bonusTowerSlots
        },
        wave: 0,
        enemies: [],
        projectiles: []
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Save to database if available
    if (publicDatabaseService.isAvailable()) {
      try {
        await publicDatabaseService.createMatch(matchData)
      } catch (error) {
        console.error('Error saving match to database:', error)
        // Continue even if database save fails
      }
    }

    // Also store in memory for quick access
    const match = {
      id: matchId,
      players: [
        { id: player1.id, ...player1 },
        { id: player2.id, ...player2 }
      ],
      state: 'waiting',
      startTime: null,
      mapSeed: matchData.game_state.mapSeed,
      gameState: matchData.game_state,
      submissions: [],
      createdAt: matchData.created_at
    }

    this.matches.set(matchId, match)
    this.playerToMatch.set(player1.id, matchId)
    this.playerToMatch.set(player2.id, matchId)

    console.log(`Match created: ${matchId} between ${player1.id} and ${player2.id}`)
    return match
  }


  // Get match by ID
  getMatch(matchId) {
    return this.matches.get(matchId)
  }

  // Get match by player ID
  getMatchByPlayer(playerId) {
    const matchId = this.playerToMatch.get(playerId)
    return matchId ? this.matches.get(matchId) : null
  }

  // Update match state
  async updateMatch(matchId, updates) {
    const match = this.matches.get(matchId)
    if (match) {
      const oldState = match.state
      Object.assign(match, updates)
      this.matches.set(matchId, match)

      // Check if match just finished - record history
      const newState = updates.state || updates.status || match.state
      const winnerId = updates.winnerId || updates.winner_id || match.winnerId
      
      if ((oldState !== 'finished' && newState === 'finished') && winnerId) {
        // Match just finished - record history
        try {
          const matchData = {
            id: matchId,
            player1_id: match.players?.[0]?.id || match.player1_id,
            player2_id: match.players?.[1]?.id || match.player2_id,
            start_time: match.startTime || match.start_time,
            game_state: match.gameState || match.game_state,
            winner_id: winnerId,
          }
          await matchHistoryService.recordMatchEnd(matchData, winnerId)
        } catch (error) {
          console.error('Error recording match history:', error)
          // Continue even if history recording fails
        }
      }

      // Update in database if available
      if (publicDatabaseService.isAvailable()) {
        try {
          const dbUpdates = {
            status: newState,
            start_time: updates.startTime || updates.start_time || match.startTime,
            end_time: updates.endTime || updates.end_time || match.endTime,
            winner_id: winnerId,
            game_state: updates.gameState || updates.game_state || match.gameState,
            updated_at: new Date().toISOString()
          }

          await publicDatabaseService.updateMatch(matchId, dbUpdates)
        } catch (error) {
          console.error('Error updating match in database:', error)
          // Continue even if database update fails
        }
      }
    }
    return match
  }

  // Remove match
  removeMatch(matchId) {
    const match = this.matches.get(matchId)
    if (match) {
      match.players.forEach(p => this.playerToMatch.delete(p.id))
      this.matches.delete(matchId)
    }
  }

  // Load match from database (useful for recovery)
  async loadMatchFromDatabase(matchId) {
    if (!publicDatabaseService.isAvailable()) {
      return null
    }

    try {
      const matchData = await publicDatabaseService.getMatch(matchId)
      if (!matchData) return null

      // Convert database format to in-memory format
      const match = {
        id: matchData.id,
        players: [
          { id: matchData.player1_id },
          { id: matchData.player2_id }
        ],
        state: matchData.status,
        startTime: matchData.start_time,
        mapSeed: matchData.game_state?.mapSeed || Math.floor(Math.random() * 1000000),
        gameState: matchData.game_state || {},
        submissions: [],
        createdAt: matchData.created_at
      }

      this.matches.set(matchId, match)
      this.playerToMatch.set(matchData.player1_id, matchId)
      this.playerToMatch.set(matchData.player2_id, matchId)

      return match
    } catch (error) {
      console.error('Error loading match from database:', error)
      return null
    }
  }
}

export default new MatchmakingService()

