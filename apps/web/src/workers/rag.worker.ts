import "dotenv/config";
import { Worker } from "bullmq";
import { connection, ragQueue, dlqQueue } from "@/lib/queue";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { ingestDocument } from "@/ai/rag/vector-store";
import { extractText } from "@/services/files/fileProcessor";
import fs from "fs";
import { setupGlobalErrorHandlers } from "@/lib/global-error-handlers";
import { env } from "@/lib/env";
import { migrateFallbackJobsToRedis } from "@/lib/fallback-queue";
import { redisHealthTracker } from "@/lib/redis-fallback";

// Setup global error handlers
setupGlobalErrorHandlers("rag-worker");

logger.info("Worker starting", { queue: ragQueue.name });

// Store interval IDs for cleanup on shutdown
const intervals: NodeJS.Timeout[] = [];

// Periodically migrate fallback jobs back to Redis when it recovers
const migrationInterval = setInterval(async () => {
  try {
    if (redisHealthTracker.shouldUseFallback()) {
      return;
    }
    await migrateFallbackJobsToRedis(ragQueue.name, ragQueue);
  } catch (error) {
    logger.warn("RAG fallback job migration failed", {
      error: (error as Error).message,
    });
  }
}, 60 * 1000);
migrationInterval.unref(); // Don't keep process alive
intervals.push(migrationInterval);

const worker = new Worker(
  ragQueue.name,
  async (job) => {
    const { userId, fileId, text, metadata } = job.data || {};
    if (!userId || (!fileId && !text)) {
      throw new Error("RAG job missing required fields");
    }

    await job.updateProgress(20);

    let contentToIngest = text;
    let fileMetadata: any = metadata || {};

    if (fileId) {
      const file = await prisma.file.findFirst({
        where: { id: fileId, userId, deletedAt: null },
      });
      if (!file) throw new Error("File not found");

      if (file.path && fs.existsSync(file.path)) {
        contentToIngest = await extractText(file.path, file.type);
      } else {
        throw new Error("File not found on disk");
      }

      fileMetadata = {
        ...fileMetadata,
        fileId: file.id,
        fileName: file.name,
        fileType: file.type,
        sourceId: file.id,
        type: "file",
      };
    } else {
      fileMetadata = {
        ...fileMetadata,
        type: "text",
        sourceId: metadata?.sourceId || `text-${Date.now()}`,
      };
    }

    await job.updateProgress(40);

    const documentIds = await ingestDocument(
      contentToIngest,
      fileMetadata,
      userId,
    );

    await job.updateProgress(80);

    if (fileId) {
      await prisma.file.update({
        where: { id: fileId },
        data: {
          metadata: {
            ...(typeof fileMetadata === "string"
              ? JSON.parse(fileMetadata)
              : fileMetadata),
            ragIngested: true,
            ragChunks: documentIds.length,
            ingestedAt: new Date().toISOString(),
          },
        },
      });
    }

    await job.updateProgress(100);

    return { documentIds, chunks: documentIds.length };
  },
  {
    connection,
    concurrency: env.WORKER_CONCURRENCY,
    settings: {
      stalledInterval: 60000, // Check for stalled jobs every 60s
      maxStalledCount: 2, // Retry stalled jobs twice before DLQ
    },
    lockDuration: 300000, // 5 minutes - RAG ingestion can take longer
  },
);

worker.on("completed", (job) => {
  logger.worker(job.id as string, "completed", { jobType: "rag" });
});

worker.on("failed", async (job, err) => {
  logger.error("Worker job failed", err as Error, {
    jobId: job?.id,
    jobType: "rag",
    attemptsMade: job?.attemptsMade,
    userId: job?.data?.userId,
  });

  if (job && job.attemptsMade >= (job.opts.attempts || 0)) {
    try {
      await dlqQueue.add("rag-dlq", {
        jobId: job.id,
        data: job.data,
        failedReason: job.failedReason,
      });
    } catch (dlqError) {
      logger.error("Failed to add job to DLQ", dlqError as Error, {
        jobId: job.id,
        jobType: "rag",
      });
    }
  }
});

worker.on("error", (err) => {
  logger.error("Worker infrastructure error", err as Error, { jobType: "rag" });
});

// Graceful shutdown with 30s timeout
process.on("SIGTERM", async () => {
  logger.warn("RAG worker SIGTERM received - shutting down");
  try {
    intervals.forEach((interval) => clearInterval(interval));

    const shutdownTimeout = setTimeout(() => {
      logger.error("Shutdown timeout exceeded - forcing exit");
      process.exit(1);
    }, 30000);

    await worker.pause(true);
    await worker.close();
    await connection.disconnect();

    clearTimeout(shutdownTimeout);
    logger.info("RAG worker shutdown complete");
    process.exit(0);
  } catch (error) {
    logger.error("RAG worker shutdown failed", error as Error);
    process.exit(1);
  }
});

process.on("SIGINT", () => {
  process.emit("SIGTERM");
});
