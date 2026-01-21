import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/services/auth/session";
import { logger } from "@/lib/logger";
import { deleteDocumentsBySource } from "@/ai/rag/vector-store";

/**
 * DELETE /api/rag/documents
 * Delete documents from RAG system by source ID
 */
export async function DELETE(req: NextRequest) {
    const startTime = Date.now();

    try {
        const user = await getUserFromRequest(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const sourceId = searchParams.get('sourceId');

        if (!sourceId) {
            return NextResponse.json(
                { error: "sourceId parameter is required" },
                { status: 400 }
            );
        }

        // Delete documents
        const deletedCount = await deleteDocumentsBySource(sourceId, user.userId);

        const duration = Date.now() - startTime;
        logger.api('DELETE', '/api/rag/documents', 200, duration);
        logger.info('Documents deleted from RAG', {
            userId: user.userId,
            sourceId,
            deletedCount,
            duration
        });

        return NextResponse.json({
            success: true,
            deletedCount,
            message: `Deleted ${deletedCount} document chunks`
        });

    } catch (error: any) {
        const duration = Date.now() - startTime;
        logger.error('RAG delete error', error, {
            path: '/api/rag/documents',
            duration
        });
        return NextResponse.json(
            { error: error.message || "Failed to delete documents" },
            { status: 500 }
        );
    }
}
