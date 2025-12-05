# API Test Checklist

Comprehensive manual testing checklist for all API endpoints and database operations.

## Prerequisites

- Backend server running on `http://localhost:3000` (or configured port)
- Valid Supabase credentials in `.env`
- Test user account created
- API testing tool (Postman, curl, or similar)

## Test User Setup

1. Create a test user account via registration endpoint
2. Note the user ID and authentication token
3. Use this user for all subsequent tests

---

## 1. User Registration & Authentication

### Registration
- [ ] `POST /api/auth/register` - Create new user
  - [ ] Verify user is created in `profiles` table
  - [ ] Verify `user_progress` is auto-created
  - [ ] Verify `user_stats` is auto-created
  - [ ] Verify `user_settings` is auto-created
  - [ ] Check response includes user ID and token

### Login
- [ ] `POST /api/auth/login` - Login user
  - [ ] Verify token is returned
  - [ ] Verify token is valid for subsequent requests

### Profile Management
- [ ] `GET /api/auth/profile` - Fetch user profile
  - [ ] Verify all profile fields are returned
  - [ ] Verify `last_active` is updated
  
- [ ] `PATCH /api/auth/profile` - Update profile
  - [ ] Update `bio` field
  - [ ] Update `avatar_url` field
  - [ ] Verify changes are persisted in database
  - [ ] Verify `updated_at` timestamp is updated

---

## 2. Problem Solving

### Problem Retrieval
- [ ] `GET /api/problems` - List all problems
  - [ ] Verify problems array is returned
  - [ ] Test filtering by `difficulty` query parameter
  - [ ] Test filtering by `category` query parameter
  - [ ] Verify problems include test cases (visible only)

- [ ] `GET /api/problems/:id` - Get problem by ID
  - [ ] Verify problem details are returned
  - [ ] Verify test cases are included
  - [ ] Verify hidden test cases are NOT included
  - [ ] Verify starter code is returned

### Code Execution
- [ ] `POST /api/submissions/run` - Run code (visible tests only)
  - [ ] Submit valid code
  - [ ] Verify test results are returned
  - [ ] Verify execution time is reported
  - [ ] Verify memory usage is reported
  - [ ] Test with invalid code (syntax error)
  - [ ] Test with code that fails tests

### Code Submission
- [ ] `POST /api/submissions/submit` - Submit code (all tests)
  - [ ] Submit correct solution
  - [ ] Verify submission is saved to `submissions` table
  - [ ] Verify all test cases (visible + hidden) are run
  - [ ] Verify complexity analysis is performed
  - [ ] Verify rewards are calculated (coins, XP)
  - [ ] Verify `user_stats` is updated (coins, XP, problems_solved)
  - [ ] Verify `user_progress` is updated (total_xp, streak)
  - [ ] Verify leaderboard is updated
  - [ ] Verify `user_activity` log is created
  - [ ] Test with incorrect solution
  - [ ] Verify no rewards are given for failed submission

### Submission History
- [ ] `GET /api/submissions/user/:userId` - Get user submissions
  - [ ] Verify submissions are returned in descending order
  - [ ] Verify submission details include test results
  - [ ] Test pagination/limit parameter

---

## 3. Progression System

### User Progression
- [ ] `GET /api/progression/me` - Get user progression
  - [ ] Verify XP, level, rank are returned
  - [ ] Verify hero selection is returned
  - [ ] Verify tech tree state is returned
  - [ ] Verify streak information is returned

### Heroes
- [ ] `GET /api/progression/heroes` - Get heroes with unlock status
  - [ ] Verify all heroes are returned
  - [ ] Verify unlock status for each hero
  - [ ] Verify selected hero is marked
  - [ ] Verify canUnlock status is correct

- [ ] `POST /api/progression/heroes/:id/unlock` - Unlock hero
  - [ ] Test unlocking hero at required level
  - [ ] Test attempting to unlock hero below required level (should fail)
  - [ ] Verify hero is added to `unlocked_heroes` array
  - [ ] Verify error if hero already unlocked

- [ ] `POST /api/progression/heroes/:id/select` - Select hero
  - [ ] Test selecting unlocked hero
  - [ ] Test attempting to select locked hero (should fail)
  - [ ] Verify `selected_hero` is updated

### Tech Tree
- [ ] `GET /api/progression/tech-tree` - Get tech tree with status
  - [ ] Verify all tech nodes are returned
  - [ ] Verify current level for each tech
  - [ ] Verify canUpgrade status
  - [ ] Verify requirements are checked

- [ ] `POST /api/progression/tech-tree/:id/upgrade` - Upgrade tech
  - [ ] Test upgrading tech with sufficient tech points
  - [ ] Test attempting upgrade without tech points (should fail)
  - [ ] Test attempting upgrade without requirements (should fail)
  - [ ] Verify tech level is increased
  - [ ] Verify tech points are deducted

