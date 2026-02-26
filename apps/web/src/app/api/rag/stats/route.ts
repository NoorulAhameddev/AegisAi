import { NextRequest } from "next/server";
import { verifyAuth } from "@/services/auth/auth";
import { logger } from "@/lib/logger";
import { getDocumentStats } from "@/ai/rag/vector-store";
import {
  errorResponse,
  successResponse,
  unauthorizedResponse,
} from "@/lib/response";

/**
 * GET /api/rag/stats
 * Get RAG statistics for the user
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();

  try {
    const user = await verifyAuth(req);
    if (!user) {
      return unauthorizedResponse();
    }

    const stats = await getDocumentStats(user.id);

    const duration = Date.now() - startTime;
    logger.api("GET", "/api/rag/stats", 200, duration);

    return successResponse({ stats });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error("RAG stats error", error, {
      path: "/api/rag/stats",
      duration,
    });
    return errorResponse(error.message || "Failed to get stats", {
      status: 500,
    });
  }
}
