import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/services/auth/auth";
import {
  errorResponse,
  forbiddenResponse,
  successResponse,
  unauthorizedResponse,
} from "@/lib/response";
import { logger } from "@/lib/logger";
import { requireAdmin } from "@/services/auth/authorization";
import { rateLimit } from "@/lib/rate-limit";

export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  // Rate limiting: 100 req/min for admin operations
  const rateLimitResult = await rateLimit(req, { limit: 100, window: 60 });
  if (!rateLimitResult.success) {
    return errorResponse("Rate limit exceeded", { status: 429 });
  }

  const params = await props.params;

  const user = await verifyAuth(req);
  if (!user) return unauthorizedResponse();
  const adminResponse = requireAdmin(user.role);
  if (adminResponse) return adminResponse;

  const { id } = params;

  try {
    await prisma.user.delete({
      where: { id },
    });
    return successResponse({ success: true });
  } catch (e) {
    logger.error("Admin delete user failed", e as Error, {
      adminId: user.id,
      targetUserId: id,
    });
    return errorResponse("Failed to delete", { status: 500 });
  }
}
