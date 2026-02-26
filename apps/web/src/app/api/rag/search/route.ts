import { NextRequest } from "next/server";
import { z } from "zod";
import { verifyAuth } from "@/services/auth/auth";
import { logger } from "@/lib/logger";
import { readPrisma } from "@/lib/read-replicas";
import { retrieveContext } from "@/lib/rag-retrieval";
import { parseBody } from "@/lib/request-validation";
import {
  errorResponse,
  successResponse,
  unauthorizedResponse,
} from "@/lib/response";
import { rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/rag/search
 * Search for relevant documents in RAG system
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    // Rate limiting: 30 searches per minute
    const rateLimitResult = await rateLimit(req, { limit: 30, window: 60 });
    if (!rateLimitResult.success) {
      return errorResponse("Rate limit exceeded", { status: 429 });
    }

    const user = await verifyAuth(req);
    if (!user) {
      return unauthorizedResponse();
    }

    const bodySchema = z.object({
      query: z.string().min(3),
      limit: z.coerce.number().int().min(1).max(20).default(5),
      filters: z.record(z.any()).optional(),
    });
    const { data, response } = await parseBody(req, bodySchema);
    if (response) return response;

    const { query, limit, filters } = data;

    // Use advanced retrieval pipeline (with rerank scores)
    const retrieval = await retrieveContext(query, user.id, {
      topK: Math.min(limit, 20),
      filters,
    });
    let formattedResults = retrieval.documents.map((doc) => ({
      id: doc.id,
      text: doc.text,
      metadata:
        typeof doc.metadata === "string"
          ? JSON.parse(doc.metadata)
          : doc.metadata,
      chunkIndex: doc.chunkIndex,
      sourceId: doc.sourceId,
      createdAt: doc.createdAt,
      relevance: retrieval.rerankScores?.get(doc.id) ?? null,
    }));

    // Fallback to DB keyword search if no results
    if (formattedResults.length === 0) {
      const fileResults = await readPrisma.file.findMany({
        where: {
          userId: user.id,
          deletedAt: null,
          content: {
            contains: query,
            mode: "insensitive",
          },
          ...(filters?.projectId ? { projectId: filters.projectId } : {}),
        },
        take: Math.min(limit, 20),
        select: {
          id: true,
          name: true,
          type: true,
          content: true,
          createdAt: true,
          projectId: true,
          metadata: true,
        },
      });

      formattedResults = fileResults.map((file) => ({
        id: file.id,
        text: file.content || "",
        metadata: {
          ...(typeof file.metadata === "object" && file.metadata
            ? file.metadata
            : {}),
          fileName: file.name,
          fileType: file.type,
          projectId: file.projectId,
          source: "db-fallback",
        },
        chunkIndex: 0,
        sourceId: file.id,
        createdAt: file.createdAt.getTime(),
        relevance: null,
      }));
    }

    const duration = Date.now() - startTime;
    logger.api("POST", "/api/rag/search", 200, duration);

    return successResponse({
      results: formattedResults,
      count: formattedResults.length,
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error("RAG search error", error, {
      path: "/api/rag/search",
      duration,
    });
    return errorResponse(error.message || "Search failed", { status: 500 });
  }
}
