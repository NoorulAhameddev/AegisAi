import { NextResponse } from "next/server";
import { getUserMemory } from "@/lib/memory";

export async function GET(req: Request) {
    const userId = req.headers.get("x-user-id");
    if (!userId)
        return NextResponse.json({ error: "Missing userId" }, { status: 400 });

    const memory = await getUserMemory(userId);
    return NextResponse.json(memory);
}
