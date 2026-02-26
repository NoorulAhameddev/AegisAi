/**
 * YouTube Ingestion API
 * Ingest transcripts from YouTube URLs
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { verifyAuth } from "@/services/auth/auth";
import { ingestYouTubeURL } from "@/services/ingestion/ingestion.service";
import { parseBody } from "@/lib/request-validation";
import {
  errorResponse,
  successResponse,
  unauthorizedResponse,
} from "@/lib/response";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const user = await verifyAuth(req);
    if (!user) {
      return unauthorizedResponse();
    }

    const bodySchema = z.object({
      url: z.string().min(1),
      projectId: z.string().optional(),
    });
    const { data, response } = await parseBody(req, bodySchema);
    if (response) return response;

    const { url, projectId } = data;
    const result = await ingestYouTubeURL(url, {
      userId: user.id,
      projectId: projectId || undefined,
      enableRAG: true,
    });

    return successResponse(result);
  } catch (error) {
    logger.error("YouTube ingestion error", error as Error);
    return errorResponse(
      error instanceof Error ? error.message : "Ingestion failed",
      { status: 500 },
    );
  }
}
