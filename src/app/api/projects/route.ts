/**
 * Projects API
 * CRUD operations for projects
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { verifyAuth } from "@/services/auth/auth";
import { prisma } from "@/lib/prisma";
import { parseBody, parseQuery } from "@/lib/request-validation";
import { errorResponse, successResponse, unauthorizedResponse } from "@/lib/response";
import { logger } from "@/lib/logger";

// GET - List user's projects
export async function GET(req: NextRequest) {
    try {
        const authResult = await verifyAuth(req);
        if (!authResult) {
            return unauthorizedResponse();
        }

        const userId = authResult.id;
        const projects = await prisma.project.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            include: {
                _count: {
                    select: {
                        Chat: true,
                        File: true,
                        Note: true,
                    },
                },
            },
        });

        return successResponse({ projects });
    } catch (error) {
        logger.error("Get projects error", error as Error);
        return errorResponse("Failed to fetch projects", { status: 500 });
    }
}

// POST - Create new project
export async function POST(req: NextRequest) {
    try {
        const authResult = await verifyAuth(req);
        if (!authResult) {
            return unauthorizedResponse();
        }

        const bodySchema = z.object({
            name: z.string().min(1),
            description: z.string().optional(),
        });

        const { data, response } = await parseBody(req, bodySchema);
        if (response) return response;

        const userId = authResult.id;
        const project = await prisma.project.create({
            data: {
                userId,
                name: data.name.trim(),
                description: data.description?.trim() || null,
            },
        });

        return successResponse({ project });
    } catch (error) {
        logger.error("Create project error", error as Error);
        return errorResponse("Failed to create project", { status: 500 });
    }
}

// DELETE - Delete project
export async function DELETE(req: NextRequest) {
    try {
        const authResult = await verifyAuth(req);
        if (!authResult) {
            return unauthorizedResponse();
        }

        const querySchema = z.object({ id: z.string().min(1) });
        const { data, response } = parseQuery(new URL(req.url), querySchema);
        if (response) return response;

        const projectId = data.id;

        const userId = authResult.id;

        // Verify ownership
        const project = await prisma.project.findFirst({
            where: { id: projectId, userId },
        });

        if (!project) {
            return errorResponse("Project not found", { status: 404 });
        }

        await prisma.project.delete({
            where: { id: projectId },
        });

        return successResponse({ success: true });
    } catch (error) {
        logger.error("Delete project error", error as Error);
        return errorResponse("Failed to delete project", { status: 500 });
    }
}
