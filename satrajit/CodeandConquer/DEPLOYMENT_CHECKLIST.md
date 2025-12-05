# 🚀 Code & Conquer Deployment Checklist

## Prerequisites
- [ ] Supabase project set up with database tables
- [ ] GitHub repo with latest code pushed

---

## Backend (Render)

### 1. Create Web Service
- [ ] Go to [render.com](https://render.com)
- [ ] New → Web Service → Connect GitHub repo
- [ ] Set Root Directory: `backend`
- [ ] Runtime: Node
- [ ] Build Command: `npm install`
- [ ] Start Command: `npm start`

### 2. Environment Variables
```
NODE_ENV=production
PORT=5000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
CLIENT_URL=https://your-app.vercel.app  (add after Vercel deploy)
```

### 3. Deploy & Note URL
- [ ] Click Create Web Service
- [ ] Wait for deployment (first deploy takes 2-5 minutes)
- [ ] Copy URL: `https://____________.onrender.com`

---

## Frontend (Vercel)

### 1. Import Project
- [ ] Go to [vercel.com](https://vercel.com)
- [ ] Add New → Project → Import GitHub repo
- [ ] Set Root Directory: `frontend`
- [ ] Framework: Vite (auto-detected)

### 2. Environment Variables
```
VITE_API_URL=https://YOUR-RENDER-URL.onrender.com/api
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Deploy & Note URL
- [ ] Click Deploy
- [ ] Wait for build (1-2 minutes)
- [ ] Copy URL: `https://____________.vercel.app`

---

## Post-Deployment

### Update Render CORS
- [ ] Go to Render → Your Service → Environment
- [ ] Update `CLIENT_URL` with your Vercel URL
- [ ] Save Changes (triggers redeploy)

### Update Supabase Auth
- [ ] Go to Supabase → Authentication → URL Configuration
- [ ] Set Site URL: `https://your-app.vercel.app`
- [ ] Add Redirect URLs:
  - `https://your-app.vercel.app`
  - `https://your-app.vercel.app/auth/callback`

---

## Testing

- [ ] Visit your Vercel URL
- [ ] Test login/signup
- [ ] Test the game loads (no black screen)
- [ ] Test problems page loads
- [ ] Test multiplayer matchmaking connects

---

## Troubleshooting

### "Failed to fetch" errors
- Check CORS: `CLIENT_URL` on Render must match your Vercel domain exactly

### Login not working
- Check Supabase redirect URLs include your Vercel domain

### Game shows black screen
- Check browser console for errors
- Ensure VITE_API_URL is set correctly on Vercel

### Socket.IO not connecting
- Render free tier may spin down after 15 min inactivity
- First request after idle takes ~30 seconds to wake up

---

## URLs Reference

| Service | URL |
|---------|-----|
| Frontend (Vercel) | `https://_____.vercel.app` |
| Backend (Render) | `https://_____.onrender.com` |
| API Endpoint | `https://_____.onrender.com/api` |
| Supabase | `https://_____.supabase.co` |

