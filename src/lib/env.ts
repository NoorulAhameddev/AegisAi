/**
 * Environment Variable Validation
 * Ensures all required configuration is present and valid
 */

import { z } from "zod";

const envSchema = z.object({
    NODE_ENV: z.enum(["development", "production", "test"]),
    APP_ENV: z.enum(["development", "staging", "production"]),

    DATABASE_URL: z.string().min(1).refine(v => v.startsWith("postgresql://"), {
        message: "DATABASE_URL must start with postgresql://",
    }),

    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),

    OPENROUTER_API_KEY: z.string().min(1).startsWith("sk-"),

    REDIS_URL: z.string().min(1),
    QUEUE_NAME: z.string().min(1).default("chat-queue"),

    SECRET_PROVIDER: z.enum(["aws-kms"]),
    ENCRYPTION_KEY_CIPHERTEXT: z.string().min(1),
    AWS_REGION: z.string().min(1),

    MAX_FILE_SIZE: z.coerce.number().int().positive().default(50 * 1024 * 1024),
    MAX_UPLOADS_PER_MINUTE: z.coerce.number().int().positive().default(20),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    const message = parsed.error.errors
        .map(e => `- ${e.path.join(".")}: ${e.message}`)
        .join("\n");
    throw new Error(`FATAL: Invalid environment configuration:\n${message}`);
}

export const env = parsed.data;
export type Env = typeof env;

let config: Env | null = null;

export function getEnv(): Env {
    if (!config) {
        config = env;
    }
    return config;
}
