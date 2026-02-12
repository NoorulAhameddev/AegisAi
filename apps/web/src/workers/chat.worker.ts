import "dotenv/config";
import { Worker } from "bullmq";
import { chatQueue, dlqQueue, connection } from "@/lib/queue";
import { processChatJob } from "@/workers/processor";
import { logger } from "@/lib/logger";
import { startCleanupTask } from "@/workers/cleanup";
import { env } from "@/lib/env";

// CRITICAL: Validate all required environment variables at startup
try {
    // Trigger env validation schema check
    const requiredEnvVars = [
        'DATABASE_URL',
        'REDIS_URL',
        'JWT_ACCESS_SECRET',
        'JWT_REFRESH_SECRET',
        'OPENROUTER_API_KEY',
        'ENCRYPTION_KEY_CIPHERTEXT',
        'AWS_REGION',
    ];
    
    const missing = requiredEnvVars.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    
    logger.info('Worker environment validation passed', {
        nodeEnv: env.NODE_ENV,
        appEnv: env.APP_ENV,
        queueName: env.QUEUE_NAME,
    });
} catch (error) {
    logger.error('Worker startup failed - environment validation', error as Error);
    process.exit(1);
}

logger.info("Worker starting", { queue: chatQueue.name });

startCleanupTask();

const worker = new Worker(chatQueue.name, async job => processChatJob(job), {
    connection,
});

worker.on("completed", job => {
    logger.worker(job.id as string, "completed", { jobType: "chat" });
});

worker.on("failed", async (job, err) => {
    logger.error("Worker job failed", err as Error, {
        jobId: job?.id,
        jobType: "chat",
        attemptsMade: job?.attemptsMade,
        userId: job?.data?.userId,
        requestId: job?.data?.requestId,
    });

    if (job && job.attemptsMade >= (job.opts.attempts || 0)) {
        await dlqQueue.add("chat-dlq", {
            jobId: job.id,
            data: job.data,
            failedReason: job.failedReason,
        });
    }
});

worker.on("error", err => {
    logger.error("Worker infrastructure error", err as Error, { jobType: "chat" });
});
