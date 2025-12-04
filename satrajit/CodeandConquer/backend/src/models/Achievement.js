/**
 * Achievement Models
 * Represents achievements and user achievements
 */

export class Achievement {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description || '';
    this.category = data.category || null;
    this.iconUrl = data.icon_url || null;
    this.xpReward = data.xp_reward || 0;
    this.rarity = data.rarity || 'common'; // common, rare, epic, legendary
    this.criteria = data.criteria || {};
    this.createdAt = data.created_at || new Date().toISOString();
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      category: this.category,
      icon_url: this.iconUrl,
      xp_reward: this.xpReward,
      rarity: this.rarity,
      criteria: this.criteria,
      created_at: this.createdAt,
    };
  }
}

export class UserAchievement {
  constructor(data) {
    this.id = data.id;
    this.userId = data.user_id;
    this.achievementId = data.achievement_id;
    this.earnedAt = data.earned_at || new Date().toISOString();
    this.progress = data.progress || {};
  }

  toJSON() {
    return {
      id: this.id,
      user_id: this.userId,
      achievement_id: this.achievementId,
      earned_at: this.earnedAt,
      progress: this.progress,
    };
  }
}

