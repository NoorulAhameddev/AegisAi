import { prisma } from "@/lib/prisma";
import { openai } from "@/services/ai/openai";
import { logger } from "@/lib/logger";

interface CompressionResult {
  success: boolean;
  compressed: boolean;
  messagesSummarized?: number;
  tokensSaved?: number;
  summaryId?: string;
  error?: string;
}

/**
 * Conversation Compressor
 *
 * Solves the problem: Hard 50-message limit loses context after ~10 minutes
 * Solution: Summarize old messages into single system message, keep them for audit
 *
 * How it works:
 * 1. Monitor message count in conversation
 * 2. When reaching 30 or 60 or 90 messages (multiples of 30):
 *    - Take oldest 30 messages
 *    - Generate LLM summary
 *    - Create ConversationSummary record
 *    - Keep original messages (for audit trail)
 * 3. When building context, include summaries instead of raw messages
 * 4. Unlimited conversation length, bounded context with summaries
 */

/**
 * Detect if conversation needs compression
 * Returns true if message count is at a compression threshold
 */
export async function shouldCompressConversation(
  chatId: string,
): Promise<boolean> {
  const messageCount = await prisma.message.count({
    where: {
      chatId,
      deletedAt: null,
    },
  });

  // Compress at 30, 60, 90, 120, etc message boundaries
  const compressionThreshold = 30;
  const alreadyCompressed = await prisma.conversationSummary.count({
    where: { chatId },
  });

  // Compress when we hit (alreadyCompressed + 1) * 30 messages
  const targetMessageCount = (alreadyCompressed + 1) * compressionThreshold;

  return messageCount >= targetMessageCount;
}

/**
 * Summarize a batch of messages using LLM
 */
async function summarizeMessages(
  messages: Array<{ role: string; content: string }>,
  chatContext: string,
): Promise<string> {
  try {
    const messageList = messages
      .map((m) => `${m.role}: ${m.content.substring(0, 200)}`)
      .join("\n");

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Use faster/cheaper model for summarization
      messages: [
        {
          role: "user",
          content: `Summarize this conversation excerpt in 2-3 sentences, capturing key points and decisions:\n\n${messageList}\n\nContext: ${chatContext}`,
        },
      ],
      max_tokens: 150,
      temperature: 0.3, // Low temperature for factual summary
    });

    const summary = response.choices[0]?.message?.content;
    if (!summary) {
      throw new Error("No summary generated");
    }

    return summary;
  } catch (error) {
    logger.error("Summarization failed", error as Error, {
      chatId: chatContext,
    });
    // Fallback: simple concatenation if LLM fails
    return messages
      .slice(-10)
      .map((m) => `${m.role}: ${m.content.substring(0, 100)}`)
      .join("; ");
  }
}

/**
 * Compress conversation by summarizing old messages
 */
