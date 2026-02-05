import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { z } from "zod";
import { decrypt } from "@/lib/encryption";
import { verifyAuth } from "@/services/auth/auth";
import { logger } from "@/lib/logger";
import { parseQuery } from "@/lib/request-validation";
import { errorResponse, successResponse, unauthorizedResponse } from "@/lib/response";

export async function GET(req: NextRequest) {
    const user = await verifyAuth(req);
    if (!user) return unauthorizedResponse();

    const querySchema = z.object({
        chatId: z.string().min(1),
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(50),
    });

    const { data, response } = parseQuery(new URL(req.url), querySchema);
    if (response) return response;

    const { chatId, page, limit } = data;

    try {
        // Get total count for pagination metadata
        const totalCount = await prisma.message.count({
            where: {
                chatId,
                Chat: { userId: user.id }
            }
        });

        // Fetch paginated messages
        const messages = await prisma.message.findMany({
            where: {
                chatId,
                Chat: { userId: user.id } // Ensure user owns this chat
            },
            orderBy: { createdAt: "asc" },
            skip: (page - 1) * limit,
            take: limit,
        });

        const decryptedMessages = await Promise.all(
            messages.map(async (msg) => {
                try {
                    return {
                        ...msg,
                        content: await decrypt(msg.content),
                        role: msg.role.toLowerCase(),
                    };
                } catch (error) {
                    logger.error("Chat history decrypt failed", error as Error, { messageId: msg.id });
                    return {
                        ...msg,
                        content: "[Decryption Error]",
                        role: msg.role.toLowerCase(),
                    };
                }
            })
        );

        // Return with pagination metadata
        return successResponse({
            messages: decryptedMessages,
            pagination: {
                page,
                limit,
                total: totalCount,
                totalPages: Math.ceil(totalCount / limit),
                hasMore: page * limit < totalCount,
            },
        });
    } catch (error) {
        logger.error("Chat history fetch failed", error as Error);
        return errorResponse("Failed to fetch chat history", { status: 500 });
    }
}
