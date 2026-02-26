/**
 * Admin Audit Export API
 * POST /api/admin/audit/export - Export audit logs for compliance
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyAuth } from "@/services/auth/auth";
import { hasAdminPermission } from "@/services/auth/permissions";
import { exportAuditLogs, createAuditLog } from "@/lib/audit";
import { parseBody } from "@/lib/request-validation";
import {
  errorResponse,
  forbiddenResponse,
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
    if (!hasAdminPermission(user.role, "AUDIT_EXPORT")) {
      return forbiddenResponse();
    }

    const bodySchema = z.object({
      format: z.enum(["json", "csv"]).default("json"),
      filters: z.record(z.any()).optional(),
    });
    const { data, response } = await parseBody(req, bodySchema);
    if (response) return response;

    const format = data.format || "json";
    const filters = data.filters || {};

    // Log the export action
    await createAuditLog({
      userId: user.id,
      adminRole: user.role,
      action: "AUDIT_EXPORT",
      metadata: { format, filters },
      ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
      userAgent: req.headers.get("user-agent") || undefined,
    });

    const exportData = await exportAuditLogs(filters, format);

    // Return as downloadable file
    const headers = new Headers();
    headers.set(
      "Content-Type",
      format === "json" ? "application/json" : "text/csv",
    );
    headers.set(
      "Content-Disposition",
      `attachment; filename="audit-logs-${Date.now()}.${format}"`,
    );

    return new NextResponse(exportData, { headers });
  } catch (error) {
    logger.error("Admin audit export error", error as Error);
    return errorResponse("Failed to export audit logs", { status: 500 });
  }
}
