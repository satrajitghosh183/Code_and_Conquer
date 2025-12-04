# 🚀 Code and Conquer - Deployment Guide

Complete guide for deploying Code and Conquer to production environments.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Local Development](#local-development)
- [Docker Deployment](#docker-deployment)
- [Cloud Deployment Options](#cloud-deployment-options)
- [Database Setup](#database-setup)
- [Monitoring & Logging](#monitoring--logging)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Services

1. **Supabase Account** - For authentication and database
   - Sign up at [supabase.com](https://supabase.com)
   - Create a new project
   - Note your project URL and keys

2. **Node.js 20+** - For local development
   - Download from [nodejs.org](https://nodejs.org)

3. **Docker & Docker Compose** - For containerized deployment
   - Download from [docker.com](https://docker.com)

### Optional Services

- **Stripe** - For payment processing (premium features)
- **Redis** - For caching and session storage

## Environment Setup

### Backend Environment Variables

Create `backend/.env` from `backend/env.example`:

```bash
# Required
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Server Configuration
PORT=5000
HOST=0.0.0.0
NODE_ENV=production
CLIENT_URL=https://your-frontend-domain.com

# Optional: Payments
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Optional: Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
EXECUTION_TIMEOUT=10000
LOG_LEVEL=info
```

### Frontend Environment Variables

Create `frontend/.env` from `frontend/env.example`:

```bash
VITE_API_URL=https://your-api-domain.com/api
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Optional: Payments
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
VITE_STRIPE_PRICE_ID=price_xxx
```

## Local Development

### Quick Start

```bash
# Clone repository
git clone https://github.com/your-repo/code-and-conquer.git
cd code-and-conquer

# Install dependencies
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# Start development servers
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

### With Docker (Development)

```bash
# Build and run with Docker Compose
docker-compose -f docker-compose.yml up --build

# Or run with Redis for caching
docker-compose --profile with-redis up --build
```

## Docker Deployment

### Production Build

```bash
# Create .env file in root directory
cp .env.example .env
# Edit .env with your production values

# Build and run
docker-compose up -d --build

# View logs
docker-compose logs -f

# Check health
curl http://localhost:5000/api/health
```

### Docker Commands Reference

```bash
# Stop services
docker-compose down

# Rebuild a specific service
docker-compose build backend
docker-compose up -d backend

# View container stats
docker stats

# Access container shell
docker exec -it cac-backend sh
```

## Cloud Deployment Options

### 1. Fly.io (Recommended)

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Deploy backend
cd backend
fly launch --name your-app-backend
fly secrets set SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx
fly deploy

# Deploy frontend
cd ../frontend
fly launch --name your-app-frontend
fly deploy
```

### 2. Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy from render.yaml blueprint
railway up
```

Or use the web interface:
1. Go to [railway.app](https://railway.app)
2. Connect your GitHub repository
3. Railway will auto-detect the `render.yaml` configuration

### 3. Render

1. Go to [render.com](https://render.com)
2. Create a new "Blueprint" instance
3. Connect your GitHub repository
4. Render will use the `render.yaml` configuration

### 4. DigitalOcean App Platform

```yaml
# app.yaml for DigitalOcean
spec:
  name: code-and-conquer
  services:
    - name: backend
      source:
        repo: your-repo
        branch: main
        root: backend
      run_command: npm start
      environment_slug: node-js
      envs:
        - key: NODE_ENV
          value: production
    - name: frontend
      source:
        repo: your-repo
        branch: main
        root: frontend
      build_command: npm ci && npm run build
      environment_slug: static
```

## Database Setup

### Supabase Schema

Run these SQL commands in Supabase SQL Editor:

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  avatar_url TEXT,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  coins INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Problems table
CREATE TABLE IF NOT EXISTS problems (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  category TEXT,
  xp_reward INTEGER DEFAULT 10,
  time_limit_ms INTEGER DEFAULT 5000,
  memory_limit_mb INTEGER DEFAULT 256,
  starter_code JSONB DEFAULT '{}',
  solution_code TEXT,
  test_cases JSONB DEFAULT '[]',
  hidden_test_cases JSONB DEFAULT '[]',
  tags JSONB DEFAULT '[]',
  constraints JSONB DEFAULT '[]',
  hints JSONB DEFAULT '[]',
  is_premium BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Submissions table
CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  problem_id TEXT REFERENCES problems(id),
  user_id UUID REFERENCES auth.users(id),
  code TEXT NOT NULL,
  language TEXT NOT NULL,
  verdict TEXT DEFAULT 'pending',
  test_results JSONB DEFAULT '[]',
  execution_time_ms INTEGER DEFAULT 0,
  memory_used_mb NUMERIC DEFAULT 0,
  test_cases_passed INTEGER DEFAULT 0,
  test_cases_total INTEGER DEFAULT 0,
  score INTEGER,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read all, update own
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- Problems: Everyone can read
CREATE POLICY "Problems are viewable by everyone"
  ON problems FOR SELECT USING (true);

-- Submissions: Users can read own, insert own
CREATE POLICY "Users can view own submissions"
  ON submissions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own submissions"
  ON submissions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_problems_difficulty ON problems(difficulty);
CREATE INDEX idx_problems_category ON problems(category);
CREATE INDEX idx_submissions_user_id ON submissions(user_id);
CREATE INDEX idx_submissions_problem_id ON submissions(problem_id);
```

## Monitoring & Logging

### Health Checks

The backend provides these health endpoints:

- `GET /api/health` - Detailed health status
- `GET /api/ready` - Readiness probe

Example response:
```json
{
  "status": "ok",
  "timestamp": "2024-12-04T10:00:00.000Z",
  "uptime": 3600,
  "services": {
    "authDatabase": true,
    "storage": true,
    "publicDatabase": true
  },
  "memory": {
    "used": 128,
    "total": 256,
    "unit": "MB"
  }
}
```

### Log Levels

Set `LOG_LEVEL` environment variable:
- `error` - Only errors
- `warn` - Warnings and errors
- `info` - General info (recommended for production)
- `debug` - Detailed debugging (development)

### Container Logs

```bash
# View all logs
docker-compose logs -f

# View specific service
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100 backend
```

## Troubleshooting

### Common Issues

#### 1. CORS Errors
Ensure `CLIENT_URL` in backend matches your frontend domain exactly.

#### 2. Supabase Connection Failed
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- Check if your IP is allowlisted in Supabase settings

#### 3. Container Won't Start
```bash
# Check logs
docker-compose logs backend

# Verify environment variables
docker-compose config
```

#### 4. High Memory Usage
- Reduce `RATE_LIMIT_MAX_REQUESTS`
- Lower `EXECUTION_TIMEOUT`
- Consider adding Redis for caching

### Support

For issues, please:
1. Check the logs: `docker-compose logs -f`
2. Verify environment variables
3. Check health endpoint: `curl /api/health`
4. Create a GitHub issue with:
   - Error message
   - Environment (local/docker/cloud)
   - Steps to reproduce

---

Happy deploying! 🎮

