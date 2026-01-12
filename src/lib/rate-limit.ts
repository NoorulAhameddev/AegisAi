import { NextRequest } from "next/server";
import Redis from "ioredis";
import { logger } from "./logger";

// Use Redis for distributed rate limiting
const redis = process.env.REDIS_URL
    ? new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: null })
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

export async function rateLimit(req: NextRequest, config?: RateLimitConfig) {
    const limit = config?.limit || GLOBAL_LIMIT;
    const window = config?.window || GLOBAL_WINDOW;

    const ip = req.headers.get("x-forwarded-for")?.split(',')[0] || "unknown";
    const key = `rate_limit:${ip}`;

    try {
        if (redis) {
            // Redis-based with Lua script (atomic operation - no race condition)
            const result = await redis.eval(RATE_LIMIT_SCRIPT, 1, key, limit, window) as [number, number];
            const [success, remaining] = result;

            if (success === 0) {
                logger.warn('Rate limit exceeded', { ip, limit });
                return { success: false, remaining: 0 };
            }

            return { success: true, remaining };
        } else {
            // Fallback to in-memory (development only)
            if (process.env.NODE_ENV === 'production') {
                logger.error('FATAL: Redis required for production rate limiting', undefined, { ip });
                throw new Error('FATAL: Redis required for production rate limiting');
            }
            logger.warn('[RateLimit] Using in-memory rate limiting - not suitable for production');
            return inMemoryRateLimit(key, limit, window);
        }
    } catch (error) {
        logger.error("Rate limit error", error as Error, { ip });
        // Fail closed in production, fail open in development
        if (process.env.NODE_ENV === 'production') {
            return { success: false, remaining: 0 };
        }
        return { success: true, remaining: 10 };
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

    keysToDelete.forEach(key => rateLimitMap.delete(key));

    if (keysToDelete.length > 0) {
        logger.debug(`[RateLimit] Cleaned up ${keysToDelete.length} expired entries`);
    }
}, 60000);
