/**
 * GET /api/collaboration/[chatId]/permissions
 * Get all users with access to a chat
 *
 * PUT /api/collaboration/[chatId]/permissions
 * Update permission role for a user
 *
 * DELETE /api/collaboration/[chatId]/permissions
 * Remove user's access to chat
 */

import { NextRequest } from "next/server";
import { verifyAuth } from "@/services/auth/auth";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
} from "@/lib/response";
import { logger } from "@/lib/logger";

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
    const hasAccess = await verifyUserAccess(user.id, chatId);
    if (!hasAccess) {
      return forbiddenResponse({ requestId });
    }

    // Get all permissions
    const permissions = await prisma.chatPermission.findMany({
      where: { chatId },
      include: {
        Chat: {
          select: {
            userId: true,
            User: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    // Get owner info
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      select: {
        userId: true,
        User: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    const collaborators = permissions.map((p) => ({
      userId: p.userId,
      role: p.role,
      invitedBy: p.invitedBy,
      createdAt: p.createdAt,
    }));

    // Add owner as first collaborator
    if (chat?.User) {
      collaborators.unshift({
        userId: chat.User.id,
        role: "OWNER" as any,
        invitedBy: null,
        createdAt: chat.User.createdAt || new Date(),
      });
    }

    return successResponse({ collaborators }, { requestId });
  } catch (error) {
    logger.error("Failed to get chat permissions", error as Error, {
      requestId,
    });
    return errorResponse("Failed to get permissions", {
      status: 500,
      requestId,
    });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  const requestId = req.headers.get("x-request-id") || "";

  try {
    const user = await verifyAuth(req);
    if (!user) return unauthorizedResponse({ requestId });

    const { chatId } = await params;
    const body = await req.json();
    const { userId: targetUserId, role } = body;

    if (!targetUserId || !role) {
      return errorResponse("User ID and role are required", {
        status: 400,
        requestId,
      });
    }

    // Only owner or admin can change permissions
    const isOwnerOrAdmin = await verifyOwnerOrAdmin(user.id, chatId);
    if (!isOwnerOrAdmin) {
      return forbiddenResponse({
        requestId,
        message: "Only owner or admins can change permissions",
      });
    }

    // Cannot change owner's role
    const chat = await prisma.chat.findUnique({ where: { id: chatId } });
    if (chat?.userId === targetUserId) {
      return errorResponse("Cannot change owner role", {
        status: 400,
        requestId,
      });
    }

    // Update permission
    await prisma.chatPermission.update({
      where: {
        chatId_userId: {
          chatId,
          userId: targetUserId,
        },
      },
      data: { role: role as any },
    });

    // Log activity
    await prisma.chatActivity.create({
      data: {
        chatId,
        userId: user.id,
        action: "changed_role",
        metadata: { targetUserId, newRole: role },
      },
    });

    logger.info("Permission updated", {
      chatId,
      targetUserId,
      role,
      requestId,
    });

    return successResponse(
      { message: "Permission updated", role },
      { requestId },
    );
  } catch (error) {
    logger.error("Failed to update permission", error as Error, { requestId });
    return errorResponse("Failed to update permission", {
      status: 500,
      requestId,
    });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  const requestId = req.headers.get("x-request-id") || "";

  try {
    const user = await verifyAuth(req);
    if (!user) return unauthorizedResponse({ requestId });

    const { chatId } = await params;
    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get("userId");

    if (!targetUserId) {
      return errorResponse("User ID is required", { status: 400, requestId });
    }

    // Verify permissions
    const isOwnerOrAdmin = await verifyOwnerOrAdmin(user.id, chatId);
    if (!isOwnerOrAdmin && user.id !== targetUserId) {
      return forbiddenResponse({
        requestId,
        message: "Cannot remove other users",
      });
    }

    // Cannot remove owner
    const chat = await prisma.chat.findUnique({ where: { id: chatId } });
    if (chat?.userId === targetUserId) {
      return errorResponse("Cannot remove chat owner", {
        status: 400,
        requestId,
      });
    }

    // Remove permission
    await prisma.chatPermission.delete({
      where: {
        chatId_userId: {
          chatId,
          userId: targetUserId,
        },
      },
    });

    // Log activity
    await prisma.chatActivity.create({
      data: {
        chatId,
        userId: user.id,
        action: "removed_user",
        metadata: { targetUserId },
      },
    });

    logger.info("Permission removed", { chatId, targetUserId, requestId });

    return successResponse({ message: "Access removed" }, { requestId });
  } catch (error) {
    logger.error("Failed to remove permission", error as Error, { requestId });
    return errorResponse("Failed to remove access", { status: 500, requestId });
  }
}

/**
 * Helper: Verify user has any access to chat
 */
async function verifyUserAccess(
  userId: string,
  chatId: string,
): Promise<boolean> {
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    include: {
      ChatPermission: {
        where: { userId },
      },
    },
  });

  return chat?.userId === userId || chat?.ChatPermission.length > 0;
}

/**
 * Helper: Verify user is owner or admin
 */
async function verifyOwnerOrAdmin(
  userId: string,
  chatId: string,
): Promise<boolean> {
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    include: {
      ChatPermission: {
        where: { userId },
      },
    },
  });

  const isOwner = chat?.userId === userId;
  const isAdmin = chat?.ChatPermission.some((p) => p.role === "ADMIN");

  return isOwner || isAdmin;
}
