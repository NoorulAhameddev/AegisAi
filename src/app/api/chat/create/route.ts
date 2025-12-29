import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

export async function POST(req: Request) {
    const token = req.cookies.get("auth_access")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let payload: any;
    try {
        payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!);
    } catch (err) {
        return NextResponse.json({ error: "Invalid Token" }, { status: 401 });
    }

    const chat = await prisma.chat.create({
        data: { userId: payload.userId },
    });

    return NextResponse.json({ chatId: chat.id });
}
