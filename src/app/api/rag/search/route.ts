import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/services/auth/session";
import { logger } from "@/lib/logger";
import { searchSimilar } from "@/ai/rag/vector-store";

/**
 * POST /api/rag/search
 * Search for relevant documents in RAG system
 */
export async function POST(req: NextRequest) {
    const startTime = Date.now();

    try {
        const user = await getUserFromRequest(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { query, limit = 5, filters } = body;

        if (!query || typeof query !== 'string') {
            return NextResponse.json(
                { error: "Query is required" },
                { status: 400 }
            );
        }

        if (query.length < 3) {
            return NextResponse.json(
                { error: "Query too short (minimum 3 characters)" },
                { status: 400 }
            );
        }

        // Search for similar documents
        const results = await searchSimilar(
            query,
            user.userId,
            Math.min(limit, 20), // Cap at 20 results
            filters
        );

        // Parse metadata for each result
        const formattedResults = results.map(doc => ({
            id: doc.id,
            text: doc.text,
            metadata: JSON.parse(doc.metadata),
            chunkIndex: doc.chunkIndex,
            sourceId: doc.sourceId,
            createdAt: doc.createdAt,
        }));

        const duration = Date.now() - startTime;
        logger.api('POST', '/api/rag/search', 200, duration);

        return NextResponse.json({
            success: true,
            results: formattedResults,
            count: formattedResults.length,
        });

    } catch (error: any) {
        const duration = Date.now() - startTime;
        logger.error('RAG search error', error, {
            path: '/api/rag/search',
            duration
        });
        return NextResponse.json(
            { error: error.message || "Search failed" },
            { status: 500 }
        );
    }
}
