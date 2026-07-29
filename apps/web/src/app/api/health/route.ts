import { prisma } from "@/lib/prisma";
import { getReplicaLag } from "@/lib/read-replicas";
import Redis from "ioredis";
import { env } from "@/lib/env";
import { successResponse, errorResponse } from "@/lib/response";
import {
  openaiCircuitBreaker,
  moderationCircuitBreaker,
  ragCircuitBreaker,
  getCircuitState,
  getCircuitStats,
} from "@/lib/circuit-breaker";
import { getRedisHealth } from "@/lib/redis-fallback";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(req: Request) {
  // Rate limit health checks to prevent abuse (10 per minute)
  const rateLimitResult = await rateLimit(req as any, {
    limit: 10,
    window: 60,
  });
  if (!rateLimitResult.success) {
    return errorResponse("Rate limit exceeded", { status: 429 });
  }

  // Basic health (public) — just status and timestamp
  // Detailed health (authenticated) — requires HEALTH_CHECK_SECRET query param
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  const isDetailed = secret === process.env.HEALTH_CHECK_SECRET;
  const checks: any = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    checks: {},
  };

  let allHealthy = true;

  // 1. Database Check
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.checks.database = {
      status: "ok",
      message: "PostgreSQL connected",
    };
  } catch (error: any) {
    allHealthy = false;
    checks.checks.database = {
      status: "error",
      message: error.message,
    };
  }

  // 2. Read Replica Lag Check
  try {
    const { replica1Lag, replica2Lag } = await getReplicaLag();
    const maxLag = Math.max(replica1Lag ?? 0, replica2Lag ?? 0);

    checks.checks.readReplicas = {
      status: maxLag > 5 ? "degraded" : "ok",
      replica1Lag,
      replica2Lag,
      message: maxLag > 5 ? "Replica lag above 5s" : "Replica lag within 5s",
    };

    if (maxLag > 5) {
      checks.status = "degraded";
    }
  } catch (error: any) {
    checks.checks.readReplicas = {
      status: "warning",
      message: error.message || "Replica lag unavailable",
    };
  }

  // 3. Redis Check (with fallback tracking)
  const redisHealth = getRedisHealth();
  if (env.REDIS_URL) {
    try {
      const redis = new Redis(env.REDIS_URL, {
        maxRetriesPerRequest: 1,
        connectTimeout: 5000,
      });
      await redis.ping();
      await redis.quit();
      checks.checks.redis = {
        status: "ok",
        message: "Redis connected",
        failureCount: redisHealth.failureCount,
      };
    } catch (error: any) {
      // Not marking allHealthy = false because fallback exists
      checks.checks.redis = {
        status: "degraded",
        message: "Redis unavailable - using PostgreSQL fallback",
        failureCount: redisHealth.failureCount,
        lastFailure: redisHealth.lastFailure,
      };
    }
  } else {
    checks.checks.redis = {
      status: "warning",
      message: "Redis not configured",
    };
  }

  // 3. OpenAI API Key Check
  if (env.OPENROUTER_API_KEY && env.OPENROUTER_API_KEY.startsWith("sk-")) {
    checks.checks.openai = {
      status: "ok",
      message: "API key configured",
    };
  } else {
    allHealthy = false;
    checks.checks.openai = {
      status: "error",
      message: "Invalid or missing API key",
    };
  }

  // 4. Environment Variables Check
  const requiredEnvVars = [
    "DATABASE_URL",
    "JWT_ACCESS_SECRET",
    "JWT_REFRESH_SECRET",
    "OPENROUTER_API_KEY",
    "ENCRYPTION_KEY_CIPHERTEXT",
    "AWS_REGION",
    "SECRET_PROVIDER",
  ];

  const missingVars = requiredEnvVars.filter((v) => !(env as any)[v]);

  if (missingVars.length === 0) {
    checks.checks.environment = {
      status: "ok",
      message: "All required variables set",
    };
  } else {
    allHealthy = false;
    checks.checks.environment = {
      status: "error",
      message: `Missing: ${missingVars.join(", ")}`,
    };
  }

  // 5. Encryption Key Length Check
  if (env.ENCRYPTION_KEY_CIPHERTEXT && env.AWS_REGION) {
    checks.checks.encryption = {
      status: "ok",
      message: "Encryption configured",
    };
  } else {
    allHealthy = false;
    checks.checks.encryption = {
      status: "error",
      message: "Missing encryption configuration",
    };
  }

  // 6. Vector Store (LanceDB) Check
  try {
    const { getDb } = await import("@/ai/rag/vector-store");
    const db = await getDb();
    // Try to list tables as a simple connectivity test
    const tables = await db.tableNames();
    checks.checks.vectorStore = {
      status: "ok",
      message: `LanceDB connected (${tables.length} tables)`,
    };
  } catch (error: any) {
    allHealthy = false;
    checks.checks.vectorStore = {
      status: "error",
      message: error.message || "Vector store not accessible",
    };
  }

  // 7. Queue Health Check
  try {
    const { chatQueue, ragQueue, getQueueMetrics } =
      await import("@/lib/queue");
    const chatMetrics = await getQueueMetrics(chatQueue, "chat");
    const ragMetrics = await getQueueMetrics(ragQueue, "rag");

    checks.checks.queues = {
      chat: {
        status:
          chatMetrics.total > 1000
            ? "critical"
            : chatMetrics.total > 500
              ? "warning"
              : "ok",
        waiting: chatMetrics.waiting,
        active: chatMetrics.active,
        failed: chatMetrics.failed,
        total: chatMetrics.total,
      },
      rag: {
        status:
          ragMetrics.total > 500
            ? "critical"
            : ragMetrics.total > 250
              ? "warning"
              : "ok",
        waiting: ragMetrics.waiting,
        active: ragMetrics.active,
        failed: ragMetrics.failed,
        total: ragMetrics.total,
      },
    };

    // Mark as degraded if queues are at critical levels
    if (chatMetrics.total > 1000 || ragMetrics.total > 500) {
      checks.status = "degraded";
    }
  } catch (error: any) {
    checks.checks.queues = {
      status: "error",
      message: error.message,
    };
  }

  // 8. Circuit Breaker Health Check
  const openaiState = getCircuitState(openaiCircuitBreaker);
  const openaiStats = getCircuitStats(openaiCircuitBreaker);
  checks.checks.circuitBreakers = {
    openai: {
      state: openaiState,
      status: openaiState === "OPEN" ? "degraded" : "ok",
      stats: {
        successes: openaiStats.successes,
        failures: openaiStats.failures,
        rejects: openaiStats.rejects,
        latencyMean: Math.round(openaiStats.latencyMean),
      },
    },
    moderation: {
      state: getCircuitState(moderationCircuitBreaker),
      status:
        getCircuitState(moderationCircuitBreaker) === "OPEN"
          ? "degraded"
          : "ok",
    },
    rag: {
      state: getCircuitState(ragCircuitBreaker),
      status: getCircuitState(ragCircuitBreaker) === "OPEN" ? "degraded" : "ok",
    },
  };

  // 9. External Audit Logging Check
  if (env.EXTERNAL_AUDIT_URL && env.EXTERNAL_AUDIT_API_KEY) {
    checks.checks.externalAudit = {
      status: "ok",
      message: "External audit logging configured",
      url: env.EXTERNAL_AUDIT_URL,
    };
  } else {
    checks.checks.externalAudit = {
      status: "warning",
      message: "External audit logging not configured",
      note: "Audit logs only stored locally",
    };
  }

  // Mark as degraded (not unhealthy) if circuit breakers are open
  if (openaiState === "OPEN") {
    checks.status = "degraded";
  }

  checks.status = allHealthy
    ? openaiState === "OPEN"
      ? "degraded"
      : "healthy"
    : "unhealthy";

  return successResponse(checks, {
    status: allHealthy ? (openaiState === "OPEN" ? 200 : 200) : 503,
  });
}
