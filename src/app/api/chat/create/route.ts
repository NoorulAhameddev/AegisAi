import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/session";

export async function POST(req: NextRequest) {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const chat = await prisma.chat.create({
        data: { userId: user.userId },
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
