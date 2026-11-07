import { NextRequest } from "next/server";
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
redis?.on("error", (err: unknown) => {
  logger.warn("Rate limit Redis error", { error: err instanceof Error ? err.message : String(err) });
});

import crypto from "crypto";

interface RateLimitConfig {
  limit: number;
  window: number; // in seconds
  enforceInTest?: boolean;
}

/**
 * Resolves client IP address safely:
 * 1. Checks direct socket/connection remote address if available
 * 2. Checks rightmost proxy hop in x-forwarded-for (closest to our trusted ingress proxy)
 * 3. Falls back to x-real-ip
 * 4. Generates an isolated ephemeral identifier per request/connection rather than sharing a global "unknown" bucket
 */
export function resolveClientIp(req: NextRequest): string {
  // 1. Direct socket address from Node HTTP / Next.js request
  const socketIp =
    (req as any).socket?.remoteAddress ||
    (req as any).ip;
  if (socketIp && typeof socketIp === "string" && socketIp.trim().length > 0) {
    return socketIp.trim();
  }

  // 2. Rightmost hop from x-forwarded-for (closest to reverse proxy / load balancer)
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const hops = forwardedFor
      .split(",")
      .map((h) => h.trim())
      .filter(Boolean);
    if (hops.length > 0) {
      // Rightmost hop is the IP added by the immediate upstream trusted proxy
      return hops[hops.length - 1];
    }
  }

  // 3. x-real-ip
  const realIp = req.headers.get("x-real-ip");
  if (realIp && realIp.trim().length > 0) {
    return realIp.trim();
  }

  // 4. Connection-isolated identifier fallback to avoid DoS on a shared "unknown" bucket
  const requestId = req.headers.get("x-request-id") || crypto.randomUUID();
  return `unidentified_${requestId}`;
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

export async function rateLimit(req: NextRequest, config?: RateLimitConfig) {
  // Disable rate limiting in test mode to allow rapid consecutive requests
  if (process.env.NODE_ENV === "test" && !config?.enforceInTest) {
    return { success: true, remaining: 999 };
  }

  const limit = config?.limit || GLOBAL_LIMIT;
  const window = config?.window || GLOBAL_WINDOW;

  const ip = resolveClientIp(req);
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
