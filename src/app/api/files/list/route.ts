import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    const token = req.cookies.get("auth_access")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const payload: any = jwt.verify(token, process.env.JWT_ACCESS_SECRET!);
        const files = await prisma.file.findMany({
            where: { userId: payload.userId },
            orderBy: { createdAt: "desc" }
        });
        return NextResponse.json(files);
    } catch {
        return NextResponse.json({ error: "Invalid Token" }, { status: 401 });
    }
}
