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
  DATABASE_URL: z
    .string()
    .min(1)
    .refine((v) => v.startsWith("postgresql://"), {
      message:
        "DATABASE_URL must start with postgresql:// with optional connectionLimit and idleTimeout params",
    }),
  // Optional read replica URLs for read scaling
  DATABASE_REPLICA_1_URL: z.string().optional(),
  DATABASE_REPLICA_2_URL: z.string().optional(),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),

  OPENROUTER_API_KEY: z.string().min(1).startsWith("sk-"),

  REDIS_URL: z.string().min(1),
  QUEUE_NAME: z.string().min(1).default("chat-queue"),

  // WebSocket configuration
  WEBSOCKET_PORT: z.coerce.number().int().positive().default(3001),
  FRONTEND_URL: z.string().url().optional().default("http://localhost:3000"),
  SITE_URL: z.string().url().optional().default("http://localhost:3000"),

  SECRET_PROVIDER: z.enum(["aws-kms", "local"]).default("local"),
  ENCRYPTION_KEY_CIPHERTEXT: z.string().optional(),
  AWS_REGION: z.string().optional(),

  MAX_FILE_SIZE: z.coerce
    .number()
    .int()
    .positive()
    .default(50 * 1024 * 1024),
  MAX_UPLOADS_PER_MINUTE: z.coerce.number().int().positive().default(20),

  // CRITICAL: CORS origins (required in production, optional in dev)
  ALLOWED_ORIGINS: z
    .string()
    .min(1)
    .default("http://localhost:8081,http://localhost:8082"),

  // CRITICAL: Audit log signing key (required in production, auto-generated in dev)
  AUDIT_SIGNING_KEY: z
    .string()
    .min(32)
    .default("dev-only-insecure-key-replace-in-production-32chars"),

  // CRITICAL: Data retention policy
  AUDIT_LOG_RETENTION_DAYS: z.coerce.number().int().positive().default(90),
  SESSION_RETENTION_DAYS: z.coerce.number().int().positive().default(7),

  // CRITICAL: Connection pool tuning for PostgreSQL
  // Production: connectionLimit=20 (can increase based on load)
  // See: https://www.postgresql.org/docs/current/sql-createpool.html
  DATABASE_POOL_MIN: z.coerce.number().int().positive().default(2),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(20),

  // NEW: Enhanced connection pool configuration
  DB_POOL_SIZE: z.coerce.number().int().positive().default(10), // Max connections, production: 40+
  DB_POOL_TIMEOUT: z.coerce.number().int().positive().default(30), // Seconds to wait for connection
  DB_STATEMENT_TIMEOUT: z.coerce.number().int().positive().default(60000), // Milliseconds for query timeout

  // NEW: Worker configuration
  WORKER_CONCURRENCY: z.coerce.number().int().positive().default(5), // Jobs per worker

  // NEW: AWS CloudWatch configuration (optional, auto-detected in ECS)
  AWS_ECS_FARGATE: z.string().optional(), // Auto-set by ECS
  AWS_EXECUTION_ENV: z.string().optional(), // Auto-set by AWS Lambda/ECS

  // Vector Database Configuration (Phase 1)
  VECTOR_DB_PROVIDER: z.enum(["lancedb", "pgvector"]).default("lancedb"),
  PGVECTOR_HOST: z.string().optional(),
  PGVECTOR_PORT: z.coerce.number().int().positive().optional(),
  PGVECTOR_DB: z.string().optional(),

  // Embedding Model Configuration (Phase 2)
  EMBEDDING_MODEL: z
    .enum(["text-embedding-3-small", "text-embedding-3-large"])
    .default("text-embedding-3-small"),
  HUGGINGFACE_API_KEY: z.string().optional(),

  // Cross-Encoder Configuration (Phase 3)
  CROSS_ENCODER_MODEL: z.string().default("ms-marco-MiniLM-L-12-v2"),

  // Semantic Cache Configuration (Phase 4)
  SEMANTIC_CACHE_TTL: z.coerce.number().int().positive().default(86400),

  // CRITICAL SECURITY: Serverless function execution (vm2 CVE-2023-37466 mitigation)
  // Set to false to disable serverless functions due to vm2 sandbox escape vulnerability
  ENABLE_SERVERLESS_FUNCTIONS: z.coerce.boolean().default(false),

  // Monitoring and Error Tracking
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_RELEASE: z.string().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(), // For source maps upload

  // Google OAuth Configuration (optional)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().optional(),
  ENABLE_GOOGLE_OAUTH: z.coerce.boolean().default(false),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  const message = parsed.error.errors
    .map((e) => `- ${e.path.join(".")}: ${e.message}`)
    .join("\n");
  throw new Error(`FATAL: Invalid environment configuration:\n${message}`);
}

// PRODUCTION SECURITY VALIDATION
// CRITICAL: Fail hard if using insecure defaults in production
if (
  parsed.data.NODE_ENV === "production" ||
  parsed.data.APP_ENV === "production"
) {
  const errors: string[] = [];

  if (
    parsed.data.AUDIT_SIGNING_KEY ===
    "dev-only-insecure-key-replace-in-production-32chars"
  ) {
    errors.push(
      "FATAL: AUDIT_SIGNING_KEY must be set in production! Generate with: openssl rand -base64 32",
    );
  }

  if (parsed.data.ALLOWED_ORIGINS.includes("localhost")) {
    errors.push(
      "FATAL: ALLOWED_ORIGINS cannot include localhost in production! Set production domains.",
    );
  }

  if (parsed.data.JWT_ACCESS_SECRET.length < 64) {
    errors.push(
      "FATAL: JWT_ACCESS_SECRET must be at least 64 characters in production!",
    );
  }

  if (parsed.data.JWT_REFRESH_SECRET.length < 64) {
    errors.push(
      "FATAL: JWT_REFRESH_SECRET must be at least 64 characters in production!",
    );
  }

  if (errors.length > 0) {
    console.error("\n" + "=".repeat(80));
    console.error("🚨 PRODUCTION SECURITY FAILURE 🚨");
    console.error("=".repeat(80));
    errors.forEach((e) => console.error(e));
    console.error("=".repeat(80) + "\n");
    throw new Error(
      `Production security validation failed: ${errors.join("; ")}`,
    );
  }
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
