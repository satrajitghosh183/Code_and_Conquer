# 🚀 Code and Conquer - Deployment Guide

Complete guide for deploying Code and Conquer to production with **Vercel** (frontend) and **Render** (backend), with 3D models hosted on **GitHub CDN**.

## 📋 Table of Contents

- [Quick Start (Recommended)](#quick-start-recommended)
- [Step 1: Push to GitHub](#step-1-push-to-github)
- [Step 2: Deploy Backend to Render](#step-2-deploy-backend-to-render)
- [Step 3: Deploy Frontend to Vercel](#step-3-deploy-frontend-to-vercel)
- [Step 4: Configure 3D Models CDN](#step-4-configure-3d-models-cdn)
- [Step 5: Update OAuth & Supabase](#step-5-update-oauth--supabase)
- [Alternative Deployment Options](#alternative-deployment-options)
- [Troubleshooting](#troubleshooting)

---

## Quick Start (Recommended)

```bash
# 1. Push your code to GitHub
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/CodeandConquer.git
git push -u origin main

# 2. Deploy Backend: Go to render.com → New → Blueprint → Connect GitHub repo
# 3. Deploy Frontend: Go to vercel.com → Import → Select GitHub repo → Set root to 'frontend'
# 4. Set environment variables in both platforms (see sections below)
```

---

## Step 1: Push to GitHub

### Create a new GitHub repository

1. Go to [github.com/new](https://github.com/new)
2. Create a repository named `CodeandConquer` (or your preferred name)
3. Keep it **Public** (required for free jsDelivr CDN) or **Private** with paid CDN
4. Don't initialize with README (you already have one)

### Push your code

```bash
# Initialize git if not already done
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - Code and Conquer"

# Add your remote
git remote add origin https://github.com/YOUR_USERNAME/CodeandConquer.git

# Push
git push -u origin main
```

---

## Step 2: Deploy Backend to Render

### Option A: Using Render Blueprint (Easiest)

1. Go to [render.com](https://render.com) and sign up/login
2. Click **New** → **Blueprint**
3. Connect your GitHub account and select your repository
4. Render will auto-detect the `render.yaml` configuration
5. Set the required environment variables:

| Variable | Value |
|----------|-------|
| `SUPABASE_URL` | `https://cbekdaqtdqqwzyexmfgp.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key |
| `CLIENT_URL` | `https://your-app.vercel.app` (update after frontend deploys) |
| `STRIPE_SECRET_KEY` | (Optional) Your Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | (Optional) Your Stripe webhook secret |

6. Click **Apply** and wait for deployment

### Option B: Manual Web Service

1. Go to [render.com](https://render.com) → **New** → **Web Service**
2. Connect your GitHub repo
3. Configure:
   - **Name**: `code-and-conquer-backend`
   - **Root Directory**: `backend`
   - **Runtime**: Node
   - **Build Command**: `npm ci --only=production`
   - **Start Command**: `npm start`
4. Add environment variables as shown above
5. Deploy

### Get your Backend URL

After deployment, your backend will be available at:
```
https://code-and-conquer-backend.onrender.com
```

Save this URL for the frontend configuration.

---

## Step 3: Deploy Frontend to Vercel

### Deploy via Vercel Dashboard

1. Go to [vercel.com](https://vercel.com) and sign up/login with GitHub
2. Click **Add New** → **Project**
3. Import your `CodeandConquer` repository
4. Configure the project:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

5. Add Environment Variables:

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://code-and-conquer-backend.onrender.com/api` |
| `VITE_SUPABASE_URL` | `https://cbekdaqtdqqwzyexmfgp.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `VITE_MODELS_CDN_URL` | `https://cdn.jsdelivr.net/gh/YOUR_USERNAME/CodeandConquer@main/frontend` |
| `VITE_STRIPE_PUBLISHABLE_KEY` | (Optional) Your Stripe publishable key |
| `VITE_STRIPE_PRICE_ID` | (Optional) Your Stripe price ID |

6. Click **Deploy**

### Get your Frontend URL

After deployment, your frontend will be available at:
```
https://your-project.vercel.app
```

---

## Step 4: Configure 3D Models CDN

Your 3D models are automatically served via **jsDelivr CDN** from your GitHub repository.

### How it works

jsDelivr is a free CDN that serves files directly from GitHub. The URL format is:
```
https://cdn.jsdelivr.net/gh/USERNAME/REPO@BRANCH/PATH
```

For your models:
```
https://cdn.jsdelivr.net/gh/YOUR_USERNAME/CodeandConquer@main/frontend/models/watch_tower.glb
https://cdn.jsdelivr.net/gh/YOUR_USERNAME/CodeandConquer@main/frontend/Models/aa_turret.glb
```

### Set the Environment Variable

In **Vercel** (frontend):
```
VITE_MODELS_CDN_URL=https://cdn.jsdelivr.net/gh/YOUR_USERNAME/CodeandConquer@main/frontend
```

### Verify Models are Loading

After deployment, open browser DevTools (F12) → Network tab and check that model files are loading from `cdn.jsdelivr.net`.

### Alternative: Use Supabase Storage

If you prefer to host models in Supabase Storage:

1. Go to Supabase Dashboard → Storage → Create bucket named `models`
2. Set bucket to **Public**
3. Upload all `.glb` files from `frontend/public/models/` and `frontend/Models/`
4. Use this as your CDN URL:
   ```
   VITE_MODELS_CDN_URL=https://cbekdaqtdqqwzyexmfgp.supabase.co/storage/v1/object/public/models
   ```

---

## Step 5: Update OAuth & Supabase

### Update Supabase Auth Settings

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Authentication** → **URL Configuration**
4. Update:
   - **Site URL**: `https://your-project.vercel.app`
   - **Redirect URLs**: Add `https://your-project.vercel.app/*`

### Update Backend CORS

Go to Render Dashboard and update the `CLIENT_URL` environment variable:
```
CLIENT_URL=https://your-project.vercel.app
```

Trigger a redeploy in Render.

---

## Environment Variables Summary

### Backend (Render)

```bash
# Required
NODE_ENV=production
PORT=5000
HOST=0.0.0.0
DATABASE_TYPE=supabase
SUPABASE_URL=https://cbekdaqtdqqwzyexmfgp.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
CLIENT_URL=https://your-app.vercel.app

# Optional
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
LOG_LEVEL=info
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
EXECUTION_TIMEOUT=10000
```

### Frontend (Vercel)

```bash
# Required
VITE_API_URL=https://your-backend.onrender.com/api
VITE_SUPABASE_URL=https://cbekdaqtdqqwzyexmfgp.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_MODELS_CDN_URL=https://cdn.jsdelivr.net/gh/username/repo@main/frontend

# Optional
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
VITE_STRIPE_PRICE_ID=price_xxx
```

---

## Alternative Deployment Options

### Fly.io (Backend)

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Deploy backend
cd backend
fly launch --name code-and-conquer-backend
fly secrets set SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx CLIENT_URL=xxx
fly deploy
```

### Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login & deploy
railway login
railway up
```

### Docker Compose (Self-hosted)

```bash
# Create .env file in root
cp .env.example .env
# Edit .env with your values

# Build and run
docker-compose up -d --build

# View logs
docker-compose logs -f
```

---

## Troubleshooting

### Models not loading in production

1. Check browser DevTools → Network tab for 404 errors
2. Verify `VITE_MODELS_CDN_URL` is set correctly
3. Make sure your GitHub repo is **public** for jsDelivr
4. Try accessing a model URL directly in browser

### CORS Errors

1. Verify `CLIENT_URL` in backend matches your frontend URL exactly
2. Check for trailing slashes (shouldn't have one)
3. Redeploy backend after updating environment variables

### Supabase Connection Failed

1. Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
2. Check Supabase dashboard for any IP restrictions
3. Ensure your Supabase project is active (not paused)

### Build Failures

**Backend on Render:**
```bash
# Check logs
# Render Dashboard → Your Service → Logs
```

**Frontend on Vercel:**
```bash
# Check build logs
# Vercel Dashboard → Your Project → Deployments → Click latest → Build Logs
```

### Health Check

Test your backend is running:
```bash
curl https://your-backend.onrender.com/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-12-05T10:00:00.000Z",
  "uptime": 3600
}
```

---

## Production Checklist

- [ ] Code pushed to GitHub
- [ ] Backend deployed to Render
- [ ] Frontend deployed to Vercel
- [ ] Environment variables set in both platforms
- [ ] `CLIENT_URL` updated to Vercel URL
- [ ] Supabase auth redirect URLs updated
- [ ] 3D models loading from CDN
- [ ] Health check endpoint responding
- [ ] Can login/register users
- [ ] Can load and play games

---

## Support

If you encounter issues:
1. Check deployment logs
2. Verify all environment variables
3. Test health endpoint
4. Create a GitHub issue with:
   - Error message
   - Deployment platform
   - Steps to reproduce

---

Happy deploying! 🎮🚀
