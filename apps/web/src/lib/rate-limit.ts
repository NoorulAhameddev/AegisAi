import { NextRequest } from "next/server";
import { isIP } from "node:net";
import Redis from "ioredis";
import { logger } from "./logger";
import { env } from "@/lib/env";
import {
  memoryRateLimiter,
  redisHealthTracker,
  withRedisFallback,
} from "./redis-fallback";

// Use Redis for distributed rate limiting
const redis = env.REDIS_URL
  ? new Redis(env.REDIS_URL, { maxRetriesPerRequest: null })
  : null;

interface RateLimitConfig {
  limit: number;
  window: number; // in seconds
}

const GLOBAL_LIMIT = 100;
const GLOBAL_WINDOW = 60;

// Lua script to atomically increment and set expiry (prevents race condition)
const RATE_LIMIT_SCRIPT = `
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])

local current = redis.call('incr', key)
if current == 1 then
    redis.call('expire', key, window)
end

if current > limit then
    return {0, current}
else
    return {1, limit - current}
end
`;

// Resolve a client IP only from a deployment-configured trusted proxy chain.
// The edge/load balancer must overwrite or append X-Forwarded-For correctly.
export function getTrustedClientIp(req: NextRequest): string {
  const trustedProxyHops = env.TRUSTED_PROXY_HOPS;
  const forwardedFor = req.headers.get("x-forwarded-for");
  const chain = forwardedFor?.split(",").map((part) => part.trim()).filter(Boolean) ?? [];
  const clientIndex = chain.length - trustedProxyHops - 1;

  if (trustedProxyHops < 1 || clientIndex < 0) {
    return "untrusted-client";
  }

  const candidate = chain[clientIndex];
  return isIP(candidate) ? candidate : "untrusted-client";
}

export async function rateLimit(req: NextRequest, config?: RateLimitConfig) {
  // Disable rate limiting in test mode to allow rapid consecutive requests
  if (process.env.NODE_ENV === "test") {
    return { success: true, remaining: 999 };
  }

  const limit = config?.limit || GLOBAL_LIMIT;
  const window = config?.window || GLOBAL_WINDOW;
  const ip = getTrustedClientIp(req);
  const key = `rate_limit:${ip}`;

  try {
    if (redis && !redisHealthTracker.shouldUseFallback()) {
      // Redis-based with Lua script (atomic operation - no race condition)
      const result = await withRedisFallback(
        async () => {
          return (await redis.eval(
            RATE_LIMIT_SCRIPT,
            1,
            key,
            limit,
            window,
          )) as [number, number];
        },
        async () => {
          logger.warn(
            "[RateLimit] Redis unavailable, using in-memory fallback",
            { ip },
          );
          const fallback = await memoryRateLimiter.check(key);
          return fallback.allowed ? [1, fallback.remaining] : [0, 0];
        },
        "rate-limit",
      );

      const [success, remaining] = result;

      if (success === 0) {
        logger.warn("Rate limit exceeded", { ip, limit });
        return { success: false, remaining: 0 };
      }

      return { success: true, remaining };
    }

    // Redis down or not configured: degraded but functional
    logger.warn("[RateLimit] Redis unavailable, using in-memory fallback", {
      ip,
    });
    const fallback = await memoryRateLimiter.check(key);
    return { success: fallback.allowed, remaining: fallback.remaining };
  } catch (error) {
    logger.error("Rate limit error", error as Error, { ip });
    // Fail closed for security - deny requests when rate limiting fails
    return { success: false, remaining: 0 };
  }
}

// In-memory fallback (fixed memory leak)
const rateLimitMap = new Map<string, { count: number; expires: number }>();

function inMemoryRateLimit(key: string, limit: number, window: number) {
  const now = Date.now();
  let record = rateLimitMap.get(key);

  if (!record || record.expires < now) {
    record = { count: 0, expires: now + window * 1000 };
    rateLimitMap.set(key, record);
  }

  record.count += 1;

  if (record.count > limit) {
    return { success: false, remaining: 0 };
  }

  return { success: true, remaining: limit - record.count };
}

// Cleanup (collect keys first, then delete to avoid iterator issues)
setInterval(() => {
  const now = Date.now();
  const keysToDelete: string[] = [];

  for (const [key, value] of rateLimitMap.entries()) {
    if (value.expires < now) {
      keysToDelete.push(key);
    }
  }

  keysToDelete.forEach((key) => rateLimitMap.delete(key));

  if (keysToDelete.length > 0) {
    logger.debug(
      `[RateLimit] Cleaned up ${keysToDelete.length} expired entries`,
    );
  }
}, 60000);
