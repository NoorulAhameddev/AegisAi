/**
 * Multi-Modal RAG Utility Helpers
 * Common patterns and helper functions for multi-modal RAG operations
 */

import { generateMultiModalEmbedding, MergeStrategy, MultiModalEmbeddingResult } from './multi-modal-embeddings';
import { addDocument, searchSimilar, getDocumentStats } from '@/ai/rag/vector-store';
import { getRAGConfig, getMergeStrategy, shouldContinueOnError, getFallbackStrategy } from './config';
import { logger } from '@/lib/logger';

/**
 * Ingest document helper with automatic strategy selection
 */
export async function ingestDocumentAuto(
    content: string,
    userId: string,
    sourceId?: string,
    metadata?: Record<string, any>
): Promise<{
    success: boolean;
    documentId?: string;
    contentType?: string;
    warnings?: string[];
    error?: string;
}> {
    try {
        const config = getRAGConfig();
        
        if (!config.enableRAG) {
            return { 
                success: false, 
                error: 'RAG is disabled in configuration' 
            };
        }

        // Generate embedding using configured strategy
        const result = await generateMultiModalEmbedding(content, {
            mergeStrategy: getMergeStrategy((content.includes('data:image/') ? 'mixed' : 'text') as any),
        });

        // Add to vector store
        const documentId = await addDocument(
            content,
            {
                ...metadata,
                contentType: result.contentType,
                hasText: result.hasText,
                hasImage: result.hasImage,
                sourceId: sourceId || 'api',
            },
            userId
        );

        return {
            success: true,
            documentId,
            contentType: result.contentType,
            warnings: result.warnings,
        };
    } catch (error) {
        const errorMsg = (error as Error).message;
        logger.error('Auto ingest failed', error as Error);
        return {
            success: false,
            error: errorMsg,
        };
    }
}

/**
 * Search with automatic fallback strategy
 */
export async function searchWithFallback(
    query: string,
    userId: string,
    topK?: number
): Promise<{
    success: boolean;
    results?: Array<{
        id: string;
        text: string;
        metadata?: Record<string, any>;
    }>;
    fallbackUsed?: boolean;
    error?: string;
}> {
    const config = getRAGConfig();
    topK = topK || config.defaultTopK;

    try {
        // Search with the query
        const results = await searchSimilar(
            query,
            userId,
            topK
        );

        return {
            success: true,
            results: results.map(r => ({
                id: r.id,
                text: r.text,
                metadata: JSON.parse(r.metadata || '{}'),
            })),
        };
    } catch (error) {
        logger.warn('Search failed', { error: (error as Error).message });

        // Try fallback strategy
        const fallback = getFallbackStrategy();
        
        if (fallback === 'skip-chunk') {
            return {
                success: true,
                results: [],
                fallbackUsed: true,
            };
        }

        return {
            success: false,
            error: (error as Error).message,
        };
    }
}

/**
 * Batch ingest with error tolerance
 */
export async function batchIngestDocuments(
    documents: Array<{
        content: string;
        sourceId?: string;
        metadata?: Record<string, any>;
    }>,
    userId: string,
    options?: {
        continueOnError?: boolean;
        progressCallback?: (current: number, total: number) => void;
    }
): Promise<{
    successful: number;
    failed: number;
    results: Array<{
        content: string;
        documentId?: string;
        error?: string;
    }>;
}> {
    const results = [];
    let successful = 0;
    let failed = 0;

    for (let i = 0; i < documents.length; i++) {
        const doc = documents[i];
        
        try {
            const result = await ingestDocumentAuto(
                doc.content,
                userId,
                doc.sourceId,
                doc.metadata
            );

            if (result.success) {
                successful++;
                results.push({
                    content: doc.content.substring(0, 100),
                    documentId: result.documentId,
                });
            } else {
                failed++;
                results.push({
                    content: doc.content.substring(0, 100),
                    error: result.error,
                });
                
                if (!options?.continueOnError) {
                    throw new Error(`Failed to ingest document ${i}: ${result.error}`);
                }
            }
        } catch (error) {
            failed++;
            results.push({
                content: doc.content.substring(0, 100),
                error: (error as Error).message,
            });
            
            if (!options?.continueOnError) {
                throw error;
            }
        }

        options?.progressCallback?.(i + 1, documents.length);
    }

    logger.info('Batch ingest completed', { successful, failed, total: documents.length });

    return { successful, failed, results };
}

/**
 * Get  statistics about multi-modal documents
 */
export async function getMultiModalDocumentStats(userId: string): Promise<{
    totalDocuments: number;
    uniqueSources: number;
    error?: string;
}> {
    try {
        const stats = await getDocumentStats(userId);
        return {
            totalDocuments: stats.totalDocuments || 0,
            uniqueSources: stats.uniqueSources || 0,
        };
    } catch (error) {
        logger.error('Failed to get document statistics', error as Error);
        return {
            totalDocuments: 0,
            uniqueSources: 0,
            error: (error as Error).message,
        };
    }
}

/**
 * Validate document before ingestion
 */
export function validateDocument(content: string, maxSize = 1000000): {
    valid: boolean;
    errors: string[];
    warnings: string[];
} {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check empty content
    if (!content || content.trim().length === 0) {
        errors.push('Content is empty');
    }

    // Check size
    if (content.length > maxSize) {
        errors.push(`Content exceeds maximum size of ${maxSize} bytes`);
    }

    // Check for base64 images
    const imageMatches = content.match(/data:image\/[^;]+;base64,/g);
    if (imageMatches && imageMatches.length > 5) {
        warnings.push(`Document contains ${imageMatches.length} inline images (may slow down processing)`);
    }

    // Check text vs binary balance
    const printableChars = content.match(/[a-zA-Z0-9\s]/g)?.length || 0;
    const ratio = printableChars / content.length;
    if (ratio < 0.5) {
        warnings.push('Document contains lots of non-printable characters');
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings,
    };
}

/**
 * Format embedding result for API response
 */
export function formatEmbeddingResult(result: MultiModalEmbeddingResult) {
    return {
        contentType: result.contentType,
        hasText: result.hasText,
        hasImage: result.hasImage,
        strategy: result.strategy,
        embeddingDimensions: result.mergedEmbedding.length,
        textEmbeddingDims: result.textEmbedding?.length,
        imageEmbeddingDims: result.imageEmbedding?.length,
        hasErrors: !!result.error,
        error: result.error,
        warnings: result.warnings,
    };
}

/**
 * Create RAG context from search results
 */
export function createRAGContext(
    results: Array<{
        id: string;
        text: string;
        metadata?: Record<string, any>;
    }>,
    maxTokens = 2000
): string {
    if (results.length === 0) {
        return 'No relevant context found.';
    }

    let context = 'Relevant context from knowledge base:\n\n';
    let tokenCount = 0;
    const tokensPerWord = 1.3; // Rough estimate

    for (const result of results) {
        const contentLength = Math.ceil(result.text.length / 4 * tokensPerWord);
        if (tokenCount + contentLength > maxTokens) break;

        context += `[Source: ${result.id}]\n`;
        context += `${result.text}\n\n`;
        tokenCount += contentLength;
    }

    return context;
}

export default {
    ingestDocumentAuto,
    searchWithFallback,
    batchIngestDocuments,
    getMultiModalDocumentStats,
    validateDocument,
    formatEmbeddingResult,
    createRAGContext,
};
