# Code & Conquer

**Conquer code. Boost productivity. Progress your way to mastery.**

A gamified learning platform that bridges the gap between coding practice and real-world productivity habits through competitive tower defense gameplay.

---

## Team Members

| Name | Responsibilities |
|------|------------------|
| Kevin Dang | Auth & Payments, Search & Policy |
| Satrajit Ghosh | Graphics Engine, Matchmaking & Real-time |
| Tariq H Fahumy | Judge Service, Problem Curation |
| Tanushree Debbarma | Search & Jobs, Payments |
| Clementine Vander Vliet | Task Integration, Analytics & Jobs |
| Doug Lavin | Matchmaking, Leaderboards, Admin Tools |

---

## Project Overview

### The Problem
- **25%** of recent graduates are job-ready within 6 months
- **53%** of new graduates lack the full range of coding, consistency, and professionalism employers desire
- **62%** of employers report difficulty finding candidates with balanced technical and soft skills
- Students lack engaging systems that connect coding mastery with real-world productivity habits

### Our Solution
Code & Conquer gamifies developer education through:
- **Competitive 1v1 tower defense** where coding outcomes fuel live battles
- **Short, actionable learning modules** matching Gen Z learning styles
- **Productivity integration** with Calendar/Todoist for habit formation
- **AI-generated scenarios** providing fresh, real-world coding challenges
- **Career readiness tracking** with explainable job recommendations

---

## Core Features

### 1. Authentication & User Management
- OAuth 2.0 sign-in (Google, GitHub)
- Role-based access control (Visitor, User, Premium, Curator, Admin)
- Session management with automatic token refresh
- Privacy controls and GDPR compliance

### 2. Coding Problems & Judge
- Curated problem catalog with difficulty ratings and categories
- Sandboxed code execution with time/memory limits
- Comprehensive verdict system (Accepted, Wrong Answer, TLE, MLE, Runtime Error, Compilation Error)
- Version-controlled problem curation with admin review workflow
- Full-text search across problem catalog

### 3. Real-Time Tower Defense Game
- WebGL2 game client with server-authoritative state
- ELO-based matchmaking (±200 rating window, 60s queue timeout)
- Live 1v1 battles where coding verdicts = buffs/debuffs
- Instanced rendering for stable 60 FPS performance
- WebSocket protocol with state snapshots (100ms intervals)
- Reconnection support with 2-minute grace period

### 4. Task & Productivity Integration
- Google Calendar and Todoist synchronization
- Duplicate detection and conflict resolution
- Streak tracking with bonus multipliers (1.5x at 7 days)
- Task validation (24-hour completion window)
- Daily reward caps with diminishing returns
- Rewards apply to current or next match

### 5. Leaderboards & Rankings
- Multiple leaderboard types (ELO, seasonal, win rate, solve count)
- Privacy-safe rankings (opt-in public display)
- Season management with quarterly resets
- Match history with replay data

### 6. Payments & Subscriptions
- Stripe and PayPal integration
- Monthly ($9.99) and annual ($99.99) plans
- Idempotent webhook handling
- Failed payment retry with 3-day grace period
- Ad-free experience for premium users

### 7. Analytics & Job Recommendations
- Performance tracking across problem categories
- Skill gap identification
- Explainable job recommendations with match scores
- Analytics consent management
- Automated recommendation recalculation

### 8. Global Search
- Full-text search across problems, jobs, leaderboards, and policies
- Multi-factor ranking (relevance, popularity, recency)
- Input throttling (10 requests/minute)
- Pagination (25 results/page)
- Advanced filtering options

---

## Technical Architecture

### Backend Stack
- **Runtime:** Node.js with Express.js
- **Database:** PostgreSQL (Users, Problems, Jobs, Tasks, Analytics)
- **Cache:** Redis (sessions, leaderboards, rate limiting)
- **Object Storage:** Cloud storage for problem assets
- **Real-time:** WebSocket with MessagePack serialization

### Frontend Stack
- **Client:** Vanilla JavaScript, HTML5, CSS3
- **Graphics:** WebGL2 with GLSL ES 3.0 shaders
- **Rendering:** Entity-Component System with instanced geometry
- **No heavyweight frameworks** (course requirement)

### External APIs
- Google OAuth 2.0
- GitHub OAuth
- Google Calendar API
- Todoist API
- Stripe API
- PayPal API

### Key Design Patterns
- Server-authoritative game state
- Idempotent API design
- Event-driven architecture (webhooks, battle events)
- State checkpointing (10s intervals)
- Rate limiting and throttling
- Privacy-by-design

---

## Project Structure

