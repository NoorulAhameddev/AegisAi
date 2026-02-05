import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/services/auth/auth";
import { parseQuery } from "@/lib/request-validation";
import { errorResponse, successResponse, unauthorizedResponse } from "@/lib/response";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
    const user = await verifyAuth(req);
    if (!user) return unauthorizedResponse();

    const querySchema = z.object({ q: z.string().optional() });
    const { data, response } = parseQuery(new URL(req.url), querySchema);
    if (response) return response;

    const query = data.q?.trim();
    if (!query) {
        return successResponse({ results: [] });
    }

    try {
        const [chats, files] = await Promise.all([
            prisma.chat.findMany({
                where: {
                    userId: user.id,
                    OR: [
                        { title: { contains: query, mode: "insensitive" } },
                        { Message: { some: { content: { contains: query, mode: "insensitive" } } } }
                    ]
                },
                take: 5,
                select: { id: true, title: true, createdAt: true }
            }),
            prisma.file.findMany({
                where: {
                    userId: user.id,
                    name: { contains: query, mode: "insensitive" }
                },
                take: 5,
                select: { id: true, name: true, type: true }
            })
        ]);

        const results = [
            ...chats.map(c => ({ id: c.id, type: "chat", title: c.title || "Untitled Chat", subtitle: new Date(c.createdAt).toLocaleDateString() })),
            ...files.map(f => ({ id: f.id, type: "file", title: f.name, subtitle: f.type.toUpperCase() }))
        ];

        return successResponse({ results });
    } catch (error) {
        logger.error("Search failed", error as Error, { userId: user.id });
        return errorResponse("Search failed", { status: 500 });
    }
}
