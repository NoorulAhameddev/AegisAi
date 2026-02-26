import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { verifyAuth } from "@/services/auth/auth";
import {
  errorResponse,
  successResponse,
  unauthorizedResponse,
} from "@/lib/response";
import { requireAdmin } from "@/services/auth/authorization";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";

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

    const activity = await prisma.usageMetric.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      include: { User: true },
    });

    return successResponse(activity);
  } catch (error) {
    logger.error("Admin activity failed", error as Error);
    return errorResponse("Failed to fetch activity", { status: 500 });
  }
}
