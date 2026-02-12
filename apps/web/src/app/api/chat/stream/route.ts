import { chatQueue } from "@/lib/queue";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/services/auth/auth";
import { rateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { NextRequest } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/request-validation";
import { errorResponse, rateLimitResponse, successResponse, unauthorizedResponse } from "@/lib/response";
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const user = await verifyAuth(req);
    if (!user) {
      logger.warn('Unauthorized chat request');
      return unauthorizedResponse();
    }
    // const user = { userId: "fe8036b1-afc1-4626-a567-1ebf4ff27f23" };
    // const user = { userId: "fe8036b1-afc1-4626-a567-1ebf4ff27f23" };

    const limit = await rateLimit(req, { limit: 20, window: 60 });
    if (!limit.success) {
      logger.warn('Rate limit exceeded', { userId: user.id });
      return rateLimitResponse();
    }

    const { checkQuota } = await import("@/lib/quota");
    const quota = await checkQuota(user.id);
    if (!quota.allowed) {
      logger.warn('Quota exceeded', { userId: user.id });
      return rateLimitResponse();
    }

    const bodySchema = z.object({
      chatId: z.string().min(1),
      message: z.string().min(1),
      fileId: z.string().optional(),
    });
    const { data, response } = await parseBody(req, bodySchema);
    if (response) return response;

    // Encrypt Message Content (Data Privacy)
    const { encrypt } = await import("@/lib/encryption");
    const encryptedMessage = await encrypt(data.message);

    // Save User Message synchronously
    await prisma.message.create({
      data: {
        chatId: data.chatId,
        role: "USER",
        content: encryptedMessage,
      },
    });

    // Improved idempotency key using content hash
    const idempotencyKey = crypto
      .createHash('sha256')
      .update(`${data.chatId}:${user.id}:${data.message}`)
      .digest('hex')
      .substring(0, 32); // Keep it reasonable length

    const requestId = crypto.randomUUID();

    const job = await chatQueue.add('chat-job', {
      chatId: data.chatId,
      message: data.message,
      fileId: data.fileId,
      userId: user.id,
      requestId,
    }, {
      jobId: idempotencyKey, // Prevents duplicate jobs for same message
      // Let queue default retention settings handle cleanup
      // removeOnComplete: true, 
      removeOnFail: false
    });

    const duration = Date.now() - startTime;
    logger.api('POST', '/api/chat/stream', 200, duration);
    logger.info('Chat job queued', {
      jobId: job.id,
      chatId: data.chatId,
      userId: user.id,
      requestId
    });

    return successResponse({
      jobId: job.id,
      status: 'queued',
      message: "Request queued for processing"
    });

  } catch (err: any) {
    const duration = Date.now() - startTime;
    logger.error('Chat stream error', err, {
      path: '/api/chat/stream',
      duration
    });
    return errorResponse(err.message || "Chat stream failed", { status: 500 });
  }
}
