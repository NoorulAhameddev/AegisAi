/**
 * YouTube Ingestion API
 * Ingest transcripts from YouTube URLs
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/services/auth/auth";
import { ingestYouTubeURL } from "@/services/ingestion/ingestion.service";

export async function POST(req: NextRequest) {
    try {
        const user = await verifyAuth(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { url, projectId } = body;

        if (!url) {
            return NextResponse.json({ error: "Missing YouTube URL" }, { status: 400 });
        }
        const result = await ingestYouTubeURL(url, {
            userId: user.id,
            projectId: projectId || undefined,
            enableRAG: true,
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error("YouTube ingestion error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Ingestion failed" },
            { status: 500 }
        );
    }
}
