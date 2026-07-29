/**
 * PostgreSQL Fallback Queue
 *
 * When Redis is unavailable, jobs are stored in PostgreSQL
 * Workers poll this table instead of Redis
 *
 * Trade-offs:
 * - Slower than Redis (disk I/O vs memory)
 * - Less efficient polling
 * - But ensures critical jobs aren't lost
 */

import { prisma } from "./prisma";
import { logger } from "./logger";
import { publishQueueDepthMetric } from "./cloudwatch-metrics";

export interface FallbackJob {
  id: string;
  queueName: string;
  data: any;
  attempts: number;
  maxAttempts: number;
  status: "pending" | "processing" | "completed" | "failed";
  error?: string;
  createdAt: Date;
  processedAt?: Date;
}

/**
 * Add job to PostgreSQL fallback queue
 */
export async function addFallbackJob(
  queueName: string,
  jobId: string,
  data: any,
  maxAttempts: number = 3,
): Promise<void> {
  try {
    await prisma.$executeRaw`
      INSERT INTO fallback_queue (id, queue_name, data, attempts, max_attempts, status, created_at)
      VALUES (${jobId}, ${queueName}, ${JSON.stringify(data)}::jsonb, 0, ${maxAttempts}, 'pending', NOW())
      ON CONFLICT (id) DO NOTHING
    `;

    logger.info("Job added to PostgreSQL fallback queue", {
      queueName,
      jobId,
    });

    // Publish metric
    const depth = await getFallbackQueueDepth(queueName);
    publishQueueDepthMetric(queueName, depth);
  } catch (error) {
    logger.error("Failed to add job to fallback queue", error as Error, {
      queueName,
      jobId,
    });
    throw error;
  }
}

/**
 * Get next pending job from fallback queue
 */
export async function getNextFallbackJob(
  queueName: string,
): Promise<FallbackJob | null> {
  try {
    // Use FOR UPDATE SKIP LOCKED for concurrent worker safety
    const result: any = await prisma.$queryRaw`
      UPDATE fallback_queue
      SET status = 'processing',
          attempts = attempts + 1,
          processed_at = NOW()
      WHERE id = (
        SELECT id
        FROM fallback_queue
        WHERE queue_name = ${queueName}
          AND status = 'pending'
          AND attempts < max_attempts
        ORDER BY created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *
    `;

    if (result.length === 0) return null;

    const job = result[0];
    return {
      id: job.id,
      queueName: job.queue_name,
      data: job.data,
      attempts: job.attempts,
      maxAttempts: job.max_attempts,
      status: job.status,
      error: job.error,
      createdAt: job.created_at,
      processedAt: job.processed_at,
    };
  } catch (error) {
    logger.error("Failed to get next fallback job", error as Error, {
      queueName,
    });
    return null;
  }
}

/**
 * Complete fallback job (success)
 */
export async function completeFallbackJob(jobId: string): Promise<void> {
  try {
    await prisma.$executeRaw`
      UPDATE fallback_queue
      SET status = 'completed',
          processed_at = NOW()
      WHERE id = ${jobId}
    `;

    logger.info("Fallback job completed", { jobId });
  } catch (error) {
    logger.error("Failed to complete fallback job", error as Error, { jobId });
  }
}

/**
 * Fail fallback job
 */
export async function failFallbackJob(
  jobId: string,
  error: string,
): Promise<void> {
  try {
    await prisma.$executeRaw`
      UPDATE fallback_queue
      SET status = 'failed',
          error = ${error},
          processed_at = NOW()
      WHERE id = ${jobId}
    `;

    logger.warn("Fallback job failed", { jobId, error });
  } catch (err) {
    logger.error("Failed to fail fallback job", err as Error, { jobId });
  }
}

/**
 * Get fallback queue depth
 */
export async function getFallbackQueueDepth(
  queueName: string,
): Promise<number> {
  try {
    const result: any = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM fallback_queue
      WHERE queue_name = ${queueName}
        AND status IN ('pending', 'processing')
    `;

    return Number(result[0]?.count || 0);
  } catch (error) {
    logger.error("Failed to get fallback queue depth", error as Error, {
      queueName,
    });
    return 0;
  }
}

/**
 * Clean up old completed/failed jobs
 * Run periodically to prevent table bloat
 */
export async function cleanupFallbackQueue(
  olderThanHours: number = 24,
): Promise<number> {
  try {
    // Use parameterized query to prevent SQL injection
    const cutoffMs = olderThanHours * 60 * 60 * 1000;
    const cutoffDate = new Date(Date.now() - cutoffMs);
    const result = await prisma.$executeRaw`
      DELETE FROM fallback_queue
      WHERE status IN ('completed', 'failed')
        AND processed_at < ${cutoffDate}
    `;

    logger.info("Cleaned up fallback queue", { deletedCount: result });
    return Number(result);
  } catch (error) {
    logger.error("Failed to cleanup fallback queue", error as Error);
    return 0;
  }
}
}

/**
 * Migrate fallback jobs back to Redis when it recovers
 */
export async function migrateFallbackJobsToRedis(
  queueName: string,
  redisQueue: any,
): Promise<number> {
  try {
    // Step 1: Atomically claim jobs by marking them as "migrating"
    // This prevents other workers from picking up the same jobs
    const jobs: any = await prisma.$queryRaw`
      UPDATE fallback_queue
      SET status = 'migrating'
      WHERE queue_name = ${queueName}
        AND status = 'pending'
      ORDER BY created_at ASC
      LIMIT 100
      RETURNING *
    `;

    let migratedCount = 0;

    for (const job of jobs) {
      try {
        await redisQueue.add(job.id, job.data, {
          jobId: job.id,
          attempts: job.max_attempts - job.attempts,
        });

        // Mark as completed in fallback queue only AFTER Redis confirms
        await prisma.fallbackQueue.update({
          where: { id: job.id },
          data: { status: "completed", processedAt: new Date() },
        });
        migratedCount++;
      } catch (error) {
        // If Redis add fails, revert to pending so another attempt can pick it up
        await prisma.fallbackQueue.update({
          where: { id: job.id },
          data: { status: "pending" },
        });
        logger.error("Failed to migrate job to Redis", error as Error, {
          jobId: job.id,
        });
      }
    }

    logger.info("Migrated fallback jobs to Redis", {
      queueName,
      migratedCount,
    });

    return migratedCount;
  } catch (error) {
    logger.error("Failed to migrate fallback jobs", error as Error, {
      queueName,
    });
    return 0;
  }
}
    }

    logger.info("Migrated fallback jobs to Redis", {
      queueName,
      migratedCount,
    });

    return migratedCount;
  } catch (error) {
    logger.error("Failed to migrate fallback jobs", error as Error, {
      queueName,
    });
    return 0;
  }
}
