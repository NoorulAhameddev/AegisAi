/**
 * Production Metrics Collection
 * 
 * Tracks key operational metrics:
 * - Job processing times (p50, p95, p99)
 * - Duplicate job rejections
 * - Connection drops
 * - Transaction rollbacks
 * - Moderation flags
 * - Error rates
 * 
 * Stores in-memory with Redis backup for persistence
 */

import { connection } from '@/lib/queue';
import { logger } from '@/lib/logger';

// In-memory metrics store
interface MetricsData {
    // Job processing
    jobProcessingTimes: number[]; // Array of processing durations in ms
    duplicateJobsBlocked: number;
    jobTimeouts: number;
    jobFailures: number;
    
    // Streaming
    connectionDrops: number;
    partialResponses: number;
    streamTimeouts: number;
    backpressureEvents: number;
    
    // Database
    transactionRollbacks: number;
    transactionTimeouts: number;
    connectionPoolSaturations: number;
    
    // Moderation
    preModerationBlocks: number;
    postModerationFlags: number;
    streamingModerationFlags: number;
    
    // Last reset timestamp
    lastReset: number;
}

let metrics: MetricsData = {
    jobProcessingTimes: [],
    duplicateJobsBlocked: 0,
    jobTimeouts: 0,
    jobFailures: 0,
    connectionDrops: 0,
    partialResponses: 0,
    streamTimeouts: 0,
    backpressureEvents: 0,
    transactionRollbacks: 0,
    transactionTimeouts: 0,
    connectionPoolSaturations: 0,
    preModerationBlocks: 0,
    postModerationFlags: 0,
    streamingModerationFlags: 0,
    lastReset: Date.now(),
};

// Redis key for metrics persistence
const REDIS_METRICS_KEY = 'aegis:metrics:current';

/**
 * Record job processing time
 */
export function recordJobProcessingTime(durationMs: number): void {
    metrics.jobProcessingTimes.push(durationMs);
    
    // Keep only last 1000 samples to prevent memory bloat
    if (metrics.jobProcessingTimes.length > 1000) {
        metrics.jobProcessingTimes = metrics.jobProcessingTimes.slice(-1000);
    }
}

/**
 * Increment counter metrics
 */
export function incrementMetric(metric: keyof Omit<MetricsData, 'jobProcessingTimes' | 'lastReset'>): void {
    if (typeof metrics[metric] === 'number') {
        (metrics[metric] as number)++;
    }
}

/**
 * Calculate percentile from array of values
 */
function calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
}

/**
 * Get current metrics snapshot
 */
export function getMetrics(): {
    jobProcessing: {
        p50: number;
        p95: number;
        p99: number;
        count: number;
        duplicatesBlocked: number;
        timeouts: number;
        failures: number;
    };
    streaming: {
        connectionDrops: number;
        partialResponses: number;
        timeouts: number;
        backpressureEvents: number;
    };
    database: {
        transactionRollbacks: number;
        transactionTimeouts: number;
        poolSaturations: number;
    };
    moderation: {
        preModerationBlocks: number;
        postModerationFlags: number;
        streamingFlags: number;
    };
    period: {
        startTime: string;
        durationMs: number;
    };
} {
    const now = Date.now();
    const duration = now - metrics.lastReset;

    return {
        jobProcessing: {
            p50: calculatePercentile(metrics.jobProcessingTimes, 50),
            p95: calculatePercentile(metrics.jobProcessingTimes, 95),
            p99: calculatePercentile(metrics.jobProcessingTimes, 99),
            count: metrics.jobProcessingTimes.length,
            duplicatesBlocked: metrics.duplicateJobsBlocked,
            timeouts: metrics.jobTimeouts,
            failures: metrics.jobFailures,
        },
        streaming: {
            connectionDrops: metrics.connectionDrops,
            partialResponses: metrics.partialResponses,
            timeouts: metrics.streamTimeouts,
            backpressureEvents: metrics.backpressureEvents,
        },
        database: {
            transactionRollbacks: metrics.transactionRollbacks,
            transactionTimeouts: metrics.transactionTimeouts,
            poolSaturations: metrics.connectionPoolSaturations,
        },
        moderation: {
            preModerationBlocks: metrics.preModerationBlocks,
            postModerationFlags: metrics.postModerationFlags,
            streamingFlags: metrics.streamingModerationFlags,
        },
        period: {
            startTime: new Date(metrics.lastReset).toISOString(),
            durationMs: duration,
        },
    };
}

/**
 * Reset metrics (useful for hourly/daily resets)
 */
export function resetMetrics(): void {
    // Backup to Redis before reset
    saveMetricsToRedis().catch(err => {
        logger.error('Failed to backup metrics to Redis', err as Error);
    });

    metrics = {
        jobProcessingTimes: [],
        duplicateJobsBlocked: 0,
        jobTimeouts: 0,
        jobFailures: 0,
        connectionDrops: 0,
        partialResponses: 0,
        streamTimeouts: 0,
        backpressureEvents: 0,
        transactionRollbacks: 0,
        transactionTimeouts: 0,
        connectionPoolSaturations: 0,
        preModerationBlocks: 0,
        postModerationFlags: 0,
        streamingModerationFlags: 0,
        lastReset: Date.now(),
    };

    logger.info('Metrics reset', { timestamp: new Date().toISOString() });
}

/**
 * Save current metrics to Redis for persistence
 */
async function saveMetricsToRedis(): Promise<void> {
    try {
        const snapshot = getMetrics();
        await connection.setex(
            REDIS_METRICS_KEY,
            86400, // 24 hours TTL
            JSON.stringify(snapshot)
        );
    } catch (error) {
        logger.error('Failed to save metrics to Redis', error as Error);
    }
}

/**
 * Load metrics from Redis (on server restart)
 */
export async function loadMetricsFromRedis(): Promise<void> {
    try {
        const data = await connection.get(REDIS_METRICS_KEY);
        if (data) {
            const snapshot = JSON.parse(data);
            logger.info('Loaded metrics from Redis', {
                jobCount: snapshot.jobProcessing?.count || 0,
                periodStart: snapshot.period?.startTime,
            });
            // Note: We don't restore in-memory metrics, just log for visibility
        }
    } catch (error) {
        logger.error('Failed to load metrics from Redis', error as Error);
    }
}

// Auto-save metrics every 5 minutes
setInterval(() => {
    saveMetricsToRedis().catch(err => {
        logger.error('Auto-save metrics failed', err as Error);
    });
}, 5 * 60 * 1000);

// Auto-reset metrics every 24 hours
setInterval(() => {
    resetMetrics();
}, 24 * 60 * 60 * 1000);

// Load on startup
loadMetricsFromRedis().catch(err => {
    logger.error('Initial metrics load failed', err as Error);
});
