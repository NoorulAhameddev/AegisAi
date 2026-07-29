/**
 * RAG Configuration Manager
 * Provides flexible configuration options for RAG operations
 * Supports strategies, fallbacks, and feature flags
 */

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

/**
 * RAG operation modes
 */
export type RAGMode = "strict" | "permissive" | "failfast";

/**
 * Merge strategy options
 */
export type MergeStrategy = "concat" | "avg" | "text-only";

/**
 * Fallback strategy when embeddings fail
 */
export type FallbackStrategy =
  | "zero-vector"
  | "skip-chunk"
  | "text-only-fallback";

/**
 * Complete RAG configuration
 */
export interface RAGConfig {
  // Mode settings
  mode: RAGMode;

  // Embedding settings
  embeddingModel: "openai/text-embedding-3-small" | "text-embedding-3-large";
  mergeStrategy: MergeStrategy;

  enableMultiModal: boolean;
  enableImageEmbeddings: boolean;
  enableImageOCR: boolean;

  // Chunking settings
  chunkSize: number;
  chunkOverlap: number;

  // Search settings
  defaultTopK: number;
  similarityThreshold: number;

  // Performance settings
  enableCaching: boolean;
  cacheTTL: number; // seconds
  batchSize: number;

  // Error handling
  fallbackStrategy: FallbackStrategy;
  maxRetries: number;
  retryDelayMs: number;

  // Vector DB settings
  vectorDBProvider: "lancedb" | "pgvector";

  // Feature flags
  enableRAG: boolean;
  enableSemanticCache: boolean;
  enableCrossEncoderReranking: boolean;

  // Logging
  verboseLogging: boolean;
}

/**
 * Default RAG configuration
 */
export const DEFAULT_RAG_CONFIG: RAGConfig = {
  mode: "permissive",
  embeddingModel: "openai/text-embedding-3-small",
  mergeStrategy: "text-only",
  enableMultiModal: true,
  enableImageEmbeddings: !!env.HUGGINGFACE_API_KEY,
  enableImageOCR: false, // Requires OCR library
  chunkSize: 1024,
  chunkOverlap: 100,
  defaultTopK: 5,
  similarityThreshold: 0.5,
  enableCaching: !!env.REDIS_URL,
  cacheTTL: 86400, // 24 hours
  batchSize: 10,
  fallbackStrategy: "text-only-fallback",
  maxRetries: 3,
  retryDelayMs: 1000,
  vectorDBProvider:
    (env.VECTOR_DB_PROVIDER as "lancedb" | "pgvector") || "lancedb",
  enableRAG: true,
  enableSemanticCache: true, // Phase 4 - NOW IMPLEMENTED
  enableCrossEncoderReranking: false, // Phase 3 feature
  verboseLogging: env.NODE_ENV === "development",
};

/**
 * Runtime RAG configuration (can be overridden)
 */
let runtimeConfig: RAGConfig = DEFAULT_RAG_CONFIG;

/**
 * Get current RAG configuration
 */
export function getRAGConfig(): RAGConfig {
  return { ...runtimeConfig };
}

/**
 * Validate and update RAG configuration
 */
export function updateRAGConfig(partial: Partial<RAGConfig>): RAGConfig {
  const previous = { ...runtimeConfig };

  try {
    runtimeConfig = { ...runtimeConfig, ...partial };

    logger.info("RAG configuration updated", {
      previous: {
        mode: previous.mode,
        mergeStrategy: previous.mergeStrategy,
        vectorDBProvider: previous.vectorDBProvider,
      },
      updated: {
        mode: runtimeConfig.mode,
        mergeStrategy: runtimeConfig.mergeStrategy,
        vectorDBProvider: runtimeConfig.vectorDBProvider,
      },
    });

    return { ...runtimeConfig };
  } catch (error) {
    logger.error("Failed to update RAG configuration", error as Error);
    runtimeConfig = previous;
    throw error;
  }
}

/**
 * Reset to default configuration
 */
export function resetRAGConfig(): RAGConfig {
  runtimeConfig = { ...DEFAULT_RAG_CONFIG };
  logger.info("RAG configuration reset to defaults");
  return { ...runtimeConfig };
}

/**
 * Get merge strategy based on configuration and content type
 */
export function getMergeStrategy(
  contentType: "text" | "image" | "mixed",
): MergeStrategy {
  const config = getRAGConfig();

  // For image-only content, prefer concat if image embeddings enabled
  if (contentType === "image" && config.enableImageEmbeddings) {
    return config.mergeStrategy === "text-only"
      ? "concat"
      : config.mergeStrategy;
  }

  return config.mergeStrategy;
}

