/**
 * Environment Variable Validation
 * Ensures all required configuration is present and valid
 */

import { z } from "zod";

export function createEnvSchema(isBuildPhase: boolean) {
  return z.object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    APP_ENV: z.enum(["development", "staging", "production", "test"]).default("development"),

    // Build-time dummy fallback ensures 'next build' succeeds without active database connection
    DATABASE_URL: z
      .string()
      .min(1)
      .refine((v) => v.startsWith("postgresql://"), {
        message: "DATABASE_URL must start with postgresql://",
      })
      .default(
        isBuildPhase
          ? "postgresql://build:dummy@localhost:5432/build_dummy"
          : (undefined as any)
      ),

    // Optional read replica URLs for read scaling
    DATABASE_REPLICA_1_URL: z.string().optional(),
    DATABASE_REPLICA_2_URL: z.string().optional(),

    JWT_ACCESS_SECRET: z.string().min(32).default("dev-access-secret-min-32-chars-long!"),
    JWT_REFRESH_SECRET: z.string().min(32).default("dev-refresh-secret-min-32-chars-long!"),

    OPENROUTER_API_KEY: z.string().min(1).default("sk-dummy-openrouter-key-for-build"),

    REDIS_URL: z.string().min(1).default("redis://localhost:6379"),
    QUEUE_NAME: z.string().min(1).default("chat-queue"),

    // WebSocket configuration
    WEBSOCKET_PORT: z.coerce.number().int().positive().default(3001),
    FRONTEND_URL: z.string().url().optional().default("http://localhost:3000"),
    SITE_URL: z.string().url().optional().default("http://localhost:3000"),

    SECRET_PROVIDER: z.enum(["aws-kms", "local"]).default("local"),
    ENCRYPTION_KEY: z.string().optional(),
    ENCRYPTION_KEY_CIPHERTEXT: z.string().optional(),
    AWS_REGION: z.string().optional(),

    MAX_FILE_SIZE: z.coerce
      .number()
      .int()
      .positive()
      .default(50 * 1024 * 1024),
    MAX_UPLOADS_PER_MINUTE: z.coerce.number().int().positive().default(20),

    // CORS origins (required in production, optional in dev)
    ALLOWED_ORIGINS: z
      .string()
      .min(1)
      .default("http://localhost:8081,http://localhost:8082"),

    // Audit log signing key
    AUDIT_SIGNING_KEY: z
      .string()
      .min(32)
      .default("dev-only-insecure-key-replace-in-production-32chars"),

    AUDIT_LOG_RETENTION_DAYS: z.coerce.number().int().positive().default(90),
    SESSION_RETENTION_DAYS: z.coerce.number().int().positive().default(7),

    DATABASE_POOL_MIN: z.coerce.number().int().positive().default(2),
    DATABASE_POOL_MAX: z.coerce.number().int().positive().default(20),

    DB_POOL_SIZE: z.coerce.number().int().positive().default(10),
    DB_POOL_TIMEOUT: z.coerce.number().int().positive().default(30),
    DB_STATEMENT_TIMEOUT: z.coerce.number().int().positive().default(60000),

    WORKER_CONCURRENCY: z.coerce.number().int().positive().default(5),

    AWS_ECS_FARGATE: z.string().optional(),
    AWS_EXECUTION_ENV: z.string().optional(),

    VECTOR_DB_PROVIDER: z.enum(["lancedb", "pgvector"]).default("lancedb"),
    PGVECTOR_HOST: z.string().optional(),
    PGVECTOR_PORT: z.coerce.number().int().positive().optional(),
    PGVECTOR_DB: z.string().optional(),

    EMBEDDING_MODEL: z
      .enum(["text-embedding-3-small", "text-embedding-3-large"])
      .default("text-embedding-3-small"),
    HUGGINGFACE_API_KEY: z.string().optional(),

    CROSS_ENCODER_MODEL: z.string().default("ms-marco-MiniLM-L-12-v2"),

    SEMANTIC_CACHE_TTL: z.coerce.number().int().positive().default(86400),

    ENABLE_SERVERLESS_FUNCTIONS: z.coerce.boolean().default(false),

    SENTRY_DSN: z.string().url().optional(),
    SENTRY_RELEASE: z.string().optional(),
    SENTRY_AUTH_TOKEN: z.string().optional(),

    EXTERNAL_AUDIT_URL: z.string().url().optional(),
    EXTERNAL_AUDIT_API_KEY: z.string().optional(),

    STRIPE_WEBHOOK_SECRET: z.string().optional(),

    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    GOOGLE_REDIRECT_URI: z.string().optional(),
    ENABLE_GOOGLE_OAUTH: z.coerce.boolean().default(false),
  });
}

/**
 * Validates and returns environment configuration.
 * Enforces production security rules when in production runtime.
 */
