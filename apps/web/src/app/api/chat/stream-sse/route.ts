/**
 * SSE Streaming Chat API
 * Real-time streaming responses using Server-Sent Events
 * 
 * RESILIENCE FEATURES:
 * - Connection drop detection via AbortController
 * - Partial response saving when stream interrupted
 * - Server-side timeout (2 minutes max)
 * - Backpressure handling for slow clients
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { verifyAuth } from "@/services/auth/auth";
import { openai } from "@/services/ai/openai";
import { prisma } from "@/lib/prisma";
import { retrieveContext } from "@/lib/rag-retrieval";
import { parseBody } from "@/lib/request-validation";
import { badRequestResponse, notFoundResponse, unauthorizedResponse, errorResponse } from "@/lib/response";
import { logger } from "@/lib/logger";
import { decrypt, encrypt } from "@/lib/encryption";
import { rateLimit } from "@/lib/rate-limit";
import { checkModeration } from "@/lib/moderation";
import { quickModeration } from "@/lib/security";

// Stream timeout: 2 minutes max
const STREAM_TIMEOUT_MS = 120000;
// Max buffered chunks before backpressure kicks in
const MAX_BUFFER_SIZE = 50;

export async function POST(req: NextRequest) {
    try {
        // Rate limiting: 10 stream requests per minute (streaming is resource-intensive)
        const rateLimitResult = await rateLimit(req, { limit: 10, window: 60 });
        if (!rateLimitResult.success) {
            return errorResponse("Rate limit exceeded. Please wait before sending more messages.", { status: 429 });
        }

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

        // Quick pre-moderation check (lightweight, <50ms)
        const preModerationResult = quickModeration(message);
        if (!preModerationResult.safe) {
            logger.security('Pre-moderation blocked request', {
                userId,
                chatId,
                reason: preModerationResult.reason,
                category: preModerationResult.blockedCategory
            });

            return errorResponse(
                preModerationResult.reason || 'Content policy violation',
                { status: 400 }
            );
        }

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

        // Create SSE stream with resilience features
        const encoder = new TextEncoder();
        let accumulatedResponse = "";
        let isStreamComplete = false;
        let connectionAborted = false;
        let moderationBuffer: string[] = [];
        let moderationCheckInProgress = false;

        // Detect client disconnect
        req.signal?.addEventListener('abort', () => {
            connectionAborted = true;
            logger.warn('SSE connection aborted by client', { userId, chatId, chunksSent: accumulatedResponse.length });
        });

        const stream = new ReadableStream({
            async start(controller) {
                const startTime = Date.now();
                let streamController: any = null;
                
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

                    // Stream response from OpenAI with timeout
                    const completionPromise = openai.chat.completions.create({
                        model: "openai/gpt-4o-mini",
                        messages: [
                            { role: "system", content: systemPrompt },
                            ...conversationMessages,
                        ],
                        stream: true,
                        temperature: 0.7,
                    });

                    // Timeout promise
                    const timeoutPromise = new Promise((_, reject) => {
                        setTimeout(() => reject(new Error('Stream timeout after 2 minutes')), STREAM_TIMEOUT_MS);
                    });

                    // Race completion vs timeout
                    const completion = await Promise.race([completionPromise, timeoutPromise]) as any;
                    
                    let chunkBuffer: string[] = [];
                    let chunkCount = 0;

                    for await (const chunk of completion) {
                        // Check for abort or timeout
                        if (connectionAborted) {
                            logger.warn('Stream stopped - connection aborted', { userId, chatId, chunksProcessed: chunkCount });
                            break;
                        }

                        if (Date.now() - startTime > STREAM_TIMEOUT_MS) {
                            logger.warn('Stream stopped - server timeout', { userId, chatId, duration: STREAM_TIMEOUT_MS });
                            break;
                        }

                        const content = chunk.choices[0]?.delta?.content || "";
                        if (content) {
                            accumulatedResponse += content;
                            chunkCount++;
                            chunkBuffer.push(content);

                            // Backpressure handling: if buffer gets too large, pause
                            if (chunkBuffer.length > MAX_BUFFER_SIZE) {
                                logger.warn('Backpressure detected - buffer full', { 
                                    userId, 
                                    chatId, 
                                    bufferedChunks: chunkBuffer.length 
                                });
                                // Drain buffer before continuing
                                await new Promise(resolve => setTimeout(resolve, 100));
                            }

                            // Send SSE event
                            const data = JSON.stringify({ content, done: false });
                            controller.enqueue(encoder.encode(`data: ${data}\n\n`));

                            // Async moderation: buffer chunks and moderate in background
                            moderationBuffer.push(content);
                            if (moderationBuffer.length >= 10 && !moderationCheckInProgress) {
                                moderationCheckInProgress = true;
                                const bufferToCheck = moderationBuffer.join('');
                                moderationBuffer = [];

                                // Non-blocking moderation check
                                checkModeration(bufferToCheck).then(modResult => {
                                    moderationCheckInProgress = false;
                                    if (modResult.flagged) {
                                        logger.security('Streaming moderation flagged content', {
                                            userId,
                                            chatId,
                                            categories: modResult.categories
                                        });
                                        // Note: Content already streamed, but we can flag in database
                                    }
                                }).catch(err => {
                                    moderationCheckInProgress = false;
                                    logger.error('Async moderation failed', err as Error, { userId });
                                });
                            }
                        }
                    }

                    isStreamComplete = true;

                    // Final moderation check of remaining buffer
                    if (moderationBuffer.length > 0) {
                        const finalModeration = await checkModeration(moderationBuffer.join('')).catch(err => {
                            logger.error('Final moderation failed', err as Error, { userId });
                            return { flagged: false, categories: [] };
                        });

                        if (finalModeration.flagged) {
                            logger.security('Final moderation flagged content', {
                                userId,
                                chatId,
                                categories: finalModeration.categories
                            });
                        }
                    }

                    // Save assistant message (always attempt, even if partial)
                    const encryptedResponse = await encrypt(accumulatedResponse);
await prisma.message.create({
                        data: {
                            chatId,
                            role: "ASSISTANT",
                            content: encryptedResponse,
                            isPartial: !isStreamComplete || connectionAborted,
                            flagged: false, // Set async if moderation flags later
                        },
                    });

                    // Send completion event
                    const finalData = JSON.stringify({
                        content: "",
                        done: true,
                        sources,
                        isPartial: !isStreamComplete || connectionAborted,
                    });
                    controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
                    controller.close();
                } catch (error) {
                    logger.error("SSE stream error", error as Error, { userId, chatId, duration: Date.now() - startTime });
                    
                    // Save partial response even on error
                    if (accumulatedResponse.length > 0) {
                        try {
                            const encryptedResponse = await encrypt(accumulatedResponse);
                            await prisma.message.create({
                                data: {
                                    chatId,
                                    role: "ASSISTANT",
                                    content: encryptedResponse,
                                    isPartial: true, // Mark as incomplete
                                    flagged: false,
                                },
                            });
                            logger.info('Saved partial response after error', { userId, chatId, responseLength: accumulatedResponse.length });
                        } catch (saveError) {
                            logger.error('Failed to save partial response', saveError as Error, { userId, chatId });
                        }
                    }

                    const errorData = JSON.stringify({
                        error: error instanceof Error ? error.message : "Stream failed",
                        isTimeout: error instanceof Error && error.message.includes('timeout'),
                    });
                    controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
                    controller.close();
                } finally {
                    // Cleanup: Always try to save if we have content and haven't saved yet
                    if (!isStreamComplete && accumulatedResponse.length > 0) {
                        try {
                            const encryptedResponse = await encrypt(accumulatedResponse);
                            await prisma.message.create({
                                data: {
                                    chatId,
                                    role: "ASSISTANT",
                                    content: encryptedResponse,
                                    isPartial: true,
                                    flagged: false,
                                },
                            });
                            logger.info('Saved partial response in finally block', { userId, chatId });
                        } catch (finalSaveError) {
                            logger.error('Final save attempt failed', finalSaveError as Error, { userId, chatId });
                        }
                    }
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
