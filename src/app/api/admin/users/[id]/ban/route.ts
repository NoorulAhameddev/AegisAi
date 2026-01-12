import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";
import { hasAdminPermission, canModifyRole } from "@/lib/admin-permissions";
import { createAuditLog } from "@/lib/audit";
import { banUserSchema } from "@/lib/validations";

export const runtime = "nodejs";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check admin permission
        if (!hasAdminPermission(user.role, "IDENTITY_BAN")) {
            return NextResponse.json({ error: "Forbidden: Missing Permission" }, { status: 403 });
        }

        const targetUserId = (await params).id;
        const body = await request.json();
        const validation = banUserSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
        }

        const { ban, reason, ticketId } = validation.data;

        // Prevent self-modification
        if (user.id === targetUserId) {
            return NextResponse.json({ error: "Cannot modify your own account" }, { status: 403 });
        }

        // Get target user to check role hierarchy
        const targetUser = await prisma.user.findUnique({
            where: { id: targetUserId },
            select: { id: true, email: true, role: true, isBanned: true },
        });

        if (!targetUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Check role hierarchy - cannot ban higher-level admins
        if (!canModifyRole(user.role, targetUser.role)) {
            return NextResponse.json(
                { error: "Cannot modify users with equal or higher privileges" },
                { status: 403 }
            );
        }

        // Update user ban status
        const updated = await prisma.user.update({
            where: { id: targetUserId },
            data: {
                isBanned: ban,
                tokenVersion: { increment: 1 }, // Invalidate all sessions
            },
            select: { id: true, email: true, isBanned: true, role: true },
        });

        // Create comprehensive audit log
        await createAuditLog({
            userId: user.id,
            adminRole: user.role,
            action: ban ? "USER_BAN" : "USER_UNBAN",
            targetType: "USER",
            targetId: targetUserId,
            previousState: { isBanned: targetUser.isBanned },
            newState: { isBanned: ban },
            reason: reason || undefined,
            ticketId: ticketId || undefined,
            ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
            userAgent: request.headers.get("user-agent") || undefined,
            metadata: { targetEmail: targetUser.email },
        });

        return NextResponse.json({ user: updated });
    } catch (error) {
        console.error("[Admin Ban User Error]:", error);
        return NextResponse.json({ error: "Failed to update user status" }, { status: 500 });
    }
}
