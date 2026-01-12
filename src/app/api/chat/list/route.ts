import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const token = req.cookies.get("auth_access")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const payload: any = jwt.verify(token, process.env.JWT_ACCESS_SECRET!);

        const chats = await prisma.chat.findMany({
            where: { userId: payload.userId },
            orderBy: { createdAt: "desc" },
            take: 20,
            select: {
                id: true,
                title: true,
                createdAt: true,
                updatedAt: true
            }
        });

        // Format for frontend
        const formatted = chats.map(c => ({
            id: c.id,
            title: c.title || "New Conversation",
            createdAt: c.createdAt,
            updatedAt: c.updatedAt
        }));

        return NextResponse.json(formatted);
    } catch (error) {
        console.error('[ChatList] Error:', error);
        return NextResponse.json({ error: "Invalid Token" }, { status: 401 });
    }
}
