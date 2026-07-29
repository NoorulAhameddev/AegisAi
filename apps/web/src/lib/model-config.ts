/**
 * Centralized AI Model Configuration
 *
 * All model references go through this file.
 * Change models here to update the entire application.
 *
 * Valid OpenRouter model IDs:
 * - https://openrouter.ai/models
 */

export const AI_MODELS = {
  // Primary chat model - used for all user-facing conversations
  CHAT: "openai/gpt-4o-mini" as const,

  // Embedding model - for vector search and RAG
  EMBEDDING: "openai/text-embedding-3-small" as const,

  // Large embedding model - higher quality, more expensive
  EMBEDDING_LARGE: "openai/text-embedding-3-large" as const,

  // Cross-encoder reranking model
  RERANK: "openai/text-embedding-3-small" as const,

  // Image generation model
  IMAGE_GENERATION: "openai/dall-e-3" as const,

  // Summarization model - cheaper/faster for internal operations
  SUMMARIZATION: "openai/gpt-4o-mini" as const,

  // Security analysis model - used for moderation and safety checks
  SECURITY: "openai/gpt-4o-mini" as const,

  // Memory extraction model
  MEMORY_EXTRACTION: "openai/gpt-4o-mini" as const,

  // Conversation compression model
  CONVERSATION_COMPRESSION: "openai/gpt-4o-mini" as const,
} as const;

export type ModelKey = keyof typeof AI_MODELS;

export function getModel(key: ModelKey): string {
  return AI_MODELS[key];
}

export function getAllModels(): Record<string, string> {
  return { ...AI_MODELS };
}
