import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/services/auth/session";
import { logger } from "@/lib/logger";
import { ingestDocument } from "@/ai/rag/vector-store";
import { extractText } from "@/services/files/fileProcessor";
import { prisma } from "@/lib/prisma";
import { isSupportedFileType, isValidFileSize } from "@/services/rag/rag-config";
import path from "path";
import fs from "fs";

/**
 * POST /api/rag/ingest
 * Ingest a file into the RAG system
 */
export async function POST(req: NextRequest) {
    const startTime = Date.now();

    try {
        const user = await getUserFromRequest(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { fileId, text, metadata } = body;

        if (!fileId && !text) {
            return NextResponse.json(
                { error: "Either fileId or text must be provided" },
                { status: 400 }
            );
        }

        let contentToIngest = text;
        let fileMetadata: any = metadata || {};

        // If fileId provided, fetch file and extract content
        if (fileId) {
            const file = await prisma.file.findUnique({
                where: { id: fileId, userId: user.userId }
            });

            if (!file) {
                return NextResponse.json(
                    { error: "File not found" },
                    { status: 404 }
                );
            }

            // Validate file type
            if (!isSupportedFileType(file.type)) {
                return NextResponse.json(
                    { error: `File type ${file.type} not supported for RAG` },
                    { status: 400 }
                );
            }

            // Size validation would be done during upload

            // Extract text from file
            if (file.path && fs.existsSync(file.path)) {
                try {
                    contentToIngest = await extractText(file.path, file.type);
                    
                    if (!contentToIngest || contentToIngest.length < 10) {
                        return NextResponse.json(
                            { error: "Could not extract meaningful content from file" },
                            { status: 400 }
                        );
                    }
                } catch (error: any) {
                    logger.error("File extraction error", error);
                    return NextResponse.json(
                        { error: "Failed to extract text from file" },
                        { status: 500 }
                    );
                }
            } else {
                return NextResponse.json(
                    { error: "File not found on disk" },
                    { status: 404 }
                );
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

        // Ingest document with chunking
        const documentIds = await ingestDocument(
            contentToIngest,
            fileMetadata,
            user.userId
        );

        // Update file metadata if it's a file ingestion
        if (fileId) {
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
        }

        const duration = Date.now() - startTime;
        logger.api('POST', '/api/rag/ingest', 200, duration);
        logger.info('Document ingested', {
            userId: user.userId,
            fileId,
            chunks: documentIds.length,
            duration
        });

        return NextResponse.json({
            success: true,
            documentIds,
            chunks: documentIds.length,
            message: `Successfully ingested document into ${documentIds.length} chunks`
        });

    } catch (error: any) {
        const duration = Date.now() - startTime;
        logger.error('RAG ingest error', error, {
            path: '/api/rag/ingest',
            duration
        });
        return NextResponse.json(
            { error: error.message || "Failed to ingest document" },
            { status: 500 }
        );
    }
}
