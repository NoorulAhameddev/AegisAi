import { NextRequest } from "next/server";
import { verifyAuth } from "@/services/auth/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse, unauthorizedResponse, notFoundResponse, badRequestResponse } from "@/lib/response";

export async function POST(req: NextRequest) {
  try {
    const user = await verifyAuth(req);
    if (!user) return unauthorizedResponse();

    const body = await req.json().catch(() => null);
    const chatId: string | undefined = body?.chatId;

    if (!chatId) {
      return badRequestResponse("Missing required field: chatId");
    }

    // Verify chat ownership
    const chat = await prisma.chat.findFirst({
      where: { id: chatId, userId: user.id },
      select: { id: true },
    });

    if (!chat) {
      return notFoundResponse();
    }

    // Delete messages first due to FK constraints, then the chat
    await prisma.message.deleteMany({ where: { chatId } });
    await prisma.chat.delete({ where: { id: chatId } });

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
