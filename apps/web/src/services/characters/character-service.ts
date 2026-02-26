/**
 * Character Service
 * Core CRUD operations for AI character presets
 */

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { Prisma } from "@prisma/client";

/**
 * Sanitize user input to prevent prompt injection attacks
 */
function sanitizeCharacterInput(input: string): string {
  // Remove potential prompt injection patterns
  // These patterns could be used to override system instructions
  const dangerousPatterns = [
    /^(ignore|disregard|forget|override)[\s,:]/im,
    /^(you are now|pretend to be|act as)[\s,:]/im,
    /^\(system\)/im,
    /^\[system\]/im,
    /\{\{system\}\}/im,
    /<system>/im,
    /<\/system>/im,
    /\b(SYSTEM|ADMIN|MASTER)\s*:/im,
  ];

  let sanitized = input;
  for (const pattern of dangerousPatterns) {
    sanitized = sanitized.replace(pattern, "[BLOCKED] ");
  }

  // Trim and limit length
  return sanitized.trim().slice(0, 10000); // Max 10k characters
}

export interface CharacterData {
  name: string;
  description?: string;
  avatar?: string;
  systemPrompt: string;
  temperature?: number;
  model?: string;
  maxTokens?: number;
  tags?: string[];
  category?: string;
  isPublic?: boolean;
}

export interface CharacterFilters {
  category?: string;
  tags?: string[];
  searchQuery?: string;
  includeInactive?: boolean;
}

function getCharacterPresetModel() {
  const model = (prisma as any).characterPreset;
  if (!model) {
    throw new Error(
      "Character presets are unavailable. Run database migrations and regenerate Prisma client.",
    );
  }
  return model as {
    findMany: Function;
    findFirst: Function;
    create: Function;
    update: Function;
    count: Function;
  };
}

/**
 * Get all available character presets for a user
 * Returns: system presets + user's own presets + public presets
 */
export async function getCharacterPresets(
  userId: string,
  filters?: CharacterFilters,
): Promise<{
  system: any[];
  userCreated: any[];
  public: any[];
}> {
  try {
    const characterPreset = getCharacterPresetModel();
    const whereClause: any = {
      isActive: filters?.includeInactive ? undefined : true,
      category: filters?.category || undefined,
      tags: filters?.tags ? { hasSome: filters.tags } : undefined,
      OR: filters?.searchQuery
        ? [
            { name: { contains: filters.searchQuery, mode: "insensitive" } },
            {
              description: {
                contains: filters.searchQuery,
                mode: "insensitive",
              },
            },
          ]
        : undefined,
    };

    // Fetch system presets (admin-created, available to all)
    const systemPresets = await characterPreset.findMany({
      where: {
        ...whereClause,
        isSystem: true,
      },
      orderBy: [{ usageCount: "desc" }, { name: "asc" }],
    });

    // Fetch user's own presets
    const userPresets = await characterPreset.findMany({
      where: {
        ...whereClause,
        userId,
        isSystem: false,
      },
      orderBy: { createdAt: "desc" },
    });

    // Fetch public presets (created by other users, marked public)
    const publicPresets = await characterPreset.findMany({
      where: {
        ...whereClause,
        isPublic: true,
        isSystem: false,
        userId: { not: userId }, // Exclude user's own (already in userPresets)
      },
      orderBy: [{ usageCount: "desc" }, { name: "asc" }],
      take: 20, // Limit public presets to avoid overwhelming UI
    });

    logger.info("Fetched character presets", {
      userId,
      systemCount: systemPresets.length,
      userCount: userPresets.length,
      publicCount: publicPresets.length,
    });

    return {
      system: systemPresets,
      userCreated: userPresets,
      public: publicPresets,
    };
  } catch (error) {
    logger.error("Failed to fetch character presets", error as Error, {
      userId,
    });
    throw new Error("Failed to fetch character presets");
  }
}

/**
 * Get a single character preset by ID
 * Checks user permissions: owner, public, or system
 */
export async function getCharacterById(
  characterId: string,
  userId: string,
): Promise<any | null> {
  try {
    const characterPreset = getCharacterPresetModel();
    const character = await characterPreset.findFirst({
      where: {
        id: characterId,
        isActive: true,
        OR: [
          { isSystem: true }, // System presets available to all
          { isPublic: true }, // Public presets available to all
          { userId }, // User's own presets
        ],
      },
    });

    if (!character) {
      logger.warn("Character not found or access denied", {
        characterId,
        userId,
      });
      return null;
    }

    return character;
  } catch (error) {
    logger.error("Failed to fetch character by ID", error as Error, {
      characterId,
      userId,
    });
    throw new Error("Failed to fetch character");
  }
}

/**
 * Create a new character preset
 */
