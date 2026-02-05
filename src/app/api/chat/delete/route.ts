import { NextRequest } from "next/server";
import { verifyAuth } from "@/services/auth/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse, unauthorizedResponse, notFoundResponse, badRequestResponse } from "@/lib/response";
import { z } from "zod";

export async function POST(req: NextRequest) {
  try {
    const user = await verifyAuth(req);
    if (!user) return unauthorizedResponse();

    const body = await req.json().catch(() => null);
    const chatId: string | undefined = body?.chatId;

    if (!chatId) {
      return badRequestResponse("Missing required field: chatId");
    }

    // Validate chatId as UUID
    const uuidSchema = z.string().uuid();
    const validation = uuidSchema.safeParse(chatId);
    if (!validation.success) {
      return badRequestResponse("Invalid chatId format - must be a valid UUID");
    }

    // Verify chat ownership
    const chat = await prisma.chat.findFirst({
      where: { id: chatId, userId: user.id, deletedAt: null }, // Only find non-deleted chats
      select: { id: true },
    });

    if (!chat) {
      return notFoundResponse();
    }

    // Soft delete: Mark chat and all messages as deleted instead of hard delete
    await prisma.$transaction([
      // Soft delete messages in this chat
      prisma.message.updateMany({
        where: { chatId },
        data: { deletedAt: new Date() }
      }),
      // Soft delete the chat itself
      prisma.chat.update({
        where: { id: chatId },
        data: { deletedAt: new Date() }
      })
    ]);

    // Audit log entry
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: `CHAT_DELETE:${chatId}`,
      },
    });

    return successResponse({ deleted: true, chatId });
  } catch (error: any) {
    const message = error?.message || "Unexpected error";
    return errorResponse(message, { status: 500 });
  }
}
