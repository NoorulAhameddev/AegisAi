import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { verifyAuth } from "@/services/auth/auth";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse, unauthorizedResponse } from "@/lib/response";

export async function GET(req: NextRequest) {
    try {
        const user = await verifyAuth(req);
        if (!user) return unauthorizedResponse();

        const chats = await prisma.chat.findMany({
            where: { userId: user.id, deletedAt: null }, // Exclude soft-deleted chats
            orderBy: { createdAt: "desc" },
            take: 20,
            select: {
                id: true,
                title: true,
                createdAt: true,
                updatedAt: true
            }
        });

        // Format for frontend
        const formatted = chats.map(c => ({
            id: c.id,
            title: c.title || "New Conversation",
            createdAt: c.createdAt,
            updatedAt: c.updatedAt
        }));

        return successResponse(formatted);
    } catch (error) {
        logger.error("Chat list fetch failed", error as Error);
        return errorResponse("Failed to fetch chat list", { status: 500 });
    }
}
