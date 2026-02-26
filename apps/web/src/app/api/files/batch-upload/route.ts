/**
 * Batch File Upload API
 * Upload multiple files at once
 */

import { NextRequest } from "next/server";
import { verifyAuth } from "@/services/auth/auth";
import { batchIngestFiles } from "@/services/ingestion/ingestion.service";
import { writeFile, unlink, mkdir, readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import {
  errorResponse,
  rateLimitResponse,
  successResponse,
  unauthorizedResponse,
  badRequestResponse,
} from "@/lib/response";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

export async function POST(req: NextRequest) {
  const tempFiles: string[] = [];

  try {
    const authResult = await verifyAuth(req);
    if (!authResult) {
      return unauthorizedResponse();
    }

    const limit = await rateLimit(req, {
      limit: env.MAX_UPLOADS_PER_MINUTE,
      window: 60,
    });
    if (!limit.success) {
      return rateLimitResponse();
    }

    const formData = await req.formData();
    const projectId = formData.get("projectId") as string | null;

    // Validate projectId as UUID if provided
    if (projectId) {
      const uuidSchema = z.string().uuid();
      const validation = uuidSchema.safeParse(projectId);
      if (!validation.success) {
        return badRequestResponse(
          "Invalid projectId format - must be a valid UUID",
        );
      }
    }

    // Extract all files
    const files: Array<{ path: string; name: string; mimeType: string }> = [];

    for (const [key, value] of formData.entries()) {
      if (key.startsWith("file-") && value instanceof File) {
        const file = value as File;
        if (file.size > env.MAX_FILE_SIZE) {
          return errorResponse("File too large", { status: 413 });
        }
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Ensure uploads directory exists
        const uploadsDir = join(process.cwd(), "uploads");
        if (!existsSync(uploadsDir)) {
          await mkdir(uploadsDir, { recursive: true });
        }

        const tempPath = join(uploadsDir, `temp-${Date.now()}-${file.name}`);
        await writeFile(tempPath, buffer);

        tempFiles.push(tempPath);
        files.push({
          path: tempPath,
          name: file.name,
          mimeType: file.type,
        });
      }
    }

    if (files.length === 0) {
      return errorResponse("No files provided", { status: 400 });
    }

    const userId = authResult.id;

    // Read file buffers before ingestion
    const fileBuffers = await Promise.all(
      files.map(async (f) => ({
        name: f.name,
        type: f.mimeType,
        buffer: await readFile(f.path),
      })),
    );

    const results = await batchIngestFiles(fileBuffers, {
      userId,
      projectId: projectId || undefined,
      enableRAG: true,
      encryptStorage: true,
    });

    // Cleanup temp files
    await Promise.all(tempFiles.map((path) => unlink(path).catch(() => {})));

    return successResponse({
      results,
      total: files.length,
      successful: results.filter((r) => r.fileId).length,
      failed: results.filter((r) => !r.fileId).length,
    });
  } catch (error) {
    // Cleanup on error
    await Promise.all(tempFiles.map((path) => unlink(path).catch(() => {})));

    logger.error("Batch upload error", error as Error);
    return errorResponse(
      error instanceof Error ? error.message : "Batch upload failed",
      { status: 500 },
    );
  }
}
