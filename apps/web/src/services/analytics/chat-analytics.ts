/**
 * Chat Analytics Service
 *
 * Provides aggregated analytics for chat activity, user engagement,
 * token usage, and moderation insights.
 *
 * Features:
 * - Time-series aggregations (hourly, daily, weekly)
 * - Real-time metrics snapshot
 * - Redis caching for expensive queries
 * - Anomaly detection
 */

import { prisma } from "@/lib/prisma";
import { getMetrics } from "@/lib/metrics";
import Redis from "ioredis";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

const redis = env.REDIS_URL
  ? new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      connectTimeout: 3000,
      retryStrategy: () => null,
    })
  : null;
redis?.on("error", (err: unknown) => {
  logger.warn("Chat analytics Redis error", { error: err instanceof Error ? err.message : String(err) });
});

const CACHE_TTL = 3600; // 1 hour in seconds

export type TimeGrouping = "hourly" | "daily" | "weekly";

export interface HistoricalStats {
  messagesPerPeriod: Array<{
    period: string;
    count: number;
    userMessages: number;
    assistantMessages: number;
  }>;
  activeUsers: Array<{ period: string; count: number }>;
  tokenUsage: Array<{ period: string; total: number }>;
  moderationFlags: Array<{ period: string; count: number }>;
  totalMessages: number;
  totalChats: number;
  totalUsers: number;
}

export interface LiveMetrics {
  activeChats: number;
  messagesPerMinute: number;
  avgResponseTime: number;
  queueDepth: number;
  moderationFlags: number;
  timestamp: string;
}

export interface SummaryStats {
  totalChats: number;
  totalMessages: number;
  activeUsers24h: number;
  flaggedContent: number;
  avgMessagesPerChat: number;
  avgTokensPerMessage: number;
}

/**
 * Generic cache wrapper with Redis fallback
 */
async function getCachedStats<T>(
  cacheKey: string,
  computeFn: () => Promise<T>,
): Promise<T> {
  // Try Redis cache
  if (redis) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        logger.info("[Analytics] Cache hit", { key: cacheKey });
        return JSON.parse(cached) as T;
      }
    } catch (error) {
      logger.warn("[Analytics] Redis get failed", {
        error: (error as Error).message,
      });
    }
  }

  // Compute fresh data
  const data = await computeFn();

  // Store in cache
  if (redis) {
    try {
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(data));
    } catch (error) {
      logger.warn("[Analytics] Redis set failed", {
        error: (error as Error).message,
      });
    }
  }

  return data;
}

/**
 * Get historical statistics for a date range
 */
