# 🚀 Aegis AI - Quick Database Setup Guide

## Option 1: Use Supabase (Recommended - Fastest 5-minute setup)

### Step 1: Create Free Supabase Account
1. Go to https://supabase.com
2. Sign up (free tier available)
3. Create a new project

### Step 2: Get Connection String
1. Go to Project Settings → Database → Connection String
2. Copy the PostgreSQL connection string
3. Replace password in the string with your actual password

### Step 3: Update Environment Files
Update **both** of these files:

#### File 1: `d:\Aegis-Ai\apps\web\.env.local`
```
DATABASE_URL=postgresql://[user]:[password]@[host]:5432/[database]?schema=public&connection_limit=10
REDIS_URL=redis://localhost:6379
```

#### File 2: `d:\Aegis-Ai\.env.local`
```
DATABASE_URL=postgresql://[user]:[password]@[host]:5432/[database]?schema=public&connection_limit=10
REDIS_URL=redis://localhost:6379
```

### Step 4: Run Migrations
```bash
cd d:\Aegis-Ai
npm run migrate:deploy
```

### Step 5: Restart Web App
```bash
cd d:\Aegis-Ai\apps\web
npm run dev
```

---

## Option 2: Fix Local PostgreSQL (If You Prefer Local Setup)

### Issue Identified:
- PostgreSQL installed but has authentication issues on Windows
- Advisory lock timeout during migrations

### Solution:
1. **Reinstall PostgreSQL:**
   - Uninstall current PostgreSQL 18
   - Download PostgreSQL 16+ from https://www.postgresql.org/download/windows/
   - During installation, set:
     - Password for postgres user: `password`
     - Port: 5432
   - **Important**: Choose "Trust" authentication during setup

2. **Create Database:**
   ```bash
   # In PowerShell as Administrator
   $env:PGPASSWORD='password'
   C:\Program Files\PostgreSQL\16\bin\psql.exe -U postgres -h localhost -c "CREATE DATABASE aegis_ai;"
   ```

3. **Update .env.local:**
   ```
   DATABASE_URL=postgresql://postgres:password@localhost:5432/aegis_ai?connection_limit=10&schema=public
   ```

4. **Run Migrations:**
   ```bash
   cd d:\Aegis-Ai
   npm run migrate:deploy
   ```

---

## ✅ Testing After Setup

1. **Restart Web Server:**
   ```sh
   cd d:\Aegis-Ai\apps\web
   npm run dev
   ```

2. **Test Sign-In:**
   - Open `http://localhost:3000/login`
   - You should see the login form (no 500 errors)

3. **Test Authentication:**
   ```bash
   curl -X POST http://localhost:3000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "TestPass123!",
       "name": "Test User"
     }'
   ```

4. **Test Chat (After login):**
   - Create your account
   - Send a message to test the chatbot

---

## 🔧 Configuration Checklist

- [ ] DATABASE_URL is set correctly in `.env.local` (both files)
- [ ] Redis URL is set to `redis://localhost:6379`
- [ ] Migrations have been run with `npm run migrate:deploy`
- [ ] Web server is running on port 3000
- [ ] Browser shows no 500 errors on login page

---

## 🆘 Still Having Issues?

###Symptoms:
- "Authentication failed" on login
- "Timed out trying to acquire advisory lock"
- "Connection refused"

### Debug Steps:
1. **Test database connection directly:**
   ```bash
   psql -U [user] -h [host] -d [database] -c "SELECT 1;"
   ```

2. **Check if Redis is running:**
   ```bash
   redis-cli ping  # Should return "PONG"
   ```

3. **View server logs:**
   - Keep the `npm run dev` window open
   - Look for error messages when you try to sign in

4. **Reset database (if needed):**
   ```bash
   # Supabase: Delete project and create new
   # Local: DROP DATABASE aegis_ai; CREATE DATABASE aegis_ai;
   ```

---

## 📚 Environment Variables Reference

| Variable | Purpose | Example |
|----------|---------|---------|
| `DATABASE_URL` | PostgreSQL connection | `postgresql://user:pass@host:5432/db` |
| `REDIS_URL` | Redis queue system | `redis://localhost:6379` |
| `JWT_ACCESS_SECRET` | API auth tokens | 32+ character string |
| `JWT_REFRESH_SECRET` | Token refresh | 32+ character string |
| `ENCRYPTION_KEY` | Data encryption | 32 character hex string |
| `OPENROUTER_API_KEY` | AI model access | `sk-or-v1-...` |

---

**Recommended: Use Supabase for 99% fewer setup headaches!**
