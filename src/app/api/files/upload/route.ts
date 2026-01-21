import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractText } from "@/services/files/fileProcessor";
import { getUserFromRequest } from "@/services/auth/session";
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

        // 🚀 ENHANCED: Ingest into RAG Vector Store with smart chunking
        let ragIngested = false;
        let ragChunks = 0;
        try {
            const { isSupportedFileType, isValidFileSize } = await import("@/lib/rag-config");
            
            // Check if file is suitable for RAG ingestion
            if (isSupportedFileType(file.type) && isValidFileSize(file.size) && text && text.length > 50) {
                const { ingestDocument } = await import("@/lib/vector-store");
                
                const documentIds = await ingestDocument(
                    text,
                    {
                        fileId: saved.id,
                        fileName: file.name,
                        fileType: file.type,
                        sourceId: saved.id,
                        type: 'file',
                    },
                    user.userId
                );
                
                ragIngested = true;
                ragChunks = documentIds.length;
                
                // Update file metadata
                await prisma.file.update({
                    where: { id: saved.id },
                    data: {
                        metadata: JSON.stringify({
                            ragIngested: true,
                            ragChunks: documentIds.length,
                            ingestedAt: new Date().toISOString(),
                        })
                    }
                });
                
                fs.appendFileSync('server_debug.log', `[UPLOAD] RAG Ingested: ${documentIds.length} chunks\n`);
            } else {
                fs.appendFileSync('server_debug.log', `[UPLOAD] RAG Ingestion skipped (type: ${file.type}, size: ${file.size}, textLen: ${text.length})\n`);
            }
        } catch (ingestErr: any) {
            console.error("RAG Ingestion failed", ingestErr);
            fs.appendFileSync('server_debug.log', `[UPLOAD] RAG Ingestion Failed: ${ingestErr.message}\n`);
        }

        return NextResponse.json({ 
            fileId: saved.id,
            ragIngested,
            ragChunks,
        });
    } catch (error: any) {
        fs.appendFileSync('server_debug.log', `[UPLOAD ERROR] ${error.message}\n${error.stack}\n`);
        return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
    }
}
