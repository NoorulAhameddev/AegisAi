import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    const token = req.cookies.get("auth_access")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let payload: any;
    try {
        payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!);
    } catch {
        return NextResponse.json({ error: "Invalid Token" }, { status: 401 });
    }

    if (payload.role !== "ADMIN")
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const users = await prisma.user.count();
    const usage = await prisma.usageMetric.aggregate({
        _sum: { tokens: true },
    });

    return NextResponse.json({
        users,
        totalTokensUsed: usage._sum.tokens || 0,
    });
}
