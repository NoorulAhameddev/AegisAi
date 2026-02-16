-- Google OAuth Setup SQL Migration
-- This file contains the manual database changes for OAuth support
-- 
-- OPTION 1: Run this file directly using PostgreSQL command line:
--   psql -U postgres -d aegis_ai -h localhost -f manual_oauth_support.sql
--
-- OPTION 2: Copy and paste this SQL into your PostgreSQL client (pgAdmin, DBeaver, etc.)
--
-- OPTION 3: Use the Node.js migration script (recommended):
--   node scripts/run-oauth-migration.js

BEGIN;

-- Make password column optional (allow NULL for OAuth users)
ALTER TABLE "User" ALTER COLUMN "password" DROP NOT NULL;

-- Add OAuth fields
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "provider" VARCHAR(50);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "providerId" VARCHAR(255);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "picture" TEXT;

-- Create indexes for OAuth fields
CREATE INDEX IF NOT EXISTS "User_provider_providerId_idx" ON "User"("provider", "providerId");

-- Create unique constraint for provider + providerId combination
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'User_provider_providerId_key'
    ) THEN
        ALTER TABLE "User" ADD CONSTRAINT "User_provider_providerId_key" UNIQUE ("provider", "providerId");
    END IF;
END $$;

-- Verify changes
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'User' 
  AND column_name IN ('password', 'provider', 'providerId', 'picture')
ORDER BY ordinal_position;

COMMIT;

-- Success message
SELECT 'OAuth migration completed successfully!' AS status;
