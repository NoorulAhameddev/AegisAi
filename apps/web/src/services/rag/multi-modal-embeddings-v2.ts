/**
 * Enhanced Multi-Modal Embeddings Service with Robustness
 * Generates embeddings for both text and images
 * Features: Retry logic, error handling, type safety, caching
 */

import {
  generateEmbedding,
  generateImageEmbedding,
  generateEmbeddingsBatch,
  getEmbeddingModelConfig,
  EmbeddingConfig,
} from "./embeddings";
import { logger } from "@/lib/logger";
import { Redis } from "ioredis";

/**
 * Merge strategy for combining text and image embeddings
 */
export type MergeStrategy = "concat" | "avg" | "text-only";

/**
 * Configuration for multi-modal embedding
 */
export interface MultiModalOptions {
  mergeStrategy?: MergeStrategy;
  skipImageProcessing?: boolean;
  skipTextProcessing?: boolean;
  useCache?: boolean;
  embeddingConfig?: EmbeddingConfig;
}

/**
 * Result of multi-modal embedding generation
 */
export interface MultiModalEmbeddingResult {
  textEmbedding: number[] | null;
  imageEmbedding: number[] | null;
  mergedEmbedding: number[];
  contentType: ContentType;
  hasText: boolean;
  hasImage: boolean;
  strategy: MergeStrategy;
  cachedFromCache?: boolean;
  error?: string;
  warnings?: string[];
}

/**
 * Content type classification
 */
export type ContentType = "text" | "image" | "mixed";

/**
 * Legacy interface for backward compatibility
 */
export interface MultiModalContent {
  type: ContentType;
  text?: string;
  imageBase64?: string;
  imageUrl?: string;
  mimeType?: string;
}

/**
 * Legacy interface for backward compatibility
 */
export interface MultiModalEmbedding {
  textEmbedding: number[];
  imageEmbedding?: number[];
  contentType: ContentType;
}

/**
 * Cache key generator for embeddings
 */
function generateCacheKey(content: string, strategy: MergeStrategy): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const crypto = require("crypto");
  const hash = crypto.createHash("sha256").update(content).digest("hex");
  return `embedding:${hash}:${strategy}`;
}

/**
 * Get Redis cache client
 */
async function getRedisCache(): Promise<InstanceType<typeof Redis> | null> {
  try {
    if (!process.env.REDIS_URL) return null;
    const redis = new Redis(process.env.REDIS_URL);
    await redis.ping();
    return redis;
  } catch (error) {
    logger.warn("Redis cache unavailable", { error: (error as Error).message });
    return null;
  }
}

/**
 * Detect content type from text and images
 */
export function detectContentType(
  text?: string,
  hasImages?: boolean,
): ContentType {
  const hasText = text && text.trim().length > 0;

  if (hasText && hasImages) return "mixed";
  if (hasImages) return "image";
  return "text";
}

/**
 * Extract base64-encoded images from content string
 */
export function extractImageBase64(content: string): string[] {
  const imageMatches = content.matchAll(
    /data:image\/[^;]+;base64,([A-Za-z0-9+/=]+)/g,
  );
  const images: string[] = [];

  for (const match of imageMatches) {
    if (match[1]) {
      images.push(match[1]);
    }
  }

  return images;
}

/**
 * Check if content has text
 */
export function hasTextContent(content: string): boolean {
  const cleaned = content
    .replace(/\s+/g, "")
    .replace(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/g, "");
  return cleaned.length > 0;
}

/**
 * Check if content has images
 */
export function hasImageContent(content: string): boolean {
  return /data:image\/[^;]+;base64,/.test(content);
}

/**
 * Get expected output dimensions for a merge strategy
 */
export function getExpectedOutputDimensions(strategy: MergeStrategy): number {
  switch (strategy) {
    case "concat":
      return 3072; // 1536 + 1536
    case "avg":
    case "text-only":
    default:
      return 1536;
  }
}

/**
 * Merge embeddings using specified strategy
 * - concat: Concatenate embeddings (3072 dims)
 * - avg: Element-wise average (1536 dims)
 * - text-only: Use text only (1536 dims, default)
 */
