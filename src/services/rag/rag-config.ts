/**
 * RAG (Retrieval Augmented Generation) Configuration
 * Central configuration for document ingestion, chunking, and retrieval
 */

export interface RAGConfig {
    // Chunking Configuration
    chunking: {
        chunkSize: number;          // Maximum characters per chunk
        chunkOverlap: number;       // Overlap between chunks (for context)
        minChunkSize: number;       // Minimum viable chunk size
    };
    
    // Retrieval Configuration
    retrieval: {
        topK: number;               // Number of documents to retrieve
        similarityThreshold: number; // Minimum similarity score (0-1)
        maxContextLength: number;   // Max total context characters
        rerank: boolean;            // Whether to use reranking
    };
    
    // Document Processing
    processing: {
        supportedTypes: string[];   // Supported MIME types
        maxFileSize: number;        // Max file size in bytes (10MB)
        extractImages: boolean;     // Extract text from images (OCR)
    };
    
    // Embedding Configuration
    embedding: {
        model: string;              // OpenAI embedding model
        dimensions: number;         // Vector dimensions
        batchSize: number;          // Batch size for embeddings
    };
}

export const defaultRAGConfig: RAGConfig = {
    chunking: {
        chunkSize: 1000,            // 1000 characters per chunk
        chunkOverlap: 200,          // 200 character overlap
        minChunkSize: 100,          // Skip chunks smaller than 100 chars
    },
    retrieval: {
        topK: 5,                    // Retrieve top 5 documents
        similarityThreshold: 0.7,   // 70% similarity threshold
        maxContextLength: 4000,     // Max 4000 chars in context
        rerank: true,               // Enable reranking
    },
    processing: {
        supportedTypes: [
            'text/plain',
            'text/markdown',
            'application/pdf',
            'application/json',
            'text/csv',
            'image/png',
            'image/jpeg',
            'image/jpg',
        ],
        maxFileSize: 10 * 1024 * 1024,  // 10MB
        extractImages: true,
    },
    embedding: {
        model: 'openai/text-embedding-3-small',
        dimensions: 1536,
        batchSize: 100,
    },
};

/**
 * Get RAG configuration (can be extended to load from DB/env)
 */
export function getRAGConfig(): RAGConfig {
    return defaultRAGConfig;
}

/**
 * Validate if file type is supported for RAG
 */
export function isSupportedFileType(mimeType: string): boolean {
    return defaultRAGConfig.processing.supportedTypes.includes(mimeType);
}

/**
 * Validate file size
 */
export function isValidFileSize(size: number): boolean {
    return size <= defaultRAGConfig.processing.maxFileSize;
}
