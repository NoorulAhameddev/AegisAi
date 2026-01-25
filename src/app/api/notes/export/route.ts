/**
 * Export Notes API
 * Export notes to PDF, Markdown, or DOCX
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
        const { noteId, format } = body;

        if (!noteId || !format) {
            return NextResponse.json(
                { error: "Missing required fields: noteId, format" },
                { status: 400 }
            );
        }

        if (!["pdf", "markdown", "docx"].includes(format)) {
            return NextResponse.json({ error: "Invalid format" }, { status: 400 });
        }

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
        console.error("Export error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Export failed" },
            { status: 500 }
        );
    }
}