export async function getHistoricalStats(
  startDate: Date,
  endDate: Date,
  groupBy: TimeGrouping = "daily",
): Promise<HistoricalStats> {
  const dateKey = `${startDate.toISOString().split("T")[0]}_${endDate.toISOString().split("T")[0]}`;
  const cacheKey = `analytics:history:${groupBy}:${dateKey}`;

  return getCachedStats(cacheKey, async () => {
    const startTime = Date.now();

    // Determine SQL date truncation based on grouping
    let dateTrunc: string;
    switch (groupBy) {
      case "hourly":
        dateTrunc = "hour";
        break;
      case "weekly":
        dateTrunc = "week";
        break;
      default:
        dateTrunc = "day";
    }

    // Messages per period with role breakdown
    const messagesByPeriod = await prisma.$queryRaw<
      Array<{
        period: Date;
        total: bigint;
        user_messages: bigint;
        assistant_messages: bigint;
      }>
    >`
            SELECT 
                DATE_TRUNC(${dateTrunc}, "createdAt") as period,
                COUNT(*) as total,
                SUM(CASE WHEN role = 'USER' THEN 1 ELSE 0 END) as user_messages,
                SUM(CASE WHEN role = 'ASSISTANT' THEN 1 ELSE 0 END) as assistant_messages
            FROM "Message"
            WHERE "createdAt" >= ${startDate}
                AND "createdAt" <= ${endDate}
                AND "deletedAt" IS NULL
            GROUP BY period
            ORDER BY period ASC
        `;

    // Active users per period
    const activeUsersByPeriod = await prisma.$queryRaw<
      Array<{ period: Date; count: bigint }>
    >`
            SELECT 
                DATE_TRUNC(${dateTrunc}, c."createdAt") as period,
                COUNT(DISTINCT c."userId") as count
            FROM "Chat" c
            WHERE c."createdAt" >= ${startDate}
                AND c."createdAt" <= ${endDate}
                AND c."deletedAt" IS NULL
            GROUP BY period
            ORDER BY period ASC
        `;

    // Token usage per period
    const tokensByPeriod = await prisma.$queryRaw<
      Array<{ period: Date; total: bigint }>
    >`
            SELECT 
                DATE_TRUNC(${dateTrunc}, "createdAt") as period,
                SUM(tokens) as total
            FROM "UsageMetric"
            WHERE "createdAt" >= ${startDate}
                AND "createdAt" <= ${endDate}
            GROUP BY period
            ORDER BY period ASC
        `;

    // Moderation flags per period
    const flagsByPeriod = await prisma.$queryRaw<
      Array<{ period: Date; count: bigint }>
    >`
            SELECT 
                DATE_TRUNC(${dateTrunc}, "createdAt") as period,
                COUNT(*) as count
            FROM "Message"
            WHERE "createdAt" >= ${startDate}
                AND "createdAt" <= ${endDate}
                AND "deletedAt" IS NULL
                AND flagged = true
            GROUP BY period
            ORDER BY period ASC
        `;

    // Overall totals
    const [totalMessages, totalChats, totalUsers] = await Promise.all([
      prisma.message.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          deletedAt: null,
        },
      }),
      prisma.chat.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          deletedAt: null,
        },
      }),
      prisma.chat
        .findMany({
          where: {
            createdAt: { gte: startDate, lte: endDate },
            deletedAt: null,
          },
          select: { userId: true },
          distinct: ["userId"],
        })
        .then((users) => users.length),
    ]);

    const duration = Date.now() - startTime;
    logger.info("[Analytics] Historical stats computed", {
      duration,
      groupBy,
      dateRange: dateKey,
    });

    return {
      messagesPerPeriod: messagesByPeriod.map((row) => ({
        period: row.period.toISOString(),
        count: Number(row.total),
        userMessages: Number(row.user_messages),
        assistantMessages: Number(row.assistant_messages),
      })),
      activeUsers: activeUsersByPeriod.map((row) => ({
        period: row.period.toISOString(),
        count: Number(row.count),
      })),
      tokenUsage: tokensByPeriod.map((row) => ({
        period: row.period.toISOString(),
        total: Number(row.total),
      })),
      moderationFlags: flagsByPeriod.map((row) => ({
        period: row.period.toISOString(),
        count: Number(row.count),
      })),
      totalMessages,
      totalChats,
      totalUsers,
    };
  });
}

/**
 * Get real-time metrics snapshot
 */
export async function getLiveMetrics(): Promise<LiveMetrics> {
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

  const [activeChats, messagesLastMinute] = await Promise.all([
    // Chats updated in last 5 minutes
    prisma.chat.count({
      where: {
        updatedAt: { gte: fiveMinutesAgo },
        deletedAt: null,
      },
    }),
    // Messages in last minute
    prisma.message.count({
      where: {
        createdAt: { gte: oneMinuteAgo },
        deletedAt: null,
      },
    }),
  ]);

  // Get in-memory metrics
  const metrics = getMetrics();

  // Use P95 as average response time
  const avgResponseTime = metrics.jobProcessing.p95;

  return {
    activeChats,
    messagesPerMinute: messagesLastMinute,
    avgResponseTime: Math.round(avgResponseTime),
    queueDepth: 0, // Will be populated from queue metrics if available
    moderationFlags: metrics.moderation.postModerationFlags,
    timestamp: now.toISOString(),
  };
}

/**
 * Get dashboard summary statistics
 */
