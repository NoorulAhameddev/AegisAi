/**
 * Admin Audit Export API
 * POST /api/admin/audit/export - Export audit logs for compliance
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { hasAdminPermission } from "@/lib/admin-permissions";
import { exportAuditLogs, createAuditLog } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    try {
        const user = await verifyAuth(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check admin permission
        if (!hasAdminPermission(user.role, "AUDIT_EXPORT")) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const { format = "json", filters = {} } = body;

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
        headers.set("Content-Type", format === "json" ? "application/json" : "text/csv");
        headers.set(
            "Content-Disposition",
            `attachment; filename="audit-logs-${Date.now()}.${format}"`
        );

        return new NextResponse(exportData, { headers });
    } catch (error) {
        console.error("[Admin Audit Export Error]:", error);
        return NextResponse.json(
            { error: "Failed to export audit logs" },
            { status: 500 }
        );
    }
}
