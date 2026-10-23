/**
 * Image Generation API Endpoint
 * POST /api/images/generate
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyAuth } from "@/services/auth/auth";
import {
  generateImages,
  GenerateImageOptions,
} from "@/services/ai/image-generation";
import { parseBody } from "@/lib/request-validation";
import {
  badRequestResponse,
  errorResponse,
  successResponse,
  unauthorizedResponse,
} from "@/lib/response";
import { logger } from "@/lib/logger";

const generateSchema = z.object({
  prompt: z.string().min(1).max(4000),
  size: z
    .enum(["256x256", "512x512", "1024x1024", "1792x1024", "1024x1792"])
    .optional()
    .default("1024x1024"),
  quality: z.enum(["standard", "hd"]).optional().default("standard"),
  style: z.enum(["natural", "vivid"]).optional().default("natural"),
  numImages: z.number().int().min(1).max(10).optional().default(1),
});

export async function POST(req: NextRequest) {
  try {
    const authResult = await verifyAuth(req);
    if (!authResult) {
      return unauthorizedResponse();
    }

    const { data, response } = await parseBody(req, generateSchema);
    if (response) return response;

    const userId = authResult.id;
    const requestId = req.headers.get("x-request-id") || undefined;

    logger.worker("image-gen-api", "request", {
      userId,
      promptLength: data.prompt.length,
      requestId,
    });

    // Generate images
    const images = await generateImages(
      userId,
      data as GenerateImageOptions,
      requestId,
    );

    logger.worker("image-gen-api", "success", {
      userId,
      imagesGenerated: images.length,
      requestId,
    });

    return successResponse(
      {
        images,
        count: images.length,
      },
      { requestId },
    );
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : "Image generation failed";
    logger.error("Image generation error", error as Error);

    if (errorMsg.includes("Prompt contains inappropriate content")) {
      return badRequestResponse(errorMsg);
    }

    return errorResponse(errorMsg, { status: 500 });
  }
}
