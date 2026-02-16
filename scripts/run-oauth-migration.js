/**
 * OAuth Database Migration Script
 * Applies the necessary database changes for Google OAuth support
 * 
 * Run this script: node scripts/run-oauth-migration.js
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function runMigration() {
  console.log('🔄 Starting OAuth database migration...\n');

  try {
    // Read the SQL migration file
    const sqlPath = path.join(__dirname, 'oauth-migration.sql');
    
    // Execute each statement (split by semicolon, excluding comments)
    const statements = [
      'ALTER TABLE "User" ALTER COLUMN "password" DROP NOT NULL',
      'ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "provider" VARCHAR(50)',
      'ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "providerId" VARCHAR(255)',
      'ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "picture" TEXT',
      'CREATE INDEX IF NOT EXISTS "User_provider_providerId_idx" ON "User"("provider", "providerId")',
    ];

    for (const statement of statements) {
      console.log(`Executing: ${statement.substring(0, 50)}...`);
      try {
        await prisma.$executeRawUnsafe(statement);
        console.log('✅ Success\n');
      } catch (error) {
        if (error.message.includes('already exists') || error.message.includes('does not exist')) {
          console.log('⚠️  Already applied, skipping\n');
        } else {
          throw error;
        }
      }
    }

    // Add unique constraint
    console.log('Adding unique constraint for provider + providerId...');
    try {
      await prisma.$executeRawUnsafe(`
        DO $$ 
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint 
                WHERE conname = 'User_provider_providerId_key'
            ) THEN
                ALTER TABLE "User" ADD CONSTRAINT "User_provider_providerId_key" UNIQUE ("provider", "providerId");
            END IF;
        END $$;
      `);
      console.log('✅ Constraint added\n');
    } catch (error) {
      console.log('⚠️  Constraint may already exist\n');
    }

    // Verify the migration
    console.log('🔍 Verifying migration...\n');
    const columns = await prisma.$queryRaw`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'User' 
        AND column_name IN ('password', 'provider', 'providerId', 'picture')
      ORDER BY ordinal_position
    `;

    console.log('Database columns:');
    console.table(columns);

    console.log('\n✅ OAuth migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Set up Google OAuth credentials in Google Cloud Console');
    console.log('2. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your .env file');
    console.log('3. Set GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback');
    console.log('4. Restart your development server: npm run dev');
    console.log('5. Test Google login at http://localhost:3000/login\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runMigration();
