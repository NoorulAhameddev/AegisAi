import { NextRequest, NextResponse } from "next/server";
import dotenv from "dotenv";

dotenv.config();

import { prisma } from "@/lib/prisma";
import { buildSystemPrompt } from "@/lib/prompt";
import { shouldStoreMemory } from "@/lib/memoryDetector";
import { saveMemory } from "@/lib/memory";
import { openai } from "@/lib/ai";
import OpenAI from "openai";
import { getUserFromRequest } from "@/lib/session";

export async function POST(req: NextRequest) {
  // Use session to get userId reliably
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { conversationId, message } = await req.json();

  if (!conversationId || !message)
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const userId = user.userId;

  // 1. Build system prompt with memory
  const systemPrompt = await buildSystemPrompt(userId);

  // 2. Ensure conversation exists
  let conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        id: conversationId,
        userId,
        title: "New Chat",
      },
    });
  }

  // 3. Add user message to DB
  await prisma.message.create({
    data: {
      conversationId,
      role: "USER",
      content: message,
    },
  });

  // 3. Get recent messages for context
  const recentMessages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    take: 10 // Limit context window
  });

  const conversationHistory = recentMessages.map((m) => ({
    role: m.role.toLowerCase() as "user" | "assistant" | "system",
    content: m.content,
  }));

  // 4. Call OpenAI
  // 4. Call OpenAI
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    // VERY IMPORTANT: If this logs 'undefined', the env var is missing!
    console.log("Debug: API Key present?", !!apiKey);

    if (!apiKey) {
      throw new Error("Missing OPENAI_API_KEY environment variable");
    }

    // Create a local client to ensure we use the latest env var
    const localOpenAI = new OpenAI({
      apiKey: apiKey,
    });

    const completion = await localOpenAI.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        ...conversationHistory
      ],
    });

    const reply = completion.choices[0].message.content || "";

    // 5. Save assistant reply
    await prisma.message.create({
      data: {
        conversationId,
        role: "ASSISTANT",
        content: reply,
      },
    });

    // 6. Memory detection & storage
    const decision = shouldStoreMemory(message);
    if (decision.store && decision.type) {
      await saveMemory(userId, decision.type, message, "user-explicit");
    }

    return NextResponse.json({
      reply,
      usage: completion.usage,
    });
  } catch (error: any) {
    console.error("OpenAI Error:", error);
    const errorMessage = error?.message || "Failed to generate response";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
