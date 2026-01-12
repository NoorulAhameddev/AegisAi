/**
 * Admin System Settings API
 * POST /api/admin/system/settings - Update system-wide settings
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { hasAdminPermission } from "@/lib/admin-permissions";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    try {
        const user = await verifyAuth(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check admin permission
        if (!hasAdminPermission(user.role, "CONFIG_TOGGLE")) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const { key, value, reason, ticketId } = body;

        if (!key || value === undefined) {
            return NextResponse.json({ error: "Key and value are required" }, { status: 400 });
        }

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

        return NextResponse.json({ setting: updated });
    } catch (error) {
        console.error("[Admin System Settings Error]:", error);
        return NextResponse.json(
            { error: "Failed to update system setting" },
            { status: 500 }
        );
    }
}
