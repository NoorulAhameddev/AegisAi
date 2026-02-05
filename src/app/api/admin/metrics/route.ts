import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { verifyAuth } from "@/services/auth/auth";
import { errorResponse, forbiddenResponse, successResponse, unauthorizedResponse } from "@/lib/response";
import { requireAdmin } from "@/services/auth/authorization";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
    try {
        const user = await verifyAuth(req);
        if (!user) return unauthorizedResponse();
        const adminResponse = requireAdmin(user.role);
        if (adminResponse) return adminResponse;

        const users = await prisma.user.count();
        const usage = await prisma.usageMetric.aggregate({
            _sum: { tokens: true },
        });

        return successResponse({
            users,
            totalTokensUsed: usage._sum.tokens || 0,
        });
    } catch (error) {
        logger.error("Admin metrics failed", error as Error);
        return errorResponse("Failed to fetch metrics", { status: 500 });
    }
}
