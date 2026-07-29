/**
 * Regenerate Response API
 * Regenerate the last assistant message in a chat
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { verifyAuth } from "@/services/auth/auth";
import { openai } from "@/services/ai/openai";
import { prisma } from "@/lib/prisma";
import { retrieveContext } from "@/lib/rag-retrieval";
import { parseBody } from "@/lib/request-validation";
import {
  errorResponse,
  successResponse,
  unauthorizedResponse,
} from "@/lib/response";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";
import { decrypt, encrypt } from "@/lib/encryption";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    // Rate limiting: 5 regenerations per minute (prevents abuse)
    const rateLimitResult = await rateLimit(req, { limit: 5, window: 60 });
    if (!rateLimitResult.success) {
      return errorResponse("Rate limit exceeded", { status: 429 });
    }

    const authResult = await verifyAuth(req);
    if (!authResult) {
      return unauthorizedResponse();
    }

    const bodySchema = z.object({
      chatId: z.string().min(1),
      projectId: z.string().optional(),
    });
    const { data, response } = await parseBody(req, bodySchema);
    if (response) return response;

    const { chatId } = data;

    const userId = authResult.id;

    // Get chat with messages
    const chat = await prisma.chat.findFirst({
      where: { id: chatId, userId, deletedAt: null },
      include: {
        Message: {
          where: { deletedAt: null },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!chat || chat.Message.length < 2) {
      return errorResponse("Chat not found or insufficient messages", {
        status: 404,
      });
    }

    // Find last assistant message
    const lastAssistantMsgIndex = chat.Message.map((m: any, idx: number) => ({
      msg: m,
      idx,
    }))
      .filter((item: any) => item.msg.role === "ASSISTANT")
      .pop();

    if (!lastAssistantMsgIndex) {
      return errorResponse("No assistant message to regenerate", {
        status: 400,
      });
    }

    // Delete last assistant message
    await prisma.message.delete({
      where: { id: lastAssistantMsgIndex.msg.id },
    });

    // Get last user message
    const lastUserMsg = chat.Message.filter(
      (m: any) => m.role === "USER",
    ).pop();

    if (!lastUserMsg) {
      return errorResponse("No user message found", { status: 400 });
    }

    // Retrieve RAG context
    let ragContext = "";
    let sources: string[] = [];

    try {
      const lastUserContent = await decrypt(lastUserMsg.content).catch(
        () => "",
      );
      const ragResult = await retrieveContext(lastUserContent, userId);
      if (ragResult.context && ragResult.context.length > 0) {
        ragContext = ragResult.context;
        sources = Array.from(ragResult.sources);
      }
    } catch (ragError) {
      logger.error("RAG retrieval error", ragError as Error, { userId });
    }

    // Build conversation (exclude deleted message)
    const conversationMessages = await Promise.all(
      chat.Message.filter(
        (m: any) => m.id !== lastAssistantMsgIndex.msg.id,
      ).map(async (msg: any) => ({
        role: msg.role.toLowerCase() as "user" | "assistant",
        content: await decrypt(msg.content).catch(() => "[Decryption failed]"),
      })),
    );

    const systemPrompt = ragContext
      ? `You are a helpful AI assistant. Use the following context to answer the user's question:\n\n${ragContext}`
      : "You are a helpful AI assistant.";

    // Generate new response
    const completion = await openai.chat.completions.create({
      model: "openai/gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...conversationMessages,
      ],
      temperature: 0.8, // Higher temperature for variation
    });

    const newResponse = completion.choices[0].message.content || "";

    // Save new assistant message
    const encryptedResponse = await encrypt(newResponse);
    const responseHash = crypto
      .createHash("sha256")
      .update(newResponse)
      .digest("hex");
    const newMessage = await prisma.message.create({
      data: {
        chatId,
        role: "ASSISTANT",
        content: encryptedResponse,
        contentHash: responseHash,
      },
    });

    return successResponse({
      message: newMessage,
      tokensUsed: completion.usage?.total_tokens,
    });
  } catch (error) {
    logger.error("Regenerate error", error as Error);
    return errorResponse("Regeneration failed", { status: 500 });
  }
}
