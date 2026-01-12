import { Queue } from 'bullmq';
import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const queueName = process.env.QUEUE_NAME || 'chat-queue';

let connection: Redis;

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

console.log(`[Queue] Initialized queue: ${queueName}`);
