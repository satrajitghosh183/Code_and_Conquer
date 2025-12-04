/**
 * Match History Service
 * Handles match history and statistics
 */

import publicDatabaseService from './publicDatabaseService.js';
import { v4 as uuidv4 } from 'uuid';

class MatchHistoryService {
  /**
   * Create match history entry
   */
  async createMatchHistory(matchId, userId, opponentId, result, gameData) {
    try {
      const historyData = {
        id: uuidv4(),
        match_id: matchId,
        user_id: userId,
        opponent_id: opponentId || null,
        result: result, // win, loss, draw
        hero_used: gameData.heroUsed || 'python',
        gold_earned: gameData.goldEarned || 0,
        damage_dealt: gameData.damageDealt || 0,
        towers_placed: gameData.towersPlaced || 0,
        troops_deployed: gameData.troopsDeployed || 0,
        problems_solved: gameData.problemsSolved || 0,
        xp_gained: gameData.xpGained || 0,
        duration_seconds: gameData.durationSeconds || 0,
        created_at: new Date().toISOString(),
      };

      if (publicDatabaseService.isAvailable()) {
        return await publicDatabaseService.createMatchHistory(historyData);
      }

      // Return dummy data if DB not available
      return historyData;
    } catch (error) {
      console.error('Error creating match history:', error);
      return null;
    }
  }

  /**
   * Get user's match history
   */
  async getUserMatchHistory(userId, limit = 20) {
    try {
      if (publicDatabaseService.isAvailable()) {
        return await publicDatabaseService.getUserMatchHistory(userId, limit);
      }
      return [];
    } catch (error) {
      console.error('Error getting match history:', error);
      return [];
    }
  }

  /**
   * Get match statistics for a user
   */
  async getUserMatchStats(userId) {
    try {
      const history = await this.getUserMatchHistory(userId, 1000); // Get all history for stats

      const stats = {
        totalMatches: history.length,
        wins: history.filter(h => h.result === 'win').length,
        losses: history.filter(h => h.result === 'loss').length,
        draws: history.filter(h => h.result === 'draw').length,
        winRate: 0,
        totalGoldEarned: 0,
        totalXpGained: 0,
        totalProblemsSolved: 0,
        averageDamageDealt: 0,
        totalTowersPlaced: 0,
        totalTroopsDeployed: 0,
        favoriteHero: null,
        totalPlayTimeSeconds: 0,
      };

      if (stats.totalMatches > 0) {
        stats.winRate = (stats.wins / stats.totalMatches) * 100;
        stats.totalGoldEarned = history.reduce((sum, h) => sum + (h.gold_earned || 0), 0);
        stats.totalXpGained = history.reduce((sum, h) => sum + (h.xp_gained || 0), 0);
        stats.totalProblemsSolved = history.reduce((sum, h) => sum + (h.problems_solved || 0), 0);
        stats.totalTowersPlaced = history.reduce((sum, h) => sum + (h.towers_placed || 0), 0);
        stats.totalTroopsDeployed = history.reduce((sum, h) => sum + (h.troops_deployed || 0), 0);
        stats.totalPlayTimeSeconds = history.reduce((sum, h) => sum + (h.duration_seconds || 0), 0);
        
        const totalDamage = history.reduce((sum, h) => sum + (h.damage_dealt || 0), 0);
        stats.averageDamageDealt = totalDamage / stats.totalMatches;

        // Find favorite hero (most used)
        const heroCounts = {};
        history.forEach(h => {
          const hero = h.hero_used || 'python';
          heroCounts[hero] = (heroCounts[hero] || 0) + 1;
        });
        stats.favoriteHero = Object.keys(heroCounts).reduce((a, b) => 
          heroCounts[a] > heroCounts[b] ? a : b
        ) || 'python';
      }

      return stats;
    } catch (error) {
      console.error('Error getting match stats:', error);
      return {
        totalMatches: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        winRate: 0,
        totalGoldEarned: 0,
        totalXpGained: 0,
        totalProblemsSolved: 0,
        averageDamageDealt: 0,
        totalTowersPlaced: 0,
        totalTroopsDeployed: 0,
        favoriteHero: null,
        totalPlayTimeSeconds: 0,
      };
    }
  }

  /**
   * Record match end
   */
  async recordMatchEnd(match, winnerId) {
    try {
      const player1Id = match.player1_id || match.players?.[0]?.id;
      const player2Id = match.player2_id || match.players?.[1]?.id;

      if (!player1Id || !player2Id) {
        console.warn('Cannot record match end: missing player IDs');
        return;
      }

      const startTime = match.start_time || match.startTime || match.created_at;
      const endTime = new Date().toISOString();
      const duration = startTime ? Math.floor((new Date(endTime) - new Date(startTime)) / 1000) : 0;

      // Get game state data
      const gameState = match.game_state || match.gameState || {};
      const player1State = gameState.player1 || {};
      const player2State = gameState.player2 || {};

      // Determine results
      const player1Result = winnerId === player1Id ? 'win' : (winnerId === player2Id ? 'loss' : 'draw');
      const player2Result = winnerId === player2Id ? 'win' : (winnerId === player1Id ? 'loss' : 'draw');

      // Create history for player 1
      await this.createMatchHistory(
        match.id,
        player1Id,
        player2Id,
        player1Result,
        {
          heroUsed: match.player1_hero || 'python',
          goldEarned: Math.floor(player1State.codingScore || 0 / 10), // Dummy calculation
          damageDealt: player1State.totalDamageDealt || 0,
          towersPlaced: (player1State.towers || []).length,
          troopsDeployed: player1State.troopsDeployed || 0,
          problemsSolved: player1State.problemsSolved || 0,
          xpGained: Math.floor((player1State.codingScore || 0) / 5), // Dummy calculation
          durationSeconds: duration,
        }
      );

      // Create history for player 2
      await this.createMatchHistory(
        match.id,
        player2Id,
        player1Id,
        player2Result,
        {
          heroUsed: match.player2_hero || 'python',
          goldEarned: Math.floor(player2State.codingScore || 0 / 10), // Dummy calculation
          damageDealt: player2State.totalDamageDealt || 0,
          towersPlaced: (player2State.towers || []).length,
          troopsDeployed: player2State.troopsDeployed || 0,
          problemsSolved: player2State.problemsSolved || 0,
          xpGained: Math.floor((player2State.codingScore || 0) / 5), // Dummy calculation
          durationSeconds: duration,
        }
      );
    } catch (error) {
      console.error('Error recording match end:', error);
    }
  }
}

export default new MatchHistoryService();

