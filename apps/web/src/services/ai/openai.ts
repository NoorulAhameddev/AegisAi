import OpenAI from "openai";
import { env } from "@/lib/env";
import { openaiCircuitBreaker } from "@/lib/circuit-breaker";

const cleanKey = env.OPENROUTER_API_KEY.trim().replace(/^["']|["']$/g, "");

const baseOpenAI = new OpenAI({
    apiKey: cleanKey,
    baseURL: "https://openrouter.ai/api/v1",
    timeout: 30000,
    maxRetries: 0, // Disable internal retries (circuit breaker handles this)
    defaultHeaders: {
        "HTTP-Referer": process.env.SITE_URL || "http://localhost:3000",
        "X-Title": process.env.SITE_NAME || "Aegis AI",
    },
    // Allow browser usage in test environments
    dangerouslyAllowBrowser: process.env.NODE_ENV === 'test',
});

/**
 * Wrapped OpenAI client with production-grade circuit breaker protection
 * 
 * Features:
 * - Prevents cascading failures when OpenAI is degraded
 * - Automatic fallback to cached/degraded responses when circuit OPEN
 * - CloudWatch metrics for circuit state and performance
 * - Intelligent error % based triggering (not just consecutive failures)
 */
export const openai = {
    chat: {
        completions: {
            create: async (params: Parameters<typeof baseOpenAI.chat.completions.create>[0]) => {
                return openaiCircuitBreaker.fire(() =>
                    baseOpenAI.chat.completions.create(params)
                );
            },
        },
    },
    moderations: {
        create: async (params: Parameters<typeof baseOpenAI.moderations.create>[0]) => {
            return openaiCircuitBreaker.fire(() =>
                baseOpenAI.moderations.create(params)
            );
        },
    },
    images: {
        generate: async (params: any) => {
            return openaiCircuitBreaker.fire(() =>
                baseOpenAI.images.generate(params)
            );
        },
    },
} as any;
