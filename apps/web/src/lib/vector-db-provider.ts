/**
 * Abstract Vector Database Provider Interface
 * Allows switching between LanceDB, pgvector, Milvus, etc.
 */

export interface VectorDocument {
    id: string;
    text: string;
    vector: number[];
    textEmbedding?: number[];      // text-embedding-3-large (Phase 2)
    imageEmbedding?: number[];     // CLIP image embedding (Phase 2)
    imageData?: string;            // Base64 encoded image
    imageMimeType?: string;        // e.g., "image/jpeg"
    metadata: string; // JSON string
    userId: string;
    createdAt: number;
    chunkIndex?: number;
    sourceId?: string;
    [key: string]: unknown;
}

export interface DocumentMetadata {
    role?: string;
    chatId?: string;
    fileId?: string;
    fileName?: string;
    fileType?: string;
    chunkIndex?: number;
    sourceId?: string;
    type?: string;
    startChar?: number;
    endChar?: number;
    [key: string]: any;
}

export interface SearchFilters {
    sourceId?: string;
    fileId?: string;
    type?: string;
    [key: string]: any;
}

export interface VectorDBStats {
    totalDocuments: number;
    uniqueSources: number;
}

/**
 * Provider interface - implement this for each vector DB
 */
export interface IVectorDBProvider {
    /**
     * Add a single document to the vector store
     */
    addDocument(
        text: string,
        metadata: DocumentMetadata,
        userId: string,
        vector: number[],
        options?: {
            textEmbedding?: number[];
            imageEmbedding?: number[];
            imageData?: string;
            imageMimeType?: string;
        }
    ): Promise<string>;

    /**
     * Ingest a document with chunking
     */
    ingestDocument(
        text: string,
        metadata: DocumentMetadata,
        userId: string
    ): Promise<string[]>;

    /**
     * Batch ingest multiple documents
     */
    batchIngestDocuments(
        documents: Array<{ text: string; metadata: DocumentMetadata }>,
        userId: string
    ): Promise<string[]>;

    /**
     * Search for similar documents
     */
    searchSimilar(
        query: string,
        userId: string,
        limit?: number,
        filters?: SearchFilters
    ): Promise<VectorDocument[]>;

    /**
     * Delete documents by source ID
     */
    deleteDocumentsBySource(sourceId: string, userId: string): Promise<number>;

    /**
     * Get statistics for a user
     */
    getDocumentStats(userId: string): Promise<VectorDBStats>;

    /**
     * Check if table/collection exists
     */
    exists(): Promise<boolean>;

    /**
     * Initialize provider (create tables, indexes, etc.)
     */
    initialize(): Promise<void>;
}

/**
 * Provider Factory - creates appropriate provider based on environment
 */
export function createVectorDBProvider(): IVectorDBProvider {
    const providerType = process.env.VECTOR_DB_PROVIDER || 'lancedb';

    switch (providerType.toLowerCase()) {
        case 'pgvector':
            const { PgvectorProvider } = require('./vector-providers/pgvector-provider');
            return new PgvectorProvider();
        case 'lancedb':
        default:
            const { LanceDBProvider } = require('./vector-providers/lancedb-provider');
            return new LanceDBProvider();
    }
}

// Singleton instance
let _provider: IVectorDBProvider | null = null;

export function getVectorDBProvider(): IVectorDBProvider {
    if (!_provider) {
        _provider = createVectorDBProvider();
    }
    return _provider;
}
