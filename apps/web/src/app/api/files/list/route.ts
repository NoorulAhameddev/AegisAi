import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { verifyAuth } from "@/services/auth/auth";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse, unauthorizedResponse } from "@/lib/response";

export async function GET(req: NextRequest) {
    try {
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
