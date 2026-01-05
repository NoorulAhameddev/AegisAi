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
            include: {
                messages: {
                    take: 1,
                    orderBy: { createdAt: "desc" } // Use first message as title if needed, or generated title
                }
            }
        });

        // Transform for frontend
        const formatted = chats.map(c => ({
            id: c.id,
            title: c.messages[0]?.content.substring(0, 30) || "New Conversation",
            createdAt: c.createdAt
        }));

        return NextResponse.json(formatted);
    } catch {
        return NextResponse.json({ error: "Invalid Token" }, { status: 401 });
    }
}
