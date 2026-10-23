import Redis from "ioredis";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

type CacheEntry = {
  value: number;
  expiresAt: number;
};

const inMemoryCache = new Map<string, CacheEntry>();

const redis = env.REDIS_URL
  ? new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      connectTimeout: 3000,
      retryStrategy: () => null,
    })
  : null;
redis?.on("error", (err) => {
  logger.warn("Rerank cache Redis error", { error: err.message });
});

const DEFAULT_TTL_SECONDS = 900;

function getExpiry(ttlSeconds?: number): number {
  const ttl = ttlSeconds && ttlSeconds > 0 ? ttlSeconds : DEFAULT_TTL_SECONDS;
  return Date.now() + ttl * 1000;
}

function isExpired(entry: CacheEntry): boolean {
  return Date.now() > entry.expiresAt;
}

export async function getCachedRerankScores(
  keys: string[],
): Promise<(number | null)[]> {
  if (keys.length === 0) return [];

  if (redis) {
    try {
      const raw = await redis.mget(...keys);
      return raw.map((item: string | null) => {
        if (item === null || item === undefined) return null;
        const parsed = Number(item);
        return Number.isFinite(parsed) ? parsed : null;
      });
    } catch (error) {
      logger.warn("[RerankCache] Redis mget failed", {
        error: (error as Error).message,
      });
    }
  }

  return keys.map((key) => {
    const entry = inMemoryCache.get(key);
    if (!entry) return null;
    if (isExpired(entry)) {
      inMemoryCache.delete(key);
      return null;
    }
    return entry.value;
  });
}

export async function setCachedRerankScores(
  entries: Array<{ key: string; value: number }>,
  ttlSeconds?: number,
): Promise<void> {
  if (entries.length === 0) return;

  if (redis) {
    try {
      const ttl =
        ttlSeconds && ttlSeconds > 0 ? ttlSeconds : DEFAULT_TTL_SECONDS;
      const pipeline = redis.pipeline();
      entries.forEach((entry) => {
        if (Number.isFinite(entry.value)) {
          pipeline.set(entry.key, String(entry.value), "EX", ttl);
        }
      });
      await pipeline.exec();
      return;
    } catch (error) {
      logger.warn("[RerankCache] Redis pipeline set failed", {
        error: (error as Error).message,
      });
    }
  }

  const expiresAt = getExpiry(ttlSeconds);
  entries.forEach((entry) => {
    if (Number.isFinite(entry.value)) {
      inMemoryCache.set(entry.key, {
        value: entry.value,
        expiresAt,
      });
    }
  });
}
