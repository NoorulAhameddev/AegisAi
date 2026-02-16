import { addDocument, addMultiModalDocument } from "@/ai/rag/vector-store";
import { getDocumentChunker } from "@/services/rag/chunker";
import { logger } from "@/lib/logger";
import { getRAGConfig } from "@/services/rag/rag-config";
import { prisma } from "@/lib/prisma";

/**
 * Ingest file with support for multi-modal content (text + images)
 * Automatically extracts and embeds images from documents
 */
export async function ingestFile(
    fileId: string,
    content: string,
    userId: string,
    options?: {
        fileName?: string;
        fileType?: string;
        enableImageEmbedding?: boolean;
    }
) {
    const config = getRAGConfig();
    const chunker = getDocumentChunker();
    const enableImages = options?.enableImageEmbedding !== false && config.embeddings.imageSupport;

    try {
        logger.info('[Ingest] Starting file ingestion', {
            fileId: fileId.substring(0, 8),
            userId: userId.substring(0, 8),
            contentLength: content.length,
            enableImages,
        });

        // Extract text chunks and images
        const { chunks, images } = chunker.chunkWithImages(content);

        logger.info('[Ingest] Chunking complete', {
            textChunks: chunks.length,
            imagesFound: images.length,
        });

        const validChunkIndexes: number[] = [];

        // Ingest text chunks with optional image embeddings
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const metadata = {
                fileId,
                type: 'document',
                fileName: options?.fileName,
                fileType: options?.fileType,
                chunkIndex: i,
                startChar: chunk.metadata.startChar,
                endChar: chunk.metadata.endChar,
            };

            validChunkIndexes.push(i);

            // Check if this chunk has associated image data
            if (enableImages && chunk.metadata.imageData && chunk.metadata.imageMimeType) {
                logger.debug('[Ingest] Adding multi-modal chunk', {
                    chunkIndex: i,
                    hasImage: true,
                });

                await addMultiModalDocument(
                    chunk.text,
                    metadata,
                    userId,
                    chunk.metadata.imageData,
                    chunk.metadata.imageMimeType
                );
            } else {
                // Text-only chunk
                await addDocument(chunk.text, metadata, userId);
            }
        }

        // Ingest standalone images (not embedded in chunks)
        if (enableImages && images.length > 0) {
            for (let i = 0; i < images.length; i++) {
                const image = images[i];
                const metadata = {
                    fileId,
                    type: 'image',
                    fileName: options?.fileName,
                    fileType: options?.fileType,
                    imageId: image.id,
                    chunkIndex: chunks.length + i, // Continue indexing after text chunks
                };

                validChunkIndexes.push(chunks.length + i);

                logger.debug('[Ingest] Adding standalone image', {
                    imageId: image.id,
                    mimeType: image.mimeType,
                });

                // Add as image-only document with minimal text
                await addMultiModalDocument(
                    `[Image from ${options?.fileName || fileId}]`,
                    metadata,
                    userId,
                    image.base64,
                    image.mimeType
                );
            }
        }

        // Cleanup stale chunks from previous ingestions
        if (validChunkIndexes.length > 0) {
            await prisma.document.deleteMany({
                where: {
                    userId,
                    sourceId: fileId,
                    chunkIndex: { notIn: validChunkIndexes },
                },
            });
        }

        logger.info('[Ingest] Ingestion complete', {
            totalChunks: chunks.length + images.length,
            textChunks: chunks.length,
            standaloneImages: images.length,
        });

        return {
            success: true,
            chunksIngested: chunks.length,
            imagesIngested: images.length,
            totalDocuments: chunks.length + images.length,
        };
    } catch (error) {
        logger.error('[Ingest] Ingestion failed', error as Error, {
            fileId: fileId.substring(0, 8),
            userId: userId.substring(0, 8),
        });
        throw error;
    }
}
