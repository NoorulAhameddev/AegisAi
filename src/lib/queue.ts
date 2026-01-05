import { Queue } from 'bullmq';
import Redis from 'ioredis';

// Use environment variable or default
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const connection = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
});

export const chatQueue = new Queue('chat-queue', {
    connection,
    defaultJobOptions: {
        removeOnComplete: { count: 100, age: 3600 },
        removeOnFail: { count: 1000, age: 7 * 24 * 3600 }, // Keep failed jobs longer for inspection
        attempts: 3, // Retry up to 3 times
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
    },
    // timeout: 30000, // Enforced in worker loop logic manually or via lockDuration
});
