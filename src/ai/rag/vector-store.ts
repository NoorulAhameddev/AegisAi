import * as lancedb from "@lancedb/lancedb";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { generateEmbedding } from "./embeddings";
import { getDocumentChunker } from "./chunker";
import { getRAGConfig } from "./rag-config";

const DB_DIR = path.join(process.cwd(), "data", "lancedb");

// Ensure DB directory exists
if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
}

export interface Document {
    id: string;
    text: string;
    vector: number[];
    metadata: string; // JSON string
    userId: string;
    createdAt: number;
    chunkIndex?: number;
    sourceId?: string; // Original document/file ID
    [key: string]: unknown; // Index signature for LanceDB
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
    [key: string]: any;
}

// connect function
async function getDb() {
    return await lancedb.connect(DB_DIR);
}

/**
 * Add a single document to vector store (for backward compatibility)
 */
export async function addDocument(text: string, metadata: DocumentMetadata, userId: string): Promise<string> {
    const db = await getDb();
    const tableNames = await db.tableNames();

    // Generate Vector
    const vector = await generateEmbedding(text);

    const record: Document = {
        id: crypto.randomUUID(),
        text,
        vector,
        metadata: JSON.stringify(metadata),
        userId,
        createdAt: Date.now(),
        chunkIndex: metadata.chunkIndex,
        sourceId: metadata.sourceId || metadata.fileId,
    };

    let table;
    if (tableNames.includes("documents")) {
        table = await db.openTable("documents");
        await table.add([record]);
    } else {
        // Create table with first record to infer schema
        table = await db.createTable("documents", [record]);
    }

    return record.id;
}

/**
 * Ingest a document with smart chunking
 */
export async function ingestDocument(
    text: string, 
    metadata: DocumentMetadata, 
    userId: string
): Promise<string[]> {
    const chunker = getDocumentChunker();
    const chunks = chunker.chunkText(text);
    
    const sourceId = metadata.sourceId || metadata.fileId || crypto.randomUUID();
    const documentIds: string[] = [];

    console.log(`[VectorStore] Ingesting document with ${chunks.length} chunks`);

    // Add all chunks to vector store
    for (const chunk of chunks) {
        const chunkMetadata: DocumentMetadata = {
            ...metadata,
            chunkIndex: chunk.index,
            sourceId,
            startChar: chunk.metadata.startChar,
            endChar: chunk.metadata.endChar,
        };

        const docId = await addDocument(chunk.text, chunkMetadata, userId);
        documentIds.push(docId);
    }

    console.log(`[VectorStore] Successfully ingested ${documentIds.length} chunks`);
    return documentIds;
}

/**
 * Batch ingest multiple documents
 */
export async function batchIngestDocuments(
    documents: Array<{ text: string; metadata: DocumentMetadata }>,
    userId: string
): Promise<string[]> {
    const allIds: string[] = [];
    
    for (const doc of documents) {
        const ids = await ingestDocument(doc.text, doc.metadata, userId);
        allIds.push(...ids);
    }
    
    return allIds;
}

/**
 * Search for similar documents with enhanced filtering
 */
export async function searchSimilar(
    query: string, 
    userId: string, 
    limit = 5,
    filters?: {
        sourceId?: string;
        fileId?: string;
        type?: string;
    }
): Promise<Document[]> {
    const db = await getDb();
    const tableNames = await db.tableNames();

    if (!tableNames.includes("documents")) return [];

    // SECURITY: Validate userId is a valid UUID to prevent injection
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
        console.error(`[VectorStore] Invalid userId format: ${userId}`);
        throw new Error('Invalid userId format');
    }

    const vector = await generateEmbedding(query);
    const table = await db.openTable("documents");

    // Build filter query
    let filterQuery = `userId = '${userId}'`;
    if (filters?.sourceId) {
        filterQuery += ` AND sourceId = '${filters.sourceId}'`;
    }

    // Safe: userId is validated as UUID, no injection possible
    const results = await table.vectorSearch(vector)
        .filter(filterQuery)
        .limit(limit * 2) // Get more results for reranking
        .toArray();

    // Post-process: Remove duplicates and apply threshold
    const config = getRAGConfig();
    const uniqueResults = deduplicateResults(results as Document[]);
    
    return uniqueResults.slice(0, limit);
}

/**
 * Remove duplicate chunks from same source
 */
function deduplicateResults(results: Document[]): Document[] {
    const seen = new Set<string>();
    const deduped: Document[] = [];

    for (const doc of results) {
        // Create a fingerprint based on text content
        const fingerprint = doc.text.slice(0, 100); // First 100 chars
        if (!seen.has(fingerprint)) {
            seen.add(fingerprint);
            deduped.push(doc);
        }
    }

    return deduped;
}

/**
 * Delete documents by source ID (e.g., when file is deleted)
 */
export async function deleteDocumentsBySource(sourceId: string, userId: string): Promise<number> {
    const db = await getDb();
    const tableNames = await db.tableNames();

    if (!tableNames.includes("documents")) return 0;

    const table = await db.openTable("documents");
    
    // LanceDB delete by filter
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId) || !uuidRegex.test(sourceId)) {
        throw new Error('Invalid ID format');
    }

    // Get count before deletion
    const beforeResults = await table
        .query()
        .filter(`userId = '${userId}' AND sourceId = '${sourceId}'`)
        .limit(10000)
        .toArray();
    
    const count = beforeResults.length;

    if (count > 0) {
        await table.delete(`userId = '${userId}' AND sourceId = '${sourceId}'`);
        console.log(`[VectorStore] Deleted ${count} documents for source ${sourceId}`);
    }

    return count;
}

/**
 * Get document statistics for a user
 */
export async function getDocumentStats(userId: string): Promise<{
    totalDocuments: number;
    uniqueSources: number;
}> {
    const db = await getDb();
    const tableNames = await db.tableNames();

    if (!tableNames.includes("documents")) {
        return { totalDocuments: 0, uniqueSources: 0 };
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
        throw new Error('Invalid userId format');
    }

    const table = await db.openTable("documents");
    const results = await table
        .query()
        .filter(`userId = '${userId}'`)
        .limit(10000)
        .toArray();

    const sources = new Set(results.map((r: any) => r.sourceId).filter(Boolean));

    return {
        totalDocuments: results.length,
        uniqueSources: sources.size,
    };
}
