import { prisma } from "../lib/prisma";
import fs from "fs";
import { Job } from "bullmq";
import { validateInput, detectLeaks } from "../lib/security";
import { buildSystemPrompt } from "../services/ai/prompt";
import { createAgent, runAgent } from "../ai/integrations/langchain-agent";
import { logger } from "../lib/logger";
import crypto from "crypto";

export async function processChatJobLangChain(job: Job) {
  const { chatId, message, fileId, userId, requestId } = job.data;

  const logPrefix = `[Worker-LC] [Req:${requestId || "N/A"}] [Job:${job.id}]`;
  logger.worker(job.id as string, "started", {
    userId,
    chatId,
    requestId,
    jobType: "chat-langchain",
    messagePreview: message.substring(0, 50),
  });

  // 0. Security Input Validation (Regex)
  const validation = validateInput(message);
  if (!validation.valid) {
    logger.security("Input validation failed (regex)", {
      jobId: job.id as string,
      userId,
      error: validation.error,
    });
    return { status: "failed", error: validation.error };
  }

  logger.worker(job.id as string, "validation-passed", { stage: "regex" });

  // 0.1 AI Sentinel Check (Intent Classification)
  try {
    const { checkIntent } = await import("../lib/security-agent");
    logger.worker(job.id as string, "security-check-start", {
      stage: "sentinel",
    });
    const securityCheck = await checkIntent(message);
    logger.worker(job.id as string, "security-check-result", {
      valid: securityCheck.valid,
      intent: securityCheck.intent,
    });

    if (!securityCheck.valid) {
      logger.security("Security sentinel blocked request", {
        jobId: job.id as string,
        userId,
        intent: securityCheck.intent,
        reason: securityCheck.reason,
      });

      await prisma.auditLog.create({
        data: {
          userId: userId,
          action: `SECURITY_BLOCK: ${securityCheck.intent} | ${securityCheck.reason}`,
        },
      });

      return {
        status: "completed",
        content: `🔒 Request blocked by security policy. \nReason: ${securityCheck.reason}`,
        chatId,
      };
    }
    logger.worker(job.id as string, "security-check-passed", {
      stage: "sentinel",
    });
  } catch (e) {
    logger.error("Security sentinel crashed", e as Error, {
      jobId: job.id as string,
      userId,
    });
    return { status: "failed", error: "Security system malfunction." };
  }

  try {
    // 0.5 Ingest User Message into Vector Store
    try {
      const { addDocument } = await import("../lib/vector-store");
      await addDocument(
        message,
        { role: "user", chatId, fileId, type: "conversation" },
        userId,
      );
      logger.worker(job.id as string, "vector-store-ingested", { chatId });
    } catch (e) {
      logger.warn("Vector store ingestion failed (non-blocking)", {
        jobId: job.id as string,
        error: (e as Error).message,
      });
    }

    // Ensure chat exists and is not deleted
    const chatRecord = await prisma.chat.findFirst({
      where: { id: chatId, userId, deletedAt: null },
      select: { id: true },
    });

    if (!chatRecord) {
      logger.warn("Chat not found or deleted", {
        jobId: job.id as string,
        userId,
        chatId,
      });
      return { status: "failed", error: "Chat not found", chatId };
    }

    // 1. Fetch System Prompt
    const systemPrompt = await buildSystemPrompt(userId);

    // 🚀 ENHANCED RAG Context Injection
    let ragContext = "";
    let ragSourceCount = 0;
    try {
      const { retrieveContext, shouldUseRAG, formatRAGContext } =
        await import("../lib/rag-retrieval");

      if (shouldUseRAG(message)) {
        logger.worker(job.id as string, "rag-retrieval-start", { userId });
        const retrievalResult = await retrieveContext(message, userId, {
          topK: 5,
          includeMetadata: true,
        });

        if (retrievalResult.documents.length > 0) {
          ragContext = formatRAGContext(retrievalResult);
          ragSourceCount = retrievalResult.sources.size;
          logger.worker(job.id as string, "rag-retrieval-success", {
            documentsCount: retrievalResult.documents.length,
            sourcesCount: ragSourceCount,
            tokensUsed: retrievalResult.tokensUsed,
          });
        } else {
          logger.worker(job.id as string, "rag-retrieval-empty", {
            reason: "no-relevant-docs",
          });
        }
      } else {
        logger.worker(job.id as string, "rag-retrieval-skipped", {
          reason: "query-type-not-suitable",
        });
      }
    } catch (e) {
      logger.warn("RAG retrieval failed (non-blocking)", {
        jobId: job.id as string,
        error: (e as Error).message,
      });
    }

    const finalSystemPrompt = ragContext
      ? `${systemPrompt}\n\n${ragContext}`
      : systemPrompt;

    // Note: LangChain agent handles memory automatically via our createAgent implementation which loads history

    // 3. File Injection (if applicable)
    // LangChain agent input is a string. If we have a file/image, we need to handle it.
    // For now, if there is an image, we append a note or try to handle it.
    // Future: Update LangChain agent to accept multimodal input.
    let finalMessage = message;

    if (fileId) {
      try {
        const fileRecord = await prisma.file.findUnique({
          where: { id: fileId },
        });
        if (fileRecord && fileRecord.path && fs.existsSync(fileRecord.path)) {
          // For now, just note that there is a file attached since standard string agents might not handle binary data
          // This is a limitation compared to the manual implementation which injects image_url
          logger.worker(job.id as string, "file-attached", {
            fileId,
            fileType: fileRecord.type,
          });
        }
      } catch (e) {
        logger.error("Failed to check file", e as Error, {
          jobId: job.id as string,
          fileId,
        });
      }
    }

    // 4. LangChain Agent Execution
    logger.worker(job.id as string, "langchain-agent-init", { chatId });
    const agentExecutor = await createAgent(chatId, finalSystemPrompt);

    logger.worker(job.id as string, "langchain-agent-run", { chatId });
    const agentResult = await runAgent(agentExecutor, finalMessage);

    if (!agentResult.success) {
      // Check for rate limits in the error message
      const errorMsg = agentResult.error || "";
      if (errorMsg.includes("429") || errorMsg.includes("rate limit")) {
        logger.error("OpenAI rate limit hit (LangChain)", new Error(errorMsg), {
          jobId: job.id as string,
          userId,
        });
        return {
          status: "failed",
          error: "OpenAI API rate limited. Please wait a moment and try again.",
          rateLimited: true,
          chatId,
        };
      }

      logger.error("LangChain agent execution failed", new Error(errorMsg), {
        jobId: job.id as string,
        userId,
      });
      return {
        status: "failed",
        error: errorMsg || "Agent execution failed",
        chatId,
      };
    }

    let finalContent = agentResult.output;
    logger.worker(job.id as string, "langchain-agent-success", { chatId });

    // 7. Security Output Validation
    if (detectLeaks(finalContent)) {
      logger.security("Data leak detected in response", {
        jobId: job.id as string,
        userId,
      });
      finalContent =
        "[REDACTED] The response contained sensitive information and was blocked by security policy.";
    }

    // 8. Save Assistant Response to DB
    const { encrypt } = await import("../lib/encryption");
    const encryptedResponse = await encrypt(finalContent);

    const responseHash = crypto
      .createHash("sha256")
      .update(finalContent)
      .digest("hex");
    await prisma.message.create({
      data: {
        chatId,
        role: "ASSISTANT",
        content: encryptedResponse,
        contentHash: responseHash,
      },
    });

    // Update chat title from first message if not set
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      select: { title: true },
    });

    if (!chat?.title || chat.title === "New Conversation") {
      const title =
        message.substring(0, 50) + (message.length > 50 ? "..." : "");
      await prisma.chat.update({
        where: { id: chatId },
        data: { title },
      });
    }

    // Save usage (approximation for LangChain)
    if (userId) {
      // LangChain doesn't easily expose token usage in the simple result,
      // but we can estimate or improve the agent return type to include it later.
      // For now, we put a placeholder or basic count.
      const estimatedTokens = finalContent.length / 4;
      await prisma.usageMetric.create({
        data: { userId, tokens: Math.ceil(estimatedTokens) }, // Placeholder
      });
    }

    logger.worker(job.id as string, "completed", {
      userId,
      chatId,
      requestId,
      jobType: "chat-langchain",
    });
    return { status: "completed", content: finalContent, chatId };
  } catch (err: any) {
    logger.error("Worker job failed (LangChain)", err as Error, {
      jobId: job.id,
      userId,
      chatId,
      requestId,
    });
    throw err;
  }
}
