import { PrismaClient } from "@prisma/client";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import {
  startPoolMonitoring,
  incrementActiveConnections,
  decrementActiveConnections,
  isPoolSaturated,
} from "@/lib/db-pool-monitor";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Prisma Client with Optimized Connection Pooling
 *
 * PRODUCTION CONNECTION POOL CONFIGURATION:
 * Target: Medium scale (100-1000 concurrent users)
 * Pool size: 75 connections
 *
 * Formula: (num_workers * concurrent_jobs_per_worker) + (api_instances * expected_concurrent_requests) + buffer
 * Example: (4 workers * 4 jobs) + (2 api instances * 20 requests) + 15 buffer = 75 connections
 *
 * REQUIRED DATABASE_URL format:
 * postgresql://user:pass@host:5432/db?connection_limit=75&pool_timeout=30&connect_timeout=10&socket_timeout=30
 *
 * Parameters explained:
 * - connection_limit: Max connections in pool (75 for medium scale)
 * - pool_timeout: Max wait time for available connection (30s)
 * - connect_timeout: Max time to establish new connection (10s)
 * - socket_timeout: Max idle time before closing connection (30s)
 *
 * Pool size recommendations:
 * - Development: 5-10
 * - Staging: 20-30
 * - Production (single instance): 50-75
 * - Production (multi-instance): Scale horizontally with load balancer
 */

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    errorFormat: "pretty",

    datasources: {
      db: {
        url: env.DATABASE_URL,
      },
    },
  });

// Validate connection pool configuration on startup
if (process.env.SKIP_PROD_VALIDATION !== '1') {
  if (env.NODE_ENV === "production") {
    const dbUrl = env.DATABASE_URL;
    if (!dbUrl.includes("connection_limit=")) {
      throw new Error(
        "[Prisma] FATAL: connection_limit not set in DATABASE_URL. Add ?connection_limit=75&pool_timeout=30&connect_timeout=10",
      );
    } else {
      const limitMatch = dbUrl.match(/connection_limit=(\d+)/);
      if (limitMatch) {
        const limit = parseInt(limitMatch[1], 10);
        logger.debug(`[Prisma] Connection pool configured: ${limit} connections`);
        if (limit < 50) {
          throw new Error(
            `[Prisma] FATAL: Connection pool size (${limit}) too small for production (minimum: 75)`,
          );
        }
      }
    }
  }

  // Log connection pool info on startup (development only)
  if (env.NODE_ENV === "development") {
    logger.debug(
      `[Prisma] Connected to: ${env.DATABASE_URL.split("://")[0]}://...`,
    );
    logger.debug(
      "[Prisma] Development mode: Add ?connection_limit=10 for local testing",
    );
  }
}

// Start connection pool monitoring
startPoolMonitoring();

// Extend Prisma with connection tracking middleware
prisma.$use(async (params, next) => {
  // Track connection acquisition
  incrementActiveConnections();

  // Check for pool saturation (warning only, don't block)
  if (isPoolSaturated()) {
    logger.warn("Database connection pool near capacity", {
      model: params.model,
      action: params.action,
    });
  }

  try {
    const result = await next(params);
    return result;
  } finally {
    // Track connection release
    decrementActiveConnections();
  }
});

// Graceful shutdown with connection pool cleanup
process.on("beforeExit", async () => {
  logger.info("[Prisma] Disconnecting from database...");
  await prisma.$disconnect();
});

// Handle uncaught exceptions
process.on("uncaughtException", async () => {
  await prisma.$disconnect();
  process.exit(1);
});

/**
 * Transaction helper with monitoring and logging
 * Wraps Prisma transactions with timing, error handling, and structured logs
 *
 * @param operations - Array of Prisma operations to run in transaction
 * @param context - Context info for logging (e.g., { userId, action })
 * @param timeout - Transaction timeout in milliseconds (default: 10000ms)
 * @returns Transaction result
 *
 * @example
 * const result = await withTransaction([
 *   prisma.session.deleteMany({ where: { userId } }),
 *   prisma.user.update({ where: { id: userId }, data: { tokenVersion: { increment: 1 } } })
 * ], { userId, action: 'revoke-all-sessions' });
 */
export async function withTransaction<T>(
  operations: any,
  context: Record<string, any> = {},
  timeout: number = 10000,
): Promise<T> {
  const startTime = Date.now();
  const transactionId = `tx-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  try {
    logger.db("Transaction started", transactionId, 0, context);

    const result = await prisma.$transaction(operations, {
      timeout,
      maxWait: 5000, // Max time to wait for transaction to start
    });

    const duration = Date.now() - startTime;
    logger.db("Transaction committed", transactionId, duration, {
      ...context,
      success: true,
    });

    if (duration > timeout * 0.8) {
      logger.warn("Transaction slow (>80% of timeout)", {
        transactionId,
        duration,
        timeout,
        context,
      });
    }

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error("Transaction failed", error as Error, {
      transactionId,
      duration,
      timeout,
      context,
    });

    if (error instanceof Error && error.message.includes("timeout")) {
      throw new Error(
        `Transaction timeout after ${timeout}ms: ${context.action || "unknown"}`,
      );
    }

    throw error;
  }
}
