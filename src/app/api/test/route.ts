import { NextResponse } from "next/server";

export async function GET(req: Request) {
    const cookieHeader = req.headers.get("cookie");
    const hasCookie = cookieHeader?.includes("auth_access");

    return NextResponse.json({
        status: "ok",
        time: new Date().toISOString(),
        auth: {
            hasCookie,
            cookieLength: cookieHeader?.length || 0
        },
        env: {
            hasOpenAIKey: !!process.env.OPENAI_API_KEY,
            hasJwtSecret: !!process.env.JWT_ACCESS_SECRET
        }
    });
}
