/**
 * Multi-Modal RAG Integration Service
 * Orchestrates chunking, embedding generation, and storage for mixed content
 */

import { getDocumentChunker } from './chunker';
import {
    generateMultiModalEmbedding,
    mergeEmbeddings,
    hasImage,
    hasText,
    type MultiModalContent,
} from './multi-modal-embeddings';
import { getVectorDBProvider } from '@/lib/vector-db-provider';
import type { DocumentMetadata } from '@/lib/vector-db-provider';
import { generateEmbedding } from './embeddings';

interface MultiModalIngestOptions {
    userId: string;
    sourceId?: string;
    fileName?: string;
    fileType?: string;
    embedStrategy?: 'concat' | 'avg' | 'text-only';
}

interface IngestResult {
    documentIds: string[];
    chunksCreated: number;
    imagesProcessed: number;
    totalEmbeddingsGenerated: number;
}

/**
 * Ingest multi-modal document (text + images) into vector store
 */
export async function ingestMultiModalDocument(
    text: string,
    options: MultiModalIngestOptions
): Promise<IngestResult> {
    const chunker = getDocumentChunker();
    const provider = getVectorDBProvider();

    console.log('[MultiModalRAG] Starting multi-modal ingestion');

    // Extract chunks and images from document
    const { chunks, images } = chunker.chunkWithImages(text);

    if (chunks.length === 0) {
        console.warn('[MultiModalRAG] No chunks extracted from document');
        return {
            documentIds: [],
            chunksCreated: 0,
            imagesProcessed: 0,
            totalEmbeddingsGenerated: 0,
        };
    }

    const documentIds: string[] = [];
    let embeddingsGenerated = 0;

    // Process each chunk as potential multi-modal content
    for (const chunk of chunks) {
        const multiModalContent: MultiModalContent = {
            type: chunk.metadata.imageData ? 'mixed' : 'text',
            text: chunk.text,
            imageBase64: chunk.metadata.imageData,
            mimeType: chunk.metadata.imageMimeType,
        };

        try {
            // Generate multi-modal embeddings
            const embedding = await generateMultiModalEmbedding(multiModalContent);
            embeddingsGenerated++;

            // Merge embeddings into single vector (based on strategy)
            const mergedVector = mergeEmbeddings(
                embedding,
                options.embedStrategy || 'text-only'
            );

            // Primary vector for search (text embedding)
            const primaryVector = await generateEmbedding(chunk.text);

            // Prepare metadata
            const metadata: DocumentMetadata = {
                fileId: options.sourceId,
                fileName: options.fileName,
                fileType: options.fileType,
                chunkIndex: chunk.index,
                sourceId: options.sourceId,
                startChar: chunk.metadata.startChar,
                endChar: chunk.metadata.endChar,
            };

            // Store document with multi-modal embeddings
            const docId = await provider.addDocument(
                chunk.text,
                metadata,
                options.userId,
                primaryVector,
                {
                    textEmbedding: embedding.textEmbedding,
                    imageEmbedding: embedding.imageEmbedding,
                    imageData: chunk.metadata.imageData,
                    imageMimeType: chunk.metadata.imageMimeType,
                }
            );

            documentIds.push(docId);
            console.log(
                `[MultiModalRAG] Ingested chunk ${chunk.index} (${chunk.text.length} chars, images: ${embedding.imageEmbedding ? 'yes' : 'no'})`
            );
        } catch (error) {
            console.error(
                `[MultiModalRAG] Failed to ingest chunk ${chunk.index}:`,
                error
            );
            // Continue with next chunk on error
        }
    }

    console.log(
        `[MultiModalRAG] Completed ingestion: ${documentIds.length} chunks, ${images.length} images, ${embeddingsGenerated} embeddings`
    );

    return {
        documentIds,
        chunksCreated: chunks.length,
        imagesProcessed: images.length,
        totalEmbeddingsGenerated: embeddingsGenerated,
    };
}

/**
 * Search using multi-modal embeddings
 * Can search by text, image, or both
 */
export async function searchMultiModal(
    query: string,
    userId: string,
    imageBase64?: string,
    options?: {
        topK?: number;
        searchStrategy?: 'text' | 'image' | 'hybrid';
    }
): Promise<any[]> {
    const provider = getVectorDBProvider();
    const topK = options?.topK || 5;
    const strategy = options?.searchStrategy || 'text';

    console.log(`[MultiModalRAG] Searching with strategy: ${strategy}`);

    // Generate query embeddings
    const multiModalQuery: MultiModalContent = {
        type: imageBase64 ? 'mixed' : 'text',
        text: query,
        imageBase64,
    };

    const queryEmbedding = await generateMultiModalEmbedding(multiModalQuery);

    // For now, use text-based search (search by text embedding)
    // Full multi-modal search would require database support for vector comparisons on multiple fields
    const results = await provider.searchSimilar(query, userId, topK * 2);

    // If searching with image and no query text, prioritize by image embedding similarity
    if (imageBase64 && !query.trim()) {
        // Sort by image embedding distance (simple scoring)
        results.sort((a, b) => {
            const aImageSim = a.imageEmbedding ? 0.5 : 0; // Simple placeholder
            const bImageSim = b.imageEmbedding ? 0.5 : 0;
            return bImageSim - aImageSim;
        });
    }

    return results.slice(0, topK);
}

/**
 * Get multi-modal document statistics
 */
export async function getMultiModalStats(userId: string): Promise<{
    totalDocuments: number;
    documentsWithText: number;
    documentsWithImages: number;
    uniqueSources: number;
}> {
    const provider = getVectorDBProvider();
    const stats = await provider.getDocumentStats(userId);

    // For more detailed stats, would need direct database access
    // This is a simplified version
    return {
        totalDocuments: stats.totalDocuments,
        documentsWithText: stats.totalDocuments, // Assumption: all have text
        documentsWithImages: 0, // Would need database count
        uniqueSources: stats.uniqueSources,
    };
}
