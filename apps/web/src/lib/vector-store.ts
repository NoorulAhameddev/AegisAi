/**
 * Vector Store Adapter - Supports multiple providers (LanceDB, pgvector, etc.)
 * Maintains backward compatibility with existing code
 * Supports multi-modal embeddings (text + image)
 */

import {
  getVectorDBProvider,
  type VectorDocument,
  type DocumentMetadata,
} from './vector-db-provider';
import { generateEmbedding } from '@/services/rag/embeddings';
import {
  generateMultiModalEmbedding,
  type MultiModalContent,
} from '@/services/rag/multi-modal-embeddings';

// Backward compatibility types
export type Document = VectorDocument;
export type { DocumentMetadata };

// Provider instance
const provider = getVectorDBProvider();

/**
 * Add a single document (backward compatible)
 */
export async function addDocument(
  text: string,
  metadata: DocumentMetadata,
  userId: string
): Promise<string> {
  const vector = await generateEmbedding(text);
  return provider.addDocument(text, metadata, userId, vector);
}

/**
 * Add document with multi-modal content (text + image)
 */
export async function addMultiModalDocument(
  text: string,
  metadata: DocumentMetadata,
  userId: string,
  imageBase64?: string,
  imageMimeType?: string
): Promise<string> {
  // Generate embeddings for both text and image
  const multiModalContent: MultiModalContent = {
    type: imageBase64 ? 'mixed' : 'text',
    text,
    imageBase64,
    mimeType: imageMimeType,
  };

  const multiModalEmbedding = await generateMultiModalEmbedding(multiModalContent);
  const vector = await generateEmbedding(text);

  return provider.addDocument(text, metadata, userId, vector, {
    textEmbedding: multiModalEmbedding.textEmbedding,
    imageEmbedding: multiModalEmbedding.imageEmbedding,
    imageData: imageBase64,
    imageMimeType,
  });
}

/**
 * Ingest document with chunking (backward compatible)
 */
export async function ingestDocument(
  text: string,
  metadata: DocumentMetadata,
  userId: string
): Promise<string[]> {
  return provider.ingestDocument(text, metadata, userId);
}

/**
 * Batch ingest documents (backward compatible)
 */
export async function batchIngestDocuments(
  documents: Array<{ text: string; metadata: DocumentMetadata }>,
  userId: string
): Promise<string[]> {
  return provider.batchIngestDocuments(documents, userId);
}

/**
 * Search for similar documents (backward compatible)
 */
export async function searchSimilar(
  query: string,
  userId: string,
  limit = 5,
  filters?: { sourceId?: string; fileId?: string; type?: string }
): Promise<VectorDocument[]> {
  return provider.searchSimilar(query, userId, limit, filters);
}

/**
 * Delete documents by source (backward compatible)
 */
export async function deleteDocumentsBySource(
  sourceId: string,
  userId: string
): Promise<number> {
  return provider.deleteDocumentsBySource(sourceId, userId);
}

/**
 * Get statistics (backward compatible)
 */
export async function getDocumentStats(userId: string): Promise<{
  totalDocuments: number;
  uniqueSources: number;
}> {
  return provider.getDocumentStats(userId);
}

// Export provider for advanced usage
export { getVectorDBProvider };
