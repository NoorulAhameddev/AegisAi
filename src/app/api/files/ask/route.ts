import { prisma } from "@/lib/prisma";
import { openai } from "@/lib/openai";
import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
    const token = req.cookies.get("auth_access")?.value;
    if (!token) return new Response("Unauthorized", { status: 401 });

    let payload: any;
    try {
        payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!);
    } catch (e) {
        return new Response("Unauthorized", { status: 401 });
    }

    const { fileId, question } = await req.json();

    const file = await prisma.file.findFirst({
        where: { id: fileId, userId: payload.userId },
    });

    if (!file) return new Response("File not found", { status: 404 });

    const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            { role: "system", content: "Answer ONLY using the provided document." },
            { role: "user", content: file.content.slice(0, 12000) },
            { role: "user", content: question },
        ],
    });

    return new Response(completion.choices[0].message.content);
}
