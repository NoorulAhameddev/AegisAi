/**
 * Notes API
 * CRUD operations for AI-generated notes
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { verifyAuth } from "@/services/auth/auth";
import { prisma } from "@/lib/prisma";
import { parseBody, parseQuery } from "@/lib/request-validation";
import { errorResponse, successResponse, unauthorizedResponse } from "@/lib/response";
import { logger } from "@/lib/logger";

// GET - List user's notes
export async function GET(req: NextRequest) {
    try {
        const authResult = await verifyAuth(req);
        if (!authResult) {
            return unauthorizedResponse();
        }

        const querySchema = z.object({
            projectId: z.string().optional(),
            type: z.string().optional(),
            limit: z.coerce.number().int().min(1).max(100).default(50),
        });

        const { data, response } = parseQuery(new URL(req.url), querySchema);
        if (response) return response;

        const { projectId, type, limit } = data;

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

        return successResponse({ notes });
    } catch (error) {
        logger.error("Get notes error", error as Error);
        return errorResponse("Failed to fetch notes", { status: 500 });
    }
}

// POST - Create note manually
export async function POST(req: NextRequest) {
    try {
        const authResult = await verifyAuth(req);
        if (!authResult) {
            return unauthorizedResponse();
        }

        const bodySchema = z.object({
            title: z.string().min(1),
            content: z.string().min(1),
            type: z.string().min(1),
            projectId: z.string().nullable().optional(),
            tags: z.array(z.string()).optional(),
        });

        const { data, response } = await parseBody(req, bodySchema);
        if (response) return response;

        const { title, content, type, projectId, tags } = data;

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

        return successResponse({ note });
    } catch (error) {
        logger.error("Create note error", error as Error);
        return errorResponse("Failed to create note", { status: 500 });
    }
}

// PATCH - Update note
export async function PATCH(req: NextRequest) {
    try {
        const authResult = await verifyAuth(req);
        if (!authResult) {
            return unauthorizedResponse();
        }

        const bodySchema = z.object({
            noteId: z.string().min(1),
            title: z.string().optional(),
            content: z.string().optional(),
            tags: z.array(z.string()).optional(),
        });

        const { data, response } = await parseBody(req, bodySchema);
        if (response) return response;

        const { noteId, title, content, tags } = data;

        const userId = authResult.id;

        // Verify ownership
        const existing = await prisma.note.findFirst({
            where: { id: noteId, userId },
        });

        if (!existing) {
            return errorResponse("Note not found", { status: 404 });
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

        return successResponse({ note });
    } catch (error) {
        logger.error("Update note error", error as Error);
        return errorResponse("Failed to update note", { status: 500 });
    }
}

// DELETE - Delete note
export async function DELETE(req: NextRequest) {
    try {
        const authResult = await verifyAuth(req);
        if (!authResult) {
            return unauthorizedResponse();
        }

        const querySchema = z.object({ id: z.string().min(1) });
        const { data, response } = parseQuery(new URL(req.url), querySchema);
        if (response) return response;

        const noteId = data.id;

        const userId = authResult.id;

        // Verify ownership
        const note = await prisma.note.findFirst({
            where: { id: noteId, userId },
        });

        if (!note) {
            return errorResponse("Note not found", { status: 404 });
        }

        await prisma.note.delete({
            where: { id: noteId },
        });

        return successResponse({ success: true });
    } catch (error) {
        logger.error("Delete note error", error as Error);
        return errorResponse("Failed to delete note", { status: 500 });
    }
}