### XP and Leveling
- [ ] Solve a problem and verify XP is added
  - [ ] Verify `addXP` is called after successful submission
  - [ ] Verify level calculation is correct
  - [ ] Verify rank updates based on level
  - [ ] Verify coding level updates
  - [ ] Verify tech points are awarded on level up
  - [ ] Test level up notification/response

---

## 4. Multiplayer Match System

### Match Creation
- [ ] `POST /api/matches/create` - Create match
  - [ ] Verify match is created in `matches` table
  - [ ] Verify both players are assigned
  - [ ] Verify problem is assigned
  - [ ] Verify status is 'active'
  - [ ] Verify WebSocket connection is established

### Match Gameplay
- [ ] `POST /api/matches/:id/action` - Record game action
  - [ ] Test tower placement action
  - [ ] Test troop spawn action
  - [ ] Verify action is logged to `game_actions` table
  - [ ] Verify action is broadcast to opponent via WebSocket

### Match Completion
- [ ] `POST /api/matches/:id/complete` - Complete match
  - [ ] Set winner
  - [ ] Verify match status is updated to 'completed'
  - [ ] Verify `end_time` is set
  - [ ] Verify `match_history` entries are created for both players
  - [ ] Verify `user_stats` is updated (wins, games_played)
  - [ ] Verify `user_progress` lifetime stats are updated

### Match History
- [ ] `GET /api/matches/history/:userId` - Get user match history
  - [ ] Verify match history is returned
  - [ ] Verify history includes opponent info
  - [ ] Verify history includes game stats (gold, damage, etc.)
  - [ ] Test pagination/limit

- [ ] `GET /api/matches/stats/:userId` - Get match statistics
  - [ ] Verify total matches count
  - [ ] Verify wins/losses/draws
  - [ ] Verify win rate calculation
  - [ ] Verify total gold earned
  - [ ] Verify favorite hero

---

## 5. Learning Modules

### Module Retrieval
- [ ] `GET /api/learning-modules` - Get all modules
  - [ ] Verify modules array is returned
  - [ ] Verify modules include metadata (title, description, duration)
  - [ ] Test filtering by category
  - [ ] Test search functionality

- [ ] `GET /api/learning-modules/:id` - Get module by ID
  - [ ] Verify module details are returned
  - [ ] Verify audio URL is included (if available)
  - [ ] Verify content is returned

### Module Progress
- [ ] `GET /api/learning-modules/:id/progress` - Get user progress
  - [ ] Verify progress percentage is returned
  - [ ] Verify last position is returned
  - [ ] Verify completion status

- [ ] `POST /api/learning-modules/:id/progress` - Update progress
  - [ ] Update progress to 50%
  - [ ] Verify progress is saved to `user_module_progress`
  - [ ] Update progress to 100%
  - [ ] Verify module is marked as completed
  - [ ] Verify `completed_at` timestamp is set
  - [ ] Test UPSERT (update existing progress)

---

## 6. Advertising System

### Ad Retrieval
- [ ] `GET /api/ads/random` - Get random ad
  - [ ] Verify ad is returned
  - [ ] Verify ad includes YouTube URL
  - [ ] Verify ad includes sponsor info
  - [ ] Test multiple calls (verify randomness)
  - [ ] Verify caching (subsequent calls should be faster)

### Ad Tracking
- [ ] `POST /api/ads/:id/impression` - Log ad impression
  - [ ] Verify impression is logged to `ad_impressions` table
  - [ ] Verify timestamp is recorded
  - [ ] Verify user_id is recorded (if authenticated)

- [ ] `POST /api/ads/:id/interaction` - Log ad interaction
  - [ ] Test logging skip (with watch time)
  - [ ] Test logging completion
  - [ ] Verify interaction is logged to `ad_interactions` table
  - [ ] Verify interaction_type is correct

---

## 7. Leaderboard System

### Leaderboard Retrieval
- [ ] `GET /api/leaderboard?type=global&limit=100` - Get leaderboard
  - [ ] Verify leaderboard entries are returned
  - [ ] Verify entries are sorted by score (descending)
  - [ ] Verify limit parameter works
  - [ ] Verify user profile info is included
  - [ ] Test different leaderboard types (global, weekly, monthly)

### Leaderboard Updates
- [ ] Solve a problem and verify leaderboard is updated
  - [ ] Verify score calculation: `xp + (problems_solved * 10)`
  - [ ] Verify user's entry is updated in `leaderboards` table
  - [ ] Verify new entry is created if user not in leaderboard
  - [ ] Verify existing entry is updated if user already in leaderboard

---

## 8. Payment & Subscriptions

### Customer Management
- [ ] `POST /api/payments/customer` - Create customer
  - [ ] Verify customer is created in `customers` table
  - [ ] Verify Stripe customer ID is stored