```
code-and-conquer/
├── docs/
│   ├── Report_1_Proposal_Requirements_UseCases.pdf
│   ├── architecture/
│   └── api-specs/
├── server/
│   ├── auth/              # OAuth & session management
│   ├── problems/          # Problem catalog & judge
│   ├── tasks/             # Calendar/Todoist integration
│   ├── game/              # Matchmaking & battle engine
│   ├── leaderboards/      # Ranking computation
│   ├── payments/          # Stripe/PayPal webhooks
│   ├── jobs/              # Job recommendations
│   ├── search/            # Full-text search
│   ├── analytics/         # Performance tracking
│   └── realtime/          # WebSocket gateway
├── client/
│   ├── webgl/             # Game renderer
│   ├── ui/                # Minimal web UI
│   └── assets/            # Shaders, textures
├── judge/
│   └── sandbox/           # Code execution environment
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/
```

---

## Sub-Group Assignments

### Sub-group Alpha: Graphics & Game Engine
**Members:** Doug Lavin, Satrajit Ghosh

**Responsibilities:**
- WebGL2 game client and renderer
- Real-time gateway (WebSocket server)
- Matchmaking service (ELO-based pairing)
- Battle state machine
- Leaderboard computation

**Can Demo Independently:** Bot matches with mocked judge verdicts, showing frame-accurate state updates and leaderboard writes

---

### Sub-group Beta: Auth & Payments + Search
**Members:** Kevin Dang, Tanushree Debbarma

**Responsibilities:**
- OAuth authentication (Google, GitHub)
- Session and entitlement management
- Payment processing (Stripe, PayPal)
- Webhook idempotency
- Full-text search engine
- Ad policy management

**Can Demo Independently:** OAuth flow → subscription purchase → feature unlock → search functionality

---

### Sub-group Gamma: Problems & Tasks + Analytics
**Members:** Tariq H Fahumy, Clementine Vander Vliet

**Responsibilities:**
- Problem catalog and versioning
- Sandboxed judge service
- Calendar/Todoist integration
- Task validation and rewards
- Analytics engine
- Job recommendations

**Can Demo Independently:** Problem submission → judge verdict → task completion → reward generation → job recommendation

---

## Development Progress

### Report 1: Proposal, Requirements & Use Cases ✅
**Due Date:** October 3, 2025  
**Status:** COMPLETE

- [x] Project proposal and description
- [x] Team sub-group partitioning
- [x] Data collections and operations
- [x] Business rules and policies
- [x] 12 requirements with ownership
- [x] Glossary of business terms
- [x] 9 use cases with ownership
- [x] Detailed use case scenarios
- [x] System sequence diagrams
- [x] Traceability matrix

---

### Report 2: Database Schema & API Specification
**Due Date:** November 4, 2025  
**Status:** NOT STARTED

#### Database Schema (Part 1)
- [ ] Users table schema
- [ ] Problems table schema
- [ ] Tasks table schema
- [ ] Game/Leaderboards table schema
- [ ] Jobs table schema
- [ ] Redis cache structure
- [ ] Object storage schema
- [ ] Analytics time-series schema
- [ ] ER diagram
- [ ] Index strategy
- [ ] Data migration plan

#### API Specification (Part 2)
- [ ] RESTful API endpoints
  - [ ] Auth API (`/api/auth/*`)
  - [ ] Problems API (`/api/problems/*`)
  - [ ] Tasks API (`/api/tasks/*`)
  - [ ] Game API (`/api/game/*`)
  - [ ] Leaderboards API (`/api/leaderboards/*`)
  - [ ] Payments API (`/api/payments/*`)
  - [ ] Jobs API (`/api/jobs/*`)
  - [ ] Search API (`/api/search/*`)
  - [ ] Analytics API (`/api/analytics/*`)
- [ ] WebSocket protocol specification
- [ ] Request/response schemas (JSON)
- [ ] Error handling conventions
- [ ] Rate limiting specifications
- [ ] Authentication/authorization flow
- [ ] API versioning strategy
- [ ] Updated sequence diagrams with API calls

---

### Report 3: Implementation & Final Documentation
**Due Date:** December 19, 2025  
**Status:** NOT STARTED

#### API Implementation Docs (Part 1)
- [ ] Endpoint implementation status
- [ ] API testing results
- [ ] Performance benchmarks
- [ ] Security audit results
- [ ] Deployment documentation

#### Combined Report (Part 2)
- [ ] All previous reports updated
- [ ] Feedback addressed
- [ ] Final architecture diagram
- [ ] Complete API reference
- [ ] Deployment guide

---

## Feature Implementation Checklist

### Authentication & Authorization
- [ ] Google OAuth integration
- [ ] GitHub OAuth integration
- [ ] JWT token generation/validation
- [ ] Token refresh mechanism
- [ ] Role-based middleware
- [ ] Session storage (Redis)
- [ ] Login rate limiting
- [ ] Password-less authentication

### Problems & Judge Service
- [ ] Problem CRUD operations
- [ ] Test case management
- [ ] Docker-based sandbox
- [ ] Time/memory limit enforcement
- [ ] Verdict generation
- [ ] Plagiarism detection
- [ ] Problem versioning
- [ ] Admin review workflow
- [ ] Problem search indexing

