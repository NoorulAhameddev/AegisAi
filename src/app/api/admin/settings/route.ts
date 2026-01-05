import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/session";
import { getSettings, saveSettings } from "@/lib/settings";

export async function GET(req: NextRequest) {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { hasPermission } = await import("@/lib/rbac");
    if (!hasPermission(user.role as any, "settings:manage")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    return NextResponse.json(getSettings());
}

export async function POST(req: NextRequest) {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { hasPermission } = await import("@/lib/rbac");
    if (!hasPermission(user.role as any, "settings:manage")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const current = getSettings();
    const newSettings = { ...current, ...body };

    saveSettings(newSettings);
    return NextResponse.json(newSettings);
}
