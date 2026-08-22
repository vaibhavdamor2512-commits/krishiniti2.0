# Krishiniti Deployment Guide

## Quick Deployment (Manual - Recommended)

### Step 1: Deploy Backend to Render (One-time setup)

1. **Go to Render.com**
   - Visit https://render.com
   - Sign up/login with GitHub

2. **Create Backend Service**
   - Click "New +" → "Web Service"
   - Connect GitHub repository: `vaibhavdamor2512-commits/krishiniti2.0`
   - Configure:
     - **Name:** `krishiniti-backend`
     - **Branch:** `main`
     - **Root Directory:** `backend`
     - **Runtime:** Python 3
     - **Build Command:** `pip install -r requirements.txt`
     - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
     - **Health Check Path:** `/health`
   - Environment variables will be auto-imported from `backend/render.yaml`
   - Click "Create Web Service"
   - Wait 2-3 minutes for deployment
   - **Copy your backend URL** (e.g., `https://krishiniti-backend.onrender.com`)

### Step 2: Update Vercel Frontend (One-time setup)

1. **Go to Vercel Dashboard**
   - Visit https://vercel.com/dashboard
   - Find `krishiniti2-0` project

2. **Add Environment Variable**
   - Settings → Environment Variables
   - Add: `VITE_API_URL` = `https://krishiniti-backend.onrender.com/api`
   - Select all environments (Production, Preview, Development)
   - Save

3. **Redeploy**
   - Deployments → "..." → "Redeploy"

### Step 3: Test

1. Visit https://krishiniti2-0.vercel.app
2. Test demo login: `9999999999` / `demo123`
3. Test new user registration and login
4. Verify all features work

## GitHub Actions (Optional - for CI/CD)

The `.github/workflows/deploy-backend.yml` file provides:
- Automated testing on every push
- Code quality checks
- Test coverage reporting

This ensures code quality before you manually deploy to Render.

## Environment Variables Reference

### Backend (Render)
- `DATABASE_URL` - PostgreSQL connection (auto-generated)
- `JWT_SECRET` - JWT signing secret (auto-generated)
- `FRONTEND_URL` - Your Vercel frontend URL
- `CORS_ORIGINS` - Allowed frontend origins
- `DEMO_MODE` - Set to `true` for demo data

### Frontend (Vercel)
- `VITE_API_URL` - Backend API URL
- `VITE_DEMO_MODE` - Demo mode toggle

## Troubleshooting

### Backend Deployment Issues
- Check Render logs for errors
- Verify environment variables are set
- Ensure Python version compatibility
- Check database connection

### Frontend Issues
- Verify `VITE_API_URL` is correct
- Check Vercel deployment logs
- Ensure CORS is configured correctly
- Test backend health endpoint

### Login Issues
- Verify backend is running
- Check CORS configuration
- Test API endpoints directly
- Verify database has user data

## Support

For issues with:
- **Render deployment:** Check Render dashboard logs
- **Vercel deployment:** Check Vercel dashboard logs  
- **Application bugs:** Check GitHub issues or create new one