import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");

    if (!query) {
        return NextResponse.json({ results: [] });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get("auth_access");

    if (!token) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const payload = jwt.verify(token.value, process.env.JWT_ACCESS_SECRET!) as { userId: string };
        const userId = payload.userId;

        const [chats, files] = await Promise.all([
            prisma.chat.findMany({
                where: {
                    userId,
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
                    userId,
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

        return NextResponse.json({ results });
    } catch (error) {
        return NextResponse.json({ error: "Search failed" }, { status: 500 });
    }
}
