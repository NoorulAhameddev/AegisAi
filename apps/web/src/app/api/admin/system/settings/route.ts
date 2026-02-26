/**
 * Admin System Settings API
 * POST /api/admin/system/settings - Update system-wide settings
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { verifyAuth } from "@/services/auth/auth";
import { hasAdminPermission } from "@/services/auth/permissions";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { parseBody } from "@/lib/request-validation";
import {
  errorResponse,
  forbiddenResponse,
  successResponse,
  unauthorizedResponse,
} from "@/lib/response";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const user = await verifyAuth(req);
    if (!user) {
      return unauthorizedResponse();
    }

    // Check admin permission
    if (!hasAdminPermission(user.role, "CONFIG_TOGGLE")) {
      return forbiddenResponse();
    }

    const bodySchema = z.object({
      key: z.string().min(1),
      value: z.any(),
      reason: z.string().optional(),
      ticketId: z.string().optional(),
    });
    const { data, response } = await parseBody(req, bodySchema);
    if (response) return response;

    const { key, value, reason, ticketId } = data;

    // Get previous state
    const previousSetting = await prisma.systemSetting.findUnique({
      where: { key },
    });

    // Update or create setting
    const updated = await prisma.systemSetting.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) },
    });

    // Create audit log
    await createAuditLog({
      userId: user.id,
      adminRole: user.role,
      action: "CONFIG_CHANGE",
      targetType: "SYSTEM_SETTING",
      targetId: key,
      previousState: previousSetting ? { value: previousSetting.value } : null,
      newState: { value: String(value) },
      reason,
      ticketId,
      ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
      userAgent: req.headers.get("user-agent") || undefined,
    });

    return successResponse({ setting: updated });
  } catch (error) {
    logger.error("Admin system settings error", error as Error);
    return errorResponse("Failed to update system setting", { status: 500 });
  }
}
