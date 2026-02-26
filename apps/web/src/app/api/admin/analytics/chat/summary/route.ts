/**
 * Chat Analytics - Summary Stats API
 *
 * GET /api/admin/analytics/chat/summary
 *
 * Returns high-level overview statistics for admin dashboard
 * Cached with 5-minute TTL
 */

import { NextRequest } from "next/server";
import { verifyAuth } from "@/services/auth/auth";
import { hasAdminPermission } from "@/services/auth/permissions";
import {
  errorResponse,
  forbiddenResponse,
  successResponse,
  unauthorizedResponse,
} from "@/lib/response";
import { rateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { createAuditLog } from "@/lib/audit";
import { getSummaryStats } from "@/services/analytics/chat-analytics";

export async function GET(req: NextRequest) {
  try {
    // Rate limiting: 100 req/min for admin operations
    const rateLimitResult = await rateLimit(req, { limit: 100, window: 60 });
    if (!rateLimitResult.success) {
      return errorResponse("Rate limit exceeded", { status: 429 });
    }

    // Authentication
    const user = await verifyAuth(req);
    if (!user) return unauthorizedResponse();

    // Authorization: ANALYTICS_VIEW permission
    if (!hasAdminPermission(user.role, "ANALYTICS_VIEW")) {
      return forbiddenResponse({
        requestId: req.headers.get("x-request-id") || undefined,
      });
    }

    // Fetch summary statistics
    const startTime = Date.now();
    const stats = await getSummaryStats();
    const queryDuration = Date.now() - startTime;

    // Create audit log (less verbose than historical queries)
    await createAuditLog({
      userId: user.id,
      adminRole: user.role,
      action: "ANALYTICS_VIEW",
      targetType: "ANALYTICS",
      metadata: {
        endpoint: "/api/admin/analytics/chat/summary",
        queryDuration,
      },
      ipAddress:
        req.headers.get("x-forwarded-for") ||
        req.headers.get("x-real-ip") ||
        "unknown",
      userAgent: req.headers.get("user-agent") || "unknown",
      mfaVerified: false,
    });

    logger.info("[Analytics] Summary stats retrieved", {
      userId: user.id,
      duration: queryDuration,
    });

    return successResponse(stats, {
      requestId: req.headers.get("x-request-id") || undefined,
    });
  } catch (error) {
    logger.error("[Analytics] Failed to fetch summary stats", error as Error);
    return errorResponse("Failed to fetch analytics summary", { status: 500 });
  }
}
