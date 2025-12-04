/**
 * Match and Game Models
 * Represents matches, match results, and game actions
 */

export class Match {
  constructor(data) {
    this.id = data.id;
    this.player1Id = data.player1_id || null;
    this.player2Id = data.player2_id || null;
    this.problemId = data.problem_id || null;
    this.status = data.status || 'waiting'; // waiting, running, finished
    this.winnerId = data.winner_id || null;
    this.startTime = data.start_time || null;
    this.endTime = data.end_time || null;
    this.matchType = data.match_type || 'casual'; // ranked, casual
    this.createdAt = data.created_at || new Date().toISOString();
  }

  toJSON() {
    return {
      id: this.id,
      player1_id: this.player1Id,
      player2_id: this.player2Id,
      problem_id: this.problemId,
      status: this.status,
      winner_id: this.winnerId,
      start_time: this.startTime,
      end_time: this.endTime,
      match_type: this.matchType,
      created_at: this.createdAt,
    };
  }
}

export class MatchResult {
  constructor(data) {
    this.id = data.id;
    this.matchId = data.match_id;
    this.player1Score = data.player1_score || 0;
    this.player2Score = data.player2_score || 0;
    this.player1DamageDealt = data.player1_damage_dealt || 0;
    this.player2DamageDealt = data.player2_damage_dealt || 0;
    this.player1TowersDestroyed = data.player1_towers_destroyed || 0;
    this.player2TowersDestroyed = data.player2_towers_destroyed || 0;
    this.bonuses = data.bonuses || {};
    this.createdAt = data.created_at || new Date().toISOString();
  }

  toJSON() {
    return {
      id: this.id,
      match_id: this.matchId,
      player1_score: this.player1Score,
      player2_score: this.player2Score,
      player1_damage_dealt: this.player1DamageDealt,
      player2_damage_dealt: this.player2DamageDealt,
      player1_towers_destroyed: this.player1TowersDestroyed,
      player2_towers_destroyed: this.player2TowersDestroyed,
      bonuses: this.bonuses,
      created_at: this.createdAt,
    };
  }
}

export class MatchHistory {
  constructor(data) {
    this.id = data.id;
    this.matchId = data.match_id;
    this.userId = data.user_id;
    this.opponentId = data.opponent_id || null;
    this.result = data.result; // win, loss, draw
    this.heroUsed = data.hero_used;
    this.goldEarned = data.gold_earned || 0;
    this.damageDealt = data.damage_dealt || 0;
    this.towersPlaced = data.towers_placed || 0;
    this.troopsDeployed = data.troops_deployed || 0;
    this.problemsSolved = data.problems_solved || 0;
    this.xpGained = data.xp_gained || 0;
    this.durationSeconds = data.duration_seconds || 0;
    this.createdAt = data.created_at || new Date().toISOString();
  }

  toJSON() {
    return {
      id: this.id,
      match_id: this.matchId,
      user_id: this.userId,
      opponent_id: this.opponentId,
      result: this.result,
      hero_used: this.heroUsed,
      gold_earned: this.goldEarned,
      damage_dealt: this.damageDealt,
      towers_placed: this.towersPlaced,
      troops_deployed: this.troopsDeployed,
      problems_solved: this.problemsSolved,
      xp_gained: this.xpGained,
      duration_seconds: this.durationSeconds,
      created_at: this.createdAt,
    };
  }
}

export class GameAction {
  constructor(data) {
    this.id = data.id;
    this.matchId = data.match_id;
    this.userId = data.user_id || null;
    this.actionType = data.action_type; // tower_placed, troop_deployed, problem_solved, etc.
    this.actionData = data.action_data || {};
    this.timestamp = data.timestamp || new Date().toISOString();
  }

  toJSON() {
    return {
      id: this.id,
      match_id: this.matchId,
      user_id: this.userId,
      action_type: this.actionType,
      action_data: this.actionData,
      timestamp: this.timestamp,
    };
  }
}

