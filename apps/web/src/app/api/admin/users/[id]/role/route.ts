import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/services/auth/auth";
import { parseBody } from "@/lib/request-validation";
import {
  errorResponse,
  forbiddenResponse,
  successResponse,
  unauthorizedResponse,
} from "@/lib/response";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";
import { canModifyRole } from "@/services/auth/permissions";
import { createAuditLog } from "@/lib/audit";
import { Role } from "@prisma/client";

const ROLE_HIERARCHY: Record<Role, number> = {
  SUPER_ADMIN: 5,
  ADMIN: 4,
  MODERATOR: 3,
  ANALYST: 2,
  SUPPORT: 2,
  USER: 2,
  BANNED: 1,
};

export async function PUT(
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

  // RBAC Check
  const { hasPermission } = await import("@/services/auth/rbac");
  if (!hasPermission(user.role as any, "user:promote")) {
    return forbiddenResponse();
  }

  const { id } = params;
  const bodySchema = z.object({
    role: z.enum(["ADMIN", "USER", "MODERATOR"]),
  });
  const { data, response } = await parseBody(req, bodySchema);
  if (response) return response;

  try {
    // Get target user
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, email: true },
    });

    if (!targetUser) {
      return errorResponse("User not found", { status: 404 });
    }

    // Prevent self-modification
    if (user.id === id) {
      return errorResponse("Cannot modify your own role", { status: 400 });
    }

    // Check role hierarchy - cannot modify users with higher or equal roles
    const requesterRoleLevel = ROLE_HIERARCHY[user.role as Role] || 0;
    const targetRoleLevel = ROLE_HIERARCHY[targetUser.role] || 0;
    const newRoleLevel = ROLE_HIERARCHY[data.role] || 0;

    if (targetRoleLevel >= requesterRoleLevel) {
      logger.security("Privilege escalation attempt blocked", {
        adminId: user.id,
        targetId: id,
        targetRole: targetUser.role,
        adminRole: user.role,
      });
      return forbiddenResponse();
    }

    // Cannot promote to role higher than own
    if (newRoleLevel >= requesterRoleLevel) {
      return errorResponse(
        "Cannot assign role equal to or higher than your own",
        { status: 400 },
      );
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role: data.role },
    });

    // Audit log
    await createAuditLog({
      userId: user.id,
      adminRole: user.role as Role,
      action: "USER_ROLE_CHANGE",
      targetType: "USER",
      targetId: id,
      previousState: { role: targetUser.role },
      newState: { role: data.role },
      metadata: { targetEmail: targetUser.email },
      ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
      userAgent: req.headers.get("user-agent") || undefined,
    });

    logger.security("User role changed", {
      adminId: user.id,
      targetId: id,
      newRole: data.role,
    });

    return successResponse(updated);
  } catch (e) {
    logger.error("Admin update role failed", e as Error, {
      adminId: user.id,
      targetUserId: id,
    });
    return errorResponse("Failed to update", { status: 500 });
  }
}
