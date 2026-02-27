import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import crypto from "crypto";
import {
  getCachedEmbedding,
  setCachedEmbedding,
  getCachedEmbeddings,
  setCachedEmbeddings,
} from "@/lib/embedding-cache";
import { getRAGConfig, isCachingEnabled } from "@/services/rag/config";
import { retryWithBackoff, RetryStrategies } from "@/lib/retry";

const isTest = process.env.NODE_ENV === "test";

/**
 * Embedding generation configuration and error handling
 */
export interface EmbeddingConfig {
  maxRetries: number;
  retryDelayMs: number;
  timeoutMs: number;
  batchSizeLimit: number;
}

const DEFAULT_EMBEDDING_CONFIG: EmbeddingConfig = {
  maxRetries: 3,
  retryDelayMs: 1000,
  timeoutMs: 30000,
  batchSizeLimit: 200,
};

/**
 * Sleep utility for retry backoff
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Exponential backoff with jitter
 */
function getBackoffDelay(attempt: number, baseMs: number): number {
  const exponential = Math.pow(2, attempt) * baseMs;
  const jitter = Math.random() * 0.1 * exponential;
  return exponential + jitter;
}

function normalizeTextForCache(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function createCacheKey(prefix: string, model: string, input: string): string {
  const hash = crypto.createHash("sha256").update(input).digest("hex");
  return `rag:${prefix}:${model}:${hash}`;
}

/**
 * Get embedding model and dimensions based on EMBEDDING_MODEL env var
 */
export function getEmbeddingModelConfig(): {
  model: string;
  dimensions: number;
} {
  const model = env.EMBEDDING_MODEL as
    | "text-embedding-3-small"
    | "text-embedding-3-large";

  const config = {
    "text-embedding-3-small": {
      model: "glm-5",
      dimensions: 1536,
    },
    "text-embedding-3-large": {
      model: "glm-5",
      dimensions: 3072,
    },
  };

  const result = config[model] || config["text-embedding-3-small"];
  logger.debug(
    `[Embeddings] Using model: ${result.model} (${result.dimensions} dims)`,
  );
  return result;
}

/**
 * Generate text embedding with automatic retry and timeout
 */
export async function generateEmbedding(
  text: string,
  config: EmbeddingConfig = DEFAULT_EMBEDDING_CONFIG,
): Promise<number[]> {
  const cleanText = text.replace(/\n/g, " ").trim();
  const ragConfig = getRAGConfig();
  const shouldUseCache = isCachingEnabled();
  const { model, dimensions } = getEmbeddingModelConfig();
  const cacheKey = cleanText
    ? createCacheKey("text", model, normalizeTextForCache(cleanText))
    : null;

  // Avoid hitting OpenAI during tests
  if (isTest) {
    const base = cleanText || "test";
    const values = Array.from(base)
      .slice(0, dimensions)
      .map((char, idx) => ((char.charCodeAt(0) + idx) % 10) / 10);

    if (values.length < dimensions) {
      values.push(...Array(dimensions - values.length).fill(0));
    }

    return values.slice(0, dimensions);
  }

  if (!cleanText) {
    logger.warn("[Embeddings] Empty text provided, returning zero vector");
    return Array(dimensions).fill(0);
  }

  if (shouldUseCache && cacheKey) {
    const cached = await getCachedEmbedding(cacheKey);
    if (cached) {
      return cached.slice(0, dimensions);
    }
  }

  const { openai } = await import("../ai/openai");

  try {
    // Use retry utility with embeddings-specific strategy (5 retries, exponential backoff)
    const response = await retryWithBackoff(
      async () => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

        try {
          return await openai.embeddings.create({
            model,
            input: cleanText.substring(0, 8000), // OpenAI limit is ~8k tokens
            encoding_format: "float",
          });
        } finally {
          clearTimeout(timeout);
        }
      },
      RetryStrategies.embeddings,
      `embedding-${cacheKey || "no-cache"}`,
    );

    const embedding = response.data[0].embedding;

    if (!embedding || embedding.length === 0) {
      throw new Error("Empty embedding returned from API");
    }

    // Ensure consistent dimensions (in case API returns different size)
    if (embedding.length !== dimensions) {
      logger.warn(
        `[Embeddings] Expected ${dimensions} dims, got ${embedding.length}, padding/truncating`,
      );
      if (embedding.length < dimensions) {
        embedding.push(...Array(dimensions - embedding.length).fill(0));
      }
    }

    const normalized = embedding.slice(0, dimensions);
    if (shouldUseCache && cacheKey) {
      await setCachedEmbedding(cacheKey, normalized, ragConfig.cacheTTL);
    }

    return normalized;
  } catch (error) {
    logger.error(
      "Embedding generation failed after all retries",
      error as Error,
    );
    throw new Error(
      `Failed to generate embedding: ${(error as Error).message}`,
    );
  }
}

/**
 * Generate embedding for image using CLIP via Hugging Face
 * Falls back to stub if API not configured or fails
 */