export async function compressConversation(
  chatId: string,
  userId: string,
): Promise<CompressionResult> {
  try {
    // 1. Get all messages for this chat (older first)
    const messages = await prisma.message.findMany({
      where: {
        chatId,
        deletedAt: null,
      },
      orderBy: { createdAt: "asc" },
    });

    // 2. Check if compression needed
    const compressionThreshold = 30;
    const summaryCount = await prisma.conversationSummary.count({
      where: { chatId },
    });

    const targetCount = (summaryCount + 1) * compressionThreshold;

    if (messages.length < targetCount) {
      return { success: true, compressed: false };
    }

    // 3. Get messages to summarize (oldest 30)
    const messagesToSummarize = messages.slice(0, compressionThreshold);

    // 4. Generate summary via LLM
    const messageContent = messagesToSummarize.map((m) => ({
      role: m.role.toLowerCase(),
      content: m.content,
    }));

    const chatTitle =
      (
        await prisma.chat.findUnique({
          where: { id: chatId },
        })
      )?.title || "Untitled Chat";

    const summary = await summarizeMessages(messageContent, chatTitle);

    // 5. Estimate tokens saved (rough: 5 characters ≈ 1 token)
    const originalTokens = messagesToSummarize.reduce(
      (sum, m) => sum + Math.ceil(m.content.length / 5),
      0,
    );
    const tokensSaved = Math.max(
      originalTokens - Math.ceil(summary.length / 5),
      0,
    );

    // 6. Create ConversationSummary record
    const summaryRecord = await prisma.conversationSummary.create({
      data: {
        chatId,
        summaryIndex: summaryCount + 1,
        startMessageId: messagesToSummarize[0].id,
        endMessageId: messagesToSummarize[messagesToSummarize.length - 1].id,
        startTimestamp: messagesToSummarize[0].createdAt,
        endTimestamp:
          messagesToSummarize[messagesToSummarize.length - 1].createdAt,
        summary,
        messageCount: messagesToSummarize.length,
        tokensSaved,
      },
    });

    logger.info("Conversation compressed", {
      chatId,
      userId,
      messagesSummarized: messagesToSummarize.length,
      tokensSaved,
      summaryLength: summary.length,
    });

    return {
      success: true,
      compressed: true,
      messagesSummarized: messagesToSummarize.length,
      tokensSaved,
      summaryId: summaryRecord.id,
    };
  } catch (error) {
    logger.error("Conversation compression failed", error as Error, {
      chatId,
      userId,
    });

    return {
      success: false,
      compressed: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Build conversation context with summaries
 * Returns: summary messages + recent messages (up to limit)
 */
export async function buildContextWithSummaries(
  chatId: string,
  maxRecentMessages: number = 20,
): Promise<Array<{ role: "user" | "assistant" | "system"; content: string }>> {
  try {
    // 1. Get all conversation summaries (newest first)
    const summaries = await prisma.conversationSummary.findMany({
      where: { chatId },
      orderBy: { summaryIndex: "desc" },
    });

    const context: Array<{
      role: "user" | "assistant" | "system";
      content: string;
    }> = [];

    // 2. Add summaries to context (oldest summaries first in presentation)
    for (const summary of summaries.reverse()) {
      context.push({
        role: "system",
        content: `[Earlier discussion summary (${summary.messageCount} messages, ${summary.tokensSaved} tokens saved)]: ${summary.summary}`,
      });
    }

    // 3. Add recent messages (last N messages)
    const recentMessages = await prisma.message.findMany({
      where: {
        chatId,
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
      take: maxRecentMessages,
    });

    // Reverse to get chronological order
    for (const message of recentMessages.reverse()) {
      context.push({
        role: message.role === "USER" ? "user" : "assistant",
        content: message.content,
      });
    }

    return context;
  } catch (error) {
    logger.error("Failed to build context with summaries", error as Error, {
      chatId,
    });

    // Fallback: return just recent messages
    const fallbackMessages = await prisma.message.findMany({
      where: { chatId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return fallbackMessages.reverse().map((m) => ({
      role: (m.role === "USER" ? "user" : "assistant") as "user" | "assistant",
      content: m.content,
    }));
  }
}

/**
 * Maintenance: Delete old summaries beyond retention policy
 * Keep summaries for 90 days
 */
export async function cleanupOldSummaries(): Promise<void> {
  const retentionDays = 90;
  const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  const result = await prisma.conversationSummary.deleteMany({
    where: {
      createdAt: {
        lt: cutoffDate,
      },
    },
  });

  if (result.count > 0) {
    logger.info("Cleaned up old conversation summaries", {
      count: result.count,
      older_than: cutoffDate,
    });
  }
}

/**
 * Get compression stats for a chat
 */
export async function getCompressionStats(chatId: string) {
  const summaries = await prisma.conversationSummary.findMany({
    where: { chatId },
  });

  const totalSummarized = summaries.reduce((sum, s) => sum + s.messageCount, 0);
  const totalTokensSaved = summaries.reduce((sum, s) => sum + s.tokensSaved, 0);

  return {
    compressionCycles: summaries.length,
    messagesSummarized: totalSummarized,
    tokensSaved: totalTokensSaved,
    summaries: summaries.map((s) => ({
      index: s.summaryIndex,
      messages: s.messageCount,
      tokensSaved: s.tokensSaved,
      date: s.createdAt,
    })),
  };
}
