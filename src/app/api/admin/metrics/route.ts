import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const users = await prisma.user.count();
    const usage = await prisma.usageMetric.aggregate({
        _sum: { tokens: true },
    });

    return NextResponse.json({
        users,
        totalTokensUsed: usage._sum.tokens || 0,
    });
}
