import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/services/auth/auth";
import { errorResponse, successResponse, unauthorizedResponse } from "@/lib/response";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
    const auth = await verifyAuth(req);
    if (!auth) return unauthorizedResponse();

    const user = await prisma.user.findUnique({
        where: { id: auth.id },
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true
        }
    });

    if (!user) return errorResponse("User not found", { status: 404 });

    try {
        return successResponse(user);
    } catch (error) {
        logger.error("Auth me failed", error as Error);
        return errorResponse("Failed to fetch user", { status: 500 });
    }
}
