-- Manual migration to add OAuth fields to User table
-- Run this SQL in your PostgreSQL database if the Prisma migration fails

-- Make password column optional (allow NULL for OAuth users)
ALTER TABLE "User" ALTER COLUMN "password" DROP NOT NULL;

-- Add OAuth fields
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "provider" VARCHAR(50);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "providerId" VARCHAR(255);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "picture" TEXT;

-- Create indexes for OAuth fields
CREATE INDEX IF NOT EXISTS "User_provider_providerId_idx" ON "User"("provider", "providerId");

-- Create unique constraint for provider + providerId combination
-- This ensures one user per OAuth provider account
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'User_provider_providerId_key'
    ) THEN
        ALTER TABLE "User" ADD CONSTRAINT "User_provider_providerId_key" UNIQUE ("provider", "providerId");
    END IF;
END $$;
