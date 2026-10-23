/**
 * LanceDB Vector Provider Implementation
 * Wraps existing LanceDB logic with provider interface
 */

import path from "path";
import fs from "fs";
import crypto from "crypto";
import {
  IVectorDBProvider,
  VectorDocument,
  DocumentMetadata,
  SearchFilters,
  VectorDBStats,
} from "../vector-db-provider";
import { generateEmbedding } from "@/services/rag/embeddings";
import { getDocumentChunker } from "@/services/rag/chunker";
import { getRAGConfig } from "@/services/rag/rag-config";
import { logger } from "@/lib/logger";

let lancedb: any = null;

async function loadLanceDB() {
  if (!lancedb) {
    const moduleName = "@lancedb/lancedb";
    lancedb = await import(/* webpackIgnore: true */ moduleName);
  }
  return lancedb;
}

async function getDb() {
  const db = await loadLanceDB();
  const dbDir = path.join(process.cwd(), "data", "lancedb");
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  const dbConnection = await db.connect(dbDir);
  return dbConnection;
}

function deduplicateResults(results: VectorDocument[]): VectorDocument[] {
  const seen = new Set<string>();
  const deduped: VectorDocument[] = [];

  for (const doc of results) {
    const fingerprint = doc.text.slice(0, 100);
    if (!seen.has(fingerprint)) {
      seen.add(fingerprint);
      deduped.push(doc);
    }
  }

  return deduped;
}

function validateUUID(id: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

export class LanceDBProvider implements IVectorDBProvider {
  async initialize(): Promise<void> {
    const db = await getDb();
    const tableNames = await db.tableNames();
    if (!tableNames.includes("documents")) {
      logger.info(
        "[LanceDBProvider] Initializing documents table on first use",
      );
    }
  }

  async exists(): Promise<boolean> {
    try {
      const db = await getDb();
      const tableNames = await db.tableNames();
      return tableNames.includes("documents");
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
    },
  ): Promise<string> {
    const db = await getDb();
    const docId = crypto.randomUUID();

    const record: Record<string, any> = {
      id: docId,
      text,
      vector,
      metadata: JSON.stringify(metadata),
      userId,
      createdAt: Date.now(),
    };

    // Multi-modal embeddings (Phase 2)
    if (options?.textEmbedding) {
      record.textEmbedding = options.textEmbedding;
    }
    if (options?.imageEmbedding) {
      record.imageEmbedding = options.imageEmbedding;
    }
    if (options?.imageData) {
      record.imageData = options.imageData;
    }
    if (options?.imageMimeType) {
      record.imageMimeType = options.imageMimeType;
    }

    if (metadata.chunkIndex !== undefined && metadata.chunkIndex !== null) {
      record.chunkIndex = metadata.chunkIndex;
    }

    const sourceId = metadata.sourceId || metadata.fileId;
    if (sourceId) {
      record.sourceId = sourceId;
    }

    logger.info(
      `[LanceDBProvider] Adding document ${docId.substring(0, 8)} for userId ${userId.substring(0, 8)}`,
    );

    const tableNames = await db.tableNames();

    if (tableNames.includes("documents")) {
      const table = await db.openTable("documents");
      await table.add([record]);
    } else {
      await db.createTable("documents", [record]);
    }

    return docId;
  }

  async ingestDocument(
    text: string,
    metadata: DocumentMetadata,
    userId: string,
  ): Promise<string[]> {
    const chunker = getDocumentChunker();
    const chunks = chunker.chunkText(text);
    const sourceId =
      metadata.sourceId || metadata.fileId || crypto.randomUUID();
    const documentIds: string[] = [];

    logger.info("[LanceDBProvider] Initializing documents table on first use");

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
      const docId = await this.addDocument(
        chunk.text,
        chunkMetadata,
        userId,
        vector,
      );
      documentIds.push(docId);
    }

    logger.info(
      `[LanceDBProvider] Ingesting document with ${chunks.length} chunks`,
    );
    return documentIds;
  }

  async batchIngestDocuments(
    documents: Array<{ text: string; metadata: DocumentMetadata }>,
    userId: string,
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
    filters?: SearchFilters,
  ): Promise<VectorDocument[]> {
    const db = await getDb();
    const tableNames = await db.tableNames();

    if (!tableNames.includes("documents")) {
      logger.info("[LanceDBProvider] No documents table found");
      return [];
    }

    if (!validateUUID(userId)) {
      logger.error(`[LanceDBProvider] Invalid userId format: ${userId}`);
      throw new Error("Invalid userId format");
    }

    logger.info(
      `[LanceDBProvider] Searching for similar documents (limit=${limit})`,
    );
    const vector = await generateEmbedding(query);

    const table = await db.openTable("documents");

    let filterQuery = `"userId" = '${userId}'`;
    if (filters?.sourceId) {
      filterQuery += ` AND "sourceId" = '${filters.sourceId}'`;
    }

    logger.info(`[LanceDBProvider] Running search with filter: ${filterQuery}`);

    try {
      const results = await table
        .vectorSearch(vector)
        .filter(filterQuery)
        .limit(limit * 2)
        .toArray();

      logger.info(
        `[LanceDBProvider] Searching for: "${query.substring(0, 50)}..."`,
      );

      const uniqueResults = deduplicateResults(results as VectorDocument[]);
      return uniqueResults.slice(0, limit);
    } catch (error) {
      logger.error(`[LanceDBProvider] Search failed:`, error);
      return [];
    }
  }

  async deleteDocumentsBySource(
    sourceId: string,
    userId: string,
  ): Promise<number> {
    const db = await getDb();
    const tableNames = await db.tableNames();

    if (!tableNames.includes("documents")) return 0;

    if (!validateUUID(userId) || !validateUUID(sourceId)) {
      throw new Error("Invalid ID format");
    }

    const table = await db.openTable("documents");
    const beforeResults = await table
      .query()
      .filter(`"userId" = '${userId}' AND "sourceId" = '${sourceId}'`)
      .limit(10000)
      .toArray();

    const count = beforeResults.length;

    if (count > 0) {
      await table.delete(
        `"userId" = '${userId}' AND "sourceId" = '${sourceId}'`,
      );
      logger.info(
        `[LanceDBProvider] Deleting ${count} documents by source ${sourceId}`,
      );
    }

    return count;
  }

  async getDocumentStats(userId: string): Promise<VectorDBStats> {
    const db = await getDb();
    const tableNames = await db.tableNames();

    if (!tableNames.includes("documents")) {
      return { totalDocuments: 0, uniqueSources: 0 };
    }

    if (!validateUUID(userId)) {
      throw new Error("Invalid userId format");
    }

    const table = await db.openTable("documents");
    const results = await table
      .query()
      .filter(`"userId" = '${userId}'`)
      .limit(10000)
      .toArray();

    const sources = new Set(
      results.map((r: any) => r.sourceId).filter(Boolean),
    );

    return {
      totalDocuments: results.length,
      uniqueSources: sources.size,
    };
  }
}
