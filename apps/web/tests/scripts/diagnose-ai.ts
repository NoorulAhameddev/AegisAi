import "dotenv/config";
import { Queue } from "bullmq";
import Redis from "ioredis";

async function diagnose() {
  console.log("🔍 Starting AI Diagnosis...");

  // 1. Check Env Vars
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasRedis = !!process.env.REDIS_URL;

  console.log(`[Env] OPENAI_API_KEY: ${hasOpenAI ? "✅ Set" : "❌ Missing"}`);
  console.log(
    `[Env] REDIS_URL: ${hasRedis ? "✅ Set" : "⚠️ Defaulting to localhost:6379"}`,
  );

  if (!hasOpenAI) {
    console.error(
      "❌ CRITICAL: OPENAI_API_KEY is not set. The worker cannot function.",
    );
  }

  // 2. Check Redis Connection
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
  const connection = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    connectTimeout: 2000,
    retryStrategy: (times) => {
      if (times > 1) return null; // Stop retrying after 1 attempt
      return 500;
    },
  });

  try {
    await connection.ping();
    console.log("✅ Redis Connection: Successful");
  } catch (e) {
    console.error(
      "❌ Redis Connection: FAILED. Ensure Redis is running (docker-compose up -d or local server).",
    );
    console.error("   Error:", (e as Error).message);
    process.exit(1);
  }

  // 3. Check Queue State
  const queue = new Queue("chat-queue", { connection });
  try {
    const counts = await queue.getJobCounts();
    console.log("\n📊 Queue Statistics:");
    console.log(`   - Waiting (No worker picking up): ${counts.waiting}`);
    console.log(`   - Active (Stuck?): ${counts.active}`);
    console.log(`   - Completed: ${counts.completed}`);
    console.log(`   - Failed: ${counts.failed}`);

    if (counts.waiting > 0) {
      console.log("\n⚠️  WARNING: There are waiting jobs!");
      console.log(
        "   This strongly suggests the Worker process is NOT running.",
      );
      console.log('   👉 Run: "npm run worker" in a separate terminal.');
    } else if (counts.active > 0) {
      console.log("\n⚠️  WARNING: There are active jobs that seem stuck.");
      console.log("   The worker might have crashed or hung.");
    } else {
      console.log(
        "\n✅ Queue looks healthy (empty). If requests are failing, check Worker logs.",
      );
    }
  } catch (e) {
    console.error("❌ Failed to inspect queue:", e);
  } finally {
    await queue.close();
    await connection.quit();
  }
}

diagnose();
