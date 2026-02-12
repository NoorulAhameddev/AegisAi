import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/services/auth/auth";
import { changePasswordSchema } from "@/lib/validations";
import { parseBody } from "@/lib/request-validation";
import { errorResponse, successResponse, unauthorizedResponse } from "@/lib/response";
import { comparePassword } from "@/services/auth/auth";
import { logger } from "@/lib/logger";
import { createAuditLog } from "@/lib/audit";

/**
 * DELETE /api/user/delete-account
 * GDPR Compliance: Allows user to request complete account deletion
 * Requires password confirmation for security
 */
export async function POST(req: NextRequest) {
    const user = await verifyAuth(req);
    if (!user) return unauthorizedResponse();

    try {
        // Require password confirmation for security
        const bodySchema = changePasswordSchema.pick({ currentPassword: true });
        const { data, response } = await parseBody(req, bodySchema);
        if (response) return response;

        const { currentPassword } = data;

        // Verify password before deletion
        const userRecord = await prisma.user.findUnique({ where: { id: user.id } });
        if (!userRecord) return errorResponse("User not found", { status: 404 });

        const valid = await comparePassword(currentPassword, userRecord.password);
        if (!valid) {
            return errorResponse("Incorrect password", { status: 400 });
        }

        // CRITICAL: Delete all user data in transaction for GDPR compliance
        // This cascades to all related records due to schema OnDelete: Cascade
        await prisma.$transaction([
            // Create audit log BEFORE deletion
            prisma.auditLog.create({
                data: {
                    userId: user.id,
                    adminRole: user.role,
                    action: "ACCOUNT_DELETION_REQUESTED",
                    targetType: "USER",
                    targetId: user.id,
                    metadata: { email: userRecord.email, reason: "User-initiated GDPR deletion" },
                }
            }),
            // Then delete the user (cascades to all related records)
            prisma.user.delete({ where: { id: user.id } }),
        ]);

        logger.security('User account deleted', { userId: user.id, email: userRecord.email });

        return successResponse({
            message: "Account deleted successfully. All personal data has been removed.",
        }, { status: 200 });
    } catch (error) {
        logger.error('Account deletion failed', error as Error, { userId: user.id });
        return errorResponse("Failed to delete account", { status: 500 });
    }
}
