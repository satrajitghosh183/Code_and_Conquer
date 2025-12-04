/**
 * User Profile Model
 * Represents a user profile in the public.profiles table
 */

export class Profile {
  constructor(data) {
    this.id = data.id;
    this.username = data.username || null;
    this.email = data.email || null;
    this.fullName = data.full_name || null;
    this.avatarUrl = data.avatar_url || null;
    this.bio = data.bio || null;
    this.dateJoined = data.date_joined || new Date().toISOString();
    this.lastActive = data.last_active || new Date().toISOString();
    this.isPremium = data.is_premium || false;
    this.subscriptionTier = data.subscription_tier || 'free';
    this.createdAt = data.created_at || new Date().toISOString();
    this.updatedAt = data.updated_at || new Date().toISOString();
  }

  toJSON() {
    return {
      id: this.id,
      username: this.username,
      email: this.email,
      full_name: this.fullName,
      avatar_url: this.avatarUrl,
      bio: this.bio,
      date_joined: this.dateJoined,
      last_active: this.lastActive,
      is_premium: this.isPremium,
      subscription_tier: this.subscriptionTier,
      created_at: this.createdAt,
      updated_at: this.updatedAt,
    };
  }
}

export class UserProgress {
  constructor(data) {
    this.id = data.id;
    this.userId = data.user_id;
    this.codingLevel = data.coding_level || 'Beginner';
    this.totalXp = data.total_xp || 0;
    this.currentRank = data.current_rank || 'Bronze';
    this.rankLevel = data.rank_level || 1;
    this.badges = data.badges || [];
    this.currentStreak = data.current_streak || 0;
    this.longestStreak = data.longest_streak || 0;
    this.lastActivityDate = data.last_activity_date || null;
    this.selectedHero = data.selected_hero || 'python';
    this.unlockedHeroes = data.unlocked_heroes || ['python', 'javascript'];
    this.techTree = data.tech_tree || {};
    this.availableTechPoints = data.available_tech_points || 0;
    this.lifetimeProblemsSolved = data.lifetime_problems_solved || 0;
    this.lifetimeWins = data.lifetime_wins || 0;
    this.lifetimeGoldEarned = data.lifetime_gold_earned || 0;
    this.createdAt = data.created_at || new Date().toISOString();
    this.updatedAt = data.updated_at || new Date().toISOString();
  }

  toJSON() {
    return {
      id: this.id,
      user_id: this.userId,
      coding_level: this.codingLevel,
      total_xp: this.totalXp,
      current_rank: this.currentRank,
      rank_level: this.rankLevel,
      badges: this.badges,
      current_streak: this.currentStreak,
      longest_streak: this.longestStreak,
      last_activity_date: this.lastActivityDate,
      selected_hero: this.selectedHero,
      unlocked_heroes: this.unlockedHeroes,
      tech_tree: this.techTree,
      available_tech_points: this.availableTechPoints,
      lifetime_problems_solved: this.lifetimeProblemsSolved,
      lifetime_wins: this.lifetimeWins,
      lifetime_gold_earned: this.lifetimeGoldEarned,
      created_at: this.createdAt,
      updated_at: this.updatedAt,
    };
  }
}

export class UserSettings {
  constructor(data) {
    this.id = data.id;
    this.userId = data.user_id;
    this.notificationsEnabled = data.notifications_enabled ?? true;
    this.emailNotifications = data.email_notifications ?? true;
    this.theme = data.theme || 'dark';
    this.privacyLevel = data.privacy_level || 'public';
    this.language = data.language || 'en';
    this.createdAt = data.created_at || new Date().toISOString();
    this.updatedAt = data.updated_at || new Date().toISOString();
  }

  toJSON() {
    return {
      id: this.id,
      user_id: this.userId,
      notifications_enabled: this.notificationsEnabled,
      email_notifications: this.emailNotifications,
      theme: this.theme,
      privacy_level: this.privacyLevel,
      language: this.language,
      created_at: this.createdAt,
      updated_at: this.updatedAt,
    };
  }
}

