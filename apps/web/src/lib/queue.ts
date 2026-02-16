import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { env } from '@/lib/env';
import { redisHealthTracker } from './redis-fallback';
import { logger } from './logger';

const redisUrl = env.REDIS_URL;
const queueName = env.QUEUE_NAME;

export let connection: Redis;

try {
    connection = new Redis(redisUrl, {
        maxRetriesPerRequest: null,
        enableReadyCheck: true,
        retryStrategy(times) {
            const delay = Math.min(times * 50, 2000);
            logger.warn(`Redis connection retry attempt ${times}, waiting ${delay}ms`);
            return delay;
        }
    });

    connection.on('error', (err) => {
        logger.error('[Queue] Redis connection error', err as Error);
        redisHealthTracker.markFailure();
    });

    connection.on('ready', () => {
        logger.info(`Redis connection established at ${redisUrl}`);
        redisHealthTracker.markSuccess();
    });

    connection.on('close', () => {
        logger.warn('Redis connection closed');
        redisHealthTracker.markFailure();
    });

    connection.on('reconnecting', () => {
        logger.info('Redis reconnecting...');
    });
} catch (error) {
    logger.error('[Queue] Failed to initialize Redis', error as Error);
    redisHealthTracker.markFailure();
    throw error;
}

export const chatQueue = new Queue(queueName, {
    connection,
    defaultJobOptions: {
        removeOnComplete: { count: 100, age: 3600 },
        removeOnFail: false, // Keep failed jobs for recovery even if Redis crashes
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
        // Job timeout: 90 seconds for chat completion
        // Prevents jobs from running indefinitely
        timeout: 90000, // 90 seconds
        // CRITICAL: Use deduplication to prevent duplicate job processing
        // Note: jobId should be set when enqueueing to enable dedup
    },
    // Limit queue size to prevent memory exhaustion
    limiter: {
        max: 1000, // Max 1000 jobs in queue
        duration: 1000, // Per second
    },
});

// Log duplicate job attempts for monitoring
chatQueue.on('duplicated', ({ jobId }) => {
    logger.info(`Duplicate job blocked: ${jobId}`, { queue: 'chat' });
});

chatQueue.on('error', (error) => {
    logger.error('Chat queue error', error as Error);
    redisHealthTracker.markFailure();
});

export const ragQueue = new Queue('rag-queue', {
    connection,
    defaultJobOptions: {
        attempts: 5,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
        removeOnComplete: { count: 100, age: 3600 },
        removeOnFail: false, // Keep failed jobs for recovery even if Redis crashes
        // Job timeout: 300 seconds for RAG ingestion (embeddings + chunking)
        timeout: 300000, // 5 minutes
    },
    // Limit queue size to prevent memory exhaustion
    limiter: {
        max: 500, // Max 500 jobs in queue (RAG is more expensive)
        duration: 1000, // Per second
    },
});

// Log duplicate job attempts for monitoring
ragQueue.on('duplicated', ({ jobId }) => {
    logger.info(`Duplicate RAG job blocked: ${jobId}`, { queue: 'rag' });
});

ragQueue.on('error', (error) => {
    logger.error('RAG queue error', error as Error);
    redisHealthTracker.markFailure();
});

export const dlqQueue = new Queue('dlq-queue', {
    connection,
    defaultJobOptions: {
        removeOnComplete: { count: 5000, age: 14 * 24 * 3600 }, // Keep for 14 days
        removeOnFail: false, // Persist DLQ entries
    },
});

logger.info(`Initialized queues: ${queueName}, rag-queue, dlq-queue`);

/**
 * Queue backpressure configuration
 * Reject new jobs when queue depth exceeds thresholds
 */
export const BACKPRESSURE_THRESHOLDS = {
    chat: {
        warning: 500,   // Log warning at 500 jobs
        critical: 1000, // Reject new jobs at 1000
    },
    rag: {
        warning: 250,   // Log warning at 250 jobs
        critical: 500,  // Reject new jobs at 500
    },
};

/**
 * Check queue depth and determine if backpressure should be applied
 * Returns { allowed: boolean, depth: number, message?: string }
 */
export async function checkQueueBackpressure(
    queue: Queue,
    queueName: 'chat' | 'rag'
): Promise<{ allowed: boolean; depth: number; message?: string }> {
    try {
        // Get counts of jobs in various states
        const counts = await queue.getJobCounts('waiting', 'active', 'delayed');
        const depth = (counts.waiting || 0) + (counts.active || 0) + (counts.delayed || 0);
        
        const thresholds = BACKPRESSURE_THRESHOLDS[queueName];
        
        // Critical threshold: reject new jobs
        if (depth >= thresholds.critical) {
            logger.warn(`Queue backpressure: ${queueName} at CRITICAL depth ${depth}`, {
                queue: queueName,
                depth,
                threshold: thresholds.critical,
                waiting: counts.waiting,
                active: counts.active,
                delayed: counts.delayed,
            });
            
            return {
                allowed: false,
                depth,
                message: `System overloaded. Queue depth: ${depth}. Please try again in a few minutes.`,
            };
        }
        
        // Warning threshold: log but allow
        if (depth >= thresholds.warning) {
            logger.warn(`Queue backpressure: ${queueName} at WARNING depth ${depth}`, {
                queue: queueName,
                depth,
                threshold: thresholds.warning,
                waiting: counts.waiting,
                active: counts.active,
                delayed: counts.delayed,
            });
        }
        
        return {
            allowed: true,
            depth,
        };
    } catch (error) {
        // On error checking queue depth, allow the request (fail open)
        // But log the error for investigation
        logger.error(`Failed to check queue backpressure for ${queueName}`, error as Error);
        return {
            allowed: true,
            depth: 0,
            message: 'Unable to check queue status',
        };
    }
}

/**
 * Get queue health metrics for monitoring
 * Returns counts of jobs in each state
 */
export async function getQueueMetrics(queue: Queue, queueName: string) {
    try {
        const counts = await queue.getJobCounts(
            'waiting',
            'active',
            'completed',
            'failed',
            'delayed'
        );
        
        return {
            queueName,
            waiting: counts.waiting || 0,
            active: counts.active || 0,
            completed: counts.completed || 0,
            failed: counts.failed || 0,
            delayed: counts.delayed || 0,
            total: (counts.waiting || 0) + (counts.active || 0) + (counts.delayed || 0),
        };
    } catch (error) {
        logger.error(`Failed to get metrics for queue ${queueName}`, error as Error);
        return {
            queueName,
            waiting: 0,
            active: 0,
            completed: 0,
            failed: 0,
            delayed: 0,
            total: 0,
            error: (error as Error).message,
        };
    }
}

