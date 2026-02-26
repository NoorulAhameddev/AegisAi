/**
 * Delete Generated Image
 * DELETE /api/images/[imageId]
 */

import { NextRequest } from "next/server";
import { verifyAuth } from "@/services/auth/auth";
import { deleteGeneratedImage } from "@/services/ai/image-generation";
import {
  errorResponse,
  notFoundResponse,
  successResponse,
  unauthorizedResponse,
} from "@/lib/response";
import { logger } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ imageId: string }>;
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await verifyAuth(req);
    if (!authResult) {
      return unauthorizedResponse();
    }

    const { imageId } = await params;
    const userId = authResult.id;
    const requestId = req.headers.get("x-request-id");

    if (!imageId) {
      return notFoundResponse();
    }

    await deleteGeneratedImage(imageId, userId);

    logger.worker("image-delete-api", "success", {
      userId,
      imageId,
      requestId,
    });

    return successResponse({ success: true }, { requestId });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Delete failed";
    logger.error("Image deletion error", error as Error);

    if (errorMsg.includes("not found")) {
      return notFoundResponse();
    }

    return errorResponse(errorMsg, { status: 500 });
  }
}
