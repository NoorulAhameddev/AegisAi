/**
 * Audio Ingestion API
 * Transcribe audio files using Whisper
 */

import { NextRequest } from "next/server";
import { verifyAuth } from "@/services/auth/auth";
import { ingestAudioFile } from "@/services/ingestion/ingestion.service";
import { errorResponse, successResponse, unauthorizedResponse } from "@/lib/response";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
    try {
        const authResult = await verifyAuth(req);
        if (!authResult) {
            return unauthorizedResponse();
        }

        const formData = await req.formData();
        const file = formData.get("file") as File;
        const projectId = formData.get("projectId") as string | null;

        if (!file) {
            return errorResponse("No audio file provided", { status: 400 });
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

            return successResponse(result);
        } catch (error) {
            throw error;
        }
    } catch (error) {
        logger.error("Audio ingestion error", error as Error);
        return errorResponse(error instanceof Error ? error.message : "Transcription failed", { status: 500 });
    }
}
