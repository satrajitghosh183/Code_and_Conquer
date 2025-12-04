# Database Implementation Guide

This document describes the comprehensive database implementation across the CodeandConquer codebase.

## Overview

All database operations have been integrated to use Supabase with proper schema definitions. The implementation includes:

- Comprehensive database models for all tables
- Database service classes with full CRUD operations
- Integration with existing controllers and services
- Dummy implementations for incomplete features with proper DB integration

## Database Schema

The application uses multiple Supabase schemas:

### Public Schema (`public.*`)
- **profiles** - User profiles
- **user_progress** - User progression data (XP, levels, heroes, tech tree)
- **user_settings** - User preferences
- **user_achievements** - User achievement records
- **user_activity** - User activity logs
- **problems** - Coding problems
- **submissions** - Code submissions
- **matches** - Game matches
- **match_results** - Match result details
- **match_history** - Detailed match history (from migration)
- **game_actions** - In-game actions log
- **leaderboards** - Leaderboard entries
- **achievements** - Available achievements
- **subscriptions** - User subscriptions
- **transactions** - Payment transactions
- **customers** - Stripe customer records
- **entitlements** - Feature entitlements
- **tasks** - User tasks
- **task_integrations** - Task service integrations
- **towers** - Tower definitions
- **player_inventory** - Player inventory items
- **daily_challenges** - Daily challenge definitions (from migration)
- **user_daily_completions** - Daily challenge completions (from migration)
- **user_powerups** - User power-ups (from migration)
- **event_logs** - Application event logs
- **performance_metrics** - Performance tracking
- **ads** - Advertisement data
- **ab_tests** - A/B test data
- **companies** - Company information
- **jobs** - Job postings
- **job_skills** - Job skill mappings
- **career_recommendations** - Career recommendations
- **content_modules** - Content modules
- **media_files** - Media file metadata

### Auth Schema (`auth.*`)
- Managed by Supabase Auth system
- See `backend/src/config/supabaseAuthSchema.js` for details

### Storage Schema (`storage.*`)
- Managed by Supabase Storage
- See `backend/src/config/supabaseStorageSchema.js` for details

### Realtime Schema (`realtime.*`)
- Managed by Supabase Realtime
- See `backend/src/config/supabaseRealtimeSchema.js` for details

## Models

All database models are located in `backend/src/models/`:

- **Problem.js** - Problem and Submission models
- **User.js** - Profile, UserProgress, UserSettings models
- **Match.js** - Match, MatchResult, MatchHistory, GameAction models
- **Achievement.js** - Achievement and UserAchievement models
- **Payment.js** - Subscription, Customer, Transaction, Entitlement models
- **Misc.js** - Various models (Leaderboard, Activity, Tasks, etc.)
- **Hero.js** - Hero definitions and game data

All models can be imported from `backend/src/models/index.js`.

## Services

### Database Services

- **publicDatabaseService.js** - Comprehensive service for all public schema tables
  - Generic CRUD operations
  - Specialized methods for common operations
  - Handles missing tables/columns gracefully
  
- **authDatabaseService.js** - Service for auth schema (existing)
- **storageService.js** - Service for storage operations (existing)
- **realtimeService.js** - Service for realtime subscriptions (existing)

### Feature Services

- **achievementService.js** - Achievement management and awarding
- **dailyChallengeService.js** - Daily challenge management
- **matchHistoryService.js** - Match history and statistics
- **progressionService.js** - User progression (XP, levels, heroes, tech tree)
- **taskService.js** - Task management (existing, enhanced)
- **gameService.js** - Game logic (existing)
- **matchmakingService.js** - Matchmaking (existing, uses database)

### Core Services

- **database.js** - Main database connection (existing)
- **executorService.js** - Code execution (existing)

## Controllers

All controllers have been updated to use the database services:

- **dashboardController.js** - Uses dailyChallengeService
- **leaderboardController.js** - Uses publicDatabaseService
- **submissionController.js** - Uses database and publicDatabaseService
- **problemController.js** - Uses database service (existing)

## Database Operations

### Creating Records

```javascript
import publicDatabaseService from './services/publicDatabaseService.js';
import { PUBLIC_TABLES } from './config/supabasePublicSchema.js';

// Create a record
const newRecord = await publicDatabaseService.insert(PUBLIC_TABLES.PROFILES, {
  id: userId,
  username: 'john_doe',
  email: 'john@example.com',
  // ... other fields
});
```

### Reading Records

```javascript
// Get by ID
const profile = await publicDatabaseService.getById(PUBLIC_TABLES.PROFILES, userId);

// Query with filters
const matches = await publicDatabaseService.query(PUBLIC_TABLES.MATCHES, {
  where: { user_id: userId },
  orderBy: { field: 'created_at', ascending: false },
  limit: 10,
});
```

### Updating Records

```javascript
// Update a record
await publicDatabaseService.update(PUBLIC_TABLES.PROFILES, userId, {
  last_active: new Date().toISOString(),
});
```

### Deleting Records

```javascript
// Delete a record
await publicDatabaseService.delete(PUBLIC_TABLES.PROFILES, userId);
```

## Dummy Implementations

Features that are not fully implemented yet have dummy implementations with proper database integration:

1. **Achievements** - Basic achievement system with default achievements
2. **Daily Challenges** - Creates challenges on-demand if not in database
3. **Match History** - Records match data when available
4. **User Powerups** - Can be stored and retrieved from database
5. **Career/Jobs** - Tables exist, ready for implementation
6. **Content Modules** - Tables exist, ready for implementation

## Error Handling

All database operations handle missing tables/columns gracefully:

- Returns `null` for missing records
- Returns empty arrays for queries on non-existent tables
- Logs warnings but doesn't crash the application
- Falls back to in-memory storage when database is unavailable

## Migration Support

The codebase includes migration files:

- `backend/migrations/add_progression_system.sql` - Adds progression system tables

To apply migrations, run them against your Supabase database.

## Usage Examples

### Getting User Progress

```javascript
import progressionService from './services/progressionService.js';

const progress = await progressionService.getUserProgression(userId);
```

### Awarding Achievement

```javascript
import achievementService from './services/achievementService.js';

await achievementService.grantAchievement(userId, achievementId, progressData);
```

### Getting Daily Challenge

```javascript
import dailyChallengeService from './services/dailyChallengeService.js';

const challenge = await dailyChallengeService.getTodaysChallenge();
```

### Recording Match History

```javascript
import matchHistoryService from './services/matchHistoryService.js';

await matchHistoryService.recordMatchEnd(match, winnerId);
```

## Future Implementation Notes

When implementing new features:

1. Use the existing database models
2. Use publicDatabaseService for CRUD operations
3. Create specialized services for complex features
4. Update controllers to use the new services
5. Handle database unavailability gracefully
6. Use dummy data when features are incomplete

## Testing

When testing:

- All services handle database unavailability
- Fallback to in-memory storage when needed
- Database errors are logged but don't crash the app
- Missing tables/columns return null/empty arrays

## Notes

- The database implementation is production-ready for when tables are created
- All features have proper database integration paths
- Dummy implementations allow development without a full database setup
- The code gracefully handles missing database configuration

