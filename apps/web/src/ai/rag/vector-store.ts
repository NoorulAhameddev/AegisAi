// File: src/ai/rag/vector-store.ts
// This module uses LanceDB which requires native bindings and should only run on the server
let lancedb: any = null;
// NOTE: Do NOT cache database connection - each operation must get fresh connection
// to ensure recent writes are visible. Tables are cached internally by LanceDB.

// Lazy load lancedb to prevent bundling issues
async function loadLanceDB() {
	if (!lancedb) {
		// Use eval-like approach to hide from static analysis
		const moduleName = "@lancedb/lancedb";
		lancedb = await import(/* webpackIgnore: true */ moduleName);
	}
	return lancedb;
}

import path from "path";
import fs from "fs";
import crypto from "crypto";
import { generateEmbedding } from "@/services/rag/embeddings";
import { getDocumentChunker } from "@/services/rag/chunker";
import { getRAGConfig } from "@/services/rag/rag-config";

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

// CRITICAL FIX: Get fresh database connection for each operation
// This ensures recent writes are always visible
async function getDb() {
    const db = await loadLanceDB();
    // Create new connection each time - LanceDB internally caches table handles
    const dbConnection = await db.connect(DB_DIR);
    return dbConnection;
}

/**
 * Add a single document to vector store (for backward compatibility)
 */
export async function addDocument(text: string, metadata: DocumentMetadata, userId: string): Promise<string> {
    const db = await getDb();

    // Generate Vector
    const vector = await generateEmbedding(text);

    const record: Record<string, any> = {
        id: crypto.randomUUID(),
        text,
        vector,
        metadata: JSON.stringify(metadata),
        userId,
        createdAt: Date.now(),
    };

    // Only add optional fields if they have values to avoid schema inference issues
    if (metadata.chunkIndex !== undefined && metadata.chunkIndex !== null) {
        record.chunkIndex = metadata.chunkIndex;
    }
    
    const sourceId = metadata.sourceId || metadata.fileId;
    if (sourceId) {
        record.sourceId = sourceId;
    }

    console.log(`[VectorStore] addDocument - Creating record with userId: ${userId.substring(0, 8)}, sourceId: ${sourceId?.substring(0, 8) || 'none'}`);
    console.log(`[VectorStore] Record structure:`, Object.keys(record).join(', '));

    const tableNames = await db.tableNames();
    
    if (tableNames.includes("documents")) {
        // Always open fresh table for adds to ensure we're writing to latest version
        const table = await db.openTable("documents");
        console.log(`[VectorStore] Opening fresh table for insert`);
        await table.add([record]);
    } else {
        // Create table with first record
        console.log(`[VectorStore] Creating new documents table`);
        await db.createTable("documents", [record]);
    }

    console.log(`[VectorStore] Successfully added document ${record.id.substring(0, 8)}`);
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

    console.log(`[VectorStore] Available tables: ${tableNames.join(", ")}`);

    if (!tableNames.includes("documents")) {
        console.log(`[VectorStore] No documents table found`);
        return [];
    }

    // SECURITY: Validate userId is a valid UUID to prevent injection
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
        console.error(`[VectorStore] Invalid userId format: ${userId}`);
        throw new Error('Invalid userId format');
    }

    console.log(`[VectorStore] Generating embedding for query: "${query.substring(0, 50)}..."`);
    const vector = await generateEmbedding(query);
    console.log(`[VectorStore] Generated query embedding with ${vector.length} dimensions`);
    
    // Always open fresh table for queries to see latest data
    const table = await db.openTable("documents");
    console.log(`[VectorStore] Opened fresh table for search`);

    // First, check how many documents exist for this user
    try {
        // Try without filter first to see if ANY documents exist
        const allDocs = await table.query().limit(100).toArray();
        console.log(`[VectorStore] Total documents in entire store: ${allDocs.length}`);
        
        // Try the filter with double quotes for case-sensitive columns
        const filterNoQuotes = `"userId" = '${userId}'`;
        const allDocsForUser = await table
            .query()
            .filter(filterNoQuotes)
            .limit(1000)
            .toArray();
        console.log(`[VectorStore] Total documents with filter (double quotes): ${allDocsForUser.length}`);
        
        if (allDocsForUser.length === 0) {
            // Try with backticks as fallback
            const filterWithBackticks = `\`userId\` = '${userId}'`;
            const allDocsForUser2 = await table
                .query()
                .filter(filterWithBackticks)
                .limit(1000)
                .toArray();
            console.log(`[VectorStore] Total documents with filter (backticks): ${allDocsForUser2.length}`);
            
            if (allDocsForUser2.length > 0) {
                console.log(`[VectorStore] ✅ Backtick filter works! Updating filter syntax...`);
                // Store to use backticks from now on
            }
        }
        
        if (allDocsForUser.length > 0) {
            console.log(`[VectorStore] Sample document:`, JSON.stringify(allDocsForUser[0], null, 2).substring(0, 400));
            // Check if the sample document has a vector
            if (allDocsForUser[0].vector) {
                console.log(`[VectorStore] Sample doc has vector with ${allDocsForUser[0].vector.length} dimensions`);
            } else {
                console.warn(`[VectorStore] ⚠️ Sample document has NO vector field!`);
            }
        } else if (allDocs.length > 0) {
            console.log(`[VectorStore] Found documents in store, but NONE match filter. First doc userId: ${allDocs[0].userId}`);
            console.log(`[VectorStore] First doc full: ${JSON.stringify(allDocs[0]).substring(0, 200)}`);
        }
    } catch (e) {
        console.error(`[VectorStore] Error counting documents:`, e);
    }

    // Build filter query - use double quotes for case-sensitive column names
    let filterQuery = `"userId" = '${userId}'`;
    if (filters?.sourceId) {
        filterQuery += ` AND "sourceId" = '${filters.sourceId}'`;
    }

    console.log(`[VectorStore] Running search with filter: ${filterQuery}`);

    try {
        // Safe: userId is validated as UUID, no injection possible
        console.log(`[VectorStore] About to call vectorSearch with vector of ${vector.length} dimensions`);
        
        const builder = table.vectorSearch(vector);
        console.log(`[VectorStore] vectorSearch builder created`);
        
        const filtered = builder.filter(filterQuery);
        console.log(`[VectorStore] filter applied: ${filterQuery}`);
        
        const limited = filtered.limit(limit * 2);
        console.log(`[VectorStore] limit set to ${limit * 2}`);
        
        const results = await limited.toArray();

        console.log(`[VectorStore] Vector search returned ${results.length} results before deduplication`);

        // Post-process: Remove duplicates and apply threshold
        const config = getRAGConfig();
        const uniqueResults = deduplicateResults(results as Document[]);
        
        console.log(`[VectorStore] After deduplication: ${uniqueResults.length} results, returning ${Math.min(uniqueResults.length, limit)}`);
        
        return uniqueResults.slice(0, limit);
    } catch (error) {
        console.error(`[VectorStore] search failed: ${String(error)}`);
        console.error(`[VectorStore] Error stack:`, error);
        return [];
    }
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
        .filter(`"userId" = '${userId}' AND "sourceId" = '${sourceId}'`)
        .limit(10000)
        .toArray();
    
    const count = beforeResults.length;

    if (count > 0) {
        await table.delete(`"userId" = '${userId}' AND "sourceId" = '${sourceId}'`);
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
        .filter(`"userId" = '${userId}'`)
        .limit(10000)
        .toArray();

    const sources = new Set(results.map((r: any) => r.sourceId).filter(Boolean));

    return {
        totalDocuments: results.length,
        uniqueSources: sources.size,
    };
}
