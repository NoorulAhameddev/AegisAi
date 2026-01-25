/**
 * SSE Streaming Chat API
 * Real-time streaming responses using Server-Sent Events
 */

import { NextRequest } from "next/server";
import { verifyAuth } from "@/services/auth/auth";
import { openai } from "@/services/ai/openai";
import { prisma } from "@/lib/prisma";
import { retrieveContext } from "@/lib/rag-retrieval";

export async function POST(req: NextRequest) {
    try {
        const authResult = await verifyAuth(req);
        if (!authResult) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { "Content-Type": "application/json" },
            });
        }

        const body = await req.json();
        const { chatId, message, projectId } = body;

        if (!chatId || !message) {
            return new Response(JSON.stringify({ error: "Missing chatId or message" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        const userId = authResult.id;

        // Verify chat ownership
        const chat = await prisma.chat.findFirst({
            where: { id: chatId, userId },
            include: { Message: { orderBy: { createdAt: "asc" }, take: 20 } },
        });

        if (!chat) {
            return new Response(JSON.stringify({ error: "Chat not found" }), {
                status: 404,
                headers: { "Content-Type": "application/json" },
            });
        }

        // Save user message
        await prisma.message.create({
            data: {
                chatId,
                role: "USER",
                content: message,
            },
        });

        // Create SSE stream
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    // Retrieve RAG context
                    let ragContext = "";
                    let sources: string[] = [];

                    try {
                        const ragResult = await retrieveContext(message, userId);
                        if (ragResult.context && ragResult.context.length > 0) {
                            ragContext = ragResult.context;
                            sources = Array.from(ragResult.sources);
                        }
                    } catch (ragError) {
                        console.error("RAG retrieval error:", ragError);
                    }

                    // Build conversation history
                    const conversationMessages = chat.Message.map((msg: any) => ({
                        role: msg.role.toLowerCase() as "user" | "assistant",
                        content: msg.content,
                    }));

                    // Add current message with RAG context
                    const systemPrompt = ragContext
                        ? `You are a helpful AI assistant. Use the following context to answer the user's question:\n\n${ragContext}`
                        : "You are a helpful AI assistant.";

                    conversationMessages.push({ role: "user", content: message });

                    // Stream response from OpenAI
                    const completion = await openai.chat.completions.create({
                        model: "openai/gpt-4o-mini",
                        messages: [
                            { role: "system", content: systemPrompt },
                            ...conversationMessages,
                        ],
                        stream: true,
                        temperature: 0.7,
                    });

                    let fullResponse = "";

                    for await (const chunk of completion) {
                        const content = chunk.choices[0]?.delta?.content || "";
                        if (content) {
                            fullResponse += content;
                            // Send SSE event
                            const data = JSON.stringify({ content, done: false });
                            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                        }
                    }

                    // Save assistant message
                    await prisma.message.create({
                        data: {
                            chatId,
                            role: "ASSISTANT",
                            content: fullResponse,
                            sources: sources.length > 0 ? sources : undefined,
                        },
                    });

                    // Send completion event
                    const finalData = JSON.stringify({
                        content: "",
                        done: true,
                        sources,
                    });
                    controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
                    controller.close();
                } catch (error) {
                    console.error("SSE stream error:", error);
                    const errorData = JSON.stringify({
                        error: error instanceof Error ? error.message : "Stream failed",
                    });
                    controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
                    controller.close();
                }
            },
        });

        return new Response(stream, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
            },
        });
    } catch (error) {
        console.error("SSE endpoint error:", error);
        return new Response(JSON.stringify({ error: "Internal server error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
