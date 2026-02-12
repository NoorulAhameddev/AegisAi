/**
 * Export Service
 * Handles exporting notes and content to various formats (PDF, Markdown, DOCX)
 */

import { prisma } from "@/lib/prisma";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import PDFDocument from "pdfkit";
import { marked } from "marked";

export interface ExportResult {
    buffer: Buffer;
    filename: string;
    mimeType: string;
}

/**
 * Export note to Markdown
 */
export async function exportToMarkdown(noteId: string, userId: string): Promise<ExportResult> {
    const note = await prisma.note.findFirst({
        where: { id: noteId, userId },
        include: { project: true },
    });

    if (!note) {
        throw new Error("Note not found");
    }

    const markdown = `# ${note.title}

**Type:** ${note.type}
**Created:** ${note.createdAt.toISOString()}
${note.project ? `**Project:** ${note.project.name}` : ""}

---

${note.content}
`;

    const buffer = Buffer.from(markdown, "utf-8");
    const filename = `${sanitizeFilename(note.title)}.md`;

    return {
        buffer,
        filename,
        mimeType: "text/markdown",
    };
}

/**
 * Export note to DOCX
 */
export async function exportToDOCX(noteId: string, userId: string): Promise<ExportResult> {
    const note = await prisma.note.findFirst({
        where: { id: noteId, userId },
        include: { project: true },
    });

    if (!note) {
        throw new Error("Note not found");
    }

    // Parse markdown content
    const lines = note.content.split("\n");
    const paragraphs: Paragraph[] = [];

    // Title
    paragraphs.push(
        new Paragraph({
            text: note.title,
            heading: HeadingLevel.HEADING_1,
        })
    );

    // Metadata
    paragraphs.push(
        new Paragraph({
            children: [
                new TextRun({ text: "Type: ", bold: true }),
                new TextRun(note.type),
            ],
        })
    );

    paragraphs.push(
        new Paragraph({
            children: [
                new TextRun({ text: "Created: ", bold: true }),
                new TextRun(note.createdAt.toISOString()),
            ],
        })
    );

    if (note.project) {
        paragraphs.push(
            new Paragraph({
                children: [
                    new TextRun({ text: "Project: ", bold: true }),
                    new TextRun(note.project.name),
                ],
            })
        );
    }

    paragraphs.push(new Paragraph({ text: "" })); // Spacer

    // Content - basic markdown parsing
    for (const line of lines) {
        if (!line.trim()) {
            paragraphs.push(new Paragraph({ text: "" }));
            continue;
        }

        // Heading detection
        if (line.startsWith("### ")) {
            paragraphs.push(
                new Paragraph({
                    text: line.replace(/^### /, ""),
                    heading: HeadingLevel.HEADING_3,
                })
            );
        } else if (line.startsWith("## ")) {
            paragraphs.push(
                new Paragraph({
                    text: line.replace(/^## /, ""),
                    heading: HeadingLevel.HEADING_2,
                })
            );
        } else if (line.startsWith("# ")) {
            paragraphs.push(
                new Paragraph({
                    text: line.replace(/^# /, ""),
                    heading: HeadingLevel.HEADING_1,
                })
            );
        } else {
            // Regular text
            paragraphs.push(new Paragraph({ text: line }));
        }
    }

    const doc = new Document({
        sections: [
            {
                properties: {},
                children: paragraphs,
            },
        ],
    });

    const buffer = await Packer.toBuffer(doc);
    const filename = `${sanitizeFilename(note.title)}.docx`;

    return {
        buffer,
        filename,
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };
}

/**
 * Export note to PDF
 */
export async function exportToPDF(noteId: string, userId: string): Promise<ExportResult> {
    const note = await prisma.note.findFirst({
        where: { id: noteId, userId },
        include: { project: true },
    });

    if (!note) {
        throw new Error("Note not found");
    }

    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });
        const buffers: Buffer[] = [];

        doc.on("data", buffers.push.bind(buffers));
        doc.on("end", () => {
            const buffer = Buffer.concat(buffers);
            const filename = `${sanitizeFilename(note.title)}.pdf`;
            resolve({
                buffer,
                filename,
                mimeType: "application/pdf",
            });
        });
        doc.on("error", reject);

        // Title
        doc.fontSize(20).font("Helvetica-Bold").text(note.title, { align: "center" });
        doc.moveDown();

        // Metadata
        doc.fontSize(10).font("Helvetica");
        doc.text(`Type: ${note.type}`);
        doc.text(`Created: ${note.createdAt.toISOString()}`);
        if (note.project) {
            doc.text(`Project: ${note.project.name}`);
        }
        doc.moveDown(2);

        // Content
        doc.fontSize(12).font("Helvetica");
        const lines = note.content.split("\n");

        for (const line of lines) {
            if (!line.trim()) {
                doc.moveDown(0.5);
                continue;
            }

            // Heading detection
            if (line.startsWith("### ")) {
                doc.fontSize(14).font("Helvetica-Bold").text(line.replace(/^### /, ""));
                doc.fontSize(12).font("Helvetica");
            } else if (line.startsWith("## ")) {
                doc.fontSize(16).font("Helvetica-Bold").text(line.replace(/^## /, ""));
                doc.fontSize(12).font("Helvetica");
            } else if (line.startsWith("# ")) {
                doc.fontSize(18).font("Helvetica-Bold").text(line.replace(/^# /, ""));
                doc.fontSize(12).font("Helvetica");
            } else {
                // Regular text
                doc.text(line);
            }
        }

        doc.end();
    });
}

/**
 * Export chat conversation to PDF
 */
export async function exportChatToPDF(chatId: string, userId: string): Promise<ExportResult> {
    const chat = await prisma.chat.findFirst({
        where: { id: chatId, userId },
        include: {
            Message: {
                orderBy: { createdAt: "asc" },
            },
        },
    });

    if (!chat) {
        throw new Error("Chat not found");
    }

    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });
        const buffers: Buffer[] = [];

        doc.on("data", buffers.push.bind(buffers));
        doc.on("end", () => {
            const buffer = Buffer.concat(buffers);
            const filename = `chat-${sanitizeFilename(chat.title || "conversation")}.pdf`;
            resolve({
                buffer,
                filename,
                mimeType: "application/pdf",
            });
        });
        doc.on("error", reject);

        // Title
        doc.fontSize(20).font("Helvetica-Bold").text(chat.title || "Chat Conversation", { align: "center" });
        doc.moveDown();

        // Metadata
        doc.fontSize(10).font("Helvetica");
        doc.text(`Created: ${chat.createdAt.toISOString()}`);
        doc.text(`Messages: ${chat.Message.length}`);
        doc.moveDown(2);

        // Messages
        for (const message of chat.Message) {
            const isUser = message.role === "USER";
            doc.fontSize(12)
                .font("Helvetica-Bold")
                .text(isUser ? "You:" : "Assistant:", { continued: false });
            
            doc.fontSize(11).font("Helvetica").text(message.content);
            doc.moveDown();
        }

        doc.end();
    });
}

/**
 * Export multiple notes as ZIP
 */
export async function exportNotesAsZip(noteIds: string[], userId: string, format: "pdf" | "markdown" | "docx"): Promise<ExportResult> {
    const archiver = require("archiver");
    const { Readable } = require("stream");

    const archive = archiver("zip", { zlib: { level: 9 } });
    const buffers: Buffer[] = [];

    archive.on("data", (chunk: Buffer) => buffers.push(chunk));

    const exportPromises = noteIds.map(async (noteId) => {
        try {
            let result: ExportResult;
            if (format === "pdf") {
                result = await exportToPDF(noteId, userId);
            } else if (format === "docx") {
                result = await exportToDOCX(noteId, userId);
            } else {
                result = await exportToMarkdown(noteId, userId);
            }
            return result;
        } catch (error) {
            console.error(`Failed to export note ${noteId}:`, error);
            return null;
        }
    });

    const results = await Promise.all(exportPromises);

    for (const result of results) {
        if (result) {
            archive.append(result.buffer, { name: result.filename });
        }
    }

    await archive.finalize();

    return new Promise((resolve) => {
        archive.on("end", () => {
            const buffer = Buffer.concat(buffers);
            resolve({
                buffer,
                filename: `notes-export-${Date.now()}.zip`,
                mimeType: "application/zip",
            });
        });
    });
}

/**
 * Sanitize filename
 */
function sanitizeFilename(filename: string): string {
    return filename
        .replace(/[^a-z0-9_\-\.]/gi, "_")
        .replace(/_+/g, "_")
        .substring(0, 100);
}
