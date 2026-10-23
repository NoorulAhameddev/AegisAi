/**
 * Token Version Cache
 * 
 * Provides fast token version lookup for immediate session revocation
 * Uses Redis with short TTL to avoid DB hits on every request
 */

import Redis from "ioredis";
import { env } from "./env";
import { logger } from "./logger";

const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  retryStrategy: () => null,
});
redis.on("error", (err: unknown) => {
  logger.warn("Token version cache Redis error", { error: err instanceof Error ? err.message : String(err) });
});
const TOKEN_VERSION_KEY_PREFIX = "token_version:";
const TOKEN_VERSION_TTL = 30; // 30 seconds - short TTL for fast revocation

/**
 * Get cached token version for a user
 * Returns null if not cached (needs DB lookup), or version number if cached
 */
export async function getCachedTokenVersion(userId: string): Promise<number | null> {
  try {
    const key = `${TOKEN_VERSION_KEY_PREFIX}${userId}`;
    const cached = await redis.get(key);
    if (cached) {
      return parseInt(cached, 10);
    }
    return null;
  } catch (error) {
    logger.warn("Token version cache get failed", {
      userId,
      error: (error as Error).message,
    });
    return null;
  }
}

/**
 * Cache token version for fast lookups
 * Called when user logs in or token version changes
 */
export async function cacheTokenVersion(
  userId: string,
  tokenVersion: number,
): Promise<void> {
  try {
    const key = `${TOKEN_VERSION_KEY_PREFIX}${userId}`;
    await redis.setex(key, TOKEN_VERSION_TTL, tokenVersion.toString());
  } catch (error) {
    logger.warn("Token version cache set failed", {
      userId,
      tokenVersion,
      error: (error as Error).message,
    });
  }
}

/**
 * Invalidate cached token version (for immediate revocation)
 * Called on password change, logout, or admin action
 */
export async function invalidateTokenVersion(userId: string): Promise<void> {
  try {
    const key = `${TOKEN_VERSION_KEY_PREFIX}${userId}`;
    await redis.del(key);
    logger.security("Token version cache invalidated", { userId });
  } catch (error) {
    logger.warn("Token version cache invalidation failed", {
      userId,
      error: (error as Error).message,
    });
  }
}

/**
 * Get fresh token version from DB and cache it
 * Used for initial lookup or cache miss
 */
export async function getAndCacheTokenVersion(
  userId: string,
  dbTokenVersion: number,
): Promise<number> {
  await cacheTokenVersion(userId, dbTokenVersion);
  return dbTokenVersion;
}