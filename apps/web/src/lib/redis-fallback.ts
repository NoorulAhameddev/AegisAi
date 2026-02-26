/**
 * Redis Fallback Mechanism
 *
 * Provides in-memory fallbacks when Redis is unavailable
 * Ensures application continues to function in degraded mode
 *
 * Fallback Strategies:
 * - Rate limiting: In-memory LRU cache per instance
 * - Caching: In-memory cache with TTL
 * - Session tracking: PostgreSQL fallback
 */

import { logger } from "./logger";

/**
 * In-memory LRU cache with TTL support
 */
class MemoryCache<T> {
  private cache: Map<string, { value: T; expiry: number }> = new Map();
  private readonly maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  set(key: string, value: T, ttlSeconds: number): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      value,
      expiry: Date.now() + ttlSeconds * 1000,
    });
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check expiry
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    // Remove expired entries
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
      }
    }
    return this.cache.size;
  }
}

/**
 * Rate limiter using in-memory tracking
 * Less accurate than Redis (per-instance only) but functional
 */
class MemoryRateLimiter {
  private requests: Map<string, { count: number; resetAt: number }> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(maxRequests: number = 100, windowSeconds: number = 60) {
    this.maxRequests = maxRequests;
    this.windowMs = windowSeconds * 1000;
  }

  async check(key: string): Promise<{ allowed: boolean; remaining: number }> {
    const now = Date.now();
    const entry = this.requests.get(key);

    // Reset window if expired
    if (!entry || now > entry.resetAt) {
      this.requests.set(key, {
        count: 1,
        resetAt: now + this.windowMs,
      });
      return { allowed: true, remaining: this.maxRequests - 1 };
    }

    // Increment count
    entry.count++;

    if (entry.count > this.maxRequests) {
      return { allowed: false, remaining: 0 };
    }

    return { allowed: true, remaining: this.maxRequests - entry.count };
  }

  reset(key: string): void {
    this.requests.delete(key);
  }

  clear(): void {
    this.requests.clear();
  }
}

// ========================================
// Global Fallback Instances
// ========================================

/**
 * In-memory cache for general purpose
 * Used when Redis unavailable for caching
 */
export const memoryCache = new MemoryCache<any>(5000); // 5K items max

/**
 * In-memory rate limiter
 * Less accurate (per-instance) but prevents complete failure
 */
export const memoryRateLimiter = new MemoryRateLimiter(100, 60); // 100 req/min

/**
 * Redis connection state tracker
 */
export class RedisHealthTracker {
  private isHealthy: boolean = true;
  private lastFailure: number | null = null;
  private failureCount: number = 0;

  markFailure(): void {
    this.isHealthy = false;
    this.lastFailure = Date.now();
    this.failureCount++;

    logger.warn("Redis connection failed", {
      failureCount: this.failureCount,
      lastFailure: new Date(Date.now()).toISOString(),
    });
  }

  markSuccess(): void {
    const wasUnhealthy = !this.isHealthy;
    this.isHealthy = true;
    this.failureCount = 0;

    if (wasUnhealthy) {
      logger.info("Redis connection recovered");
    }
  }

  getHealth(): {
    isHealthy: boolean;
    failureCount: number;
    lastFailure: string | null;
  } {
    return {
      isHealthy: this.isHealthy,
      failureCount: this.failureCount,
      lastFailure: this.lastFailure
        ? new Date(this.lastFailure).toISOString()
        : null,
    };
  }

  shouldUseFallback(): boolean {
    return !this.isHealthy;
  }
}

export const redisHealthTracker = new RedisHealthTracker();

/**
 * Wrap Redis operations with fallback
 * Automatically falls back to memory cache on failure
 */
export async function withRedisFallback<T>(
  operation: () => Promise<T>,
  fallback: () => T | Promise<T>,
  operationName: string = "redis-operation",
): Promise<T> {
  try {
    const result = await operation();
    redisHealthTracker.markSuccess();
    return result;
  } catch (error) {
    logger.error(`Redis operation failed: ${operationName}`, error as Error);
    redisHealthTracker.markFailure();

    try {
      return await fallback();
    } catch (fallbackError) {
      logger.error(
        `Fallback failed for ${operationName}`,
        fallbackError as Error,
      );
      throw fallbackError;
    }
  }
}

/**
 * Check if Redis is available
 * Used by health checks and monitoring
 */
export function isRedisHealthy(): boolean {
  return redisHealthTracker.getHealth().isHealthy;
}

/**
 * Get Redis health details for monitoring
 */
export function getRedisHealth() {
  return redisHealthTracker.getHealth();
}
