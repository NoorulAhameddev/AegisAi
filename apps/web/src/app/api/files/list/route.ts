import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { verifyAuth } from "@/services/auth/auth";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse, unauthorizedResponse } from "@/lib/response";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
    try {
        // Rate limiting: 30 list requests per minute
        const rateLimitResult = await rateLimit(req, { limit: 30, window: 60 });
        if (!rateLimitResult.success) {
            return errorResponse("Rate limit exceeded", { status: 429 });
        }

        const user = await verifyAuth(req);
        if (!user) return unauthorizedResponse();

        const files = await prisma.file.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: "desc" }
        });
        return successResponse(files);
    } catch (error) {
        logger.error("Files list fetch failed", error as Error);
        return errorResponse("Failed to fetch files", { status: 500 });
    }
}
