import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/session";
import { hashPassword, comparePassword } from "@/lib/auth";
import { changePasswordSchema } from "@/lib/validations";

export async function PUT(req: NextRequest) {
    const session = await getUserFromRequest(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const validation = changePasswordSchema.safeParse(body);

    if (!validation.success) {
        return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
    }

    const { currentPassword, newPassword } = validation.data;

    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const valid = await comparePassword(currentPassword, user.password);
    if (!valid) {
        return NextResponse.json({ error: "Incorrect current password" }, { status: 400 });
    }

    const hashedPassword = await hashPassword(newPassword);

    await prisma.user.update({
        where: { id: session.userId },
        data: { password: hashedPassword }
    });

    return NextResponse.json({ message: "Password updated successfully" });
}
