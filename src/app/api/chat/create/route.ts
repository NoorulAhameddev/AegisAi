import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/session";

export async function POST(req: NextRequest) {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // const user = { userId: "fe8036b1-afc1-4626-a567-1ebf4ff27f23" };
    // const user = { userId: "fe8036b1-afc1-4626-a567-1ebf4ff27f23" };

    let body = {};
    try {
        body = await req.json();
    } catch (e) {
        // If body is empty/invalid, use defaults
    }
    const { title } = body as any;

    const chat = await prisma.chat.create({
        data: {
            userId: user.userId,
            title: title || "New Conversation"
        },
    });

    // Audit (Silent fail is ok for logs)
    prisma.auditLog.create({
        data: {
            userId: user.userId,
            action: `CHAT_CREATE:${chat.id}`
        }
    }).catch(() => { });

    return NextResponse.json({ chatId: chat.id });
}
