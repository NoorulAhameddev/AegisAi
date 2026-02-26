/**
 * Export Notes API
 * Export notes to PDF, Markdown, or DOCX
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyAuth } from "@/services/auth/auth";
import * as exportService from "@/services/export/export.service";
import { parseBody } from "@/lib/request-validation";
import { errorResponse, unauthorizedResponse } from "@/lib/response";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const authResult = await verifyAuth(req);
    if (!authResult) {
      return unauthorizedResponse();
    }

    const bodySchema = z.object({
      noteId: z.string().min(1),
      format: z.enum(["pdf", "markdown", "docx"]),
    });

    const { data, response } = await parseBody(req, bodySchema);
    if (response) return response;

    const { noteId, format } = data;

    const userId = authResult.id;
    let result;

    if (format === "pdf") {
      result = await exportService.exportToPDF(noteId, userId);
    } else if (format === "docx") {
      result = await exportService.exportToDOCX(noteId, userId);
    } else {
      result = await exportService.exportToMarkdown(noteId, userId);
    }

    return new NextResponse(result.buffer as any, {
      headers: {
        "Content-Type": result.mimeType,
        "Content-Disposition": `attachment; filename="${result.filename}"`,
      },
    });
  } catch (error) {
    logger.error("Export error", error as Error);
    return errorResponse("Export failed", { status: 500 });
  }
}
