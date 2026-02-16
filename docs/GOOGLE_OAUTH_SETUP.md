# Google OAuth Setup Guide

This guide will help you set up Google OAuth login for Aegis AI.

## ✅ Completed Steps

The following have been implemented:

1. ✅ Database schema updated with OAuth fields
2. ✅ Google OAuth service created (`apps/web/src/services/auth/google-oauth.ts`)
3. ✅ Google OAuth API routes created
   - `/api/auth/google` - Initiates OAuth flow
   - `/api/auth/google/callback` - Handles OAuth callback
4. ✅ Login page updated with "Sign in with Google" button
5. ✅ Environment variables added to `.env`
6. ✅ Dependencies installed (`googleapis`)

## 🔧 Required Setup Steps

### 1. Apply Database Migration

Run ONE of the following options:

**Option A: Using Node.js script (Recommended)**
```bash
node scripts/run-oauth-migration.js
```

**Option B: Using psql CLI**
```bash
psql -U postgres -d aegis_ai -h localhost -f scripts/oauth-migration.sql
```

**Option C: Manual SQL (if psql not available)**
Open your PostgreSQL client (pgAdmin, DBeaver, etc.) and run:
```sql
ALTER TABLE "User" ALTER COLUMN "password" DROP NOT NULL;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "provider" VARCHAR(50);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "providerId" VARCHAR(255);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "picture" TEXT;
CREATE INDEX IF NOT EXISTS "User_provider_providerId_idx" ON "User"("provider", "providerId");
ALTER TABLE "User" ADD CONSTRAINT "User_provider_providerId_key" UNIQUE ("provider", "providerId");
```

### 2. Set Up Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google+ API" and enable it
4. Configure OAuth consent screen:
   - Go to "APIs & Services" > "OAuth consent screen"
   - Choose "External" user type
   - Fill in application name: "Aegis AI"
   - Add authorized domains: `localhost`
   - Add scopes: `email`, `profile`
5. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client ID"
   - Application type: "Web application"
   - Name: "Aegis AI Web"
   - Add authorized redirect URI: `http://localhost:3000/api/auth/google/callback`
   - Click "Create"
6. Copy the Client ID and Client Secret

### 3. Update Environment Variables

Edit your `.env` file (located at project root: `d:\Aegis-Ai\.env`):

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

Replace `your_google_client_id_here` and `your_google_client_secret_here` with the actual values from Google Cloud Console.

### 4. Restart Development Server

```bash
npm run dev
```

## 🧪 Testing

1. Navigate to http://localhost:3000/login
2. Click the "Sign in with Google" button
3. You should be redirected to Google's OAuth consent screen
4. After granting permissions, you'll be redirected back to your app
5. You should be logged in and redirected to `/dashboard`

## 🔍 Troubleshooting

### Error: "OAuth denied"
- Check that redirect URI matches exactly in Google Console and `.env`
- Ensure Google+ API is enabled

### Error: "Invalid credentials"
- Verify GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are correct
- Check for extra spaces or quotes in .env file

### Error: "Database error"
- Run the database migration script: `node scripts/run-oauth-migration.js`
- Verify database connection in `.env`

### Error: "Account banned"
- Check the `isBanned` field in the User table
- Unban the user if necessary

## 📁 Files Created/Modified

### Created Files:
- `apps/web/src/services/auth/google-oauth.ts` - OAuth service
- `apps/web/src/app/api/auth/google/route.ts` - OAuth redirect endpoint
- `apps/web/src/app/api/auth/google/callback/route.ts` - OAuth callback handler
- `scripts/oauth-migration.sql` - SQL migration script
- `scripts/run-oauth-migration.js` - Node.js migration script
- `docs/GOOGLE_OAUTH_SETUP.md` - This guide

### Modified Files:
- `prisma/schema.prisma` - Added OAuth fields to User model
- `.env` - Added Google OAuth environment variables
- `apps/web/src/lib/env.ts` - Added OAuth variable validation
- `apps/web/src/app/login/page.tsx` - Added Google login button

## 🔐 Security Notes

- OAuth tokens are never stored in the database
- User sessions use the existing JWT-based authentication
- OAuth users can still set a password later if needed
- All existing security measures (rate limiting, audit logs) apply to OAuth logins

## 📚 Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [googleapis Node.js Library](https://github.com/googleapis/google-api-nodejs-client)
- [Next.js Authentication Guide](https://nextjs.org/docs/authentication)

## 🎯 Production Deployment

For production deployment:

1. Update redirect URI in Google Console:
   - Add: `https://yourdomain.com/api/auth/google/callback`
2. Update `.env` production variables:
   ```env
   GOOGLE_REDIRECT_URI=https://yourdomain.com/api/auth/google/callback
   SITE_URL=https://yourdomain.com
   NODE_ENV=production
   ```
3. Ensure HTTPS is enabled (Google requires HTTPS for OAuth in production)
4. Test thoroughly before going live

## ✨ Next Steps

Consider adding:
- GitHub OAuth (similar implementation)
- Microsoft OAuth
- Apple Sign In
- OAuth account linking (allow users to link multiple OAuth providers)
- Profile picture display in UI
- OAuth-specific user dashboard

---

Need help? Check the implementation guide or open an issue!
