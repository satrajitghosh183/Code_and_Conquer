/**
 * Miscellaneous Models
 * Represents leaderboards, activities, events, tasks, and other entities
 */

export class Leaderboard {
  constructor(data) {
    this.id = data.id;
    this.userId = data.user_id;
    this.leaderboardType = data.leaderboard_type || 'global'; // global, weekly, monthly
    this.score = data.score || 0;
    this.rank = data.rank || null;
    this.periodStart = data.period_start || null;
    this.periodEnd = data.period_end || null;
    this.updatedAt = data.updated_at || new Date().toISOString();
  }

  toJSON() {
    return {
      id: this.id,
      user_id: this.userId,
      leaderboard_type: this.leaderboardType,
      score: this.score,
      rank: this.rank,
      period_start: this.periodStart,
      period_end: this.periodEnd,
      updated_at: this.updatedAt,
    };
  }
}

export class UserActivity {
  constructor(data) {
    this.id = data.id;
    this.userId = data.user_id || null;
    this.activityType = data.activity_type; // problem_solved, match_played, etc.
    this.module = data.module || null;
    this.timeSpentSeconds = data.time_spent_seconds || 0;
    this.metadata = data.metadata || {};
    this.createdAt = data.created_at || new Date().toISOString();
  }

  toJSON() {
    return {
      id: this.id,
      user_id: this.userId,
      activity_type: this.activityType,
      module: this.module,
      time_spent_seconds: this.timeSpentSeconds,
      metadata: this.metadata,
      created_at: this.createdAt,
    };
  }
}

export class EventLog {
  constructor(data) {
    this.id = data.id;
    this.userId = data.user_id || null;
    this.eventName = data.event_name;
    this.eventData = data.event_data || {};
    this.ipAddress = data.ip_address || null;
    this.userAgent = data.user_agent || null;
    this.createdAt = data.created_at || new Date().toISOString();
  }

  toJSON() {
    return {
      id: this.id,
      user_id: this.userId,
      event_name: this.eventName,
      event_data: this.eventData,
      ip_address: this.ipAddress,
      user_agent: this.userAgent,
      created_at: this.createdAt,
    };
  }
}

export class Task {
  constructor(data) {
    this.id = data.id;
    this.userId = data.user_id;
    this.title = data.title;
    this.description = data.description || null;
    this.status = data.status || 'pending'; // pending, completed, cancelled
    this.dueDate = data.due_date || null;
    this.completedAt = data.completed_at || null;
    this.source = data.source || 'manual'; // manual, todoist, google_calendar
    this.sourceId = data.source_id || null;
    this.metadata = data.metadata || {};
    this.createdAt = data.created_at || new Date().toISOString();
    this.updatedAt = data.updated_at || new Date().toISOString();
  }

  toJSON() {
    return {
      id: this.id,
      user_id: this.userId,
      title: this.title,
      description: this.description,
      status: this.status,
      due_date: this.dueDate,
      completed_at: this.completedAt,
      source: this.source,
      source_id: this.sourceId,
      metadata: this.metadata,
      created_at: this.createdAt,
      updated_at: this.updatedAt,
    };
  }
}

export class TaskIntegration {
  constructor(data) {
    this.id = data.id;
    this.userId = data.user_id;
    this.integrationType = data.integration_type; // todoist, google_calendar
    this.isActive = data.is_active ?? true;
    this.lastSyncAt = data.last_sync_at || null;
    this.metadata = data.metadata || {};
    this.createdAt = data.created_at || new Date().toISOString();
    this.updatedAt = data.updated_at || new Date().toISOString();
  }

  toJSON() {
    return {
      id: this.id,
      user_id: this.userId,
      integration_type: this.integrationType,
      is_active: this.isActive,
      last_sync_at: this.lastSyncAt,
      metadata: this.metadata,
      created_at: this.createdAt,
      updated_at: this.updatedAt,
    };
  }
}

export class DailyChallenge {
  constructor(data) {
    this.id = data.id;
    this.problemId = data.problem_id;
    this.challengeDate = data.challenge_date;
    this.bonusXp = data.bonus_xp || 100;
    this.bonusGold = data.bonus_gold || 50;
    this.createdAt = data.created_at || new Date().toISOString();
  }

  toJSON() {
    return {
      id: this.id,
      problem_id: this.problemId,
      challenge_date: this.challengeDate,
      bonus_xp: this.bonusXp,
      bonus_gold: this.bonusGold,
      created_at: this.createdAt,
    };
  }
}

export class UserDailyCompletion {
  constructor(data) {
    this.id = data.id;
    this.userId = data.user_id;
    this.challengeId = data.challenge_id;
    this.completedAt = data.completed_at || new Date().toISOString();
  }

  toJSON() {
    return {
      id: this.id,
      user_id: this.userId,
      challenge_id: this.challengeId,
      completed_at: this.completedAt,
    };
  }
}

export class UserPowerup {
  constructor(data) {
    this.id = data.id;
    this.userId = data.user_id;
    this.powerupType = data.powerup_type; // extra_time, hint, etc.
    this.quantity = data.quantity || 1;
    this.expiresAt = data.expires_at || null;
    this.createdAt = data.created_at || new Date().toISOString();
  }

  toJSON() {
    return {
      id: this.id,
      user_id: this.userId,
      powerup_type: this.powerupType,
      quantity: this.quantity,
      expires_at: this.expiresAt,
      created_at: this.createdAt,
    };
  }
}

export class Tower {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.towerType = data.tower_type;
    this.baseHp = data.base_hp || 100;
    this.baseDamage = data.base_damage || 10;
    this.unlockLevel = data.unlock_level || 1;
    this.cost = data.cost || 100;
    this.description = data.description || null;
    this.iconUrl = data.icon_url || null;
    this.buffs = data.buffs || [];
    this.debuffs = data.debuffs || [];
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      tower_type: this.towerType,
      base_hp: this.baseHp,
      base_damage: this.baseDamage,
      unlock_level: this.unlockLevel,
      cost: this.cost,
      description: this.description,
      icon_url: this.iconUrl,
      buffs: this.buffs,
      debuffs: this.debuffs,
    };
  }
}

export class PlayerInventory {
  constructor(data) {
    this.id = data.id;
    this.userId = data.user_id;
    this.itemType = data.item_type; // tower, troop, powerup
    this.itemId = data.item_id;
    this.quantity = data.quantity || 1;
    this.metadata = data.metadata || {};
    this.createdAt = data.created_at || new Date().toISOString();
    this.updatedAt = data.updated_at || new Date().toISOString();
  }

  toJSON() {
    return {
      id: this.id,
      user_id: this.userId,
      item_type: this.itemType,
      item_id: this.itemId,
      quantity: this.quantity,
      metadata: this.metadata,
      created_at: this.createdAt,
      updated_at: this.updatedAt,
    };
  }
}

