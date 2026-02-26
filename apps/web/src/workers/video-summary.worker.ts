/**
 * Video Summary Worker
 * Processes video summary jobs asynchronously.
 */
import "dotenv/config";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../../.env.local") });

import { Worker, Job } from "bullmq";
import { videoSummaryQueue } from "@/lib/queue";
import { connection } from "@/lib/queue";
import { generateVideoSummary } from "@/services/orchestration/video-summary-orchestrator";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";
import { setupGlobalErrorHandlers } from "@/lib/global-error-handlers";

setupGlobalErrorHandlers("video-summary-worker");

try {
  const requiredEnvVars = ["DATABASE_URL", "REDIS_URL"];
  const missing = requiredEnvVars.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }
  logger.info("Video summary worker environment validation passed");
} catch (error) {
  logger.error("Video summary worker startup failed", error as Error);
  process.exit(1);
}

const worker = new Worker(
  videoSummaryQueue.name,
  async (job: Job) => {
    try {
      const { youtubeUrl, userId, projectId } = job.data;
      const result = await generateVideoSummary(youtubeUrl, userId, projectId);
      logger.worker(job.id as string, "completed", {
        jobType: "video-summary",
      });
      return { success: true, result };
    } catch (error) {
      logger.error("Video summary job failed", error as Error, {
        jobId: job.id,
      });
      return { success: false, error: (error as Error).message };
    }
  },
  {
    connection,
    concurrency: env.WORKER_CONCURRENCY,
  },
);

worker.on("failed", async (job, err) => {
  logger.error("Video summary worker job failed", err as Error, {
    jobId: job?.id,
  });
});

worker.on("error", (err) => {
  logger.error("Video summary worker infrastructure error", err as Error);
});

process.on("SIGTERM", async () => {
  logger.warn("Video summary worker SIGTERM received - shutting down");
  try {
    await worker.pause(true);
    await worker.close();
    await connection.disconnect();
    logger.info("Video summary worker shutdown complete");
    process.exit(0);
  } catch (e) {
    logger.error("Video summary worker shutdown failed", e as Error);
    process.exit(1);
  }
});

process.on("SIGINT", () => process.emit("SIGTERM"));

export default worker;
