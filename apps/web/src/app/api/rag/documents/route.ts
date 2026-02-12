import { NextRequest } from "next/server";
import { z } from "zod";
import { verifyAuth } from "@/services/auth/auth";
import { logger } from "@/lib/logger";
import { deleteDocumentsBySource } from "@/ai/rag/vector-store";
import { parseQuery } from "@/lib/request-validation";
import { errorResponse, successResponse, unauthorizedResponse } from "@/lib/response";

/**
 * DELETE /api/rag/documents
 * Delete documents from RAG system by source ID
 */
export async function DELETE(req: NextRequest) {
    const startTime = Date.now();

    try {
        const user = await verifyAuth(req);
        if (!user) {
            return unauthorizedResponse();
        }

        const querySchema = z.object({ sourceId: z.string().min(1) });
        const { data, response } = parseQuery(new URL(req.url), querySchema);
        if (response) return response;

        const sourceId = data.sourceId;

        // Delete documents
        const deletedCount = await deleteDocumentsBySource(sourceId, user.id);

        const duration = Date.now() - startTime;
        logger.api('DELETE', '/api/rag/documents', 200, duration);
        logger.info('Documents deleted from RAG', {
            userId: user.id,
            sourceId,
            deletedCount,
            duration
        });

        return successResponse({
            deletedCount,
            message: `Deleted ${deletedCount} document chunks`,
        });

    } catch (error: any) {
        const duration = Date.now() - startTime;
        logger.error('RAG delete error', error, {
            path: '/api/rag/documents',
            duration
        });
        return errorResponse(error.message || "Failed to delete documents", { status: 500 });
    }
}
