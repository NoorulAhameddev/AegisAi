import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function DELETE(req: Request) {
    const token = req.cookies.get("auth_access")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { fileId } = await req.json();

    try {
        const payload: any = jwt.verify(token, process.env.JWT_ACCESS_SECRET!);

        const file = await prisma.file.findUnique({
            where: { id: fileId }
        });

        if (!file || file.userId !== payload.userId) {
            return NextResponse.json({ error: "File not found or access denied" }, { status: 404 });
        }

        // Delete from DB
        await prisma.file.delete({ where: { id: fileId } });

        // Try delete from disk (ignore error if missing)
        try {
            await fs.unlink(file.path);
        } catch (e) {
            console.warn("File could not be deleted from disk", e);
        }

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: "Action failed" }, { status: 500 });
    }
}
