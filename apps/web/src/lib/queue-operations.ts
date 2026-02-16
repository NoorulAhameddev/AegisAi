/**
 * Queue Operations with Automatic Fallback
 * 
 * Wraps BullMQ queue operations to automatically fall back to PostgreSQL
 * when Redis is unavailable
 */

import { Queue } from 'bullmq';
import { logger } from './logger';
import { redisHealthTracker } from './redis-fallback';
import {
  addFallbackJob,
  getFallbackQueueDepth,
} from './fallback-queue';

/**
 * Add job to queue with automatic fallback
 * 
 * @param queue BullMQ queue instance
 * @param jobId Unique job ID (for deduplication)
 * @param data Job data
 * @param options BullMQ job options
 * @returns Job ID
 */
export async function addJobWithFallback(
  queue: Queue,
  jobId: string,
  data: any,
  options?: any
): Promise<string> {
  try {
    // Try Redis first
    const job = await queue.add(jobId, data, { ...options, jobId });
    redisHealthTracker.markSuccess();
    return job.id!;
  } catch (error) {
    logger.warn('Redis queue add failed, using PostgreSQL fallback', {
      queue: queue.name,
      jobId,
      error: (error as Error).message,
    });

    redisHealthTracker.markFailure();

    // Fall back to PostgreSQL
    await addFallbackJob(queue.name, jobId, data, options?.attempts || 3);
    return jobId;
  }
}

/**
 * Get queue depth with fallback
 * Returns Redis count if available, otherwise PostgreSQL count
 */
export async function getQueueDepthWithFallback(queue: Queue): Promise<number> {
  try {
    const [waiting, active] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
    ]);
    redisHealthTracker.markSuccess();
    return waiting + active;
  } catch (error) {
    logger.warn('Redis queue depth check failed, using PostgreSQL fallback', {
      queue: queue.name,
    });

    redisHealthTracker.markFailure();
    return await getFallbackQueueDepth(queue.name);
  }
}

/**
 * Check if queue is backed up (for backpressure)
 */
export async function isQueueBackedUp(
  queue: Queue,
  threshold: number = 500
): Promise<boolean> {
  const depth = await getQueueDepthWithFallback(queue);
  return depth >= threshold;
}
