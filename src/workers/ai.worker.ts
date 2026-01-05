import 'dotenv/config';
import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { startCleanupTask } from './cleanup';
import { processChatJob } from './processor';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const connection = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
});

console.log('[Worker] Starting AI Worker connected to Redis at ' + redisUrl);

// Start Periodic Cleanup
startCleanupTask();

// Start Job Worker
const worker = new Worker('chat-queue', processChatJob, { connection });

worker.on('completed', job => {
    console.log(`[Worker] Monitor: Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
    console.error(`[Worker] Monitor: Job ${job?.id} failed: ${err.message}`);
});
