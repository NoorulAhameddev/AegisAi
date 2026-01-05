import { chatQueue } from "@/lib/queue";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";
import fs from 'fs';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const limit = await rateLimit(req, { limit: 20, window: 60 });
    if (!limit.success) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const { checkQuota } = await import("@/lib/quota");
    const quota = await checkQuota(user.userId);
    if (!quota.allowed) {
      return NextResponse.json({ error: "Daily token limit exceeded." }, { status: 429 });
    }

    const body = await req.json();
    const { chatId, message, fileId } = body;

    if (!chatId || !message) {
      return NextResponse.json({ error: "Missing chatId or message" }, { status: 400 });
    }

    // Log to file
    fs.appendFileSync('server_debug.log', `[REQ] ${new Date().toISOString()} ChatId: ${chatId} Job Queued\n`);

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

    // Enqueue Job with Deterministic ID for Idempotency
    const idempotencyKey = `${chatId}-${user.userId}-${Date.now().toString().slice(0, -3)}`; // Simple dedup within same second, or use message hash
    // Better: Hash(chatId + message + userId) to allow strict dedup if retried immediately
    // For now, let's keep it simple but safe against double-click submit

    const job = await chatQueue.add('chat-job', {
      chatId,
      message,
      fileId,
      userId: user.userId,
      requestId: crypto.randomUUID(), // Traceability across systems
    }, {
      jobId: idempotencyKey, // Prevents multiple jobs with same ID
      removeOnComplete: true,
      removeOnFail: false
    });

    return NextResponse.json({
      jobId: job.id,
      status: 'queued',
      message: "Request queued for processing"
    });

  } catch (err: any) {
    console.error("[API Error]", err);
    fs.appendFileSync('server_debug.log', `[API ERROR] ${err.message}\n`);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