export function validateEnv(inputEnv: NodeJS.ProcessEnv = process.env) {
  const isBuildPhase = inputEnv.NEXT_PHASE === "phase-production-build";

  // Prevent contradictory APP_ENV / NODE_ENV behaviors in runtime
  if (!isBuildPhase) {
    if (inputEnv.NODE_ENV === "production" && inputEnv.APP_ENV === "development") {
      throw new Error(
        "FATAL: Contradictory environment configuration: NODE_ENV cannot be 'production' while APP_ENV is 'development'."
      );
    }
    if (inputEnv.APP_ENV === "production" && inputEnv.NODE_ENV === "development") {
      throw new Error(
        "FATAL: Contradictory environment configuration: APP_ENV cannot be 'production' while NODE_ENV is 'development'."
      );
    }
  }

  // Harmonize APP_ENV and NODE_ENV:
  // If process.env.NODE_ENV === 'production', treat APP_ENV as production unless explicitly configured
  const effectiveAppEnv =
    inputEnv.APP_ENV || (inputEnv.NODE_ENV === "production" ? "production" : undefined);

  // Check if target runtime is production
  const isProductionRuntime =
    !isBuildPhase &&
    (effectiveAppEnv === "production" ||
      (inputEnv.NODE_ENV === "production" && inputEnv.APP_ENV !== "development"));

  // Strictly disallow SKIP_PROD_VALIDATION in production runtime
  if (!isBuildPhase && inputEnv.SKIP_PROD_VALIDATION === "1") {
    if (
      effectiveAppEnv === "production" ||
      inputEnv.NODE_ENV === "production" ||
      !inputEnv.APP_ENV
    ) {
      throw new Error(
        "CRITICAL SECURITY VIOLATION: SKIP_PROD_VALIDATION=1 is strictly prohibited in production runtime!"
      );
    }
  }

  const envToParse = {
    ...inputEnv,
    ...(effectiveAppEnv && !inputEnv.APP_ENV ? { APP_ENV: effectiveAppEnv } : {}),
  };

  const schema = createEnvSchema(isBuildPhase);
  const parsed = schema.safeParse(envToParse);

  if (!parsed.success) {
    const message = parsed.error.errors
      .map((e) => `- ${e.path.join(".")}: ${e.message}`)
      .join("\n");
    throw new Error(`FATAL: Invalid environment configuration:\n${message}`);
  }

  // Strict Runtime Production Hardening (Bypassed during build phase)
  if (isProductionRuntime) {
    const errors: string[] = [];

    // Minimum 64-character entropy for production tokens and no dev defaults
    if (
      parsed.data.JWT_ACCESS_SECRET.length < 64 ||
      parsed.data.JWT_ACCESS_SECRET.includes("dev-access-secret")
    ) {
      errors.push(
        "FATAL: JWT_ACCESS_SECRET must be at least 64 random characters in production!"
      );
    }

    if (
      parsed.data.JWT_REFRESH_SECRET.length < 64 ||
      parsed.data.JWT_REFRESH_SECRET.includes("dev-refresh-secret")
    ) {
      errors.push(
        "FATAL: JWT_REFRESH_SECRET must be at least 64 random characters in production!"
      );
    }

    if (
      parsed.data.AUDIT_SIGNING_KEY.length < 64 ||
      parsed.data.AUDIT_SIGNING_KEY.includes("dev-only-insecure")
    ) {
      errors.push(
        "FATAL: AUDIT_SIGNING_KEY must be at least 64 random characters in production!"
      );
    }

    // Production CORS Validation:
    // Validate that CORS origins are valid HTTPS URLs with no trailing slashes,
    // and reject wildcard '*' when credentials are enabled.
    const origins = parsed.data.ALLOWED_ORIGINS.split(",").map((o) => o.trim());
    if (origins.length === 0 || parsed.data.ALLOWED_ORIGINS.trim() === "") {
      errors.push(
        "FATAL: ALLOWED_ORIGINS must be configured with HTTPS URLs in production."
      );
    }
    for (const origin of origins) {
      if (origin === "*") {
        errors.push(
          "FATAL: Wildcard CORS origin '*' is disallowed in production when credentials are enabled. Must be explicit HTTPS URL."
        );
        continue;
      }
      if (
        origin.startsWith("http://") ||
        origin.includes("localhost") ||
        origin.includes("127.0.0.1")
      ) {
        errors.push(
          `FATAL: Insecure CORS origin '${origin}' is disallowed in production. Must be explicit HTTPS URL.`
        );
        continue;
      }
      if (origin.endsWith("/")) {
        errors.push(
          `FATAL: CORS origin '${origin}' must not have a trailing slash in production.`
        );
        continue;
      }
      try {
        const u = new URL(origin);
        if (u.protocol !== "https:") {
          errors.push(
            `FATAL: Insecure CORS origin '${origin}' is disallowed in production. Must be explicit HTTPS URL.`
          );
        }
      } catch {
        errors.push(
          `FATAL: Insecure CORS origin '${origin}' is disallowed in production. Must be explicit HTTPS URL.`
        );
      }
    }

    // Secret Provider Validation
    if (parsed.data.SECRET_PROVIDER === "aws-kms") {
      if (!parsed.data.AWS_REGION || !parsed.data.ENCRYPTION_KEY_CIPHERTEXT) {
        errors.push(
          "FATAL: AWS_REGION and ENCRYPTION_KEY_CIPHERTEXT are required when SECRET_PROVIDER=aws-kms."
        );
      }
    } else if (parsed.data.SECRET_PROVIDER === "local") {
      if (!parsed.data.ENCRYPTION_KEY || parsed.data.ENCRYPTION_KEY.length < 64) {
        errors.push(
          "FATAL: ENCRYPTION_KEY (minimum 64 hex characters) is required when SECRET_PROVIDER=local."
        );
      }
    }

    if (errors.length > 0) {
      throw new Error(
        `Production security validation failed:\n${errors.join("\n")}`
      );
    }
  }

  return parsed.data;
}

export const env = validateEnv(process.env);
export type Env = typeof env;

let config: Env | null = null;

export function getEnv(): Env {
  if (!config) {
    config = env;
  }
  return config;
}

export default env;
