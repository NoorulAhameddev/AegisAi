import { prisma } from "@/lib/prisma";
import { openai } from "@/services/ai/openai";
import { logger } from "@/lib/logger";
import { MemoryType } from "@prisma/client";

/**
 * CRITICAL FIX: Memory Extraction Service
 *
 * Problem fixed:
 * - Memory system existed but was never populated (saveMemory() never called)
 * - System prompt included memory but it was always empty
 * - No personalization for students
 *
 * Solution:
 * - Extract learning facts from conversations using LLM
 * - Save student preferences and learning history
 * - Use in subsequent chats for personalization
 * - Automatically triggered after each chat
 */

export interface ExtractedMemory {
  concepts: string[];
  preferences: Record<string, any>;
  struggles: string[];
}

/**
 * Extract learning facts from a chat conversation
 * Uses LLM to identify what the student learned or struggled with
 */
export async function extractAndSaveMemory(
  userId: string,
  chatMessages: Array<{ role: string; content: string }> | string,
  chatId?: string,
): Promise<void> {
  try {
    // Normalize string input to array format
    const messages: Array<{ role: string; content: string }> =
      typeof chatMessages === "string"
        ? [{ role: "user", content: chatMessages }]
        : chatMessages;
    if (messages.length === 0) return;

    // Extract facts using LLM
    const memory = await extractMemoryFromChat(messages);

    // Save each fact to database
    if (memory.concepts && memory.concepts.length > 0) {
      for (const concept of memory.concepts.slice(0, 5)) {
        // Limit to 5 per chat to avoid bloat
        await saveMemory(
          userId,
          "LEARNED_CONCEPT",
          concept,
          chatId || "general",
        );
      }
    }

    if (memory.preferences) {
      await saveMemory(
        userId,
        "PREFERENCE",
        JSON.stringify(memory.preferences),
        chatId || "general",
      );
    }

    if (memory.struggles && memory.struggles.length > 0) {
      for (const struggle of memory.struggles.slice(0, 3)) {
        await saveMemory(userId, "LEARNING_GAP", struggle, chatId || "general");
      }
    }

    logger.info("Memory extraction completed", {
      userId,
      conceptsExtracted: memory.concepts.length,
      strugglesIdentified: memory.struggles.length,
    });
  } catch (error) {
    logger.error("Memory extraction failed", error as Error, { userId });
    // Don't throwâ€”memory extraction is non-blocking
  }
}

/**
 * Use LLM to extract learning facts from conversation
 */
async function extractMemoryFromChat(
  chatMessages: Array<{ role: string; content: string }>,
): Promise<ExtractedMemory> {
  const conversationText = chatMessages
    .slice(-20) // Last 20 messages
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");

  const extractionPrompt = `You are analyzing a student's conversation with an AI tutor.

CONVERSATION:
${conversationText}

Extract the following in JSON format:
{
  "concepts": ["concept 1 the student learned", "concept 2", ...],
  "preferences": {
    "preferred_language": "python|javascript|java|etc",
    "preferred_explanation_level": "beginner|intermediate|advanced",
    "preferred_response_length": "short|medium|long"
  },
  "struggles": ["topic the student struggled with", "another struggle topic", ...]
}

Be concise. Maximum 5 concepts, 3 struggles. Return ONLY valid JSON.`;

  try {
    const response = await openai.chat.completions.create({
      model: "openai/gpt-4o-mini",
      messages: [{ role: "user", content: extractionPrompt }],
      temperature: 0.3,
      max_tokens: 500,
    });

    const content = response.choices[0].message.content || "{}";
    const result = JSON.parse(content);

    return {
      concepts: result.concepts || [],
      preferences: result.preferences || {},
      struggles: result.struggles || [],
    };
  } catch (error) {
    logger.warn("Failed to extract memory from chat", { error: String(error) });
    return {
      concepts: [],
      preferences: {},
      struggles: [],
    };
  }
}

/**
 * Save a memory entry to database
 */
export async function saveMemory(
  userId: string,
  type: MemoryType,
  content: string,
  source?: string,
): Promise<void> {
  try {
    // Check if similar memory already exists (avoid duplicates)
    const existing = await prisma.memory.findFirst({
      where: {
        userId,
        type,
        content: {
          contains: content.substring(0, 50), // Check first 50 chars
        },
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Within 7 days
        },
      },
    });

    if (existing) {
      // Don't duplicate recent memories
      return;
    }

    await prisma.memory.create({
      data: {
        userId,
        type,
        content: content.substring(0, 1000), // Cap length
        source: source || "extraction",
      },
    });
  } catch (error) {
    logger.error("Failed to save memory", error as Error, { userId, type });
  }
}

/**
 * Get personalized facts about a student for use in system prompts
 */
export async function getStudentMemorySummary(userId: string): Promise<{
  learnedConcepts: string[];
  struggledWith: string[];
  preferences: Record<string, any>;
}> {
  const memories = await prisma.memory.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 30, // Last 30 memories
  });

  const learnedConcepts = memories
    .filter((m) => m.type === "LEARNED_CONCEPT")
    .slice(0, 5)
    .map((m) => m.content);

  const struggledWith = memories
    .filter((m) => m.type === "LEARNING_GAP")
    .slice(0, 3)
    .map((m) => m.content);

  const preferenceEntries = memories.filter((m) => m.type === "PREFERENCE");
  let preferences: Record<string, any> = {};

  if (preferenceEntries.length > 0) {
    try {
      preferences = JSON.parse(preferenceEntries[0].content);
    } catch {
      // Invalid JSON, ignore
    }
  }

  return {
    learnedConcepts,
    struggledWith,
    preferences,
  };
}

/**
 * Format memory for inclusion in system prompt
 */
export function formatMemoryForPrompt(
  summary: Awaited<ReturnType<typeof getStudentMemorySummary>>,
): string {
  let block = "";

  if (summary.learnedConcepts.length > 0) {
    block += `\nKnown concepts: ${summary.learnedConcepts.join(", ")}`;
  }

  if (summary.struggledWith.length > 0) {
    block += `\nPreviously struggled with: ${summary.struggledWith.join(", ")}`;
    block += `\nConsider providing extra explanation or simpler examples for these topics.`;
  }

  if (Object.keys(summary.preferences).length > 0) {
    if (summary.preferences.preferred_explanation_level === "beginner") {
      block += `\nSTUDENT LEVEL: Beginnerâ€”use simple words and concrete examples`;
    } else if (summary.preferences.preferred_explanation_level === "advanced") {
      block += `\nSTUDENT LEVEL: Advancedâ€”be concise and assume background knowledge`;
    }

    if (summary.preferences.preferred_language) {
      block += `\nStudent's preferred language: ${summary.preferences.preferred_language}`;
    }
  }

  return block;
}
