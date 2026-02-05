import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { env } from '@/lib/env';

const redisUrl = env.REDIS_URL;
const queueName = env.QUEUE_NAME;

export let connection: Redis;

try {
    connection = new Redis(redisUrl, {
        maxRetriesPerRequest: null,
        enableReadyCheck: true,
        retryStrategy(times) {
            const delay = Math.min(times * 50, 2000);
            console.log(`[Queue] Redis connection retry ${times}, waiting ${delay}ms`);
            return delay;
        }
    });

    connection.on('error', (err) => {
        console.error('[Queue] Redis connection error:', err);
    });

    connection.on('ready', () => {
        console.log(`[Queue] Redis connection established at ${redisUrl}`);
    });
} catch (error) {
    console.error('[Queue] Failed to initialize Redis:', error);
    throw error;
}

export const chatQueue = new Queue(queueName, {
    connection,
    defaultJobOptions: {
        removeOnComplete: { count: 100, age: 3600 },
        removeOnFail: { count: 1000, age: 7 * 24 * 3600 },
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
    },
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
        removeOnFail: { count: 1000, age: 7 * 24 * 3600 },
    },
});

export const dlqQueue = new Queue('dlq-queue', {
    connection,
    defaultJobOptions: {
        removeOnComplete: { count: 1000, age: 30 * 24 * 3600 },
    },
});

console.log(`[Queue] Initialized queue: ${queueName}`);
