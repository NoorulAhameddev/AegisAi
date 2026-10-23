import "dotenv/config";
import * as dotenv from "dotenv";
import * as path from "path";

// Load .env.local from root for monorepo setup
dotenv.config({ path: path.resolve(__dirname, "../../../../.env.local") });

import { Worker } from "bullmq";
import { chatQueue, dlqQueue, connection } from "@/lib/queue";
import { processChatJob } from "@/workers/processor";
import { logger } from "@/lib/logger";
import { startCleanupTask } from "@/workers/cleanup";
import { env } from "@/lib/env";
import { setupGlobalErrorHandlers } from "@/lib/global-error-handlers";
import {
  cleanupFallbackQueue,
  migrateFallbackJobsToRedis,
} from "@/lib/fallback-queue";
import { redisHealthTracker } from "@/lib/redis-fallback";

// Setup global error handlers to catch unhandled rejections and exceptions
setupGlobalErrorHandlers("chat-worker");

// CRITICAL: Validate all required environment variables at startup
try {
  // Trigger env validation schema check
  const requiredEnvVars = [
    "DATABASE_URL",
    "REDIS_URL",
    "JWT_ACCESS_SECRET",
    "JWT_REFRESH_SECRET",
    "OPENROUTER_API_KEY",
    "ENCRYPTION_KEY_CIPHERTEXT",
    "AWS_REGION",
  ];

  const missing = requiredEnvVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }

  logger.info("Worker environment validation passed", {
    nodeEnv: env.NODE_ENV,
    appEnv: env.APP_ENV,
    queueName: env.QUEUE_NAME,
  });
} catch (error) {
  logger.error(
    "Worker startup failed - environment validation",
    error as Error,
  );
  process.exit(1);
}

logger.info("Worker starting", { queue: chatQueue.name });

// Store interval IDs for cleanup on shutdown
const intervals: NodeJS.Timeout[] = [];

// Start cleanup task and store interval
(async () => {
  const cleanupInterval = await startCleanupTask();
  intervals.push(cleanupInterval);
})();

// Periodically migrate fallback jobs back to Redis when it recovers
const migrationInterval = setInterval(async () => {
  try {
    if (redisHealthTracker.shouldUseFallback()) {
      return;
    }
    await migrateFallbackJobsToRedis(chatQueue.name, chatQueue);
  } catch (error) {
    logger.warn("Fallback job migration failed", {
      error: (error as Error).message,
    });
  }
}, 60 * 1000);
migrationInterval.unref(); // Don't keep process alive
intervals.push(migrationInterval);

// Cleanup fallback queue to prevent table bloat
const cleanupInterval = setInterval(
  async () => {
    try {
      await cleanupFallbackQueue(24);
    } catch (error) {
      logger.warn("Fallback queue cleanup failed", {
        error: (error as Error).message,
      });
    }
  },
  6 * 60 * 60 * 1000,
);
cleanupInterval.unref(); // Don't keep process alive
intervals.push(cleanupInterval);

const worker = new Worker(chatQueue.name, async (job) => processChatJob(job), {
  connection,
  concurrency: env.WORKER_CONCURRENCY,
  stalledInterval: 60000, // Check for stalled jobs every 60s
  maxStalledCount: 2, // Retry stalled jobs twice before DLQ
  lockDuration: 180000, // 3 minutes - max time for job processing
  limiter: {
    max: 1000, // Max 1000 jobs per second
    duration: 1000,
  },
});

worker.on("completed", (job) => {
  logger.worker(job.id as string, "completed", { jobType: "chat" });
});

worker.on("failed", async (job, err) => {
  logger.error("Worker job failed", err as Error, {
    jobId: job?.id,
    jobType: "chat",
    attemptsMade: job?.attemptsMade,
    userId: job?.data?.userId,
    requestId: job?.data?.requestId,
  });

  if (job && job.attemptsMade >= (job.opts.attempts || 0)) {
    try {
      await dlqQueue.add("chat-dlq", {
        jobId: job.id,
        data: job.data,
        failedReason: job.failedReason,
      });
    } catch (dlqError) {
      logger.error("Failed to add job to DLQ", dlqError as Error, {
        jobId: job.id,
        jobType: "chat",
      });
    }
  }
});

worker.on("error", (err) => {
  logger.error("Worker infrastructure error", err as Error, {
    jobType: "chat",
  });
});

// Graceful shutdown with 30s timeout to avoid hanging processes
process.on("SIGTERM", async () => {
  logger.warn("Chat worker SIGTERM received - shutting down");
  try {
    // Clear all intervals to allow graceful exit
    intervals.forEach((interval) => clearInterval(interval));

    // Force exit after 30s to prevent hanging
    const shutdownTimeout = setTimeout(() => {
      logger.error("Shutdown timeout exceeded - forcing exit");
      process.exit(1);
    }, 30000);

    await worker.pause(true);
    await worker.close();
    await connection.disconnect();

    clearTimeout(shutdownTimeout);
    logger.info("Chat worker shutdown complete");
    process.exit(0);
  } catch (error) {
    logger.error("Chat worker shutdown failed", error as Error);
    process.exit(1);
  }
});

process.on("SIGINT", () => {
  process.emit("SIGTERM");
});
