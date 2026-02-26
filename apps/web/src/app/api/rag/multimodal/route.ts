import { NextRequest } from "next/server";
import { verifyAuth } from "@/services/auth/auth";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
} from "@/lib/response";
import {
  generateMultiModalEmbedding,
  MergeStrategy,
} from "@/services/rag/multi-modal-embeddings";
import { addDocument, searchSimilar } from "@/ai/rag/vector-store";
import { logger } from "@/lib/logger";

/**
 * POST /api/rag/multimodal
 * Ingest a document with multi-modal (text + images) support
 *
 * Request body:
 * {
 *   "content": "Text and/or base64 images...",
 *   "mergeStrategy": "text-only" | "avg" | "concat",
 *   "sourceId": "document-id-optional",
 *   "chunkIndex": 0,
 *   "metadata": {...}
 * }
 */
export async function POST(req: NextRequest) {
  const requestId = req.headers.get("x-request-id");

  try {
    const user = await verifyAuth(req);
    if (!user) {
      return unauthorizedResponse({ requestId });
    }

    const body = await req.json();
    const {
      content,
      mergeStrategy = "text-only",
      sourceId,
      chunkIndex = 0,
      metadata = {},
    } = body;

    if (
      !content ||
      typeof content !== "string" ||
      content.trim().length === 0
    ) {
      return errorResponse("Content is required and must be non-empty", {
        status: 400,
      });
    }

    console.log("[API] Ingesting multi-modal document", {
      userId: user.id,
      contentLength: content.length,
      strategy: mergeStrategy,
    });

    // Generate multi-modal embedding
    const embeddingResult = await generateMultiModalEmbedding(content, {
      mergeStrategy: mergeStrategy as MergeStrategy,
    });

    // Add document to vector database using existing API
    const documentId = await addDocument(
      content,
      {
        ...metadata,
        contentType: embeddingResult.contentType,
        strategy: mergeStrategy,
        hasText: embeddingResult.hasText,
        hasImage: embeddingResult.hasImage,
        sourceId: sourceId || "api-ingest",
        chunkIndex,
      },
      user.id,
    );

    logger.info("Document ingested successfully", {
      documentId,
      userId: user.id,
      contentType: embeddingResult.contentType,
    });

    return successResponse(
      {
        documentId,
        hasText: embeddingResult.hasText,
        hasImage: embeddingResult.hasImage,
        strategy: mergeStrategy,
        embeddingDims: embeddingResult.mergedEmbedding.length,
        contentType: embeddingResult.contentType,
        warnings: embeddingResult.warnings,
        error: embeddingResult.error,
      },
      { requestId },
    );
  } catch (error) {
    logger.error("Failed to ingest multi-modal document", error as Error);
    return errorResponse("Failed to ingest document", { status: 500 });
  }
}

/**
 * PUT /api/rag/multimodal
 * Search documents with multi-modal query support
 *
 * Request body:
 * {
 *   "query": "search text",
 *   "topK": 5
 * }
 */
export async function PUT(req: NextRequest) {
  const requestId = req.headers.get("x-request-id");

  try {
    const user = await verifyAuth(req);
    if (!user) {
      return unauthorizedResponse({ requestId });
    }

    const body = await req.json();
    const { query, topK = 5 } = body;

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return errorResponse("Query is required", { status: 400 });
    }

    console.log("[API] Searching multi-modal documents", {
      userId: user.id,
      queryLength: query.length,
      topK,
    });

    // Search vector database
    const results = await searchSimilar(
      query,
      user.id,
      Math.min(topK, 20), // Cap at 20
    );

    logger.info("Multi-modal search completed", {
      userId: user.id,
      resultsCount: results.length,
    });

    return successResponse(
      {
        results: results.map((r) => ({
          id: r.id,
          text: r.text,
          metadata: JSON.parse(r.metadata || "{}"),
          createdAt: r.createdAt,
          sourceId: r.sourceId,
        })),
        count: results.length,
      },
      { requestId },
    );
  } catch (error) {
    logger.error("Failed to search multi-modal documents", error as Error);
    return errorResponse("Search failed", { status: 500 });
  }
}