### Subscription Management
- [ ] `POST /api/payments/subscribe` - Create subscription
  - [ ] Verify subscription is created in `subscriptions` table
  - [ ] Verify status is 'active'
  - [ ] Verify dates are set correctly
  - [ ] Verify Stripe subscription ID is stored

- [ ] `GET /api/payments/subscription` - Get user subscription
  - [ ] Verify active subscription is returned
  - [ ] Verify subscription details are correct

- [ ] `POST /api/payments/subscription/cancel` - Cancel subscription
  - [ ] Verify subscription status is updated to 'canceled'
  - [ ] Verify `canceled_at` timestamp is set

### Transactions
- [ ] `POST /api/payments/transaction` - Create transaction
  - [ ] Verify transaction is logged to `transactions` table
  - [ ] Verify amount, currency, status are recorded
  - [ ] Verify Stripe payment intent ID is stored

- [ ] `GET /api/payments/transactions` - Get user transactions
  - [ ] Verify transactions are returned
  - [ ] Verify transactions are ordered by date (newest first)

---

## 9. Daily Challenges

### Challenge Retrieval
- [ ] `GET /api/daily-challenges/today` - Get today's challenge
  - [ ] Verify challenge is returned
  - [ ] Verify challenge includes problem
  - [ ] Verify challenge includes rewards (XP, coins)
  - [ ] Test on different dates

### Challenge Completion
- [ ] `POST /api/daily-challenges/:id/complete` - Complete challenge
  - [ ] Solve the challenge problem
  - [ ] Verify completion is recorded in `user_daily_completions`
  - [ ] Verify rewards are awarded
  - [ ] Test duplicate completion (should prevent or return existing)
  - [ ] Verify `completed_at` timestamp is set

---

## 10. Analytics & Logging

### Event Logging
- [ ] Verify events are logged to `event_logs` table
  - [ ] Test page view event
  - [ ] Test button click event
  - [ ] Test form submit event
  - [ ] Verify event data is stored correctly

### Activity Logging
- [ ] Verify user activities are logged to `user_activity` table
  - [ ] Test problem solved activity
  - [ ] Test XP earned activity
  - [ ] Verify activity metadata is stored

---

## 11. Error Handling

### Invalid Requests
- [ ] Test endpoints with missing required fields
  - [ ] Verify 400 Bad Request is returned
  - [ ] Verify error message is descriptive

- [ ] Test endpoints with invalid data types
  - [ ] Verify 400 Bad Request is returned
  - [ ] Verify error message indicates invalid type

### Authentication Errors
- [ ] Test endpoints without authentication token
  - [ ] Verify 401 Unauthorized is returned

- [ ] Test endpoints with invalid token
  - [ ] Verify 401 Unauthorized is returned

### Not Found Errors
- [ ] Test endpoints with non-existent IDs
  - [ ] Verify 404 Not Found is returned
  - [ ] Verify error message is clear

---

## 12. Database Fallback Mechanism

### Supabase Unavailable
- [ ] Disable Supabase connection (comment out env vars)
- [ ] Test problem retrieval
  - [ ] Verify local JSON fallback works
  - [ ] Verify problems are still returned

- [ ] Test submission creation
  - [ ] Verify local JSON fallback works
  - [ ] Verify submission is saved locally

---

## 13. Performance Tests

### Response Times
- [ ] Measure response time for `GET /api/problems`
  - [ ] Should be < 500ms
- [ ] Measure response time for `GET /api/problems/:id`
  - [ ] Should be < 300ms
- [ ] Measure response time for `POST /api/submissions/submit`
  - [ ] Should be < 5s (includes code execution)

### Concurrent Requests
- [ ] Test multiple simultaneous submissions
  - [ ] Verify all are processed
  - [ ] Verify no data corruption
  - [ ] Verify database consistency

---

## 14. Data Consistency Checks

### After Problem Solve
- [ ] Verify `user_stats.coins` increased
- [ ] Verify `user_stats.xp` increased
- [ ] Verify `user_stats.problems_solved` increased
- [ ] Verify `user_stats.level` recalculated
- [ ] Verify `user_progress.total_xp` increased
- [ ] Verify `user_progress.coding_level` updated if needed
- [ ] Verify `user_progress.current_streak` updated
- [ ] Verify `leaderboards.score` updated
- [ ] Verify `user_activity` entry created

### After Match Completion
- [ ] Verify `matches.status` = 'completed'
- [ ] Verify `matches.winner_id` is set
- [ ] Verify `matches.end_time` is set
- [ ] Verify `match_history` entries for both players
- [ ] Verify `user_stats.wins` or `games_played` updated
- [ ] Verify `user_progress.lifetime_wins` updated

---

## Test Results Summary

After completing all tests, document:

- Total tests: ___
- Passed: ___
- Failed: ___
- Skipped: ___
- Issues found: ___
- Performance issues: ___
- Database issues: ___

