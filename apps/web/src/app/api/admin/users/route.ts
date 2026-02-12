import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { verifyAuth } from "@/services/auth/auth";
import { errorResponse, forbiddenResponse, successResponse, unauthorizedResponse } from "@/lib/response";
import { logger } from "@/lib/logger";

import { requirePermission } from "@/services/auth/rbac";
import { Role } from "@prisma/client";

export async function GET(req: NextRequest) {
    const user = await verifyAuth(req);
    if (!user) return unauthorizedResponse();

    try {
        requirePermission(user.role as Role, "user:read");
    } catch (e) {
        return forbiddenResponse();
    }

    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isBanned: true,
                createdAt: true,
                _count: {
                    select: { Chat: true }
                }
            },
            orderBy: { createdAt: "desc" }
        });

        // Transform to match frontend expectation (lowercase 'chats')
        const formattedUsers = users.map(user => ({
            ...user,
            _count: {
                chats: user._count.Chat
            }
        }));

        return successResponse(formattedUsers);
    } catch (error) {
        logger.error("Admin users fetch failed", error as Error, { adminId: user.id });
        return errorResponse("Internal Server Error", { status: 500 });
    }
}
