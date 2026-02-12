/**
 * PostgreSQL pgvector Vector Provider Implementation
 * Uses PostgreSQL with pgvector extension for production-grade vector storage
 */

import crypto from 'crypto';
import {
    IVectorDBProvider,
    VectorDocument,
    DocumentMetadata,
    SearchFilters,
    VectorDBStats,
} from '../vector-db-provider';
import { generateEmbedding } from '@/services/rag/embeddings';
import { getDocumentChunker } from '@/services/rag/chunker';
import { prisma } from '@/lib/prisma';

function validateUUID(id: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
}

export class PgvectorProvider implements IVectorDBProvider {
    async initialize(): Promise<void> {
        console.log('[PgvectorProvider] Initializing - ensure pgvector extension is installed');
        // Extension should be created via init-db.sql
        // Tables created via Prisma schema
    }

    async exists(): Promise<boolean> {
        try {
            // Try to query documents table
            const result = await prisma.$queryRaw`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'Document'
                )
            `;
            return (result as any[])[0].exists;
        } catch {
            return false;
        }
    }

    async addDocument(
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
    ): Promise<string> {
        const docId = crypto.randomUUID();

        console.log(`[PgvectorProvider] Adding document ${docId.substring(0, 8)} for userId ${userId.substring(0, 8)}`);

        try {
            // Use Prisma to insert document with vector and multi-modal embeddings
            const result = await (prisma as any).document.create({
                data: {
                    id: docId,
                    text,
                    vector,
                    textEmbedding: options?.textEmbedding || null,
                    imageEmbedding: options?.imageEmbedding || null,
                    imageData: options?.imageData || null,
                    imageMimeType: options?.imageMimeType || null,
                    metadata,
                    userId,
                    sourceId: metadata.sourceId || metadata.fileId || null,
                    chunkIndex: metadata.chunkIndex || null,
                    createdAt: new Date(),
                },
            });

            console.log(`[PgvectorProvider] Successfully added document ${docId.substring(0, 8)}`);
            return result.id;
        } catch (error) {
            console.error('[PgvectorProvider] Failed to add document:', error);
            throw error;
        }
    }

    async ingestDocument(
        text: string,
        metadata: DocumentMetadata,
        userId: string
    ): Promise<string[]> {
        const chunker = getDocumentChunker();
        const chunks = chunker.chunkText(text);
        const sourceId = metadata.sourceId || metadata.fileId || crypto.randomUUID();
        const documentIds: string[] = [];

        console.log(`[PgvectorProvider] Ingesting document with ${chunks.length} chunks`);

        for (const chunk of chunks) {
            const chunkMetadata: DocumentMetadata = {
                ...metadata,
                chunkIndex: chunk.index,
                sourceId,
                startChar: chunk.metadata.startChar,
                endChar: chunk.metadata.endChar,
            };

            // Generate embedding for chunk
            const vector = await generateEmbedding(chunk.text);
            const docId = await this.addDocument(chunk.text, chunkMetadata, userId, vector);
            documentIds.push(docId);
        }

        console.log(`[PgvectorProvider] Successfully ingested ${documentIds.length} chunks`);
        return documentIds;
    }

    async batchIngestDocuments(
        documents: Array<{ text: string; metadata: DocumentMetadata }>,
        userId: string
    ): Promise<string[]> {
        const allIds: string[] = [];

        for (const doc of documents) {
            const ids = await this.ingestDocument(doc.text, doc.metadata, userId);
            allIds.push(...ids);
        }

        return allIds;
    }

    async searchSimilar(
        query: string,
        userId: string,
        limit = 5,
        filters?: SearchFilters
    ): Promise<VectorDocument[]> {
        if (!validateUUID(userId)) {
            console.error(`[PgvectorProvider] Invalid userId format: ${userId}`);
            throw new Error('Invalid userId format');
        }

        console.log(`[PgvectorProvider] Searching for: "${query.substring(0, 50)}..."`);
        const vector = await generateEmbedding(query);

        try {
            // Use pgvector cosine distance (<-> operator)
            console.log(`[PgvectorProvider] Running vector search with limit ${limit}`);

            const results = await (prisma as any).$queryRaw`
                SELECT 
                    id, 
                    text, 
                    vector, 
                    metadata, 
                    "userId", 
                    "createdAt",
                    "sourceId",
                    "chunkIndex",
                    (vector <-> ${JSON.stringify(vector)}::vector) AS distance
                FROM "Document"
                WHERE "userId" = ${userId}
                ${filters?.sourceId ? `AND "sourceId" = ${filters.sourceId}` : ''}
                ORDER BY distance ASC
                LIMIT ${limit * 2}
            `;

            console.log(`[PgvectorProvider] Found ${results.length} results`);

            // Convert distance back to similarity score (1 - distance)
            const formattedResults = (results as any[]).map(doc => ({
                id: doc.id,
                text: doc.text,
                vector: doc.vector,
                metadata: typeof doc.metadata === 'string' ? doc.metadata : JSON.stringify(doc.metadata),
                userId: doc.userId,
                createdAt: new Date(doc.createdAt).getTime(),
                sourceId: doc.sourceId,
                chunkIndex: doc.chunkIndex,
            })) as VectorDocument[];

            return formattedResults.slice(0, limit);
        } catch (error) {
            console.error('[PgvectorProvider] Search failed:', error);
            return [];
        }
    }

    async deleteDocumentsBySource(sourceId: string, userId: string): Promise<number> {
        if (!validateUUID(userId) || !validateUUID(sourceId)) {
            throw new Error('Invalid ID format');
        }

        console.log(`[PgvectorProvider] Deleting documents for source ${sourceId}`);

        try {
            const result = await (prisma as any).document.deleteMany({
                where: {
                    userId,
                    sourceId,
                },
            });

            console.log(`[PgvectorProvider] Deleted ${result.count} documents`);
            return result.count;
        } catch (error) {
            console.error('[PgvectorProvider] Delete failed:', error);
            throw error;
        }
    }

    async getDocumentStats(userId: string): Promise<VectorDBStats> {
        if (!validateUUID(userId)) {
            throw new Error('Invalid userId format');
        }

        console.log(`[PgvectorProvider] Getting stats for user ${userId.substring(0, 8)}`);

        try {
            const totalDocuments = await (prisma as any).document.count({
                where: { userId },
            });

            const uniqueSources = await (prisma as any).document.groupBy({
                by: ['sourceId'],
                where: { userId },
                _count: true,
            });

            return {
                totalDocuments,
                uniqueSources: uniqueSources.length,
            };
        } catch (error) {
            console.error('[PgvectorProvider] Stats query failed:', error);
            return { totalDocuments: 0, uniqueSources: 0 };
        }
    }
}
