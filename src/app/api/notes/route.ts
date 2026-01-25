/**
 * Notes API
 * CRUD operations for AI-generated notes
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/services/auth/auth";
import { prisma } from "@/lib/prisma";

// GET - List user's notes
export async function GET(req: NextRequest) {
    try {
        const authResult = await verifyAuth(req);
        if (!authResult) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const projectId = searchParams.get("projectId");
        const type = searchParams.get("type");
        const limit = parseInt(searchParams.get("limit") || "50");

        const userId = authResult.id;
        
        const where: any = { userId };
        if (projectId && projectId !== "null") {
            where.projectId = projectId;
        }
        if (type) {
            where.type = type;
        }

        const notes = await prisma.note.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: limit,
            include: {
                project: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        return NextResponse.json({ notes });
    } catch (error) {
        console.error("Get notes error:", error);
        return NextResponse.json({ error: "Failed to fetch notes" }, { status: 500 });
    }
}

// POST - Create note manually
export async function POST(req: NextRequest) {
    try {
        const authResult = await verifyAuth(req);
        if (!authResult) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { title, content, type, projectId, tags } = body;

        if (!title || !content || !type) {
            return NextResponse.json(
                { error: "Missing required fields: title, content, type" },
                { status: 400 }
            );
        }

        const userId = authResult.id;
        const note = await prisma.note.create({
            data: {
                userId,
                projectId: projectId || null,
                type,
                title,
                content,
                tags: tags || [],
            },
        });

        return NextResponse.json({ note });
    } catch (error) {
        console.error("Create note error:", error);
        return NextResponse.json({ error: "Failed to create note" }, { status: 500 });
    }
}

// PATCH - Update note
export async function PATCH(req: NextRequest) {
    try {
        const authResult = await verifyAuth(req);
        if (!authResult) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { noteId, title, content, tags } = body;

        if (!noteId) {
            return NextResponse.json({ error: "Note ID required" }, { status: 400 });
        }

        const userId = authResult.id;

        // Verify ownership
        const existing = await prisma.note.findFirst({
            where: { id: noteId, userId },
        });

        if (!existing) {
            return NextResponse.json({ error: "Note not found" }, { status: 404 });
        }

        const note = await prisma.note.update({
            where: { id: noteId },
            data: {
                title: title ?? undefined,
                content: content ?? undefined,
                tags: tags ?? undefined,
                version: { increment: 1 },
            },
        });

        return NextResponse.json({ note });
    } catch (error) {
        console.error("Update note error:", error);
        return NextResponse.json({ error: "Failed to update note" }, { status: 500 });
    }
}

// DELETE - Delete note
export async function DELETE(req: NextRequest) {
    try {
        const authResult = await verifyAuth(req);
        if (!authResult) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const noteId = searchParams.get("id");

        if (!noteId) {
            return NextResponse.json({ error: "Note ID required" }, { status: 400 });
        }

        const userId = authResult.id;

        // Verify ownership
        const note = await prisma.note.findFirst({
            where: { id: noteId, userId },
        });

        if (!note) {
            return NextResponse.json({ error: "Note not found" }, { status: 404 });
        }

        await prisma.note.delete({
            where: { id: noteId },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete note error:", error);
        return NextResponse.json({ error: "Failed to delete note" }, { status: 500 });
    }
}
