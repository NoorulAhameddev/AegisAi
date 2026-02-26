/**
 * Single Character API
 * GET /api/characters/[id] - Get character details
 * PATCH /api/characters/[id] - Update character
 * DELETE /api/characters/[id] - Delete character (soft)
 */

import { NextRequest } from "next/server";
import { verifyAuth } from "@/services/auth/auth";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  notFoundResponse,
} from "@/lib/response";
import {
  getCharacterById,
  updateCharacterPreset,
  deleteCharacterPreset,
} from "@/services/characters/character-service";
import { logger } from "@/lib/logger";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/characters/[id]
 * Get a single character by ID
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const requestId = req.headers.get("x-request-id") || undefined;

  try {
    const user = await verifyAuth(req);
    if (!user) {
      return unauthorizedResponse({ requestId });
    }

    const { id: characterId } = await params;
    const character = await getCharacterById(characterId, user.id);

    if (!character) {
      return notFoundResponse({ requestId });
    }

    return successResponse(character, { requestId });
  } catch (error) {
    logger.error("GET /api/characters/[id] failed", error as Error, {
      requestId,
    });
    return errorResponse("Failed to fetch character", {
      status: 500,
      requestId,
    });
  }
}

/**
 * PATCH /api/characters/[id]
 * Update a character preset
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const requestId = req.headers.get("x-request-id") || undefined;

  try {
    const user = await verifyAuth(req);
    if (!user) {
      return unauthorizedResponse({ requestId });
    }

    const { id: characterId } = await params;
    const body = await req.json();

    // Validate temperature if provided
    if (
      body.temperature !== undefined &&
      (body.temperature < 0 || body.temperature > 2)
    ) {
      return errorResponse("Temperature must be between 0 and 2", {
        status: 400,
        requestId,
      });
    }

    const updatedCharacter = await updateCharacterPreset(
      characterId,
      body,
      user.id,
    );

    logger.info("Updated character preset", {
      characterId,
      userId: user.id,
      requestId,
    });

    return successResponse(updatedCharacter, { requestId });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to update character";

    logger.error("PATCH /api/characters/[id] failed", error as Error, {
      characterId: (await params).id,
      requestId,
    });

    return errorResponse(errorMessage, { status: 500, requestId });
  }
}

/**
 * DELETE /api/characters/[id]
 * Delete a character preset (soft delete)
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const requestId = req.headers.get("x-request-id") || undefined;

  try {
    const user = await verifyAuth(req);
    if (!user) {
      return unauthorizedResponse({ requestId });
    }

    const { id: characterId } = await params;

    await deleteCharacterPreset(characterId, user.id);

    logger.info("Deleted character preset", {
      characterId,
      userId: user.id,
      requestId,
    });

    return successResponse(
      { message: "Character deleted successfully" },
      {
        requestId,
      },
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to delete character";

    logger.error("DELETE /api/characters/[id] failed", error as Error, {
      characterId: (await params).id,
      requestId,
    });

    return errorResponse(errorMessage, { status: 500, requestId });
  }
}
