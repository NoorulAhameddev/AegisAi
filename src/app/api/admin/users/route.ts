import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

import { requirePermission } from "@/lib/rbac";
import { Role } from "@prisma/client";

export async function GET(req: NextRequest) {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        requirePermission(user.role as Role, "user:read");
    } catch (e) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isBanned: true,
                createdAt: true,
                _count: {
                    select: { Chat: true }
                }
            },
            orderBy: { createdAt: "desc" }
        });

        // Transform to match frontend expectation (lowercase 'chats')
        const formattedUsers = users.map(user => ({
            ...user,
            _count: {
                chats: user._count.Chat
            }
        }));

        return NextResponse.json(formattedUsers);
    } catch (error) {
        console.error("Error fetching users:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
