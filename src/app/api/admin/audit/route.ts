/**
 * Admin Audit Logs API
 * GET /api/admin/audit - Query audit logs
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { verifyAuth } from "@/services/auth/auth";
import { hasAdminPermission } from "@/services/auth/permissions";
import { queryAuditLogs } from "@/lib/audit";
import { parseQuery } from "@/lib/request-validation";
import { errorResponse, forbiddenResponse, successResponse, unauthorizedResponse } from "@/lib/response";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
    try {
        const user = await verifyAuth(req);
        if (!user) {
            return unauthorizedResponse();
        }

        // Check admin permission
        if (!hasAdminPermission(user.role, "AUDIT_VIEW_MAP")) {
            return forbiddenResponse();
        }

        const querySchema = z.object({
            userId: z.string().optional(),
            action: z.string().optional(),
            targetType: z.string().optional(),
            targetId: z.string().optional(),
            limit: z.coerce.number().int().min(1).max(500).default(100),
        });
        const { data, response } = parseQuery(new URL(req.url), querySchema);
        if (response) return response;

        const logs = await queryAuditLogs({
            userId: data.userId,
            action: data.action as any,
            targetType: data.targetType,
            targetId: data.targetId,
            limit: data.limit,
        });

        // Redact sensitive information based on role
        const sanitizedLogs = logs.map((log) => {
            // Analysts see hashed emails, Super Admins see full details
            if (user.role === "ANALYST") {
                return {
                    ...log,
                    userId: log.userId ? `user_${log.userId.substring(0, 8)}...` : null,
                    ipAddress: log.ipAddress ? `${log.ipAddress.split(".")[0]}.xxx.xxx.xxx` : null,
                };
            }
            return log;
        });

        return successResponse(sanitizedLogs);
    } catch (error) {
        logger.error("Admin audit fetch error", error as Error);
        return errorResponse("Failed to fetch audit logs", { status: 500 });
    }
}
