/**
 * Semantic Cache Layer for RAG Query Results
 * Uses vector similarity to cache and retrieve query results
 * instead of exact key matching
 */

import { Redis } from "ioredis";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { generateEmbedding } from "./embeddings";
import type { Document } from "@/ai/rag/vector-store";

interface CachedQueryResult {
  query: string;
  queryEmbedding: number[];
  userId: string;
  documents: Document[];
  context: string;
  tokensUsed: number;
  sources: string[];
  cachedAt: number;
  expiresAt: number;
}

interface SemanticCacheStats {
  totalQueries: number;
  cacheHits: number;
  cacheMisses: number;
  hitRate: number;
  storageSizeBytes: number;
  oldestEntryAge: number;
  averageLatencyMs: {
    cached: number;
    uncached: number;
  };
}

const redis = env.REDIS_URL
  ? new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      connectTimeout: 3000,
    })
  : null;

// In-memory fallback cache
const inMemoryCache = new Map<string, CachedQueryResult>();
const CACHE_KEY_PREFIX = "rag:semantic:";
const STATS_KEY = "rag:semantic:stats";
const DEFAULT_TTL = env.SEMANTIC_CACHE_TTL || 86400; // 24 hours
const SIMILARITY_THRESHOLD = 0.95; // Cosine similarity threshold

/**
 * Cosine similarity between two vectors
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

/**
 * Create cache key from embedding (truncated hash for storage efficiency)
 */
function createCacheKey(userId: string, embedding: number[]): string {
  // Use first 8 dims as fingerprint for key (crude but fast)
  const fingerprint = embedding
    .slice(0, 8)
    .map((v) => v.toFixed(4))
    .join(",");
  const hash = Buffer.from(fingerprint).toString("base64").slice(0, 16);
  return `${CACHE_KEY_PREFIX}${userId}:${hash}`;
}

/**
 * Get semantically similar cached results for a query
 */
export async function getSemanticCachedResults(
  query: string,
  queryEmbedding: number[],
  userId: string,
  similarityThreshold: number = SIMILARITY_THRESHOLD,
): Promise<{
  result: CachedQueryResult | null;
  similarity: number;
  fromCache: boolean;
}> {
  const startTime = Date.now();

  try {
    // Update stats - cache attempt
    await incrementStat("totalQueries");

    if (redis) {
      // Redis: Search all cache entries for semantic similarity
      const pattern = `${CACHE_KEY_PREFIX}${userId}:*`;
      const keys = await redis.keys(pattern);

      let bestMatch: CachedQueryResult | null = null;
      let bestSimilarity = 0;

      for (const key of keys) {
        try {
          const raw = await redis.get(key);
          if (!raw) continue;

          const cached: CachedQueryResult = JSON.parse(raw);

          // Check if expired
          if (Date.now() > cached.expiresAt) {
            await redis.del(key);
            continue;
          }

          // Calculate similarity
          const similarity = cosineSimilarity(
            queryEmbedding,
            cached.queryEmbedding,
          );

          if (
            similarity > bestSimilarity &&
            similarity >= similarityThreshold
          ) {
            bestSimilarity = similarity;
            bestMatch = cached;
          }
        } catch (error) {
          logger.warn("[SemanticCache] Failed to parse cached entry", {
            key,
            error: (error as Error).message,
          });
        }
      }

      if (bestMatch) {
        await incrementStat("cacheHits");
        await recordLatency("cached", Date.now() - startTime);
        logger.info("[SemanticCache] Cache HIT", {
          similarity: bestSimilarity.toFixed(4),
          query: query.substring(0, 50),
          cachedQuery: bestMatch.query.substring(0, 50),
        });
        return {
          result: bestMatch,
          similarity: bestSimilarity,
          fromCache: true,
        };
      }
    } else {
      // In-memory fallback
      let bestMatch: CachedQueryResult | null = null;
      let bestSimilarity = 0;

      for (const [, cached] of inMemoryCache) {
        if (cached.userId !== userId) continue;
        if (Date.now() > cached.expiresAt) {
          inMemoryCache.delete(createCacheKey(userId, cached.queryEmbedding));
          continue;
        }

        const similarity = cosineSimilarity(
          queryEmbedding,
          cached.queryEmbedding,
        );

        if (similarity > bestSimilarity && similarity >= similarityThreshold) {
          bestSimilarity = similarity;
          bestMatch = cached;
        }
      }

      if (bestMatch) {
        await incrementStat("cacheHits");
        await recordLatency("cached", Date.now() - startTime);
        return {
          result: bestMatch,
          similarity: bestSimilarity,
          fromCache: true,
        };
      }
    }

    // Cache miss
    await incrementStat("cacheMisses");
    await recordLatency("uncached", Date.now() - startTime);
    logger.debug("[SemanticCache] Cache MISS", {
      query: query.substring(0, 50),
    });
    return { result: null, similarity: 0, fromCache: false };
  } catch (error) {
    logger.error("[SemanticCache] Error retrieving from cache", error as Error);
    return { result: null, similarity: 0, fromCache: false };
  }
}

/**
 * Cache query results with semantic indexing
 */
export async function cacheQueryResults(
  query: string,
  queryEmbedding: number[],
  userId: string,
  documents: Document[],
  context: string,
  tokensUsed: number,
  sources: string[],
  ttl: number = DEFAULT_TTL,
): Promise<void> {
  try {
    const cacheEntry: CachedQueryResult = {
      query,
      queryEmbedding,
      userId,
      documents,
      context,
      tokensUsed,
      sources,
      cachedAt: Date.now(),
      expiresAt: Date.now() + ttl * 1000,
    };

    const key = createCacheKey(userId, queryEmbedding);

    if (redis) {
      await redis.setex(key, ttl, JSON.stringify(cacheEntry));
      logger.debug("[SemanticCache] Cached query results", {
        query: query.substring(0, 50),
        documentCount: documents.length,
        ttl,
      });
    } else {
      inMemoryCache.set(key, cacheEntry);
    }
  } catch (error) {
    logger.error("[SemanticCache] Error caching results", error as Error);
  }
}