### Task Integration
- [ ] Google Calendar OAuth
- [ ] Todoist OAuth
- [ ] Task synchronization service
- [ ] Duplicate detection algorithm
- [ ] Conflict resolution UI
- [ ] Streak calculation
- [ ] Reward generation
- [ ] Daily cap enforcement
- [ ] Webhook handlers (Calendar/Todoist)

### Game & Matchmaking
- [ ] ELO calculation system
- [ ] Matchmaking queue (Redis)
- [ ] Bot opponent system
- [ ] Battle state machine
- [ ] WebSocket server
- [ ] State snapshot generation
- [ ] Buff/debuff system
- [ ] Match history storage
- [ ] Reconnection handling
- [ ] State checkpointing

### Leaderboards
- [ ] ELO leaderboard computation
- [ ] Seasonal leaderboard
- [ ] Win rate leaderboard
- [ ] Solve count leaderboard
- [ ] Privacy filtering
- [ ] Season reset automation
- [ ] Leaderboard caching (Redis)

### Payments
- [ ] Stripe checkout integration
- [ ] PayPal checkout integration
- [ ] Webhook signature verification
- [ ] Idempotency key handling
- [ ] Subscription management
- [ ] Failed payment retry logic
- [ ] Grace period enforcement
- [ ] Refund processing
- [ ] Entitlement updates

### Analytics & Jobs
- [ ] Performance metrics collection
- [ ] Skill profiling algorithm
- [ ] Job listing ingestion
- [ ] Recommendation engine
- [ ] Match score calculation
- [ ] Explainability generation
- [ ] Consent management
- [ ] Recommendation recalculation

### Search
- [ ] Full-text search engine setup
- [ ] Problem indexing
- [ ] Job indexing
- [ ] Policy document indexing
- [ ] Multi-collection search
- [ ] Ranking algorithm
- [ ] Filter implementation
- [ ] Rate limiting
- [ ] Pagination

### WebGL Client
- [ ] Canvas setup and WebGL context
- [ ] Shader programs (vertex, fragment)
- [ ] Entity-Component System
- [ ] Instanced rendering
- [ ] Animation loop (60 FPS)
- [ ] State interpolation
- [ ] WebSocket client
- [ ] Input handling
- [ ] Camera system
- [ ] Particle effects
- [ ] UI overlay

### DevOps & Infrastructure
- [ ] PostgreSQL setup
- [ ] Redis setup
- [ ] Docker containers
- [ ] CI/CD pipeline
- [ ] Monitoring (logs, metrics)
- [ ] Error tracking
- [ ] Load balancing
- [ ] CDN setup (assets)
- [ ] SSL certificates
- [ ] Environment configuration

---

## Business Policies Implementation

### Matchmaking Policies
- [x] Defined: ELO window ±200
- [ ] Implemented: ELO matching algorithm
- [x] Defined: Queue timeout 60s
- [ ] Implemented: Queue timeout handler
- [x] Defined: Bot opponent fallback
- [ ] Implemented: Bot AI system

### Task Reward Policies
- [x] Defined: 24-hour validation window
- [ ] Implemented: Validation logic
- [x] Defined: Duplicate detection (1-hour window)
- [ ] Implemented: Duplicate detection algorithm
- [x] Defined: Streak rules (7-day milestone)
- [ ] Implemented: Streak calculation
- [x] Defined: Daily cap (5 tasks)
- [ ] Implemented: Cap enforcement

### Payment Policies
- [x] Defined: Subscription tiers ($9.99/$99.99)
- [ ] Implemented: Stripe products
- [x] Defined: Webhook idempotency
- [ ] Implemented: Idempotency middleware
- [x] Defined: Grace period (3 days)
- [ ] Implemented: Grace period scheduler

### Privacy Policies
- [x] Defined: GDPR compliance requirements
- [ ] Implemented: Data export API
- [x] Defined: Leaderboard opt-in
- [ ] Implemented: Privacy settings UI
- [x] Defined: Analytics consent
- [ ] Implemented: Consent management

---

## Testing Strategy

### Unit Tests
- [ ] Auth service tests
- [ ] Problem service tests
- [ ] Task service tests
- [ ] Game service tests
- [ ] Leaderboard tests
- [ ] Payment webhook tests
- [ ] Analytics tests
- [ ] Search tests

### Integration Tests
- [ ] OAuth flow end-to-end
- [ ] Problem submission → judge → verdict
- [ ] Task sync → validation → reward
- [ ] Matchmaking → battle → leaderboard update
- [ ] Payment → webhook → entitlement
- [ ] Search across collections

### E2E Tests
- [ ] User registration → first battle
- [ ] Task completion → reward → battle advantage
- [ ] Subscription purchase → feature unlock
- [ ] Problem solve → leaderboard rank change

### Performance Tests
- [ ] Matchmaking under load (1000 concurrent users)
- [ ] Battle state updates (50 concurrent matches)
- [ ] Search response time (<500ms p95)
- [ ] Leaderboard computation time

---


**Last Updated:** October 2, 2025  
**Project Status:** Requirements & Design Phase  
**Next Milestone:** Report 2 - Database Schema & API Specification (Nov 4, 2025)
