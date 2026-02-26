import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { verifyAuth } from "@/services/auth/auth";
import {
  errorResponse,
  forbiddenResponse,
  successResponse,
  unauthorizedResponse,
} from "@/lib/response";
import { requireAdmin } from "@/services/auth/authorization";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";
import { getMetrics } from "@/lib/metrics";

export async function GET(req: NextRequest) {
  try {
    // Rate limiting: 100 req/min for admin operations
    const rateLimitResult = await rateLimit(req, { limit: 100, window: 60 });
    if (!rateLimitResult.success) {
      return errorResponse("Rate limit exceeded", { status: 429 });
    }

    const user = await verifyAuth(req);
    if (!user) return unauthorizedResponse();
    const adminResponse = requireAdmin(user.role);
    if (adminResponse) return adminResponse;

    // Existing metrics
    const users = await prisma.user.count();
    const usage = await prisma.usageMetric.aggregate({
      _sum: { tokens: true },
    });

    // Production operational metrics
    const operationalMetrics = getMetrics();

    return successResponse({
      users,
      totalTokensUsed: usage._sum.tokens || 0,
      operational: operationalMetrics,
    });
  } catch (error) {
    logger.error("Admin metrics failed", error as Error);
    return errorResponse("Failed to fetch metrics", { status: 500 });
  }
}
