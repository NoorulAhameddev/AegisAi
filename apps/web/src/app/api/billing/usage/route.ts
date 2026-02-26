/**
 * GET /api/billing/usage
 * Get token usage and remaining budget for current user
 */

import { NextRequest } from "next/server";
import { verifyAuth } from "@/services/auth/auth";
import { tokenBudgetManager } from "@/services/billing/token-budget";
import {
  successResponse,
  unauthorizedResponse,
  errorResponse,
} from "@/lib/response";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") || "";

  try {
    const user = await verifyAuth(req);
    if (!user) return unauthorizedResponse({ requestId });

    // Get budget info
    const budget = await tokenBudgetManager.getRemainingBudget(user.id);
    const stats = await tokenBudgetManager.getUsageStats(user.id);

    // Get user's tier
    const userRecord = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        plan: true,
        subscriptionEndsAt: true,
        createdAt: true,
      },
    });

    return successResponse(
      {
        tier: userRecord?.plan || "FREE",
        subscriptionEndsAt: userRecord?.subscriptionEndsAt,
        memberSince: userRecord?.createdAt,
        tokenBudget: {
          monthly: {
            limit: budget.monthly.limit,
            used: budget.monthly.used,
            remaining: budget.monthly.remaining,
            percentage: Math.round(stats.percentUsed.monthly),
          },
          daily: {
            limit: budget.daily.limit,
            used: budget.daily.used,
            remaining: budget.daily.remaining,
            percentage: Math.round(stats.percentUsed.daily),
          },
          hourly: {
            limit: budget.hourly.limit,
            used: budget.hourly.used,
            remaining: budget.hourly.remaining,
          },
        },
        resetDate: new Date(
          new Date().getFullYear(),
          new Date().getMonth() + 1,
          1,
        ).toISOString(),
      },
      { requestId },
    );
  } catch (error) {
    logger.error("Failed to get usage stats", error as Error, { requestId });
    return errorResponse("Failed to get usage statistics", {
      status: 500,
      requestId,
    });
  }
}
