import { prisma } from '../lib/prisma';
import fs from 'fs';
import { Job } from 'bullmq';
import { validateInput, detectLeaks } from '../lib/security';
import { buildSystemPrompt } from '../services/ai/prompt';
import { createAgent, runAgent } from '../ai/integrations/langchain-agent';

export async function processChatJobLangChain(job: Job) {
    const { chatId, message, fileId, userId, requestId } = job.data;

    const logPrefix = `[Worker-LC] [Req:${requestId || 'N/A'}] [Job:${job.id}]`;
    console.log(`${logPrefix} ====== JOB STARTED (LANGCHAIN) ======`);
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
            const { addDocument } = await import("../lib/vector-store");
            await addDocument(message, { role: "user", chatId, fileId, type: "conversation" }, userId);
            console.log(`${logPrefix} ✓ User message ingested to vector store`);
        } catch (e) {
            console.error(`${logPrefix} Failed to ingest message to vector store (non-blocking):`, e);
        }

        // 1. Fetch System Prompt
        const systemPrompt = await buildSystemPrompt(userId);

        // 🚀 ENHANCED RAG Context Injection
        let ragContext = "";
        let ragSourceCount = 0;
        try {
            const { retrieveContext, shouldUseRAG, formatRAGContext } = await import("../lib/rag-retrieval");
            
            if (shouldUseRAG(message)) {
                console.log(`${logPrefix} 🔍 Retrieving RAG context...`);
                const retrievalResult = await retrieveContext(message, userId, {
                    topK: 5,
                    includeMetadata: true,
                });

                if (retrievalResult.documents.length > 0) {
                    ragContext = formatRAGContext(retrievalResult);
                    ragSourceCount = retrievalResult.sources.size;
                    console.log(`${logPrefix} ✓ RAG: Retrieved ${retrievalResult.documents.length} documents from ${ragSourceCount} sources (${retrievalResult.tokensUsed} tokens)`);
                } else {
                    console.log(`${logPrefix} ℹ️ RAG: No relevant documents found`);
                }
            } else {
                console.log(`${logPrefix} ⏭️ RAG: Skipped (query type not suitable)`);
            }
        } catch (e) {
            console.warn(`${logPrefix} RAG retrieval failed (non-blocking):`, e);
        }

        const finalSystemPrompt = ragContext ? `${systemPrompt}\n\n${ragContext}` : systemPrompt;

        // Note: LangChain agent handles memory automatically via our createAgent implementation which loads history
        
        // 3. File Injection (if applicable)
        // LangChain agent input is a string. If we have a file/image, we need to handle it.
        // For now, if there is an image, we append a note or try to handle it.
        // Future: Update LangChain agent to accept multimodal input.
        let finalMessage = message;
        
        if (fileId) {
            try {
                const fileRecord = await prisma.file.findUnique({ where: { id: fileId } });
                if (fileRecord && fileRecord.path && fs.existsSync(fileRecord.path)) {
                     // For now, just note that there is a file attached since standard string agents might not handle binary data
                     // This is a limitation compared to the manual implementation which injects image_url
                     console.log(`${logPrefix} File attached (${fileRecord.type}). Basic LangChain agent may not process image content directly.`);
                }
            } catch (e) {
                console.error("Failed to check file:", e);
            }
        }

        // 4. LangChain Agent Execution
        console.log(`${logPrefix} Initializing LangChain Agent...`);
        const agentExecutor = await createAgent(chatId, finalSystemPrompt);
        
        console.log(`${logPrefix} Running LangChain Agent...`);
        const agentResult = await runAgent(agentExecutor, finalMessage);

        if (!agentResult.success) {
            // Check for rate limits in the error message
            const errorMsg = agentResult.error || "";
            if (errorMsg.includes("429") || errorMsg.includes("rate limit")) {
                console.error(`${logPrefix} RATE LIMIT HIT - OpenAI API throttling`);
                return { 
                    status: 'failed', 
                    error: 'OpenAI API rate limited. Please wait a moment and try again.',
                    rateLimited: true,
                    chatId 
                };
            }

            console.error(`${logPrefix} LangChain Agent Failed: ${errorMsg}`);
            return {
                status: 'failed',
                error: errorMsg || "Agent execution failed",
                chatId
            };
        }

        let finalContent = agentResult.output;
        console.log(`${logPrefix} ✓ LangChain Agent responded`);

        // 7. Security Output Validation
        if (detectLeaks(finalContent)) {
            console.error(`[Security] Data Leak Detected in Job ${job.id}`);
            finalContent = "[REDACTED] The response contained sensitive information and was blocked by security policy.";
        }

        // 8. Save Assistant Response to DB
        const { encrypt } = await import("../lib/encryption");
        const encryptedResponse = await encrypt(finalContent);

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
            const title = message.substring(0, 50) + (message.length > 50 ? "..." : "");
            await prisma.chat.update({
                where: { id: chatId },
                data: { title }
            });
        }

        // Save usage (approximation for LangChain)
        if (userId) {
            // LangChain doesn't easily expose token usage in the simple result, 
            // but we can estimate or improve the agent return type to include it later.
            // For now, we put a placeholder or basic count.
            const estimatedTokens = finalContent.length / 4; 
            await prisma.usageMetric.create({
                data: { userId, tokens: Math.ceil(estimatedTokens) } // Placeholder
            });
        }

        console.log(`[Worker] Job ${job.id} COMPLETED.`);
        return { status: 'completed', content: finalContent, chatId };

    } catch (err: any) {
        console.error(`[Worker] Job ${job.id} FAILED:`, err);
        throw err;
    }
}
