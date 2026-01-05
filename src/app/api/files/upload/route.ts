import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractText } from "@/lib/fileProcessor";
import { getUserFromRequest } from "@/lib/session";
import fs from "fs";
import crypto from "crypto";

export async function POST(req: NextRequest) {
    try {
        fs.appendFileSync('server_debug.log', `[UPLOAD] Start upload request\n`);

        const user = await getUserFromRequest(req);
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            fs.appendFileSync('server_debug.log', `[UPLOAD] No file found in form data\n`);
            return NextResponse.json({ error: "No file" }, { status: 400 });
        }

        fs.appendFileSync('server_debug.log', `[UPLOAD] File received: ${file.name}, Type: ${file.type}\n`);

        const buffer = Buffer.from(await file.arrayBuffer());
        const uniqueId = crypto.randomUUID();
        const extension = file.name.split('.').pop();
        const safeName = `${uniqueId}.${extension}`;
        const filePath = `uploads/${safeName}`;

        // Ensure directory exists
        if (!fs.existsSync('uploads')) {
            fs.mkdirSync('uploads');
        }

        fs.writeFileSync(filePath, buffer);
        fs.appendFileSync('server_debug.log', `[UPLOAD] Saved to ${filePath}\n`);

        let text = "";
        try {
            text = await extractText(filePath, file.type);
            fs.appendFileSync('server_debug.log', `[UPLOAD] Text extracted (${text.length} chars)\n`);
        } catch (e: any) {
            fs.appendFileSync('server_debug.log', `[UPLOAD] Extraction failed: ${e.message}\n`);
            // Don't fail the upload, just have empty text
            text = "";
        }

        const saved = await prisma.file.create({
            data: {
                userId: user.userId,
                name: file.name,
                type: file.type,
                content: text,
                path: filePath,
            },
        });

        fs.appendFileSync('server_debug.log', `[UPLOAD] Saved to DB with ID ${saved.id}\n`);

        // Ingest into Vector Store (Background-ish)
        // We use setImmediate or just await it if we want to ensure it's ready before returning
        // For better UX, we await it so the user can immediately chat about it.
        try {
            const { ingestFile } = await import("@/lib/ingest");
            await ingestFile(saved.id, text, user.userId);
            fs.appendFileSync('server_debug.log', `[UPLOAD] Ingested into Vector Store\n`);
        } catch (ingestErr: any) {
            console.error("Ingestion failed", ingestErr);
            fs.appendFileSync('server_debug.log', `[UPLOAD] Ingestion Failed: ${ingestErr.message}\n`);
        }

        return NextResponse.json({ fileId: saved.id });
    } catch (error: any) {
        fs.appendFileSync('server_debug.log', `[UPLOAD ERROR] ${error.message}\n${error.stack}\n`);
        return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
    }
}
