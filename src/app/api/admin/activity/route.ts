import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { verifyAuth } from "@/services/auth/auth";
import { errorResponse, successResponse, unauthorizedResponse } from "@/lib/response";
import { requireAdmin } from "@/services/auth/authorization";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
    try {
        const user = await verifyAuth(req);
        if (!user) return unauthorizedResponse();
        const adminResponse = requireAdmin(user.role);
        if (adminResponse) return adminResponse;

        const activity = await prisma.usageMetric.findMany({
            take: 20,
            orderBy: { createdAt: "desc" },
            include: { User: true }
        });

        return successResponse(activity);
    } catch (error) {
        logger.error("Admin activity failed", error as Error);
        return errorResponse("Failed to fetch activity", { status: 500 });
    }
}
