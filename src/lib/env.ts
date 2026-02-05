/**
 * Environment Variable Validation
 * Ensures all required configuration is present and valid
 */

import { z } from "zod";

const envSchema = z.object({
    NODE_ENV: z.enum(["development", "production", "test"]),
    APP_ENV: z.enum(["development", "staging", "production"]),

    // DATABASE_URL should include connection pool parameters:
    // postgresql://user:password@localhost:5432/dbname?schema=public&sslmode=require&connectionLimit=20&idleTimeout=25000
    DATABASE_URL: z.string().min(1).refine(v => v.startsWith("postgresql://"), {
        message: "DATABASE_URL must start with postgresql:// with optional connectionLimit and idleTimeout params",
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
    
    // CRITICAL: CORS origins from environment, not hardcoded
    ALLOWED_ORIGINS: z.string().optional().default(""),
    
    // CRITICAL: Audit log signing key for integrity verification
    AUDIT_SIGNING_KEY: z.string().min(32).optional(),
    
    // CRITICAL: Data retention policy
    AUDIT_LOG_RETENTION_DAYS: z.coerce.number().int().positive().default(90),
    SESSION_RETENTION_DAYS: z.coerce.number().int().positive().default(7),
    
    // CRITICAL: Connection pool tuning for PostgreSQL
    // Production: connectionLimit=20 (can increase based on load)
    // See: https://www.postgresql.org/docs/current/sql-createpool.html
    DATABASE_POOL_MIN: z.coerce.number().int().positive().default(2),
    DATABASE_POOL_MAX: z.coerce.number().int().positive().default(20),
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
