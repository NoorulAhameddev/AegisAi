/**
 * GET /api/collaboration/[chatId]/presence
 * Get list of users currently active in a chat
 */

import { NextRequest } from "next/server";
import { verifyAuth } from "@/services/auth/auth";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
} from "@/lib/response";
import { logger } from "@/lib/logger";
import { getCollaborationServer } from "@/services/collaboration/websocket";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  const requestId = req.headers.get("x-request-id") || "";

  try {
    const user = await verifyAuth(req);
    if (!user) return unauthorizedResponse({ requestId });

    const { chatId } = await params;

    // Verify user has access to this chat
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        ChatPermission: {
          where: { userId: user.id },
        },
      },
    });

    if (!chat) {
      return errorResponse("Chat not found", { status: 404, requestId });
    }

    const hasAccess = chat.userId === user.id || chat.ChatPermission.length > 0;
    if (!hasAccess) {
      return forbiddenResponse({ requestId });
    }

    // Get presence data from WebSocket server
    const collaborationServer = getCollaborationServer();
    const presenceList = collaborationServer?.getPresence(chatId) || [];

    // Enrich with user data
    const enriched = await Promise.all(
      presenceList.map(async (p) => {
        const userData = await prisma.user.findUnique({
          where: { id: p.userId },
          select: { name: true, email: true },
        });

        return {
          userId: p.userId,
          userName: userData?.name || p.userName,
          cursor: p.cursor,
          lastSeen: p.lastSeen,
          isActive: Date.now() - p.lastSeen < 30000, // Active if seen in last 30 seconds
        };
      }),
    );

    return successResponse(
      {
        chatId,
        presence: enriched,
        activeCount: enriched.filter((p) => p.isActive).length,
        totalCount: enriched.length,
      },
      { requestId },
    );
  } catch (error) {
    logger.error("Failed to get presence", error as Error, { requestId });
    return errorResponse("Failed to get presence", { status: 500, requestId });
  }
}
