import { openai } from "@/lib/openai";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("auth_access")?.value;
  if (!token) return new Response("Unauthorized", { status: 401 });

  let payload: any;
  try {
    payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!);
  } catch (e) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { chatId, message } = await req.json();

  if (!chatId || !message) {
    return new Response("Missing chatId or message", { status: 400 });
  }

  await prisma.message.create({
    data: {
      chatId,
      role: "USER",
      content: message,
    },
  });

  const history = await prisma.message.findMany({
    where: { chatId },
    orderBy: { createdAt: "asc" },
  });

  // File Context Injection
  const files = await prisma.file.findMany({
    where: { userId: payload.userId },
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  const fileContext = files.map((f: any) => f.content).join("\n").slice(0, 12000);

  const messages: any[] = history.map((m: any) => ({
    role: m.role.toLowerCase(),
    content: m.content,
  }));

  if (fileContext) {
    messages.unshift({
      role: "system",
      content: "Use this document context if relevant:\n" + fileContext,
    });
  }

  // Diagnostic Log
  console.log(`[DEBUG] Streaming ChatId: ${chatId}, User: ${payload.userId}`);
  console.log(`[DEBUG] Messages count: ${messages.length}`);

  let stream;
  try {
    stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      stream: true,
      messages: messages,
    });
    console.log("[DEBUG] OpenAI Stream initiated successfully");
  } catch (error: any) {
    console.error("[ERROR] OpenAI call failed:", error.message || error);
    return new Response(JSON.stringify({
      error: "OpenAI API Error",
      details: error.message
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  const encoder = new TextEncoder();
  let assistantText = "";

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          // Standard Chat Completion Chunk Parsing
          const token = chunk.choices[0]?.delta?.content;

          if (token) {
            assistantText += token;
            controller.enqueue(encoder.encode(token));
          }
        }
        console.log(`[DEBUG] Stream completed. Length: ${assistantText.length}`);
      } catch (e: any) {
        console.error("[ERROR] Stream reading error:", e.message || e);
      }

      // Save to database
      try {
        await prisma.message.create({
          data: {
            chatId,
            role: "ASSISTANT",
            content: assistantText,
          },
        });

        await prisma.usageMetric.create({
          data: {
            userId: payload.userId,
            tokens: assistantText.length,
          },
        });
      } catch (dbErr) {
        console.error("[ERROR] Post-stream DB save failed:", dbErr);
      }

      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
