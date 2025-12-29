import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    const token = req.cookies.get("auth_access")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let payload: any;
    try {
        payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!);
    } catch (err) {
        return NextResponse.json({ error: "Invalid Token" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get("chatId");

    if (!chatId) {
        return NextResponse.json({ error: "Chat ID required" }, { status: 400 });
    }

    const messages = await prisma.message.findMany({
        where: { chatId: chatId!, chat: { userId: payload.userId } },
        orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(messages);
}
