import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/session";

import { banUserSchema } from "@/lib/validations";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    // ... (auth check remains same)
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // RBAC Check (Phase 3)
    const { hasPermission } = await import("@/lib/rbac");
    if (!hasPermission(user.role as any, "user:ban")) {
        return NextResponse.json({ error: "Forbidden: Missing Permission" }, { status: 403 });
    }

    const userId = (await params).id;
    const body = await request.json();
    const validation = banUserSchema.safeParse(body);

    if (!validation.success) {
        return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
    }

    const { ban } = validation.data;

    try {
        const updated = await prisma.user.update({
            where: { id: userId },
            data: {
                isBanned: ban,
                // If banning, invalidate their refresh token so they can't simply refresh
                refreshToken: ban ? null : undefined
            } as any,
            select: { id: true, email: true, isBanned: true } as any
        });

        // Log this action
        await prisma.auditLog.create({
            data: {
                userId: userId, // The user being banned
                action: ban ? "BANNED_BY_ADMIN" : "UNBANNED_BY_ADMIN"
            }
        });

        return NextResponse.json({ user: updated });
    } catch (e) {
        return NextResponse.json({ error: "Failed to update user status" }, { status: 500 });
    }
}
