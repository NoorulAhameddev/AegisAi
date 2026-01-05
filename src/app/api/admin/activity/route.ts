import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const activity = await prisma.usageMetric.findMany({
        take: 20,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { email: true, name: true } } }
    });

    return NextResponse.json(activity);
}
