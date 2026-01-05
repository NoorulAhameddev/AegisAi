import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { getSettings } from "@/lib/settings";

import { registerSchema } from "@/lib/validations";

export async function POST(req: Request) {
  try {
    const settings = getSettings();
    if (!settings.allowRegistrations) {
      return NextResponse.json({ error: "Registrations are currently disabled." }, { status: 403 });
    }

    const body = await req.json();
    const validation = registerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
    }

    const { name, email, password } = validation.data;

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return NextResponse.json({ error: "Email exists" }, { status: 409 });
    }

    const hashed = await hashPassword(password);

    const user = await prisma.user.create({
      data: { name, email, password: hashed },
    });

    // Auto-login
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    // Dynamic import to avoid cycles/issues
    const { createSession } = await import("@/lib/session");
    const { accessToken, refreshToken } = await createSession(user.id, userAgent, ip);

    // Audit
    await prisma.auditLog.create({
      data: { userId: user.id, action: "REGISTER" }
    });

    const res = NextResponse.json({ message: "Registered & Logged in" }, { status: 201 });

    res.cookies.set("auth_access", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 600,
    });

    res.cookies.set("auth_refresh", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 604800,
    });

    return res;
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
