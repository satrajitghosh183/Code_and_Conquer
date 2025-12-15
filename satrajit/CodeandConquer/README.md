# 🎮 Code and Conquer

A competitive coding platform that combines LeetCode-style programming challenges with tower defense gameplay mechanics. Solve problems, earn resources, and defend your base!

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![React](https://img.shields.io/badge/react-19.x-blue.svg)

## ✨ Features

### 🔐 REQ-01: OAuth Authentication & Session Management
**Owner: Kevin Dang**

- **Secure OAuth 2.0** - Sign in with Google, GitHub, or Discord
- **Session Management** - Access tokens (60 min TTL), refresh tokens (7 days TTL)
- **CSRF Protection** - State parameters required for all OAuth flows
- **Role-Based Access Control** - Admin, premium, and free user roles
- **Session Timeout** - Idle sessions expire after 30 minutes
- **Token Refresh** - Automatic token refresh within 7-day window
- **Entitlement Management** - Track user permissions and premium features

**User Story:** As a user, I want to securely sign in with Google or GitHub OAuth so that I can access my dashboard and maintain session continuity.

### 🎯 REQ-02: ELO-Based Matchmaking with Queue Management
**Owner: Doug Lavin**

- **Fair Matchmaking** - 95% of matches within ±200 ELO difference
- **Smart Queue System** - Widens search window (±400 ELO) after 30 seconds
- **Queue Timeout** - Users matched with bot opponent (±50 ELO) after 60 seconds
- **Premium Priority** - Premium users matched 20% faster than free users
- **Concurrent Matching** - Eligible users paired within 5 seconds
- **Latency Resilience** - Stable matchmaking under 500ms network delay

**User Story:** As a competitive user, I want to be matched with opponents of similar skill quickly so that I can have fair and challenging battles.

### ⚡ REQ-03: Sandboxed Code Execution with Resource Limits
**Owner: Tariq H Fahumy**

- **Docker-Based Sandbox** - Isolated code execution environment
- **Resource Limits** - 2s time limit per test, 256MB memory limit
- **Security** - File system and network access denied
- **Multiple Languages** - JavaScript, Python, Java, C++, Go, Rust, Ruby, PHP
- **Verdict System** - Compilation Error, Wrong Answer, TLE, MLE, Accepted
- **Game Integration** - Verdicts mapped to buffs/debuffs (e.g., +20% fire rate for accepted, -10% health for wrong answer)
- **Complexity Analysis** - Automatic time and space complexity estimation

**User Story:** As a user, I want to submit code that runs safely in isolation and receive clear feedback on correctness and performance so that I can learn effectively and earn game rewards.

### 📅 REQ-04: Calendar/Todoist Task Synchronization with Deduplication
**Owner: Clementine Vander Vliet**

- **Multi-Source Sync** - Google Calendar and Todoist integration
- **Automatic Import** - Next 30 days' events imported automatically
- **Deduplication** - Smart duplicate detection using sourceId||time||title
- **Provenance Tracking** - Track task origin (Calendar vs Todoist)
- **Conflict Resolution** - User prompts for conflicting edits
- **Incremental Updates** - New tasks sync within 5 minutes
- **Deletion Handling** - Deleted tasks marked as removed, historical streak preserved

**User Story:** As a user, I want my real-world tasks from Google Calendar and Todoist to sync automatically so that I can earn rewards without manual entry.

### 🎁 REQ-05: Task Completion Rewards with Cap Enforcement
**Owner: Clementine Vander Vliet**

- **Reward System** - 50 units for tasks completed within 24 hours
- **Daily Caps** - First 5 tasks get full reward, 6th+ gets 50% (25 units)
- **Streak Bonuses** - 1.5x reward multiplier after 7-day streak (75 units)
- **Validation Windows** - Tasks must be completed within 24 hours for full reward
- **Duplicate Prevention** - Second completion attempts rejected
- **Game Integration** - Rewards convert to in-game resources (gold, energy)

**User Story:** As a user, I want to earn in-game rewards for completing real-world tasks so that I stay motivated and improve my tower defense performance.

### 🏆 REQ-06: Privacy-Safe Leaderboard Computation with Season Management
**Owner: Doug Lavin**

- **Multiple Leaderboards** - Global, weekly, monthly, and seasonal rankings
- **Privacy Controls** - Private profiles display as "Anonymous Player"
- **ELO System** - Baseline 1200 ELO, ±25 points per match
- **Season Resets** - Quarterly resets with historical archiving
- **Eventual Consistency** - Leaderboard updates within 2 minutes
- **Multiple Metrics** - ELO, win rate, problem solve count, XP rankings

**User Story:** As a user, I want to see my ranking compared to others while respecting privacy settings, so that I can track my progress and compete fairly.

### 💳 REQ-07: Payment Processing with Idempotent Webhook Handling
**Owner: Kevin Dang**

- **Stripe Integration** - Secure payment processing
- **Subscription Tiers** - Free, premium tiers with different features
- **Idempotent Webhooks** - Duplicate webhooks processed once (transaction ID based)
- **Retry Logic** - Failed payments retry automatically every 24 hours (up to 3 attempts)
- **Grace Period** - 3-day premium access continuation after renewal failure
- **Entitlement Management** - Immediate access to premium features upon payment
- **Payment Decline Handling** - Clear error messages, no tier upgrade on decline

**User Story:** As a user upgrading to premium, I want secure payments and immediate access to my entitlements, so that I can enjoy premium features without delays or being charged twice.

### 💼 REQ-08: Explainable Job Recommendations with Consent Management
**Owner: Tanushree Debbarma**

- **Personalized Recommendations** - Based on last 50 problem solves
- **Consent Management** - Recommendations only shown if analytics consent enabled
- **Match Scoring** - Top 5 jobs with match scores and explanations
- **Skill Gap Analysis** - Identifies missing skills for higher roles
- **Dynamic Updates** - Recommendations refresh when new problems solved
- **Transparency** - Breakdown of problem areas and skill matches shown
- **Generic Fallback** - Generic job listings if consent disabled



### 🔍 REQ-09: Full-Text Search with Rate Limiting and Filtering
**Owner: Tanushree Debbarma**

- **Unified Search** - Search across problems, jobs, leaderboards, and policies
- **Relevance Ranking** - Results ranked by relevance and popularity
- **Advanced Filtering** - Filter by job type, difficulty, category, etc.
- **Pagination** - 20 results per page (max 50), cursor-based navigation
- **Rate Limiting** - 120 queries/min (authenticated), 30 queries/min (anonymous)
- **Input Validation** - Minimum 2 characters, stop-word filtering
- **Safe Highlighting** - XSS-safe match highlighting in results

**User Story:** As a user, I want fast, accurate search across problems, jobs, leaderboards, and policies so I can find what I need without hammering the system.

### 📝 REQ-10: Admin Problem Curation with Version Control
**Owner: Tariq H Fahumy**

- **Problem Creation** - Admin interface for creating coding problems
- **Version Control** - Full version history with version bumps on edits
- **Review Workflow** - Curator approval required before publication
- **Draft System** - Problems saved as drafts until published
- **Revert Capability** - Revert to any previous version
- **Search Re-indexing** - Published problems appear in search within 60 seconds
- **Test Case Management** - Visible and hidden test cases support


### 🔄 REQ-11: Reliability with Idempotent APIs and Battle State Checkpoints
**Owner: Satrajit Ghosh**

- **Idempotent APIs** - Duplicate actions processed once using request IDs
- **Battle Checkpoints** - State saved every 10 seconds
- **Reconnection Grace** - 90-second window for reconnection without penalty
- **State Recovery** - Players can resume from last checkpoint after disconnect
- **Neutral Outcomes** - Disconnects >2 minutes result in neutral match (no ELO change)
- **Judge Timeout Handling** - 10-second timeout, system error verdict, resubmission allowed
- **Data Integrity** - No duplicate actions, no data loss during failures


### 🎮 REQ-12: WebGL2 Game Client with Server-Authoritative Real-Time Protocol
**Owner: Satrajit Ghosh**

- **60 FPS Rendering** - Smooth graphics with up to 50 entities
- **Server-Authoritative** - Client predictions with server correction
- **State Snapshots** - Server sends state every 100ms
- **Latency Tolerance** - Smooth gameplay under 50-150ms network latency
- **Client Prediction** - Immediate visual feedback with server validation
- **Smooth Corrections** - Position corrections within 1 frame
- **Reconnection Sync** - Full state sync within 500ms on reconnect
- **Visual Feedback** - Buffs/debuffs update visuals within 200ms


### 🧩 Additional Features

- **1000+ Coding Problems** - Wide variety of algorithmic challenges
- **Multiple Programming Languages** - JavaScript, Python, Java, C++, Go, Rust, Ruby, PHP
- **Real-time Code Execution** - Docker-based sandboxed environment
- **Test Cases** - Visible and hidden test cases for thorough validation
- **Complexity Analysis** - Automatic time and space complexity estimation
- **Tower Defense Gameplay** - Strategic tower placement and base defense
- **Hero System** - Multiple heroes with unique abilities
- **Progression System** - XP, levels, ranks, and unlockables
- **Daily Challenges** - Fresh problems every day with special rewards
- **Learning Modules** - Structured learning paths with video content
- **Advertising System** - Video ads with impression tracking
- **Analytics & Logging** - Comprehensive event tracking and analytics

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account (free tier works)
- Docker (optional, for code execution)

### Installation

```bash
# Clone the repository
git clone https://github.com/satrajitghosh183/Code_and_Conquer.git
cd Code_and_Conquer/satrajit/CodeandConquer

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Configuration

1. **Backend Configuration**

```bash
cd backend
cp env.example .env
# Edit .env with your Supabase credentials
```

2. **Frontend Configuration**

```bash
cd frontend
cp env.example .env
# Edit .env with your API and Supabase URLs
```

### Running Locally

```bash
# Terminal 1 - Start backend
cd backend
npm run dev

# Terminal 2 - Start frontend
cd frontend
npm run dev
```

Visit `http://localhost:3000` to access the application.

## 🏗 Architecture

```
Code_and_Conquer/
├── satrajit/
│   └── CodeandConquer/
│       ├── backend/                 # Express.js API server
│       │   ├── src/
│       │   │   ├── config/         # Database & Supabase config
│       │   │   ├── controllers/    # Route handlers
│       │   │   ├── middleware/     # Express middleware
│       │   │   ├── models/         # Data models
│       │   │   ├── routes/         # API routes
│       │   │   ├── services/       # Business logic
│       │   │   └── utils/          # Utilities
│       │   ├── scripts/            # Database & maintenance scripts
│       │   ├── judge/              # Code execution Docker images
│       │   └── tests/              # Unit tests
│       │
│       └── frontend/               # React + Vite application
│           ├── src/
│           │   ├── components/     # Reusable UI components
│           │   ├── contexts/       # React contexts
│           │   ├── game/           # 3D game engine (Three.js)
│           │   ├── hooks/          # Custom React hooks
│           │   ├── pages/          # Page components
│           │   └── services/       # API clients
│           └── public/             # Static assets
│
├── .github/
│   └── workflows/
│       └── test.yml                # GitHub Actions CI/CD
│
├── docker-compose.yml              # Full-stack Docker setup
├── fly.toml                        # Fly.io deployment config
└── render.yaml                     # Render deployment config
```

## 🛠 Tech Stack

### Backend
- **Runtime:** Node.js 20
- **Framework:** Express.js
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth (OAuth 2.0)
- **WebSocket:** Socket.IO
- **Code Execution:** Docker containers
- **Payments:** Stripe
- **Task Sync:** Google Calendar API, Todoist API

### Frontend
- **Framework:** React 19
- **Build Tool:** Vite 7
- **Routing:** React Router 7
- **3D Graphics:** Three.js (WebGL2)
- **Code Editor:** Monaco Editor
- **Charts:** Recharts
- **Styling:** CSS Modules

## 📦 Deployment

### Docker Compose (Recommended)

```bash
# Build and run all services
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Cloud Platforms

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions on deploying to:
- **Fly.io** - Recommended for backend
- **Railway** - Easy full-stack deployment
- **Render** - Free tier available
- **DigitalOcean App Platform**

## 🔧 API Endpoints

### Problems
- `GET /api/problems` - List all problems (with filtering)
- `GET /api/problems/:id` - Get problem details
- `POST /api/problems` - Create problem (admin)
- `PATCH /api/problems/:id/tags` - Update problem tags

### Submissions
- `POST /api/submissions/submit` - Submit solution (links user to problem)
- `POST /api/submissions/run` - Run code without submitting
- `GET /api/submissions/:id` - Get submission details
- `GET /api/submissions` - Get submissions with filtering (by user, problem, status, language)

### Users
- `GET /api/users/:id/stats` - Get user statistics
- `GET /api/leaderboard` - Get global leaderboard
- `GET /api/leaderboard?type=weekly` - Get weekly leaderboard
- `GET /api/leaderboard?type=monthly` - Get monthly leaderboard

### Authentication
- `POST /auth/oauth/start` - Initiate OAuth flow
- `POST /auth/oauth/callback` - OAuth callback handler
- `GET /session/refresh` - Refresh expired access tokens

### Matchmaking
- `POST /api/matches/join` - Join matchmaking queue
- `POST /api/matches/leave` - Leave matchmaking queue
- `GET /api/matches/:id` - Get match details

### Tasks
- `GET /api/tasks` - Get user tasks (synced from Calendar/Todoist)
- `POST /api/tasks/complete` - Mark task as complete
- `GET /api/tasks/sync` - Trigger task synchronization

### Jobs
- `GET /api/jobs` - Get job recommendations
- `GET /api/jobs/:id` - Get job details with match score
- `GET /api/jobs/recommendations` - Get personalized recommendations

### Search
- `GET /api/search?q=query` - Full-text search across problems, jobs, leaderboards
- `GET /api/search?q=query&domain=problems` - Search specific domain

### Health
- `GET /api/health` - Service health check
- `GET /api/ready` - Readiness probe

## 🧪 Testing

### Unit Tests

```bash
cd backend
npm run test:unit
```

Runs 32 unit tests covering:
- Utility functions (strings, arrays, objects, math)
- API utilities (validation, response formatting)
- Data models (Problem, Submission)

### API Implementation Tests

```bash
cd backend
npm run test:api
```

Tests all API requirements:
- ✅ Create operations (POST /api/problems)
- ✅ Query with filtering (GET /api/problems)
- ✅ Link items between collections (POST /api/submissions/submit)
- ✅ Security (authentication/authorization)
- ✅ Input validation

### All Tests

```bash
cd backend
npm test
```

Runs comprehensive test suite including database verification.

## 🤝 Contributing

### Requirements & Contributions Table

| Req ID | Requirement | Owner | Key Operations | Business Rules | User Story |
|--------|------------|-------|----------------|----------------|------------|
| **REQ-01** | OAuth Authentication & Session Management | Kevin Dang | `POST /auth/oauth/start`, `POST /auth/oauth/callback`, `GET /session/refresh`, Role enforcement middleware | OAuth 2.0 with state params (CSRF protection); Access token TTL = 60 min; Refresh token TTL = 7 days; Idle timeout = 30 min; Role-based access control | As a user, I want to securely sign in with Google or GitHub OAuth so that I can access my dashboard and maintain session continuity. |
| **REQ-02** | ELO-Based Matchmaking with Queue Management | Doug Lavin | `POST /match/join`, `POST /match/leave`, `matchmakingJob()` | Fair match if \|Δ ELO\| ≤ 200 (95% cases); Queue widens ±400 after 30s; Timeout at 60s; Premium priority = 20% faster | As a competitive user, I want to be matched with opponents of similar skill quickly so that I can have fair and challenging battles. |
| **REQ-03** | Sandboxed Code Execution with Resource Limits | Tariq H Fahumy | `POST /submit`, Judge workers, Resource monitor | Time limit = 2s/test; Memory limit = 256MB; FS/network access denied; Verdicts mapped to buffs/debuffs | As a user, I want to submit code that runs safely in isolation and receive clear feedback on correctness and performance so that I can learn effectively and earn game rewards. |
| **REQ-04** | Calendar/Todoist Task Synchronization with Deduplication | Clementine Vander Vliet | `syncTasks()`, `resolveConflict()`, `deduplicateTasks()` | Import window = 30 days; Dedup key = sourceId\|\|time\|\|title; Edits prompt user if conflicting | As a user, I want my real-world tasks from Google Calendar and Todoist to sync automatically so that I can earn rewards without manual entry. |
| **REQ-05** | Task Completion Rewards with Cap Enforcement | Clementine Vander Vliet | `markTaskComplete()`, Reward calculation service | Full reward = 50 units within 24h; Daily cap = 5 full tasks; Streak bonus = 1.5x after 7 days | As a user, I want to earn in-game rewards for completing real-world tasks so that I stay motivated and improve my tower defense performance. |
| **REQ-06** | Privacy-Safe Leaderboard Computation with Season Management | Doug Lavin | `updateRank()`, `resetSeason()`, `getLeaderboard()` | Quarterly reset; Baseline ELO = 1200; Private profiles → "Anonymous Player"; Consistency within 2 minutes | As a user, I want to see my ranking compared to others while respecting privacy settings, so that I can track my progress and compete fairly. |
| **REQ-07** | Payment Processing with Idempotent Webhook Handling | Kevin Dang | Stripe checkout API, `processWebhook(eventId)` | Idempotency key = transactionId; Retry every 24h; Grace period = 3 days; Declined payments do not upgrade tier | As a user upgrading to premium, I want secure payments and immediate access to my entitlements, so that I can enjoy premium features without delays or being charged twice. |
| **REQ-08** | Explainable Job Recommendations with Consent Management | Tanushree Debbarma | `generateRecommendations(userId)`, `explainRecommendation(jobId)` | Personalized recs only if consent=on; Analysis = last 50 solves; Top 5 jobs; Refresh on new problem solve | As a user, I want to receive job recommendations based on my coding performance, with clear explanations, so that I can understand my career readiness and make informed decisions. |
| **REQ-09** | Full-Text Search with Rate Limiting and Filtering | Tanushree Debbarma | `GET /search`, `GET /search/cursor`, Rate-limit middleware | minQueryLen=2; Stop-word queries invalid; pageSize=20 (max 50); Rate limits: auth=120/min, anon=30/min; ACL filtering | As a user, I want fast, accurate search across problems, jobs, leaderboards, and policies so I can find what I need without hammering the system. |
| **REQ-10** | Admin Problem Curation with Version Control | Tariq H Fahumy | `createProblem()`, `editProblem()`, `revertProblem()`, `publishProblem()` | Version bumps on edit; Only curator-approved problems publish; Reindex within 60s | As an admin, I want to create, edit, and version coding problems through a review process, so that I can ensure content quality and track all historical changes. |
| **REQ-11** | Reliability with Idempotent APIs and Battle State Checkpoints | Satrajit Ghosh | `submitAction(requestId)`, `checkpointBattle()`, `resumeBattle()` | Checkpoint interval = 10s; Reconnection grace = 90s; Disconnect >2min → neutral outcome; requestId ensures idempotency | As a user, I want active battles to handle network or server issues gracefully, so that I don't lose progress or face unfair penalties. |
| **REQ-12** | WebGL2 Game Client with Server-Authoritative Real-Time Protocol | Satrajit Ghosh | `renderLoop()`, `applySnapshot()`, `predictInput()` | FPS target = 60; Snapshot interval = 100ms; Corrections ≤1 frame; Reconnect resync ≤500ms; Visual feedback ≤200ms | As a user, I want smooth, responsive graphics that accurately reflect the server state, so that I can have a fair and enjoyable competitive experience. |

### Team Members & Detailed Contributions

#### **Kevin Dang** - Authentication & Payments
- **REQ-01: OAuth Authentication & Session Management**
  - Implemented OAuth 2.0 flows for Google, GitHub, Discord
  - Session management with access/refresh tokens
  - Role-based access control middleware
  - CSRF protection with state parameters
- **REQ-07: Payment Processing with Idempotent Webhook Handling**
  - Stripe integration for subscription payments
  - Idempotent webhook processing
  - Retry logic and grace period handling
  - Entitlement management system

#### **Doug Lavin** - Matchmaking & Leaderboards
- **REQ-02: ELO-Based Matchmaking with Queue Management**
  - ELO rating system implementation
  - Fair matchmaking algorithm (±200 ELO window)
  - Queue management with timeout handling
  - Premium user priority queue
- **REQ-06: Privacy-Safe Leaderboard Computation with Season Management**
  - Multiple leaderboard types (global, weekly, monthly)
  - Privacy controls for anonymous profiles
  - Season reset functionality
  - Eventual consistency implementation

#### **Tariq H Fahumy** - Code Execution & Problem Management
- **REQ-03: Sandboxed Code Execution with Resource Limits**
  - Docker-based sandbox implementation
  - Resource limit enforcement (time, memory)
  - Multi-language support (10+ languages)
  - Verdict-to-game-buff mapping system
- **REQ-10: Admin Problem Curation with Version Control**
  - Problem creation and editing interface
  - Version control system
  - Review workflow with curator approval
  - Search re-indexing on publication

#### **Clementine Vander Vliet** - Task Management & Rewards
- **REQ-04: Calendar/Todoist Task Synchronization with Deduplication**
  - Google Calendar API integration
  - Todoist API integration
  - Smart deduplication algorithm
  - Conflict resolution system
- **REQ-05: Task Completion Rewards with Cap Enforcement**
  - Reward calculation system
  - Daily cap enforcement
  - Streak bonus implementation
  - Game resource conversion

#### **Tanushree Debbarma** - Job Recommendations & Search
- **REQ-08: Explainable Job Recommendations with Consent Management**
  - Personalized recommendation algorithm
  - Consent management system
  - Match scoring and explanations
  - Skill gap analysis
- **REQ-09: Full-Text Search with Rate Limiting and Filtering**
  - Unified search across multiple domains
  - Relevance ranking algorithm
  - Rate limiting implementation
  - Advanced filtering and pagination

#### **Satrajit Ghosh** - Game Engine & Reliability
- **REQ-11: Reliability with Idempotent APIs and Battle State Checkpoints**
  - Idempotent API implementation
  - Battle state checkpoint system
  - Reconnection handling
  - Judge timeout management
- **REQ-12: WebGL2 Game Client with Server-Authoritative Real-Time Protocol**
  - Three.js WebGL2 game engine
  - Server-authoritative architecture
  - Client prediction and correction
  - 60 FPS rendering optimization
  - Latency compensation system

### How to Contribute

We welcome contributions! Please follow these guidelines:

1. **Fork the repository**
2. **Create a feature branch:** `git checkout -b feature/amazing-feature`
3. **Follow coding standards:**
   - Use ESLint for code formatting
   - Write unit tests for new features
   - Update documentation
4. **Test your changes:**
   ```bash
   cd backend
   npm run test:unit
   npm run test:api
   ```
5. **Commit your changes:** `git commit -m 'Add amazing feature'`
6. **Push to the branch:** `git push origin feature/amazing-feature`
7. **Open a Pull Request**

### Development Guidelines

- **API Design:** Follow RESTful principles, include input validation
- **Security:** Always validate user input, use parameterized queries
- **Testing:** Write tests for all new features, maintain >80% coverage
- **Documentation:** Update README and API docs for new endpoints
- **Code Review:** All PRs require at least one team member approval

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by LeetCode and competitive programming platforms
- Tower defense mechanics inspired by classic TD games
- Thanks to all contributors and testers
- Special thanks to the Software Engineering course instructors

---

Made with ❤️ by the Code and Conquer Team

**Team Members:**
- Kevin Dang (Authentication & Payments)
- Doug Lavin (Matchmaking & Leaderboards)
- Tariq H Fahumy (Code Execution & Problem Management)
- Clementine Vander Vliet (Task Management & Rewards)
- Tanushree Debbarma (Job Recommendations & Search)
- Satrajit Ghosh (Game Engine & Reliability)
