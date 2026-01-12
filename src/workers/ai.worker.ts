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
    const result = job.returnvalue;
    console.log(`[Worker] ✅ Job ${job.id} COMPLETED`);
    if (result?.rateLimited) {
        console.log(`[Worker] Note: Job completed with rate limit notice`);
    }
});

worker.on('failed', (job, err) => {
    console.error(`[Worker] ❌ Job ${job?.id} FAILED!`);
    console.error(`[Worker] Error Type: ${err.name}`);
    console.error(`[Worker] Error Message: ${err.message}`);
    if (err.stack) {
        console.error(`[Worker] Stack Trace (first 500 chars): ${err.stack.substring(0, 500)}`);
    }
});

worker.on('error', (err) => {
    console.error(`[Worker] Worker infrastructure error:`, err.message);
});

console.log('[Worker] Job processing started, listening on chat-queue...');
