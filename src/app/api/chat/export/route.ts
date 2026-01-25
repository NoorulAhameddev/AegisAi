/**
 * Export Chat API
 * Export chat conversations to PDF
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/services/auth/auth";
import * as exportService from "@/services/export/export.service";

export async function POST(req: NextRequest) {
    try {
        const authResult = await verifyAuth(req);
        if (!authResult) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { chatId } = body;

        if (!chatId) {
            return NextResponse.json({ error: "Missing chatId" }, { status: 400 });
        }

        const userId = authResult.id;
        const result = await exportService.exportChatToPDF(chatId, userId);

        return new NextResponse(result.buffer as any, {
            headers: {
                "Content-Type": result.mimeType,
                "Content-Disposition": `attachment; filename="${result.filename}"`,
            },
        });
    } catch (error) {
        console.error("Chat export error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Export failed" },
            { status: 500 }
        );
    }
}
