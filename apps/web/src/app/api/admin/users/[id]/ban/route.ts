import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/services/auth/auth";
import { hasAdminPermission, canModifyRole } from "@/services/auth/permissions";
import { createAuditLog } from "@/lib/audit";
import { banUserSchema } from "@/lib/validations";
import { parseBody } from "@/lib/request-validation";
import { errorResponse, forbiddenResponse, successResponse, unauthorizedResponse } from "@/lib/response";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // Rate limiting: 100 req/min for admin operations
        const rateLimitResult = await rateLimit(request, { limit: 100, window: 60 });
        if (!rateLimitResult.success) {
            return errorResponse("Rate limit exceeded", { status: 429 });
        }

        const user = await verifyAuth(request);
        if (!user) {
            return unauthorizedResponse();
        }

        // Check admin permission
        if (!hasAdminPermission(user.role, "IDENTITY_BAN")) {
            return forbiddenResponse();
        }

        const targetUserId = (await params).id;
        const { data, response } = await parseBody(request, banUserSchema);
        if (response) return response;

        const { ban, reason, ticketId } = data;

        // Prevent self-modification
        if (user.id === targetUserId) {
            return errorResponse("Cannot modify your own account", { status: 403 });
        }

        // Get target user to check role hierarchy
        const targetUser = await prisma.user.findUnique({
            where: { id: targetUserId },
            select: { id: true, email: true, role: true, isBanned: true },
        });

        if (!targetUser) {
            return errorResponse("User not found", { status: 404 });
        }

        // Check role hierarchy - cannot ban higher-level admins
        if (!canModifyRole(user.role, targetUser.role)) {
            return forbiddenResponse();
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

        return successResponse({ user: updated });
    } catch (error) {
        logger.error("Admin ban user failed", error as Error);
        return errorResponse("Failed to update user status", { status: 500 });
    }
}
