/**
 * Character Presets API
 * GET /api/characters - List all available characters
 * POST /api/characters - Create new character
 */

import { NextRequest } from "next/server";
import { verifyAuth } from "@/services/auth/auth";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
} from "@/lib/response";
import {
  getCharacterPresets,
  createCharacterPreset,
  getCharacterCategories,
} from "@/services/characters/character-service";
import { logger } from "@/lib/logger";
import { z } from "zod";

// Validation schema for character creation
const characterSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name must be less than 255 characters")
    .regex(
      /^[\w\s\-_.]+$/,
      "Name can only contain letters, numbers, spaces, and -_.",
    ),
  description: z.string().max(1000).optional(),
  avatar: z.string().url().max(500).optional().or(z.literal("")),
  systemPrompt: z
    .string()
    .min(1, "System prompt is required")
    .max(10000, "System prompt must be less than 10000 characters"),
  temperature: z.number().min(0).max(2).optional(),
  model: z.string().max(100).optional(),
  maxTokens: z.number().int().positive().max(100000).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  category: z.string().max(100).optional(),
  isPublic: z.boolean().optional(),
});

/**
 * GET /api/characters
 * List all available character presets (system + user + public)
 */
export async function GET(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") || undefined;

  try {
    const user = await verifyAuth(req);
    if (!user) {
      return unauthorizedResponse({ requestId });
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") || undefined;
    const tagsParam = searchParams.get("tags");
    const tags = tagsParam ? tagsParam.split(",") : undefined;
    const searchQuery = searchParams.get("q") || undefined;

    const filters = {
      category,
      tags,
      searchQuery,
    };

    const characters = await getCharacterPresets(user.id, filters);
    const categories = await getCharacterCategories();

    logger.info("Fetched character presets", {
      userId: user.id,
      systemCount: characters.system.length,
      userCount: characters.userCreated.length,
      publicCount: characters.public.length,
      requestId,
    });

    return successResponse(
      {
        ...characters,
        categories,
        total:
          characters.system.length +
          characters.userCreated.length +
          characters.public.length,
      },
      { requestId },
    );
  } catch (error) {
    logger.error("GET /api/characters failed", error as Error, { requestId });
    return errorResponse("Failed to fetch characters", {
      status: 500,
      requestId,
    });
  }
}

/**
 * POST /api/characters
 * Create a new character preset
 */
export async function POST(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") || undefined;

  try {
    const user = await verifyAuth(req);
    if (!user) {
      return unauthorizedResponse({ requestId });
    }

    const body = await req.json();

    // Validate input using schema
    const validation = characterSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.errors.map(
        (e) => `${e.path.join(".")}: ${e.message}`,
      );
      return errorResponse(`Validation failed: ${errors.join(", ")}`, {
        status: 400,
        requestId,
      });
    }

    const character = await createCharacterPreset(
      {
        name: validation.data.name,
        description: validation.data.description,
        avatar: validation.data.avatar,
        systemPrompt: validation.data.systemPrompt,
        temperature: validation.data.temperature,
        model: validation.data.model,
        maxTokens: validation.data.maxTokens,
        tags: validation.data.tags,
        category: validation.data.category,
        isPublic: validation.data.isPublic,
      },
      user.id,
    );

    logger.info("Created character preset", {
      characterId: character.id,
      userId: user.id,
      name: character.name,
      requestId,
    });

    return successResponse(character, { status: 201, requestId });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create character";

    logger.error("POST /api/characters failed", error as Error, {
      requestId,
    });

    return errorResponse(errorMessage, { status: 500, requestId });
  }
}
