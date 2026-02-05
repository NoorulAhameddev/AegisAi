/**
 * SSE Streaming Chat API
 * Real-time streaming responses using Server-Sent Events
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { verifyAuth } from "@/services/auth/auth";
import { openai } from "@/services/ai/openai";
import { prisma } from "@/lib/prisma";
import { retrieveContext } from "@/lib/rag-retrieval";
import { parseBody } from "@/lib/request-validation";
import { badRequestResponse, notFoundResponse, unauthorizedResponse } from "@/lib/response";
import { logger } from "@/lib/logger";
import { decrypt, encrypt } from "@/lib/encryption";

export async function POST(req: NextRequest) {
    try {
        const authResult = await verifyAuth(req);
        if (!authResult) {
            return unauthorizedResponse();
        }

        const bodySchema = z.object({
            chatId: z.string().min(1, "Chat ID is required"),
            message: z.string().min(1, "Message is required"),
            projectId: z.string().optional(),
        }).strict();
        const { data, response } = await parseBody(req, bodySchema);
        if (response) return response;

        const { chatId, message } = data;
        
        if (!chatId || chatId === "undefined") {
            return badRequestResponse("Chat ID is required. Please create a new chat first.");
        }

        const userId = authResult.id;

        // Verify chat ownership
        const chat = await prisma.chat.findFirst({
            where: { id: chatId, userId },
            include: { Message: { orderBy: { createdAt: "asc" }, take: 50 } }, // CRITICAL: Limit to last 50 messages
        });

        if (!chat) {
            return notFoundResponse();
        }

        // Save user message
        const encryptedMessage = await encrypt(message);
        await prisma.message.create({
            data: {
                chatId,
                role: "USER",
                content: encryptedMessage,
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
                        logger.error("RAG retrieval error", ragError as Error, { userId });
                    }

                    // Build conversation history
                    const conversationMessages = await Promise.all(
                        chat.Message.map(async (msg: any) => ({
                            role: msg.role.toLowerCase() as "user" | "assistant",
                            // CRITICAL: Gracefully handle decryption failure per message
                            content: await decrypt(msg.content).catch((err) => {
                                logger.error('Message decryption failed', err as Error, {userId, chatId, msgId: msg.id});
                                return '[Message corrupted - could not decrypt]';
                            }),
                        }))
                    );

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
                    const encryptedResponse = await encrypt(fullResponse);
                    await prisma.message.create({
                        data: {
                            chatId,
                            role: "ASSISTANT",
                            content: encryptedResponse,
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
                    logger.error("SSE stream error", error as Error, { userId, chatId });
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
        logger.error("SSE endpoint error", error as Error);
        return new Response(JSON.stringify({ error: "Internal server error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