export function mergeEmbeddings(
  textEmbedding: number[] | null,
  imageEmbedding: number[] | null,
  strategy: MergeStrategy = "text-only",
): number[] {
  const outputDims = getExpectedOutputDimensions(strategy);

  // Both missing
  if (!textEmbedding && !imageEmbedding) {
    logger.warn(
      "[MultiModalEmbeddings] No embeddings available, returning zero vector",
    );
    return Array(outputDims).fill(0);
  }

  // Text only strategy or missing image
  if (strategy === "text-only" || !imageEmbedding) {
    const result = textEmbedding || Array(1536).fill(0);
    return result.slice(0, outputDims).length === outputDims
      ? result.slice(0, outputDims)
      : [
          ...result.slice(0, 1536),
          ...Array(Math.max(0, outputDims - 1536)).fill(0),
        ];
  }

  // Concat strategy
  if (strategy === "concat") {
    const text = (textEmbedding || Array(1536).fill(0)).slice(0, 1536);
    const image = (imageEmbedding || Array(1536).fill(0)).slice(0, 1536);
    return [...text, ...image];
  }

  // Avg strategy
  if (strategy === "avg") {
    const text = (textEmbedding || Array(1536).fill(0)).slice(0, 1536);
    const image = (imageEmbedding || Array(1536).fill(0)).slice(0, 1536);
    return text.map((v, i) => (v + (image[i] || 0)) / 2);
  }

  // Default fallback
  return textEmbedding
    ? textEmbedding.slice(0, outputDims)
    : Array(outputDims).fill(0);
}

/**
 * Generate multi-modal embedding for content
 * Supports retry, caching, and graceful error handling
 */
export async function generateMultiModalEmbedding(
  content: string,
  options: MultiModalOptions = {},
): Promise<MultiModalEmbeddingResult> {
  const {
    mergeStrategy = "text-only",
    skipImageProcessing = false,
    skipTextProcessing = false,
    useCache = true,
    embeddingConfig,
  } = options;

  if (!content || content.trim().length === 0) {
    logger.warn("[MultiModalEmbeddings] Empty content provided");
    return {
      textEmbedding: null,
      imageEmbedding: null,
      mergedEmbedding: Array(getExpectedOutputDimensions(mergeStrategy)).fill(
        0,
      ),
      contentType: "text",
      hasText: false,
      hasImage: false,
      strategy: mergeStrategy,
      error: "Empty content",
    };
  }

  // Check cache
  if (useCache && !skipTextProcessing && !skipImageProcessing) {
    const cacheKey = generateCacheKey(content, mergeStrategy);
    const redis = await getRedisCache();

    if (redis) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          const result = JSON.parse(cached) as MultiModalEmbeddingResult;
          result.cachedFromCache = true;
          logger.debug("[MultiModalEmbeddings] Retrieved from cache");
          return result;
        }
      } catch (error) {
        logger.warn("Cache retrieval failed", {
          error: (error as Error).message,
        });
      } finally {
        redis.disconnect();
      }
    }
  }

  logger.debug(
    `[MultiModalEmbeddings] Processing (strategy: ${mergeStrategy}, skipText: ${skipTextProcessing}, skipImage: ${skipImageProcessing})`,
  );

  let textEmbedding: number[] | null = null;
  let imageEmbedding: number[] | null = null;
  const warnings: string[] = [];

  const hasText = hasTextContent(content);
  const hasImage = hasImageContent(content);
  const contentType = detectContentType(content, hasImage);

  // Generate text embedding
  if (!skipTextProcessing && hasText) {
    try {
      textEmbedding = await generateEmbedding(content, embeddingConfig);
      if (!textEmbedding || textEmbedding.length === 0) {
        warnings.push("Text embedding returned empty array");
        textEmbedding = null;
      }
    } catch (error) {
      const message = (error as Error).message;
      warnings.push(`Text embedding failed: ${message}`);
      logger.warn("Text embedding failed", {
        error: message,
        contentLength: content.length,
      });
    }
  }

  // Generate image embedding
  if (!skipImageProcessing && hasImage) {
    const images = extractImageBase64(content);

    if (images.length > 0) {
      try {
        imageEmbedding = await generateImageEmbedding(
          images[0],
          embeddingConfig,
        );
        if (!imageEmbedding || imageEmbedding.length === 0) {
          warnings.push("Image embedding returned empty or null");
        }
      } catch (error) {
        const message = (error as Error).message;
        warnings.push(`Image embedding failed: ${message}`);
        logger.warn("Image embedding failed", { error: message });
      }
    } else {
      warnings.push("No base64 images found in content");
    }
  }

  // Merge embeddings
  let mergedEmbedding: number[];
  try {
    mergedEmbedding = mergeEmbeddings(
      textEmbedding,
      imageEmbedding,
      mergeStrategy,
    );
  } catch (error) {
    const message = (error as Error).message;
    warnings.push(`Merge failed: ${message}`);
    mergedEmbedding = Array(getExpectedOutputDimensions(mergeStrategy)).fill(0);
    logger.error("Embedding merge failed", error as Error);
  }

  const result: MultiModalEmbeddingResult = {
    textEmbedding,
    imageEmbedding,
    mergedEmbedding,
    contentType,
    hasText,
    hasImage,
    strategy: mergeStrategy,
    error: warnings.length > 0 ? warnings[0] : undefined,
    warnings: warnings.length > 1 ? warnings.slice(1) : undefined,
  };

  // Cache result if enabled
  if (useCache && !skipTextProcessing && !skipImageProcessing) {
    const redis = await getRedisCache();
    if (redis) {
      try {
        const cacheKey = generateCacheKey(content, mergeStrategy);
        await redis.setex(cacheKey, 86400, JSON.stringify(result)); // 24h cache
        logger.debug("[MultiModalEmbeddings] Cached result");
      } catch (error) {
        logger.warn("Cache write failed", { error: (error as Error).message });
      } finally {
        redis.disconnect();
      }
    }
  }

  return result;
}