/**
 * Check if RAG feature is enabled
 */
export function isRAGEnabled(): boolean {
  return getRAGConfig().enableRAG;
}

/**
 * Check if multi-modal features are enabled
 */
export function isMultiModalEnabled(): boolean {
  return getRAGConfig().enableMultiModal;
}

/**
 * Check if image embeddings are enabled
 */
export function areImageEmbeddingsEnabled(): boolean {
  return getRAGConfig().enableImageEmbeddings;
}

/**
 * Check if caching is enabled
 */
export function isCachingEnabled(): boolean {
  return getRAGConfig().enableCaching;
}

/**
 * Check if cross-encoder reranking is enabled (Phase 3)
 */
export function isCrossEncoderReankingEnabled(): boolean {
  return getRAGConfig().enableCrossEncoderReranking;
}

/**
 * Check if semantic caching is enabled (Phase 4)
 */
export function isSemanticCacheEnabled(): boolean {
  return getRAGConfig().enableSemanticCache;
}

/**
 * Get fallback strategy for error handling
 */
export function getFallbackStrategy(): FallbackStrategy {
  return getRAGConfig().fallbackStrategy;
}

/**
 * Get operation mode (strict/permissive)
 */
export function getRAGMode(): RAGMode {
  return getRAGConfig().mode;
}

/**
 * Should continue on error? (permissive mode)
 */
export function shouldContinueOnError(): boolean {
  const mode = getRAGMode();
  return mode !== "strict";
}

/**
 * Validate configuration consistency
 */
export function validateConfig(): { valid: boolean; errors: string[] } {
  const config = getRAGConfig();
  const errors: string[] = [];

  // Validate embedding model
  if (
    !["text-embedding-3-small", "text-embedding-3-large"].includes(
      config.embeddingModel,
    )
  ) {
    errors.push(`Invalid embedding model: ${config.embeddingModel}`);
  }

  // Validate merge strategy
  if (!["concat", "avg", "text-only"].includes(config.mergeStrategy)) {
    errors.push(`Invalid merge strategy: ${config.mergeStrategy}`);
  }

  // Validate vector DB provider
  if (!["lancedb", "pgvector"].includes(config.vectorDBProvider)) {
    errors.push(`Invalid vector DB provider: ${config.vectorDBProvider}`);
  }

  // Check image embeddings are enabled if merge strategy is concat
  if (config.mergeStrategy === "concat" && !config.enableImageEmbeddings) {
    errors.push(
      'Merge strategy "concat" requires image embeddings to be enabled',
    );
  }

  // Validate numeric constraints
  if (config.chunkSize < 100 || config.chunkSize > 10000) {
    errors.push("Chunk size must be between 100 and 10000");
  }

  if (config.chunkOverlap >= config.chunkSize) {
    errors.push("Chunk overlap must be less than chunk size");
  }

  if (config.defaultTopK < 1 || config.defaultTopK > 100) {
    errors.push("Top K must be between 1 and 100");
  }

  if (config.similarityThreshold < 0 || config.similarityThreshold > 1) {
    errors.push("Similarity threshold must be between 0 and 1");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Log configuration for debugging
 */
export function logConfiguration(): void {
  const config = getRAGConfig();
  const validation = validateConfig();

  logger.info("RAG Configuration", {
    mode: config.mode,
    embeddingModel: config.embeddingModel,
    mergeStrategy: config.mergeStrategy,
    multiModal: {
      enabled: config.enableMultiModal,
      imageEmbeddings: config.enableImageEmbeddings,
      imageOCR: config.enableImageOCR,
    },
    chunking: {
      size: config.chunkSize,
      overlap: config.chunkOverlap,
    },
    search: {
      defaultTopK: config.defaultTopK,
      similarityThreshold: config.similarityThreshold,
    },
    performance: {
      caching: config.enableCaching,
      cacheTTL: config.cacheTTL,
      batchSize: config.batchSize,
    },
    errorHandling: {
      fallbackStrategy: config.fallbackStrategy,
      maxRetries: config.maxRetries,
      retryDelayMs: config.retryDelayMs,
    },
    vectorDB: {
      provider: config.vectorDBProvider,
    },
    features: {
      rag: config.enableRAG,
      semanticCache: config.enableSemanticCache,
      crossEncoderReranking: config.enableCrossEncoderReranking,
    },
    validation: {
      valid: validation.valid,
      errors: validation.errors.length > 0 ? validation.errors : undefined,
    },
  });
}
