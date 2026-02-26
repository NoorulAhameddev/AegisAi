/**
 * Image Upload API
 * POST /api/images/upload
 */

import { NextRequest } from "next/server";
import { verifyAuth } from "@/services/auth/auth";
import { uploadImage } from "@/services/files/image-storage";
import {
  badRequestResponse,
  errorResponse,
  successResponse,
  unauthorizedResponse,
} from "@/lib/response";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const authResult = await verifyAuth(req);
    if (!authResult) {
      return unauthorizedResponse();
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return badRequestResponse("No file provided");
    }

    const userId = authResult.id;
    const requestId = req.headers.get("x-request-id");

    // Convert File to Buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Upload image
    const result = await uploadImage(userId, fileBuffer, file.name, file.type);

    logger.worker("image-upload-api", "success", {
      userId,
      fileName: file.name,
      size: fileBuffer.length,
      requestId,
    });

    return successResponse(
      {
        imageId: result.fileId,
        fileName: result.metadata.originalName,
        size: result.metadata.size,
        mimeType: result.metadata.mimeType,
        hash: result.metadata.hash,
      },
      { requestId },
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Upload failed";
    logger.error("Image upload error", error as Error);

    if (errorMsg.includes("type") || errorMsg.includes("size")) {
      return badRequestResponse(errorMsg);
    }

    return errorResponse(errorMsg, { status: 500 });
  }
}