export async function createCharacterPreset(
  data: CharacterData,
  userId: string,
  isSystem = false,
): Promise<any> {
  try {
    const characterPreset = getCharacterPresetModel();
    // Validate required fields
    if (!data.name || !data.systemPrompt) {
      throw new Error("Name and system prompt are required");
    }

    // Check if user has reached their limit (Free tier: 3 custom characters)
    if (!isSystem) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { plan: true },
      });

      if (user?.plan === "FREE") {
        const userCharacterCount = await characterPreset.count({
          where: { userId, isActive: true },
        });

        if (userCharacterCount >= 3) {
          throw new Error(
            "Free tier limited to 3 custom characters. Upgrade to Pro for unlimited.",
          );
        }
      }
    }

    const character = await characterPreset.create({
      data: {
        userId: isSystem ? null : userId, // System presets have null userId
        name: sanitizeCharacterInput(data.name).slice(0, 255),
        description: data.description?.slice(0, 1000),
        avatar: data.avatar?.slice(0, 500),
        systemPrompt: sanitizeCharacterInput(data.systemPrompt),
        temperature: data.temperature ?? 0.7,
        model: data.model ?? "openai/gpt-4o-mini",
        maxTokens: data.maxTokens,
        tags: (data.tags ?? []).slice(0, 10).map((t) => t.slice(0, 50)),
        category: data.category?.slice(0, 100),
        isPublic: data.isPublic ?? false,
        isSystem,
      },
    });

    logger.info("Created character preset", {
      characterId: character.id,
      userId,
      name: character.name,
      isSystem,
    });

    return character;
  } catch (error) {
    logger.error("Failed to create character preset", error as Error, {
      userId,
      name: data.name,
    });
    throw error;
  }
}

/**
 * Update a character preset
 * Only allows updates if user owns the character or is updating a non-system preset
 */
export async function updateCharacterPreset(
  characterId: string,
  data: Partial<CharacterData>,
  userId: string,
): Promise<any> {
  try {
    const characterPreset = getCharacterPresetModel();
    // Check ownership and permissions
    const existingCharacter = await characterPreset.findFirst({
      where: {
        id: characterId,
        OR: [{ userId }, { isSystem: false }], // Owner or non-system
      },
    });

    if (!existingCharacter) {
      throw new Error(
        "Character not found or you don't have permission to edit it",
      );
    }

    if (existingCharacter.isSystem) {
      throw new Error("System characters cannot be modified by users");
    }

    const updatedCharacter = await characterPreset.update({
      where: { id: characterId },
      data: {
        name: data.name
          ? sanitizeCharacterInput(data.name).slice(0, 255)
          : undefined,
        description: data.description?.slice(0, 1000),
        avatar: data.avatar?.slice(0, 500),
        systemPrompt: data.systemPrompt
          ? sanitizeCharacterInput(data.systemPrompt)
          : undefined,
        temperature: data.temperature,
        model: data.model,
        maxTokens: data.maxTokens,
        tags: data.tags?.slice(0, 10).map((t) => t.slice(0, 50)),
        category: data.category?.slice(0, 100),
        isPublic: data.isPublic,
      },
    });

    logger.info("Updated character preset", {
      characterId,
      userId,
      name: updatedCharacter.name,
    });

    return updatedCharacter;
  } catch (error) {
    logger.error("Failed to update character preset", error as Error, {
      characterId,
      userId,
    });
    throw error;
  }
}

/**
 * Delete a character preset (soft delete)
 */
export async function deleteCharacterPreset(
  characterId: string,
  userId: string,
): Promise<void> {
  try {
    const characterPreset = getCharacterPresetModel();
    // Check ownership
    const existingCharacter = await characterPreset.findFirst({
      where: {
        id: characterId,
        userId, // Only owner can delete
      },
    });

    if (!existingCharacter) {
      throw new Error(
        "Character not found or you don't have permission to delete it",
      );
    }

    if (existingCharacter.isSystem) {
      throw new Error("System characters cannot be deleted by users");
    }

    // Soft delete
    await characterPreset.update({
      where: { id: characterId },
      data: { isActive: false },
    });

    // Update any chats using this character to null
    await (prisma as any).chat.updateMany({
      where: { characterId },
      data: { characterId: null },
    });

    logger.info("Deleted character preset", { characterId, userId });
  } catch (error) {
    logger.error("Failed to delete character preset", error as Error, {
      characterId,
      userId,
    });
    throw error;
  }
}

/**
 * Increment usage count for analytics
 */
export async function incrementUsageCount(characterId: string): Promise<void> {
  try {
    const characterPreset = getCharacterPresetModel();
    await characterPreset.update({
      where: { id: characterId },
      data: { usageCount: { increment: 1 } },
    });

    logger.info("Incremented character usage count", { characterId });
  } catch (error) {
    logger.error("Failed to increment usage count", error as Error, {
      characterId,
    });
    // Don't throw - usage count is not critical
  }
}

/**
 * Get popular characters (most used)
 */
export async function getPopularCharacters(limit = 10): Promise<any[]> {
  try {
    const characterPreset = getCharacterPresetModel();
    return await characterPreset.findMany({
      where: {
        isActive: true,
        OR: [{ isSystem: true }, { isPublic: true }],
      },
      orderBy: { usageCount: "desc" },
      take: limit,
    });
  } catch (error) {
    logger.error("Failed to fetch popular characters", error as Error);
    throw new Error("Failed to fetch popular characters");
  }
}

/**
 * Get character categories (distinct list)
 */
export async function getCharacterCategories(): Promise<string[]> {
  try {
    const characterPreset = getCharacterPresetModel();
    const characters = await characterPreset.findMany({
      where: { isActive: true },
      select: { category: true },
      distinct: ["category"],
    });

    return characters
      .map((c: any) => c.category)
      .filter((cat: any): cat is string => !!cat)
      .sort();
  } catch (error) {
    logger.error("Failed to fetch character categories", error as Error);
    return [];
  }
}
