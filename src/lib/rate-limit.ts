import { NextRequest } from "next/server";

// In-memory store for rate limiting (Fallback when Redis is unavailable)
// Note: This does not share state across multiple server instances/workers.
const rateLimitMap = new Map<string, { count: number; expires: number }>();

// Clean up expired entries periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of rateLimitMap.entries()) {
        if (value.expires < now) {
            rateLimitMap.delete(key);
        }
    }
}, 60000);

interface RateLimitConfig {
    limit: number;
    window: number; // in seconds
}

const GLOBAL_LIMIT = 100; // requests
const GLOBAL_WINDOW = 60; // seconds

export async function rateLimit(req: NextRequest, config?: RateLimitConfig) {
    // For development simplicity, we can still use this check or test the limiter
    // if (process.env.NODE_ENV === "development") return { success: true, remaining: 999 };

    try {
        const ip = req.headers.get("x-forwarded-for")?.split(',')[0] || "unknown";
        const key = `rate_limit:${ip}`;

        const limit = config?.limit || GLOBAL_LIMIT;
        const window = config?.window || GLOBAL_WINDOW;
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
    } catch (error) {
        console.error("Rate limit error (In-Memory):", error);
        return { success: true, remaining: 10 }; // Fail open
    }
}
