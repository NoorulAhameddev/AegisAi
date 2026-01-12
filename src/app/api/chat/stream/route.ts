import { chatQueue } from "@/lib/queue";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      logger.warn('Unauthorized chat request');
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // const user = { userId: "fe8036b1-afc1-4626-a567-1ebf4ff27f23" };
    // const user = { userId: "fe8036b1-afc1-4626-a567-1ebf4ff27f23" };

    const limit = await rateLimit(req, { limit: 20, window: 60 });
    if (!limit.success) {
      logger.warn('Rate limit exceeded', { userId: user.userId });
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const { checkQuota } = await import("@/lib/quota");
    const quota = await checkQuota(user.userId);
    if (!quota.allowed) {
      logger.warn('Quota exceeded', { userId: user.userId });
      return NextResponse.json({ error: "Daily token limit exceeded." }, { status: 429 });
    }

    const body = await req.json();
    const { chatId, message, fileId } = body;

    if (!chatId || !message) {
      return NextResponse.json({ error: "Missing chatId or message" }, { status: 400 });
    }

    // Encrypt Message Content (Data Privacy)
    const { encrypt } = await import("@/lib/encryption");
    const encryptedMessage = encrypt(message);

    // Save User Message synchronously
    await prisma.message.create({
      data: {
        chatId,
        role: "USER",
        content: encryptedMessage,
      },
    });

    // Improved idempotency key using content hash
    const idempotencyKey = crypto
      .createHash('sha256')
      .update(`${chatId}:${user.userId}:${message}`)
      .digest('hex')
      .substring(0, 32); // Keep it reasonable length

    const requestId = crypto.randomUUID();

    const job = await chatQueue.add('chat-job', {
      chatId,
      message,
      fileId,
      userId: user.userId,
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
      chatId,
      userId: user.userId,
      requestId
    });

    return NextResponse.json({
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
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
