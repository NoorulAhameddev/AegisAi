import "dotenv/config";
import { Worker } from "bullmq";
import { connection, ragQueue, dlqQueue } from "@/lib/queue";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { ingestDocument } from "@/ai/rag/vector-store";
import { extractText } from "@/services/files/fileProcessor";
import fs from "fs";

logger.info("Worker starting", { queue: ragQueue.name });

const worker = new Worker(
    ragQueue.name,
    async job => {
        const { userId, fileId, text, metadata } = job.data || {};
        if (!userId || (!fileId && !text)) {
            throw new Error("RAG job missing required fields");
        }

        let contentToIngest = text;
        let fileMetadata: any = metadata || {};

        if (fileId) {
            const file = await prisma.file.findUnique({
                where: { id: fileId, userId },
            });
            if (!file) throw new Error("File not found");

            if (file.path && fs.existsSync(file.path)) {
                contentToIngest = await extractText(file.path, file.type);
            } else {
                throw new Error("File not found on disk");
            }

            fileMetadata = {
                ...fileMetadata,
                fileId: file.id,
                fileName: file.name,
                fileType: file.type,
                sourceId: file.id,
                type: "file",
            };
        } else {
            fileMetadata = {
                ...fileMetadata,
                type: "text",
                sourceId: metadata?.sourceId || `text-${Date.now()}`,
            };
        }

        const documentIds = await ingestDocument(contentToIngest, fileMetadata, userId);

        if (fileId) {
            await prisma.file.update({
                where: { id: fileId },
                data: {
                    metadata: {
                        ...(typeof fileMetadata === "string" ? JSON.parse(fileMetadata) : fileMetadata),
                        ragIngested: true,
                        ragChunks: documentIds.length,
                        ingestedAt: new Date().toISOString(),
                    },
                },
            });
        }

        return { documentIds, chunks: documentIds.length };
    },
    { connection }
);

worker.on("completed", job => {
    logger.worker(job.id as string, "completed", { jobType: "rag" });
});

worker.on("failed", async (job, err) => {
    logger.error("Worker job failed", err as Error, {
        jobId: job?.id,
        jobType: "rag",
        attemptsMade: job?.attemptsMade,
        userId: job?.data?.userId,
    });

    if (job && job.attemptsMade >= (job.opts.attempts || 0)) {
        await dlqQueue.add("rag-dlq", {
            jobId: job.id,
            data: job.data,
            failedReason: job.failedReason,
        });
    }
});

worker.on("error", err => {
    logger.error("Worker infrastructure error", err as Error, { jobType: "rag" });
});
