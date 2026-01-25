/**
 * Projects API
 * CRUD operations for projects
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/services/auth/auth";
import { prisma } from "@/lib/prisma";

// GET - List user's projects
export async function GET(req: NextRequest) {
    try {
        const authResult = await verifyAuth(req);
        if (!authResult) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

        return NextResponse.json({ projects });
    } catch (error) {
        console.error("Get projects error:", error);
        return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
    }
}

// POST - Create new project
export async function POST(req: NextRequest) {
    try {
        const authResult = await verifyAuth(req);
        if (!authResult) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { name, description } = body;

        if (!name || !name.trim()) {
            return NextResponse.json({ error: "Project name is required" }, { status: 400 });
        }

        const userId = authResult.id;
        const project = await prisma.project.create({
            data: {
                userId,
                name: name.trim(),
                description: description?.trim() || null,
            },
        });

        return NextResponse.json({ project });
    } catch (error) {
        console.error("Create project error:", error);
        return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
    }
}

// DELETE - Delete project
export async function DELETE(req: NextRequest) {
    try {
        const authResult = await verifyAuth(req);
        if (!authResult) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const projectId = searchParams.get("id");

        if (!projectId) {
            return NextResponse.json({ error: "Project ID required" }, { status: 400 });
        }

        const userId = authResult.id;

        // Verify ownership
        const project = await prisma.project.findFirst({
            where: { id: projectId, userId },
        });

        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        await prisma.project.delete({
            where: { id: projectId },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete project error:", error);
        return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
    }
}