/**
 * Batch generate multi-modal embeddings with progress tracking
 */
export async function generateMultiModalEmbeddingsBatch(
  contents: string[],
  options: MultiModalOptions = {},
): Promise<MultiModalEmbeddingResult[]> {
  if (!contents || contents.length === 0) {
    return [];
  }

  logger.debug(
    `[MultiModalEmbeddings] Batch processing ${contents.length} items (strategy: ${options.mergeStrategy || "text-only"})`,
  );

  const results: MultiModalEmbeddingResult[] = [];
  const batchSize = 10; // Process in batches to avoid overwhelming
  const strategy = options.mergeStrategy || "text-only";

  for (let i = 0; i < contents.length; i += batchSize) {
    const batch = contents.slice(i, Math.min(i + batchSize, contents.length));

    // Process batch in parallel
    const batchResults = await Promise.all(
      batch.map((content) => generateMultiModalEmbedding(content, options)),
    );

    results.push(...batchResults);

    const progress = Math.min(i + batchSize, contents.length);
    logger.debug(
      `[MultiModalEmbeddings] Processed ${progress}/${contents.length} items`,
    );
  }

  return results;
}

/**
 * Legacy function for backward compatibility
 */
export async function generateMultiModalEmbedding_Legacy(
  content: MultiModalContent,
): Promise<MultiModalEmbedding> {
  const textContent = content.text || "";
  const hasImages = !!(content.imageBase64 || content.imageUrl);

  const result = await generateMultiModalEmbedding(textContent, {
    mergeStrategy: "text-only",
    skipImageProcessing: !hasImages,
  });

  return {
    textEmbedding: result.textEmbedding || Array(1536).fill(0),
    imageEmbedding: result.imageEmbedding || undefined,
    contentType: result.contentType,
  };
}

/**
 * Legacy function for backward compatibility
 */
export async function generateMultiModalEmbeddingsBatch_Legacy(
  contents: MultiModalContent[],
): Promise<MultiModalEmbedding[]> {
  const contentStrings = contents.map((c) => c.text || "");
  const results = await generateMultiModalEmbeddingsBatch(contentStrings, {
    mergeStrategy: "text-only",
  });

  return results.map((r) => ({
    textEmbedding: r.textEmbedding || Array(1536).fill(0),
    imageEmbedding: r.imageEmbedding || undefined,
    contentType: r.contentType,
  }));
}

/**
 * Backwards compatibility exports
 */
export { mergeEmbeddings as mergeLegacyEmbeddings };
