/**
 * Multi-Modal RAG Integration Service
 * Orchestrates chunking, embedding generation, and storage for mixed content
 */

import { getDocumentChunker } from "./chunker";
import {
  generateMultiModalEmbedding,
  mergeEmbeddings,
} from "./multi-modal-embeddings";
import { getVectorDBProvider } from "@/lib/vector-db-provider";
import type { DocumentMetadata } from "@/lib/vector-db-provider";
import { generateEmbedding } from "./embeddings";
import { logger } from "@/lib/logger";

/**
 * Calculate cosine similarity between two vectors
 * Returns a value between -1 and 1, where 1 means identical
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

interface MultiModalIngestOptions {
  userId: string;
  sourceId?: string;
  fileName?: string;
  fileType?: string;
  embedStrategy?: "concat" | "avg" | "text-only";
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
  options: MultiModalIngestOptions,
): Promise<IngestResult> {
  const chunker = getDocumentChunker();
  const provider = getVectorDBProvider();

  logger.info("[MultiModalRAG] Starting multi-modal ingestion");

  // Extract chunks and images from document
  const { chunks, images } = chunker.chunkWithImages(text);

  if (chunks.length === 0) {
    logger.warn("[MultiModalRAG] No chunks extracted from document");
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
    const embedStrategy = options.embedStrategy || "text-only";

    try {
      // Generate multi-modal embeddings
      const embedding = await generateMultiModalEmbedding(chunk.text, {
        mergeStrategy: embedStrategy,
        skipImageProcessing: !chunk.metadata.imageData,
      });
      embeddingsGenerated++;

      // Merge embeddings into single vector (based on strategy)
      const mergedVector = mergeEmbeddings(
        embedding.textEmbedding,
        embedding.imageEmbedding,
        embedStrategy,
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
          textEmbedding: embedding.textEmbedding ?? undefined,
          imageEmbedding: embedding.imageEmbedding ?? undefined,
          imageData: chunk.metadata.imageData,
          imageMimeType: chunk.metadata.imageMimeType,
        },
      );

      documentIds.push(docId);
      logger.info(
        `[MultiModalRAG] Ingested chunk ${chunk.index} (${chunk.text.length} chars, images: ${embedding.imageEmbedding ? "yes" : "no"})`,
      );
    } catch (error) {
      logger.error(
        `[MultiModalRAG] Failed to ingest chunk ${chunk.index}:`,
        error,
      );
      // Continue with next chunk on error
    }
  }

  logger.info(
    `[MultiModalRAG] Completed ingestion: ${documentIds.length} chunks, ${images.length} images, ${embeddingsGenerated} embeddings`,
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
    searchStrategy?: "text" | "image" | "hybrid";
  },
): Promise<any[]> {
  const provider = getVectorDBProvider();
  const topK = options?.topK || 5;
  const strategy = options?.searchStrategy || "text";

  logger.info(`[MultiModalRAG] Searching with strategy: ${strategy}`);

  // Generate query embeddings
  const queryEmbedding = await generateMultiModalEmbedding(query, {
    mergeStrategy: "text-only",
    skipImageProcessing: !imageBase64,
  });

  // For now, use text-based search (search by text embedding)
  // Full multi-modal search would require database support for vector comparisons on multiple fields
  const results = await provider.searchSimilar(query, userId, topK * 2);

  // If searching with image and no query text, prioritize by image embedding similarity
  if (imageBase64 && !query.trim() && queryEmbedding.imageEmbedding) {
    // Calculate actual cosine similarity between query and document image embeddings
    const queryVec = queryEmbedding.imageEmbedding;
    results.sort((a, b) => {
      const aImageSim = a.imageEmbedding
        ? cosineSimilarity(queryVec, a.imageEmbedding)
        : 0;
      const bImageSim = b.imageEmbedding
        ? cosineSimilarity(queryVec, b.imageEmbedding)
        : 0;
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
