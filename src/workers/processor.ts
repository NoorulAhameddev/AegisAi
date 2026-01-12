import { prisma } from '../lib/prisma';
import fs from 'fs';
import { openai } from '../lib/openai';
import { Job } from 'bullmq';
import { validateInput, detectLeaks } from '../lib/security';
import { buildPrompt, buildSystemPrompt } from '../lib/prompt';

export async function processChatJob(job: Job) {
    const { chatId, message, fileId, userId, requestId } = job.data;

    const logPrefix = `[Worker] [Req:${requestId || 'N/A'}] [Job:${job.id}]`;
    console.log(`${logPrefix} ====== JOB STARTED ======`);
    console.log(`${logPrefix} Chat ID: ${chatId}`);
    console.log(`${logPrefix} User ID: ${userId}`);
    console.log(`${logPrefix} Message: "${message.substring(0, 50)}..."`);
    console.log(`${logPrefix} Processing Chat: ${chatId}`);

    // 0. Security Input Validation (Regex)
    const validation = validateInput(message);
    if (!validation.valid) {
        console.warn(`${logPrefix} REJECTED (Regex): ${validation.error}`);
        return { status: 'failed', error: validation.error };
    }

    console.log(`${logPrefix} ✓ Passed regex validation`);

    // 0.1 AI Sentinel Check (Intent Classification)
    try {
        const { checkIntent } = await import("../lib/security-agent");
        console.log(`${logPrefix} Running security-agent intent check...`);
        const securityCheck = await checkIntent(message);
        console.log(`${logPrefix} Security check result: valid=${securityCheck.valid}, intent=${securityCheck.intent}`);

        if (!securityCheck.valid) {
            console.warn(`${logPrefix} REJECTED (Sentinel): ${securityCheck.intent} - ${securityCheck.reason}`);

            await prisma.auditLog.create({
                data: {
                    userId: userId,
                    action: `SECURITY_BLOCK: ${securityCheck.intent} | ${securityCheck.reason}`,
                }
            });

            return {
                status: 'completed',
                content: `🔒 Request blocked by security policy. \nReason: ${securityCheck.reason}`,
                chatId
            };
        }
        console.log(`${logPrefix} ✓ Passed security agent check`);
    } catch (e) {
        console.error(`${logPrefix} SENTINEL CRASHED:`, e);
        return { status: 'failed', error: "Security system malfunction." };
    }

    try {
        // 0.5 Ingest User Message into Vector Store
        try {
            const { addDocument, searchSimilar } = await import("../lib/vector-store");
            await addDocument(message, { role: "user", chatId, fileId }, userId);

            // 0.6 RAG Retrieval
            // Logic for context retrieval could be extracted further if needed
        } catch (e) {
            console.error("[Worker] RAG Error:", e);
        }

        // 1. Fetch System Prompt
        const systemPrompt = await buildSystemPrompt(userId);

        // 2. Fetch Chat History
        const allMessages = await prisma.message.findMany({
            where: { chatId: chatId },
            orderBy: { createdAt: "asc" },
            take: 10,
        });

        // Decrypt messages before processing
        const { decrypt } = await import("../lib/encryption");
        const decryptedMessages = allMessages.map(msg => ({
            ...msg,
            content: decrypt(msg.content)
        }));

        // RAG Context Injection
        let ragContext = "";
        try {
            const { searchSimilar } = await import("../lib/vector-store");
            const docs = await searchSimilar(message, userId, 5);
            if (docs.length > 0) {
                ragContext = "RELEVANT CONTEXT:\n" + docs.map(d => `- ${d.text}`).join("\n");
            }
        } catch (e) {
            console.warn(`${logPrefix} RAG retrieval failed (non-blocking):`, e);
            // Continue without RAG context - not fatal
        }

        const finalSystemPrompt = ragContext ? `${systemPrompt}\n\n${ragContext}` : systemPrompt;

        let formattedMessages: any[] = [
            { role: "system", content: finalSystemPrompt },
            ...buildPrompt(decryptedMessages)
        ];

        // 3. File Injection (if applicable)
        if (fileId) {
            try {
                const fileRecord = await prisma.file.findUnique({ where: { id: fileId } });
                if (fileRecord && fileRecord.path && fs.existsSync(fileRecord.path)) {
                    if (fileRecord.type.startsWith("image/")) {
                        const fileBuffer = fs.readFileSync(fileRecord.path);
                        const base64Image = fileBuffer.toString('base64');
                        const dataUrl = `data:${fileRecord.type};base64,${base64Image}`;

                        const lastMsgIndex = formattedMessages.length - 1;
                        if (lastMsgIndex >= 0 && formattedMessages[lastMsgIndex].role === 'user') {
                            formattedMessages[lastMsgIndex] = {
                                role: "user",
                                content: [
                                    { type: "text", text: message },
                                    { type: "image_url", image_url: { url: dataUrl } }
                                ]
                            };
                            console.log(`[Worker] Injected image from ${fileRecord.path}`);
                        }
                    }
                }
            } catch (e) {
                console.error("Failed to inject image:", e);
            }
        }

        // ✅ USE CENTRALIZED OPENAI CLIENT (NOT RAW KEY)
        console.log(`${logPrefix} Preparing AI call with GPT-4o-mini...`);

        // 4. Define Tools (Dynamic)
        const { getOpenAITools, toolsRegistry } = await import("../tools/index");
        const tools = getOpenAITools();

        // 5. First AI Call
        console.log(`${logPrefix} Calling OpenAI API...`);
        let response: any;
        let responseMessage: any;
        let finalContent = "";
        
        try {
            response = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: formattedMessages,
                tools: tools,
                tool_choice: "auto",
            });

            console.log(`${logPrefix} ✓ OpenAI API responded: ${response.choices[0].message.content?.substring(0, 50) || '(tool call)'}...`);
            responseMessage = response.choices[0].message;
            finalContent = responseMessage.content || "";
        } catch (e: any) {
            // Handle OpenAI errors (429, 500, timeout, etc)
            const errorMessage = e.message || String(e);
            const errorStatus = e.status || e.code;
            
            console.error(`${logPrefix} OpenAI API FAILED:`, {
                status: errorStatus,
                message: errorMessage,
                type: e.constructor.name
            });
            
            // Return explicit error to user
            if (errorStatus === 429) {
                console.error(`${logPrefix} RATE LIMIT HIT - OpenAI API throttling`);
                return { 
                    status: 'failed', 
                    error: 'OpenAI API rate limited. Please wait a moment and try again.',
                    rateLimited: true,
                    chatId 
                };
            } else if (errorStatus === 401 || errorStatus === 403) {
                console.error(`${logPrefix} AUTHENTICATION FAILED - Invalid API key`);
                return { 
                    status: 'failed', 
                    error: 'Authentication failed with AI provider.',
                    chatId 
                };
            } else if (errorStatus >= 500) {
                console.error(`${logPrefix} AI PROVIDER ERROR - Server error`);
                return { 
                    status: 'failed', 
                    error: 'AI provider is experiencing issues. Please try again shortly.',
                    chatId 
                };
            } else {
                console.error(`${logPrefix} UNKNOWN AI ERROR`);
                throw e; // Re-throw for BullMQ to handle as job failure
            }
        }

        // 6. Handle Tool Calls
        if (responseMessage.tool_calls) {
            formattedMessages.push(responseMessage); // Add assistant's intent

            for (const toolCall of responseMessage.tool_calls) {
                const toolName = (toolCall as any).function.name;
                const tool = toolsRegistry.get(toolName);

                if (tool) {
                    console.log(`[Worker] Executing Tool: ${toolName}`);
                    try {
                        const args = JSON.parse((toolCall as any).function.arguments);
                        const result = await tool.execute(args);

                        formattedMessages.push({
                            role: "tool",
                            tool_call_id: toolCall.id,
                            content: typeof result === 'string' ? result : JSON.stringify(result)
                        });
                    } catch (e: any) {
                        formattedMessages.push({
                            role: "tool",
                            tool_call_id: toolCall.id,
                            content: `Error executing tool: ${e.message}`
                        });
                    }
                } else {
                    formattedMessages.push({
                        role: "tool",
                        tool_call_id: toolCall.id,
                        content: `Error: Tool ${toolName} not found`
                    });
                }
            }

            // Second Call (Final Answer)
            try {
                console.log(`${logPrefix} Calling OpenAI API for final answer (tool result)...`);
                const secondResponse = await openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages: formattedMessages,
                });
                finalContent = secondResponse.choices[0].message.content || "";
                console.log(`${logPrefix} ✓ Final answer received`);
            } catch (e: any) {
                const errorStatus = e.status || e.code;
                console.error(`${logPrefix} Second OpenAI call FAILED:`, { status: errorStatus, message: e.message });
                
                if (errorStatus === 429) {
                    return { 
                        status: 'failed', 
                        error: 'OpenAI API rate limited during processing. Please try again.',
                        rateLimited: true,
                        chatId 
                    };
                }
                throw e;
            }
        }

        // 7. Security Output Validation
        if (detectLeaks(finalContent)) {
            console.error(`[Security] Data Leak Detected in Job ${job.id}`);
            finalContent = "[REDACTED] The response contained sensitive information and was blocked by security policy.";
        }

        // 8. Save Assistant Response to DB
        const { encrypt } = await import("../lib/encryption");
        const encryptedResponse = encrypt(finalContent);

        await prisma.message.create({
            data: {
                chatId,
                role: "ASSISTANT",
                content: encryptedResponse
            }
        });

        // Update chat title from first message if not set
        const chat = await prisma.chat.findUnique({
            where: { id: chatId },
            select: { title: true }
        });

        if (!chat?.title || chat.title === "New Conversation") {
            // Use first 50 chars of user message as title
            const title = message.substring(0, 50) + (message.length > 50 ? "..." : "");
            await prisma.chat.update({
                where: { id: chatId },
                data: { title }
            });
        }

        // Save usage
        if (userId) {
            await prisma.usageMetric.create({
                data: { userId, tokens: response.usage?.total_tokens || 0 }
            });
        }

        console.log(`[Worker] Job ${job.id} COMPLETED.`);
        return { status: 'completed', content: finalContent, chatId };

    } catch (err: any) {
        console.error(`[Worker] Job ${job.id} FAILED:`, err);
        throw err;
    }
}
