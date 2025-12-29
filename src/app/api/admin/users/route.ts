import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const token = req.cookies.get("auth_access")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const payload: any = jwt.verify(token, process.env.JWT_ACCESS_SECRET!);
        if (payload.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    } catch {
        return NextResponse.json({ error: "Invalid Token" }, { status: 401 });
    }

    const users = await prisma.user.findMany({
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
            _count: {
                select: { chats: true }
            }
        },
        orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(users);
}
