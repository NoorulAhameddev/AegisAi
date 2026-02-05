import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/services/auth/auth";
import { parseBody } from "@/lib/request-validation";
import { errorResponse, successResponse, unauthorizedResponse } from "@/lib/response";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
    const user = await verifyAuth(req);
    if (!user) return unauthorizedResponse();

    const bodySchema = z.object({ title: z.string().optional() });
    const { data, response } = await parseBody(req, bodySchema);
    if (response) return response;

    try {
        const chat = await prisma.chat.create({
            data: {
                userId: user.id,
                title: data.title || "New Conversation",
            },
        });

        // Audit (Silent fail is ok for logs)
        prisma.auditLog.create({
            data: {
                userId: user.id,
                action: `CHAT_CREATE:${chat.id}`,
            },
        }).catch(() => { });

        return successResponse({ chatId: chat.id });
    } catch (error) {
        logger.error("Chat create failed", error as Error, { userId: user.id });
        return errorResponse("Failed to create chat", { status: 500 });
    }
}