/**
 * Increment cache statistics
 */
async function incrementStat(stat: string, amount: number = 1): Promise<void> {
  if (!redis) return;

  try {
    await redis.hincrby(STATS_KEY, stat, amount);
  } catch (error) {
    // Ignore stats errors
  }
}

/**
 * Record latency for cache operations
 */
async function recordLatency(
  type: "cached" | "uncached",
  latencyMs: number,
): Promise<void> {
  if (!redis) return;

  try {
    const key = `${STATS_KEY}:latency:${type}`;
    await redis.lpush(key, latencyMs.toString());
    await redis.ltrim(key, 0, 999); // Keep last 1000 measurements
  } catch (error) {
    // Ignore stats errors
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<SemanticCacheStats> {
  if (!redis) {
    return {
      totalQueries: inMemoryCache.size,
      cacheHits: 0,
      cacheMisses: 0,
      hitRate: 0,
      storageSizeBytes: 0,
      oldestEntryAge: 0,
      averageLatencyMs: { cached: 0, uncached: 0 },
    };
  }

  try {
    const stats = await redis.hgetall(STATS_KEY);
    const totalQueries = parseInt(stats.totalQueries || "0");
    const cacheHits = parseInt(stats.cacheHits || "0");
    const cacheMisses = parseInt(stats.cacheMisses || "0");
    const hitRate = totalQueries > 0 ? cacheHits / totalQueries : 0;

    // Calculate storage size
    const keys = await redis.keys(`${CACHE_KEY_PREFIX}*`);
    let storageSizeBytes = 0;
    let oldestEntryAge = 0;
    const now = Date.now();

    for (const key of keys) {
      try {
        const raw = await redis.get(key);
        if (raw) {
          storageSizeBytes += raw.length;
          const cached: CachedQueryResult = JSON.parse(raw);
          const age = now - cached.cachedAt;
          if (age > oldestEntryAge) {
            oldestEntryAge = age;
          }
        }
      } catch (error) {
        // Skip invalid entries
      }
    }

    // Calculate average latencies
    const cachedLatencies = await redis.lrange(
      `${STATS_KEY}:latency:cached`,
      0,
      -1,
    );
    const uncachedLatencies = await redis.lrange(
      `${STATS_KEY}:latency:uncached`,
      0,
      -1,
    );

    const avgCached =
      cachedLatencies.length > 0
        ? cachedLatencies.reduce((sum, l) => sum + parseFloat(l), 0) /
          cachedLatencies.length
        : 0;

    const avgUncached =
      uncachedLatencies.length > 0
        ? uncachedLatencies.reduce((sum, l) => sum + parseFloat(l), 0) /
          uncachedLatencies.length
        : 0;

    return {
      totalQueries,
      cacheHits,
      cacheMisses,
      hitRate,
      storageSizeBytes,
      oldestEntryAge: Math.floor(oldestEntryAge / 1000), // Convert to seconds
      averageLatencyMs: {
        cached: Math.round(avgCached),
        uncached: Math.round(avgUncached),
      },
    };
  } catch (error) {
    logger.error("[SemanticCache] Error fetching stats", error as Error);
    return {
      totalQueries: 0,
      cacheHits: 0,
      cacheMisses: 0,
      hitRate: 0,
      storageSizeBytes: 0,
      oldestEntryAge: 0,
      averageLatencyMs: { cached: 0, uncached: 0 },
    };
  }
}

/**
 * Clear all semantic cache entries for a user
 */
export async function clearUserCache(userId: string): Promise<number> {
  try {
    if (redis) {
      const pattern = `${CACHE_KEY_PREFIX}${userId}:*`;
      const keys = await redis.keys(pattern);

      if (keys.length > 0) {
        await redis.del(...keys);
        logger.info("[SemanticCache] Cleared user cache", {
          userId,
          count: keys.length,
        });
        return keys.length;
      }
    } else {
      let count = 0;
      for (const [key, cached] of inMemoryCache) {
        if (cached.userId === userId) {
          inMemoryCache.delete(key);
          count++;
        }
      }
      return count;
    }
    return 0;
  } catch (error) {
    logger.error("[SemanticCache] Error clearing cache", error as Error);
    return 0;
  }
}

/**
 * Clear expired cache entries (maintenance job)
 */
export async function cleanupExpiredCache(): Promise<number> {
  try {
    const now = Date.now();
    let cleaned = 0;

    if (redis) {
      const keys = await redis.keys(`${CACHE_KEY_PREFIX}*`);

      for (const key of keys) {
        try {
          const raw = await redis.get(key);
          if (!raw) continue;

          const cached: CachedQueryResult = JSON.parse(raw);
          if (now > cached.expiresAt) {
            await redis.del(key);
            cleaned++;
          }
        } catch (error) {
          // Delete invalid entries
          await redis.del(key);
          cleaned++;
        }
      }
    } else {
      for (const [key, cached] of inMemoryCache) {
        if (now > cached.expiresAt) {
          inMemoryCache.delete(key);
          cleaned++;
        }
      }
    }

    if (cleaned > 0) {
      logger.info("[SemanticCache] Cleaned expired entries", {
        count: cleaned,
      });
    }

    return cleaned;
  } catch (error) {
    logger.error("[SemanticCache] Error during cleanup", error as Error);
    return 0;
  }
}
