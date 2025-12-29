import { redis } from "@/lib/redis";

export async function rateLimit(key: string) {
    const window = Number(process.env.RATE_LIMIT_WINDOW || 60);
    const max = Number(process.env.RATE_LIMIT_MAX || 60);

    const current = await redis.incr(key);
    if (current === 1) await redis.expire(key, window);

    return current <= max;
}
