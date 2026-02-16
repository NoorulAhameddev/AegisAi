import { readPrisma } from "@/lib/read-replicas";
import { NextRequest } from "next/server";
import { verifyAuth } from "@/services/auth/auth";
import { errorResponse, forbiddenResponse, successResponse, unauthorizedResponse } from "@/lib/response";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";

import { requirePermission } from "@/services/auth/rbac";
import { Role } from "@prisma/client";

export async function GET(req: NextRequest) {
    // Rate limiting: 100 req/min for admin operations
    const rateLimitResult = await rateLimit(req, { limit: 100, window: 60 });
    if (!rateLimitResult.success) {
        return errorResponse("Rate limit exceeded", { status: 429 });
    }

    const user = await verifyAuth(req);
    if (!user) return unauthorizedResponse();

    try {
        requirePermission(user.role as Role, "user:read");
    } catch (e) {
        return forbiddenResponse();
    }

    try {
        const users = await readPrisma.user.findMany({
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
