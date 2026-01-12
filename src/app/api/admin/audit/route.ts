/**
 * Admin Audit Logs API
 * GET /api/admin/audit - Query audit logs
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { hasAdminPermission } from "@/lib/admin-permissions";
import { queryAuditLogs } from "@/lib/audit";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
    try {
        const user = await verifyAuth(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check admin permission
        if (!hasAdminPermission(user.role, "AUDIT_VIEW_MAP")) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Parse query parameters
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get("userId") || undefined;
        const action = searchParams.get("action") || undefined;
        const targetType = searchParams.get("targetType") || undefined;
        const targetId = searchParams.get("targetId") || undefined;
        const limit = parseInt(searchParams.get("limit") || "100");

        const logs = await queryAuditLogs({
            userId,
            action: action as any,
            targetType,
            targetId,
            limit,
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

        return NextResponse.json(sanitizedLogs);
    } catch (error) {
        console.error("[Admin Audit API Error]:", error);
        return NextResponse.json(
            { error: "Failed to fetch audit logs" },
            { status: 500 }
        );
    }
}
