import Redis from "ioredis";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

type CacheEntry = {
    value: number[];
    expiresAt: number;
};

const inMemoryCache = new Map<string, CacheEntry>();

const redis = env.REDIS_URL
    ? new Redis(env.REDIS_URL, {
        maxRetriesPerRequest: 1,
        enableReadyCheck: true,
        connectTimeout: 3000,
    })
    : null;

const DEFAULT_TTL_SECONDS = 86400;

function getExpiry(ttlSeconds?: number): number {
    const ttl = ttlSeconds && ttlSeconds > 0 ? ttlSeconds : DEFAULT_TTL_SECONDS;
    return Date.now() + ttl * 1000;
}

function isExpired(entry: CacheEntry): boolean {
    return Date.now() > entry.expiresAt;
}

export async function getCachedEmbedding(key: string): Promise<number[] | null> {
    if (redis) {
        try {
            const raw = await redis.get(key);
            if (!raw) return null;
            const parsed = JSON.parse(raw) as number[];
            if (!Array.isArray(parsed)) return null;
            return parsed;
        } catch (error) {
            logger.warn("[EmbeddingCache] Redis get failed", { error: (error as Error).message });
            return null;
        }
    }

    const entry = inMemoryCache.get(key);
    if (!entry) return null;
    if (isExpired(entry)) {
        inMemoryCache.delete(key);
        return null;
    }
    return entry.value;
}

export async function setCachedEmbedding(
    key: string,
    value: number[],
    ttlSeconds?: number
): Promise<void> {
    if (!value || value.length === 0) return;

    if (redis) {
        try {
            const ttl = ttlSeconds && ttlSeconds > 0 ? ttlSeconds : DEFAULT_TTL_SECONDS;
            await redis.set(key, JSON.stringify(value), "EX", ttl);
            return;
        } catch (error) {
            logger.warn("[EmbeddingCache] Redis set failed", { error: (error as Error).message });
        }
    }

    inMemoryCache.set(key, {
        value,
        expiresAt: getExpiry(ttlSeconds),
    });
}

export async function getCachedEmbeddings(keys: string[]): Promise<(number[] | null)[]> {
    if (keys.length === 0) return [];

    if (redis) {
        try {
            const raw = await redis.mget(...keys);
            return raw.map((item: string | null) => {
                if (!item) return null;
                try {
                    const parsed = JSON.parse(item) as number[];
                    return Array.isArray(parsed) ? parsed : null;
                } catch {
                    return null;
                }
            });
        } catch (error) {
            logger.warn("[EmbeddingCache] Redis mget failed", { error: (error as Error).message });
        }
    }

    return keys.map(key => {
        const entry = inMemoryCache.get(key);
        if (!entry) return null;
        if (isExpired(entry)) {
            inMemoryCache.delete(key);
            return null;
        }
        return entry.value;
    });
}

export async function setCachedEmbeddings(
    entries: Array<{ key: string; value: number[] }>,
    ttlSeconds?: number
): Promise<void> {
    if (entries.length === 0) return;

    if (redis) {
        try {
            const ttl = ttlSeconds && ttlSeconds > 0 ? ttlSeconds : DEFAULT_TTL_SECONDS;
            const pipeline = redis.pipeline();
            entries.forEach(entry => {
                if (entry.value && entry.value.length > 0) {
                    pipeline.set(entry.key, JSON.stringify(entry.value), "EX", ttl);
                }
            });
            await pipeline.exec();
            return;
        } catch (error) {
            logger.warn("[EmbeddingCache] Redis pipeline set failed", { error: (error as Error).message });
        }
    }

    const expiresAt = getExpiry(ttlSeconds);
    entries.forEach(entry => {
        if (entry.value && entry.value.length > 0) {
            inMemoryCache.set(entry.key, {
                value: entry.value,
                expiresAt,
            });
        }
    });
}
