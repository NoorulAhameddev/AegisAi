/**
 * Webpage Ingestion API
 * Ingest content from web URLs
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { ingestWebPageURL } from "@/services/ingestion/ingestion.service";

export async function POST(req: NextRequest) {
    try {
        const authResult = await verifyAuth(req);
        if (!authResult.valid || !authResult.payload) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { url, projectId } = body;

        if (!url) {
            return NextResponse.json({ error: "Missing webpage URL" }, { status: 400 });
        }

        const userId = authResult.payload.userId;
        const result = await ingestWebPageURL(url, {
            userId,
            projectId: projectId || undefined,
            enableRAG: true,
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error("Webpage ingestion error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Ingestion failed" },
            { status: 500 }
        );
    }
}