export async function getSummaryStats(): Promise<SummaryStats> {
  const cacheKey = "analytics:summary";

  return getCachedStats(cacheKey, async () => {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      totalChats,
      totalMessages,
      activeUsers24h,
      flaggedContent,
      avgStats,
    ] = await Promise.all([
      prisma.chat.count({ where: { deletedAt: null } }),
      prisma.message.count({ where: { deletedAt: null } }),
      prisma.chat
        .findMany({
          where: {
            updatedAt: { gte: twentyFourHoursAgo },
            deletedAt: null,
          },
          select: { userId: true },
          distinct: ["userId"],
        })
        .then((users) => users.length),
      prisma.message.count({ where: { flagged: true, deletedAt: null } }),
      prisma.$queryRaw<Array<{ avg_messages: number; avg_tokens: number }>>`
                SELECT 
                    COALESCE(AVG(message_count), 0) as avg_messages,
                    COALESCE(AVG(total_tokens), 0) as avg_tokens
                FROM (
                    SELECT 
                        c.id,
                        COUNT(m.id) as message_count,
                        COALESCE(SUM(um.tokens), 0) as total_tokens
                    FROM "Chat" c
                    LEFT JOIN "Message" m ON m."chatId" = c.id AND m."deletedAt" IS NULL
                    LEFT JOIN "UsageMetric" um ON um."userId" = c."userId"
                    WHERE c."deletedAt" IS NULL
                    GROUP BY c.id
                ) chat_stats
            `,
    ]);

    const avgMessagesPerChat = avgStats[0]?.avg_messages || 0;
    const avgTokensPerMessage =
      totalMessages > 0 ? avgStats[0]?.avg_tokens / totalMessages : 0;

    return {
      totalChats,
      totalMessages,
      activeUsers24h,
      flaggedContent,
      avgMessagesPerChat: Math.round(avgMessagesPerChat * 10) / 10,
      avgTokensPerMessage: Math.round(avgTokensPerMessage),
    };
  });
}

/**
 * Detect usage anomalies (spikes > 3 standard deviations)
 */
export async function detectUsageAnomalies(userId?: string): Promise<{
  hasAnomaly: boolean;
  currentRate: number;
  avgRate: number;
  threshold: number;
}> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const lastHour = new Date(now.getTime() - 60 * 60 * 1000);

  const where = userId
    ? { userId, createdAt: { gte: sevenDaysAgo }, deletedAt: null }
    : { createdAt: { gte: sevenDaysAgo }, deletedAt: null };

  // Get message counts per hour for last 7 days
  const hourlyRates = userId
    ? await prisma.$queryRaw<Array<{ hour: Date; count: bigint }>>`
            SELECT 
                DATE_TRUNC('hour', "createdAt") as hour,
                COUNT(*) as count
            FROM "Message"
            WHERE "createdAt" >= ${sevenDaysAgo}
                AND "deletedAt" IS NULL
                AND "chatId" IN (SELECT id FROM "Chat" WHERE "userId" = ${userId})
            GROUP BY hour
            ORDER BY hour DESC
        `
    : await prisma.$queryRaw<Array<{ hour: Date; count: bigint }>>`
            SELECT 
                DATE_TRUNC('hour', "createdAt") as hour,
                COUNT(*) as count
            FROM "Message"
            WHERE "createdAt" >= ${sevenDaysAgo}
                AND "deletedAt" IS NULL
            GROUP BY hour
            ORDER BY hour DESC
        `;

  if (hourlyRates.length === 0) {
    return { hasAnomaly: false, currentRate: 0, avgRate: 0, threshold: 0 };
  }

  const rates = hourlyRates.map((r) => Number(r.count));
  const avgRate = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
  const variance =
    rates.reduce((sum, rate) => sum + Math.pow(rate - avgRate, 2), 0) /
    rates.length;
  const stdDev = Math.sqrt(variance);
  const threshold = avgRate + 3 * stdDev;

  // Current hour rate
  const currentRate = await prisma.message.count({
    where: userId
      ? { Chat: { userId }, createdAt: { gte: lastHour }, deletedAt: null }
      : { createdAt: { gte: lastHour }, deletedAt: null },
  });

  return {
    hasAnomaly: currentRate > threshold,
    currentRate,
    avgRate: Math.round(avgRate),
    threshold: Math.round(threshold),
  };
}
