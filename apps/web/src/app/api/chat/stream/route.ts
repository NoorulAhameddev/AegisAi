import { chatQueue, checkQueueBackpressure } from "@/lib/queue";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/services/auth/auth";
import { rateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { NextRequest } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/request-validation";
import {
  errorResponse,
  rateLimitResponse,
  successResponse,
  unauthorizedResponse,
  notFoundResponse,
} from "@/lib/response";
import { withMetrics } from "@/lib/middleware/metrics-middleware";
import { addJobWithFallback } from "@/lib/queue-operations";
import crypto from "crypto";

const handler = async (req: NextRequest) => {
  const startTime = Date.now();

  try {
    const user = await verifyAuth(req);
    if (!user) {
      logger.warn("Unauthorized chat request");
      return unauthorizedResponse();
    }

    const limit = await rateLimit(req, { limit: 20, window: 60 });
    if (!limit.success) {
      logger.warn("Rate limit exceeded", { userId: user.id });
      return rateLimitResponse();
    }

    const { checkQuota } = await import("@/lib/quota");
    const quota = await checkQuota(user.id);
    if (!quota.allowed) {
      logger.warn("Quota exceeded", { userId: user.id });
      return rateLimitResponse();
    }

    const bodySchema = z.object({
      chatId: z.string().min(1),
      message: z.string().min(1),
      fileId: z.string().optional(),
    });
    const { data, response } = await parseBody(req, bodySchema);
    if (response) return response;

    // Check queue backpressure before enqueueing
    const backpressure = await checkQueueBackpressure(chatQueue, "chat");
    if (!backpressure.allowed) {
      logger.warn("Queue backpressure triggered, rejecting request", {
        userId: user.id,
        queueDepth: backpressure.depth,
      });
      return errorResponse(backpressure.message || "System overloaded", {
        status: 503,
      });
    }

    // Verify chat ownership and not deleted
    const chat = await prisma.chat.findFirst({
      where: { id: data.chatId, userId: user.id, deletedAt: null },
      select: { id: true },
    });
    if (!chat) {
      return notFoundResponse();
    }

    // Encrypt Message Content (Data Privacy)
    const { encrypt } = await import("@/lib/encryption");
    const encryptedMessage = await encrypt(data.message);
    const messageHash = crypto
      .createHash("sha256")
      .update(data.message)
      .digest("hex");

    // Skip duplicate user message if recently saved
    const existingUserMessage = await prisma.message.findFirst({
      where: {
        chatId: data.chatId,
        role: "USER",
        contentHash: messageHash,
        deletedAt: null,
        createdAt: { gte: new Date(Date.now() - 60 * 1000) },
      },
      select: { id: true },
    });

    // Save User Message synchronously
    if (!existingUserMessage) {
      await prisma.message.create({
        data: {
          chatId: data.chatId,
          role: "USER",
          content: encryptedMessage,
          contentHash: messageHash,
        },
      });
    }

    // Improved idempotency key using content hash
    const idempotencyKey = crypto
      .createHash("sha256")
      .update(`${data.chatId}:${user.id}:${data.message}`)
      .digest("hex")
      .substring(0, 32); // Keep it reasonable length

    const requestId = crypto.randomUUID();

    const jobId = await addJobWithFallback(
      chatQueue,
      "chat-job",
      idempotencyKey,
      {
        chatId: data.chatId,
        message: data.message,
        fileId: data.fileId,
        userId: user.id,
        requestId,
      },
      {
        jobId: idempotencyKey,
        removeOnFail: false,
      },
    );

    const duration = Date.now() - startTime;
    logger.api("POST", "/api/chat/stream", 200, duration);
    logger.info("Chat job queued", {
      jobId,
      chatId: data.chatId,
      userId: user.id,
      requestId,
    });

    return successResponse({
      jobId,
      status: "queued",
      message: "Request queued for processing",
    });
  } catch (err: any) {
    const duration = Date.now() - startTime;
    logger.error("Chat stream error", err, {
      path: "/api/chat/stream",
      duration,
    });
    return errorResponse(err.message || "Chat stream failed", { status: 500 });
  }
};

export const POST = withMetrics(handler);
