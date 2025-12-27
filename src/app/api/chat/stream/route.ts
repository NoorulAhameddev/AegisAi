import { openai } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { buildPrompt } from "@/lib/prompt";

export async function POST(req: Request) {
  const { conversationId, message } = await req.json();

  if (!conversationId || !message) {
    return new Response("Invalid input", { status: 400 });
  }

  await prisma.message.create({
    data: {
      conversationId,
      role: "USER",
      content: message,
    },
  });

  const history = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
  });

  const prompt = buildPrompt(history as any);

  const stream = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL!,
    messages: prompt,
    stream: true,
  });

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content;
          if (delta) {
            controller.enqueue(encoder.encode(`data: ${delta}\n\n`));
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        controller.error(err);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
