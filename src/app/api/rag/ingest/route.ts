import { NextRequest } from "next/server";
import { z } from "zod";
import { verifyAuth } from "@/services/auth/auth";
import { logger } from "@/lib/logger";
import { ingestDocument } from "@/ai/rag/vector-store";
import { extractText } from "@/services/files/fileProcessor";
import { prisma } from "@/lib/prisma";
import { isSupportedFileType } from "@/services/rag/rag-config";
import fs from "fs";
import { parseBody } from "@/lib/request-validation";
import { errorResponse, successResponse, unauthorizedResponse } from "@/lib/response";

/**
 * POST /api/rag/ingest
 * Ingest a file into the RAG system
 */
export async function POST(req: NextRequest) {
    const startTime = Date.now();

    try {
        const user = await verifyAuth(req);
        if (!user) {
            return unauthorizedResponse();
        }

        const bodySchema = z.object({
            fileId: z.string().optional(),
            text: z.string().optional(),
            metadata: z.record(z.any()).optional(),
        }).refine((data) => !!data.fileId || !!data.text, {
            message: "Either fileId or text must be provided",
        });
        const { data, response } = await parseBody(req, bodySchema);
        if (response) return response;

        const { fileId, text, metadata } = data;

        let contentToIngest = text;
        let fileMetadata: any = metadata || {};

        // If fileId provided, fetch file and extract content
        if (fileId) {
            const file = await prisma.file.findUnique({
                where: { id: fileId, userId: user.id }
            });

            if (!file) {
                return errorResponse("File not found", { status: 404 });
            }

            // Validate file type
            if (!isSupportedFileType(file.type)) {
                return errorResponse(`File type ${file.type} not supported for RAG`, { status: 400 });
            }

            // Size validation would be done during upload

            // Extract text from file
            if (file.path && fs.existsSync(file.path)) {
                try {
                    contentToIngest = await extractText(file.path, file.type);
                    
                    if (!contentToIngest || contentToIngest.length < 10) {
                        return errorResponse("Could not extract meaningful content from file", { status: 400 });
                    }
                } catch (error: any) {
                    logger.error("File extraction error", error);
                    return errorResponse("Failed to extract text from file", { status: 500 });
                }
            } else {
                return errorResponse("File not found on disk", { status: 404 });
            }

            fileMetadata = {
                ...fileMetadata,
                fileId: file.id,
                fileName: file.name,
                fileType: file.type,
                sourceId: file.id,
                type: 'file',
            };
        } else {
            // Direct text ingestion
            fileMetadata = {
                ...fileMetadata,
                type: 'text',
                sourceId: metadata?.sourceId || `text-${Date.now()}`,
            };
        }

        // Ingest document with chunking and update metadata atomically
        let documentIds: string[] = [];
        try {
            documentIds = await ingestDocument(
                contentToIngest,
                fileMetadata,
                user.id
            );

            // Only update file metadata on successful ingestion
            if (fileId && documentIds.length > 0) {
                try {
                    await prisma.file.update({
                        where: { id: fileId },
                        data: {
                            metadata: JSON.stringify({
                                ...(typeof fileMetadata === 'string' 
                                    ? JSON.parse(fileMetadata) 
                                    : fileMetadata),
                                ragIngested: true,
                                ragChunks: documentIds.length,
                                ingestedAt: new Date().toISOString(),
                            })
                        }
                    });
                } catch (dbError: any) {
                    logger.error('Failed to update file metadata after ingestion', dbError, {
                        fileId,
                        chunks: documentIds.length,
                        userId: user.id
                    });
                    // Still return success since ingestion succeeded, but log warning
                }
            }
        } catch (ingestError: any) {
            logger.error('RAG document ingestion failed', ingestError, {
                fileId,
                userId: user.id,
                contentLength: contentToIngest?.length || 0
            });
            return errorResponse(`Failed to ingest document: ${ingestError.message}`, { status: 500 });
        }

        const duration = Date.now() - startTime;
        logger.api('POST', '/api/rag/ingest', 200, duration);
        logger.info('Document ingested', {
            userId: user.id,
            fileId,
            chunks: documentIds.length,
            duration
        });

        return successResponse({
            documentIds,
            chunks: documentIds.length,
            message: `Successfully ingested document into ${documentIds.length} chunks`,
        });

    } catch (error: any) {
        const duration = Date.now() - startTime;
        logger.error('RAG ingest error', error, {
            path: '/api/rag/ingest',
            duration
        });
        return errorResponse(error.message || "Failed to ingest document", { status: 500 });
    }
}
