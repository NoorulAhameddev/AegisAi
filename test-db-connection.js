#!/usr/bin/env node
/**
 * Database Connection Tester
 * Run this after updating DATABASE_URL to verify connection works
 */

const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

async function testDatabaseConnection() {
  console.log("\n🔍 Aegis AI - Database Connection Tester\n");
  console.log("═".repeat(50));

  try {
    // Check environment variables
    console.log("\n📋 Checking Environment Variables...");
    const envFiles = ["./apps/web/.env.local", "./.env.local"];

    let databaseUrl = null;
    for (const envFile of envFiles) {
      if (fs.existsSync(envFile)) {
        const content = fs.readFileSync(envFile, "utf-8");
        const match = content.match(/DATABASE_URL=(.*)/);
        if (match) {
          databaseUrl = match[1].trim();
          console.log(`  ✓ Found DATABASE_URL in ${envFile}`);
          break;
        }
      }
    }

    if (!databaseUrl) {
      console.log("  ✗ DATABASE_URL not found in environment files");
      console.log("  Please set DATABASE_URL in .env.local");
      process.exit(1);
    }

    // Mask sensitive info
    const maskedUrl = databaseUrl
      .replace(/:[^@]+@/, ":***@")
      .replace(/\?.*/, "?connection_limit=10&...");
    console.log(`  Connection: ${maskedUrl}\n`);

    // Test Prisma connection
    console.log("🔗 Testing Prisma Database Connection...");
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
    });

    // Execute test query
    console.log("  Executing: SELECT 1 as test;");
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log("  ✓ Query executed successfully!");
    console.log(`  Result: ${JSON.stringify(result)}\n`);

    // Get table count
    console.log("📊 Database Schema Information:");
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    console.log(`  Total Tables: ${tables.length}`);

    if (tables.length > 0) {
      console.log("  Tables Found:");
      tables.slice(0, 10).forEach((t, i) => {
        console.log(`    ${i + 1}. ${t.table_name}`);
      });
      if (tables.length > 10) {
        console.log(`    ... and ${tables.length - 10} more tables`);
      }
    } else {
      console.log(
        "  ⚠️  No tables found. Run migrations: npm run migrate:deploy",
      );
    }

    // Summary
    console.log("\n" + "═".repeat(50));
    console.log("✅ DATABASE CONNECTION SUCCESSFUL!\n");
    console.log("Next Steps:");
    console.log("  1. If no tables found, run: npm run migrate:deploy");
    console.log("  2. Start web server: cd apps/web && npm run dev");
    console.log("  3. Test login at: http://localhost:3000/login\n");

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.log("\n" + "═".repeat(50));
    console.error("❌ DATABASE CONNECTION FAILED!\n");
    console.error("Error Details:");
    console.error(`  Type: ${error.code || error.name}`);
    console.error(`  Message: ${error.message}\n`);

    // Provide specific help
    if (error.message.includes("ENOENT")) {
      console.error("💡 Solution: .env.local file not found");
      console.error("  Create the file: d:\\Aegis-Ai\\.env.local");
    } else if (error.message.includes("password")) {
      console.error(
        "💡 Solution: Authentication failed - check credentials in DATABASE_URL",
      );
      console.error("  Verify username, password, and host are correct");
    } else if (error.message.includes("ECONNREFUSED")) {
      console.error(
        "💡 Solution: Connection refused - database server not running",
      );
      console.error("  - For Supabase: Verify your project is active");
      console.error("  - For Local: Ensure PostgreSQL is running on port 5432");
    } else if (error.message.includes("does not exist")) {
      console.error("💡 Solution: Database does not exist");
      console.error("  First create the database in your PostgreSQL instance");
    }

    console.error("\n📚 For more help, see: DATABASE_SETUP_GUIDE.md\n");
    process.exit(1);
  }
}

testDatabaseConnection();
