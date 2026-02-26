import {
  retrieveContext,
  formatRAGContext,
  shouldUseRAG,
  type RetrievalResult,
} from "../services/rag/rag-retrieval";

// Re-export service-layer RAG helpers for tests and API use
export { retrieveContext, formatRAGContext, shouldUseRAG, RetrievalResult };
