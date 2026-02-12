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

        // CRITICAL: Await audit log to ensure it's created
        try {
            await prisma.auditLog.create({
                data: {
                    userId: user.id,
                    action: `CHAT_CREATE:${chat.id}`,
                },
            });
        } catch (auditError) {
            logger.error("Failed to create audit log for chat", auditError as Error, { userId: user.id, chatId: chat.id });
        }

        return successResponse({ chatId: chat.id });
    } catch (error) {
        logger.error("Chat create failed", error as Error, { userId: user.id });
        return errorResponse("Failed to create chat", { status: 500 });
    }
}
