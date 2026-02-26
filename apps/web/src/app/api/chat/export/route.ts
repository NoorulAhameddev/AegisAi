/**
 * Export Chat API
 * Export chat conversations to PDF
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyAuth } from "@/services/auth/auth";
import * as exportService from "@/services/export/export.service";
import { parseBody } from "@/lib/request-validation";
import { errorResponse, unauthorizedResponse } from "@/lib/response";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    // Rate limiting: 10 exports per minute
    const rateLimitResult = await rateLimit(req, { limit: 10, window: 60 });
    if (!rateLimitResult.success) {
      return errorResponse("Rate limit exceeded", { status: 429 });
    }

    const authResult = await verifyAuth(req);
    if (!authResult) {
      return unauthorizedResponse();
    }

    const bodySchema = z.object({ chatId: z.string().min(1) });
    const { data, response } = await parseBody(req, bodySchema);
    if (response) return response;

    const { chatId } = data;

    const userId = authResult.id;
    const result = await exportService.exportChatToPDF(chatId, userId);

    return new NextResponse(result.buffer as any, {
      headers: {
        "Content-Type": result.mimeType,
        "Content-Disposition": `attachment; filename="${result.filename}"`,
      },
    });
  } catch (error) {
    logger.error("Chat export error", error as Error);
    return errorResponse("Export failed", { status: 500 });
  }
}
