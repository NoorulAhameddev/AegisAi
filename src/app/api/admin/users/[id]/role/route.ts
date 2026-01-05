import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/session";

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;

    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // RBAC Check
    const { hasPermission } = await import("@/lib/rbac");
    if (!hasPermission(user.role as any, "user:promote")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = params;
    const body = await req.json();
    const { role } = body;

    if (role !== "ADMIN" && role !== "USER") {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    try {
        const updated = await prisma.user.update({
            where: { id },
            data: { role: role }
        });
        return NextResponse.json(updated);
    } catch (e) {
        return NextResponse.json({ error: "Failed to update" }, { status: 500 });
    }
}
