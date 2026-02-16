import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/services/auth/auth";
import { parseBody } from "@/lib/request-validation";
import { errorResponse, forbiddenResponse, successResponse, unauthorizedResponse } from "@/lib/response";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
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
        role: z.enum(["ADMIN", "USER"]),
    });
    const { data, response } = await parseBody(req, bodySchema);
    if (response) return response;

    try {
        const updated = await prisma.user.update({
            where: { id },
            data: { role: data.role }
        });
        return successResponse(updated);
    } catch (e) {
        logger.error("Admin update role failed", e as Error, { adminId: user.id, targetUserId: id });
        return errorResponse("Failed to update", { status: 500 });
    }
}
