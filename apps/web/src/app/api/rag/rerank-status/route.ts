import { NextRequest } from "next/server";
import { verifyAuth } from "@/services/auth/auth";
import { logger } from "@/lib/logger";
import {
  errorResponse,
  successResponse,
  unauthorizedResponse,
} from "@/lib/response";
import { getRerankerStatus } from "@/services/rag/rerank";

/**
 * GET /api/rag/rerank-status
 * Diagnostics endpoint for reranker health
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();

  try {
    const user = await verifyAuth(req);
    if (!user) {
      return unauthorizedResponse();
    }

    const status = await getRerankerStatus();

    const duration = Date.now() - startTime;
    logger.api("GET", "/api/rag/rerank-status", 200, duration);

    return successResponse({ status });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error("Rerank status error", error, {
      path: "/api/rag/rerank-status",
      duration,
    });
    return errorResponse(error.message || "Failed to get rerank status", {
      status: 500,
    });
  }
}