export async function generateImageEmbedding(
  imageBase64: string,
  config: EmbeddingConfig = DEFAULT_EMBEDDING_CONFIG,
): Promise<number[] | null> {
  const hfApiKey = env.HUGGINGFACE_API_KEY;
  const ragConfig = getRAGConfig();
  const shouldUseCache = isCachingEnabled();
  const { model, dimensions } = getEmbeddingModelConfig();
  const cacheKey = imageBase64
    ? createCacheKey("image", model, imageBase64)
    : null;

  if (!imageBase64 || imageBase64.trim().length === 0) {
    logger.warn("[Embeddings] Empty image data provided");
    return null;
  }

  // Fallback for testing or when HF API not configured
  if (!hfApiKey || isTest) {
    logger.warn(
      "[Embeddings] HUGGINGFACE_API_KEY not set or testing, skipping image embedding",
    );
    return null; // Return null instead of stub to indicate feature unavailable
  }

  if (shouldUseCache && cacheKey) {
    const cached = await getCachedEmbedding(cacheKey);
    if (cached) {
      return cached.slice(0, dimensions);
    }
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < config.maxRetries; attempt++) {
    try {
      logger.debug(
        `[Embeddings] Generating image embedding via Hugging Face (attempt ${attempt + 1}/${config.maxRetries})`,
      );

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

      try {
        const response = await fetch(
          "https://api-inference.huggingface.co/models/sentence-transformers/clip-ViT-B-32",
          {
            headers: { Authorization: `Bearer ${hfApiKey}` },
            method: "POST",
            body: JSON.stringify({ inputs: imageBase64 }),
            signal: controller.signal as any,
          },
        );

        clearTimeout(timeout);

        if (!response.ok) {
          throw new Error(
            `HF API error: ${response.status} ${response.statusText}`,
          );
        }

        const result = await response.json();

        if (!result || !Array.isArray(result) || result.length === 0) {
          throw new Error("Invalid response from HF API");
        }

        let embedding = result[0];
        if (!Array.isArray(embedding)) {
          throw new Error("Embedding is not an array");
        }

        // Normalize to target dimensions
        if (embedding.length < 1536) {
          embedding.push(...Array(1536 - embedding.length).fill(0));
        }

        const normalized = embedding.slice(0, 1536);
        if (shouldUseCache && cacheKey) {
          await setCachedEmbedding(cacheKey, normalized, ragConfig.cacheTTL);
        }
        return normalized;
      } finally {
        clearTimeout(timeout);
      }
    } catch (error) {
      lastError = error as Error;
      logger.warn("Image embedding generation failed", {
        attempt: attempt + 1,
        error: (error as Error).message,
      });

      if (attempt < config.maxRetries - 1) {
        const delay = getBackoffDelay(attempt, config.retryDelayMs);
        logger.debug(`[Embeddings] Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  // All retries failed - log but don't throw (image embedding is optional)
  logger.warn("Image embedding failed after all retries", lastError as Error);
  return null;
}

/**
 * Batch generate embeddings with automatic chunking
 */
export async function generateEmbeddingsBatch(
  texts: string[],
  config: EmbeddingConfig = DEFAULT_EMBEDDING_CONFIG,
): Promise<(number[] | null)[]> {
  if (!texts || texts.length === 0) {
    return [];
  }

  logger.debug(
    `[Embeddings] Batch generating ${texts.length} embeddings (batch size: ${config.batchSizeLimit})`,
  );

  const { openai } = await import("../ai/openai");
  const { model, dimensions } = getEmbeddingModelConfig();
  const ragConfig = getRAGConfig();
  const shouldUseCache = isCachingEnabled();

  const allEmbeddings: (number[] | null)[] = new Array(texts.length).fill(null);
  const cleanTexts = texts.map((t) => t.replace(/\n/g, " ").substring(0, 8000));

  const cacheKeys = shouldUseCache
    ? cleanTexts.map((text) =>
        createCacheKey("text", model, normalizeTextForCache(text)),
      )
    : [];

  if (shouldUseCache) {
    const cached = await getCachedEmbeddings(cacheKeys);
    cached.forEach((value, idx) => {
      if (value && Array.isArray(value)) {
        allEmbeddings[idx] = value.slice(0, dimensions);
      }
    });
  }

  const missingIndexes = cleanTexts
    .map((text, idx) => ({ text, idx }))
    .filter((item) => !allEmbeddings[item.idx] && item.text.trim().length > 0);

  if (missingIndexes.length === 0) {
    return allEmbeddings;
  }

  // Process in batches to respect API limits
  for (let i = 0; i < missingIndexes.length; i += config.batchSizeLimit) {
    const batchSlice = missingIndexes.slice(i, i + config.batchSizeLimit);
    const batch = batchSlice.map((item) => item.text);

    try {
      // Use retry utility with embeddings-specific strategy
      const response = await retryWithBackoff(
        async () =>
          openai.embeddings.create({
            model,
            input: batch,
          }),
        RetryStrategies.embeddings,
        `embedding-batch-${Math.floor(i / config.batchSizeLimit)}`,
      );

      // Sort by index to ensure correct order
      const batchEmbeddings = response.data
        .sort((a, b) => a.index - b.index)
        .map((d) => {
          const emb = d.embedding;
          if (emb.length !== dimensions) {
            if (emb.length < dimensions) {
              emb.push(...Array(dimensions - emb.length).fill(0));
            }
            return emb.slice(0, dimensions);
          }
          return emb;
        });

      const cacheEntries: Array<{ key: string; value: number[] }> = [];

      batchEmbeddings.forEach((embedding, idx) => {
        const targetIndex = batchSlice[idx]?.idx;
        if (targetIndex !== undefined) {
          allEmbeddings[targetIndex] = embedding;
          if (shouldUseCache) {
            cacheEntries.push({
              key: cacheKeys[targetIndex],
              value: embedding,
            });
          }
        }
      });

      if (shouldUseCache && cacheEntries.length > 0) {
        await setCachedEmbeddings(cacheEntries, ragConfig.cacheTTL);
      }
    } catch (error) {
      // After all retries failed - add nulls for this batch
      logger.error(
        "Batch embedding failed after all retries, skipping batch",
        error as Error,
        {
          batchIndex: Math.floor(i / config.batchSizeLimit),
          batchSize: batch.length,
        },
      );

      batchSlice.forEach((item) => {
        allEmbeddings[item.idx] = null;
      });
    }
  }

  return allEmbeddings;
}

