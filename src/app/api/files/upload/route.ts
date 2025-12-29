import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractText } from "@/lib/fileProcessor";
import jwt from "jsonwebtoken";
import fs from "fs";

export async function POST(req: NextRequest) {
    const token = req.cookies.get("auth_access")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let payload: any;
    try {
        payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!);
    } catch (err) {
        return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = `uploads/${Date.now()}-${file.name}`;
    fs.writeFileSync(filePath, buffer);

    const text = await extractText(filePath, file.type);

    const saved = await prisma.file.create({
        data: {
            userId: payload.userId,
            name: file.name,
            type: file.type,
            content: text,
        },
    });

    return NextResponse.json({ fileId: saved.id });
}
