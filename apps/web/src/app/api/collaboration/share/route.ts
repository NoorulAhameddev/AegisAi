/**
 * POST /api/collaboration/share
 * Share a chat with another user or generate public share link
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
import { randomBytes } from "crypto";
import { z } from "zod";

const shareSchema = z.object({
  chatId: z.string().uuid("Invalid chat ID format"),
  emails: z
    .array(z.string().email())
    .max(50, "Maximum 50 emails allowed")
    .optional(),
  role: z.enum(["VIEWER", "EDITOR", "ADMIN"]).default("VIEWER"),
  message: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") || "";

  try {
    const user = await verifyAuth(req);
    if (!user) return unauthorizedResponse({ requestId });

    const body = await req.json();

    // Validate input
    const validation = shareSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.errors.map(
        (e) => `${e.path.join(".")}: ${e.message}`,
      );
      return errorResponse(`Validation failed: ${errors.join(", ")}`, {
        status: 400,
        requestId,
      });
    }

    const { chatId, emails, role, message } = validation.data;

    // Verify user owns the chat or has ADMIN role
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

    const isOwner = chat.userId === user.id;
    const isAdmin = chat.ChatPermission.some(
      (p) => p.userId === user.id && (p.role === "ADMIN" || p.role === "OWNER"),
    );

    if (!isOwner && !isAdmin) {
      return forbiddenResponse({
        requestId,
        message: "Only chat owner or admins can share",
      });
    }

    // Mark chat as shared
    if (!chat.isShared) {
      await prisma.chat.update({
        where: { id: chatId },
        data: { isShared: true },
      });
    }

    // If no emails provided, generate public share link
    if (!emails || emails.length === 0) {
      const shareToken = randomBytes(32).toString("hex");
      await prisma.chat.update({
        where: { id: chatId },
        data: { shareToken },
      });

      const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/chat/${chatId}/join?token=${shareToken}`;

      logger.info("Public share link generated", {
        chatId,
        userId: user.id,
        requestId,
      });

      return successResponse(
        {
          shareUrl,
          shareToken,
          message: "Public share link created",
        },
        { requestId },
      );
    }

    // Send invitations to specific users
    const invitations = [];
    for (const email of emails) {
      try {
        // Check if user exists
        const invitee = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
        });

        if (invitee) {
          // User exists, create permission directly (or send notification)
          const existing = await prisma.chatPermission.findUnique({
            where: {
              chatId_userId: {
                chatId,
                userId: invitee.id,
              },
            },
          });

          if (!existing) {
            await prisma.chatPermission.create({
              data: {
                chatId,
                userId: invitee.id,
                role: role as any,
                invitedBy: user.id,
              },
            });

            invitations.push({
              email,
              status: "granted",
              userId: invitee.id,
            });
          } else {
            invitations.push({
              email,
              status: "already_has_access",
            });
          }
        } else {
          // User doesn't exist, create pending invitation
          const existing = await prisma.chatInvitation.findUnique({
            where: {
              chatId_inviteeEmail: {
                chatId,
                inviteeEmail: email.toLowerCase(),
              },
            },
          });

          if (!existing || existing.status === "declined") {
            await prisma.chatInvitation.create({
              data: {
                chatId,
                inviterId: user.id,
                inviteeEmail: email.toLowerCase(),
                message,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
              },
            });

            invitations.push({
              email,
              status: "invitation_sent",
            });
          } else {
            invitations.push({
              email,
              status: "invitation_pending",
            });
          }
        }

        // Log activity
        await prisma.chatActivity.create({
          data: {
            chatId,
            userId: user.id,
            action: "invited_user",
            metadata: { email, role },
          },
        });
      } catch (error) {
        logger.error("Failed to invite user", error as Error, {
          email,
          chatId,
        });
        invitations.push({
          email,
          status: "error",
          error: "Failed to send invitation",
        });
      }
    }

    logger.info("Chat shared with users", {
      chatId,
      userId: user.id,
      count: emails.length,
      requestId,
    });

    return successResponse(
      {
        invitations,
        totalInvited: invitations.filter(
          (i) => i.status === "granted" || i.status === "invitation_sent",
        ).length,
      },
      { requestId },
    );
  } catch (error) {
    logger.error("Failed to share chat", error as Error, { requestId });
    return errorResponse("Failed to share chat", { status: 500, requestId });
  }
}
