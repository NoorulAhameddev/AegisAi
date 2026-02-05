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

// Magic bytes validation for file type verification (prevents file type spoofing)
function validateMagicBytes(buffer: Buffer, extension: string): boolean {
    // Ensure buffer is large enough to check magic bytes
    if (buffer.length < 4) return false;

    const magicNumbers: Record<string, number[][]> = {
        pdf: [[0x25, 0x50, 0x44, 0x46]], // %PDF
        zip: [[0x50, 0x4b, 0x03, 0x04], [0x50, 0x4b, 0x05, 0x06], [0x50, 0x4b, 0x07, 0x08]], // PK... (includes DOCX)
        docx: [[0x50, 0x4b, 0x03, 0x04]], // DOCX is ZIP archive
        xlsx: [[0x50, 0x4b, 0x03, 0x04]], // XLSX is ZIP archive
        jpg: [[0xff, 0xd8, 0xff], [0xff, 0xd8, 0xff, 0xe0], [0xff, 0xd8, 0xff, 0xe1]], // FFD8FF
        jpeg: [[0xff, 0xd8, 0xff], [0xff, 0xd8, 0xff, 0xe0], [0xff, 0xd8, 0xff, 0xe1]],
        png: [[0x89, 0x50, 0x4e, 0x47]], // 89PNG
        gif: [[0x47, 0x49, 0x46, 0x38]], // GIF8
        txt: [], // Text files don't have magic bytes - skip check
        text: [], // Text files
        csv: [], // Text based
        json: [], // Text based
        md: [], // Text based
        doc: [[0xd0, 0xcf, 0x11, 0xe0]], // MS Office OLE2
        xls: [[0xd0, 0xcf, 0x11, 0xe0]], // MS Office OLE2
        webp: [[0x52, 0x49, 0x46, 0x46]], // RIFF
    };

    const expectedMagic = magicNumbers[extension];
    
    // If no magic bytes defined for this extension, skip validation (text files)
    if (!expectedMagic || expectedMagic.length === 0) {
        return true;
    }

    // Check if buffer starts with any of the expected magic byte sequences
    for (const magic of expectedMagic) {
        let matches = true;
        for (let i = 0; i < magic.length && i < buffer.length; i++) {
            if (buffer[i] !== magic[i]) {
                matches = false;
                break;
            }
        }
        if (matches) return true;
    }

    return false;
}

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
        
        // SECURITY: Validate extension against whitelist - prevent .php, .exe, etc
        const SAFE_EXTENSIONS = new Set(['pdf', 'txt', 'docx', 'doc', 'xlsx', 'xls', 'csv', 'json', 'md', 'jpg', 'jpeg', 'png', 'gif', 'webp']);
        const extension = file.name.split('.').pop()?.toLowerCase() || '';
        
        if (!SAFE_EXTENSIONS.has(extension)) {
            logger.warn("Upload rejected - unsafe extension", { filename: file.name, extension });
            return errorResponse("File type not allowed", { status: 400 });
        }

        // SECURITY: Validate magic bytes to prevent file type spoofing attacks
        if (!validateMagicBytes(buffer, extension)) {
            logger.warn("Upload rejected - magic bytes mismatch (possible file type spoofing)", { 
                filename: file.name, 
                extension, 
                mimeType: file.type 
            });
            return errorResponse("File type validation failed - file content does not match extension", { status: 400 });
        }

        // SECURITY: Check file size BEFORE reading into memory to prevent OOM
        if (buffer.length > env.MAX_FILE_SIZE) {
            logger.warn("Upload rejected - file size exceeds limit", { size: buffer.length });
            return errorResponse("File too large", { status: 413 });
        }

        const uniqueId = crypto.randomUUID();
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
            text = "";
        }

        // CRITICAL: Encrypt file metadata and content for privacy
        const { encrypt } = await import("@/lib/encryption");
        const encryptedFileName = await encrypt(file.name);
        const encryptedContent = text ? await encrypt(text) : "";

        const saved = await prisma.file.create({
            data: {
                userId: user.id,
                name: encryptedFileName, // ENCRYPTED - prevents plaintext search
                type: file.type, // Keep type for filtering
                content: encryptedContent, // ENCRYPTED - prevents data leaks
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
