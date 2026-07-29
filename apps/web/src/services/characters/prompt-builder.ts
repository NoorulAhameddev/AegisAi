/**
 * Character Prompt Builder
 * Builds character-aware system prompts with optional user memory injection
 */

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getUserMemory } from "@/ai/memory/memory";
import { buildSystemPrompt } from "@/services/ai/prompt";

/**
 * Build system prompt for a character
 * Falls back to default prompt if characterId is null
 */
export async function buildCharacterPrompt(
  characterId: string | null | undefined,
  userId: string,
): Promise<string> {
  try {
    // If no character selected, use default prompt
    if (!characterId) {
      logger.info("No character selected, using default prompt", { userId });
      return await buildSystemPrompt(userId);
    }

    // Fetch character
    const character = await (prisma as any).characterPreset.findFirst({
      where: {
        id: characterId,
        isActive: true,
        OR: [{ isSystem: true }, { isPublic: true }, { userId }],
      },
    });

    if (!character) {
      logger.warn("Character not found, falling back to default prompt", {
        characterId,
        userId,
      });
      return await buildSystemPrompt(userId);
    }

    // Get user memory for personalization
    const memory = await getUserMemory(userId);
    let memoryBlock = "";

    if (memory.length > 0) {
      const concepts = memory
        .filter((m) => m.type === "USER_FACT")
        .slice(0, 5)
        .map((m) => `- Known concept: ${m.content}`)
        .join("\n");

      if (concepts) {
        memoryBlock = `\n\nSTUDENT BACKGROUND:\n${concepts}\n`;
      }
    }

    // Combine character prompt with user memory
    const fullPrompt = character.systemPrompt + memoryBlock;

    logger.info("Built character prompt", {
      characterId,
      characterName: character.name,
      userId,
      promptLength: fullPrompt.length,
      hasMemory: memory.length > 0,
    });

    return fullPrompt;
  } catch (error) {
    logger.error("Failed to build character prompt", error as Error, {
      characterId,
      userId,
    });
    // Fallback to default prompt on error
    return await buildSystemPrompt(userId);
  }
}

/**
 * Get character model configuration (model + temperature)
 */
export async function getCharacterConfig(
  characterId: string | null | undefined,
): Promise<{
  model: string;
  temperature: number;
  maxTokens?: number;
}> {
  try {
    if (!characterId) {
      return {
        model: "openai/gpt-4o-mini",
        temperature: 0.7,
      };
    }

    const character = await (prisma as any).characterPreset.findUnique({
      where: { id: characterId },
      select: { model: true, temperature: true, maxTokens: true },
    });

    if (!character) {
      return {
        model: "openai/gpt-4o-mini",
        temperature: 0.7,
      };
    }

    return {
      model: character.model,
      temperature: character.temperature,
      maxTokens: character.maxTokens ?? undefined,
    };
  } catch (error) {
    logger.error("Failed to get character config", error as Error, {
      characterId,
    });
    return {
      model: "openai/gpt-4o-mini",
      temperature: 0.7,
    };
  }
}

/**
 * Validate character access for a user
 * Returns true if user can access the character
 */
export async function canUserAccessCharacter(
  characterId: string,
  userId: string,
): Promise<boolean> {
  try {
    const character = await (prisma as any).characterPreset.findFirst({
      where: {
        id: characterId,
        isActive: true,
        OR: [{ isSystem: true }, { isPublic: true }, { userId }],
      },
    });

    return !!character;
  } catch (error) {
    logger.error("Failed to validate character access", error as Error, {
      characterId,
      userId,
    });
    return false;
  }
}
