/**
 * Audio Ingestion API
 * Transcribe audio files using Whisper
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/services/auth/auth";
import { ingestAudioFile } from "@/services/ingestion/ingestion.service";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";

export async function POST(req: NextRequest) {
    try {
        const authResult = await verifyAuth(req);
        if (!authResult) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get("file") as File;
        const projectId = formData.get("projectId") as string | null;

        if (!file) {
            return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
        }

        // Save temp file
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        try {
            const userId = authResult.id;
                const result = await ingestAudioFile({
                    name: file.name,
                    type: file.type,
                    buffer,
                }, {
                userId,
                projectId: projectId || undefined,
                enableRAG: true,
                encryptStorage: true,
            });


            return NextResponse.json(result);
        } catch (error) {
            throw error;
        }
    } catch (error) {
        console.error("Audio ingestion error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Transcription failed" },
            { status: 500 }
        );
    }
}
