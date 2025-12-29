import { NextResponse } from "next/server";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const msg = searchParams.get("msg");
    console.log(`[CLIENT_DEBUG] ${msg}`);
    return NextResponse.json({ ok: true });
}
