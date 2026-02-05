import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractText } from "@/services/files/fileProcessor";
import { verifyAuth } from "@/services/auth/auth";
import fs from "fs";
import crypto from "crypto";
import { errorResponse, rateLimitResponse, successResponse, unauthorizedResponse } from "@/lib/response";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
    try {
        logger.info("Upload start");

        const user = await verifyAuth(req);
        if (!user) return unauthorizedResponse();

        const limit = await rateLimit(req, { limit: env.MAX_UPLOADS_PER_MINUTE, window: 60 });
        if (!limit.success) {
            return rateLimitResponse();
        }

        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return errorResponse("No file", { status: 400 });
        }

        if (file.size > env.MAX_FILE_SIZE) {
            return errorResponse("File too large", { status: 413 });
        }

        logger.info("Upload file received", { fileName: file.name, fileType: file.type });

        const buffer = Buffer.from(await file.arrayBuffer());
        const uniqueId = crypto.randomUUID();
        const extension = file.name.split('.').pop();
        const safeName = `${uniqueId}.${extension}`;
        const filePath = `uploads/${safeName}`;

        // Ensure directory exists
        if (!fs.existsSync('uploads')) {
            fs.mkdirSync('uploads');
        }

        fs.writeFileSync(filePath, buffer);
        logger.info("Upload saved", { filePath });

        let text = "";
        try {
            text = await extractText(filePath, file.type);
            logger.info("Upload text extracted", { length: text.length });
        } catch (e: any) {
            logger.warn("Upload extraction failed", { message: e.message });
            // Don't fail the upload, just have empty text
            text = "";
        }

        const saved = await prisma.file.create({
            data: {
                userId: user.id,
                name: file.name,
                type: file.type,
                content: text,
                path: filePath,
            },
        });

        logger.info("Upload saved to DB", { fileId: saved.id });

        // 🚀 ENHANCED: Ingest into RAG Vector Store with smart chunking
        let ragIngested = false;
        let ragChunks = 0;
        try {
            const { isSupportedFileType, isValidFileSize } = await import("@/services/rag/rag-config");
            
            // Check if file is suitable for RAG ingestion
            if (isSupportedFileType(file.type) && isValidFileSize(file.size) && text && text.length > 50) {
                const { ingestDocument } = await import("@/lib/vector-store");
                
                const documentIds = await ingestDocument(
                    text,
                    {
                        fileId: saved.id,
                        fileName: file.name,
                        fileType: file.type,
                        sourceId: saved.id,
                        type: 'file',
                    },
                    user.id
                );
                
                ragIngested = true;
                ragChunks = documentIds.length;
                
                // Update file metadata
                await prisma.file.update({
                    where: { id: saved.id },
                    data: {
                        metadata: JSON.stringify({
                            ragIngested: true,
                            ragChunks: documentIds.length,
                            ingestedAt: new Date().toISOString(),
                        })
                    }
                });
                
                logger.info("Upload RAG ingested", { chunks: documentIds.length, fileId: saved.id });
            } else {
                logger.info("Upload RAG skipped", { fileType: file.type, size: file.size, textLen: text.length });
            }
        } catch (ingestErr: any) {
            logger.error("RAG Ingestion failed", ingestErr);
        }

        return successResponse({
            fileId: saved.id,
            ragIngested,
            ragChunks,
        });
    } catch (error: any) {
        logger.error("Upload error", error as Error);
        return errorResponse("Internal Server Error", { status: 500 });
    }
}
