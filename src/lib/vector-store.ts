import {
  searchSimilar,
  ingestDocument,
  batchIngestDocuments,
  addDocument,
  deleteDocumentsBySource,
  getDocumentStats,
  type Document,
  type DocumentMetadata,
} from '../ai/rag/vector-store';

// Re-export vector store utilities for library consumers/tests
export {
  searchSimilar,
  ingestDocument,
  batchIngestDocuments,
  addDocument,
  deleteDocumentsBySource,
  getDocumentStats,
  Document,
  DocumentMetadata,
};
