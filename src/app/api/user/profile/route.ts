import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/session";
import { updateProfileSchema } from "@/lib/validations";

export async function PUT(req: NextRequest) {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const validation = updateProfileSchema.safeParse(body);

    if (!validation.success) {
        return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
    }

    const { name } = validation.data;

    // Only update fields that are provided
    const dataToUpdate: any = {};
    if (name) dataToUpdate.name = name.trim();

    if (Object.keys(dataToUpdate).length === 0) {
        return NextResponse.json({ message: "No changes needed" });
    }

    try {
        const updated = await prisma.user.update({
            where: { id: user.userId },
            data: dataToUpdate,
            select: { id: true, name: true, email: true }
        });

        return NextResponse.json(updated);
    } catch (e) {
        return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }
}
