import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/services/auth/session";
import { logger } from "@/lib/logger";
import { getDocumentStats } from "@/ai/rag/vector-store";

/**
 * GET /api/rag/stats
 * Get RAG statistics for the user
 */
export async function GET(req: NextRequest) {
    const startTime = Date.now();

    try {
        const user = await getUserFromRequest(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const stats = await getDocumentStats(user.userId);

        const duration = Date.now() - startTime;
        logger.api('GET', '/api/rag/stats', 200, duration);

        return NextResponse.json({
            success: true,
            stats,
        });

    } catch (error: any) {
        const duration = Date.now() - startTime;
        logger.error('RAG stats error', error, {
            path: '/api/rag/stats',
            duration
        });
        return NextResponse.json(
            { error: error.message || "Failed to get stats" },
            { status: 500 }
        );
    }
}
