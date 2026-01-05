import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  comparePassword,
  signAccessToken,
  signRefreshToken,
} from "@/lib/auth";

import { loginSchema } from "@/lib/validations";

export async function POST(req: Request) {
  let body;
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validation = loginSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
  }

  const { email, password } = validation.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  if (!(await comparePassword(password, user.password))) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  if ((user as any).isBanned) {
    return NextResponse.json({ error: "Your account has been permanently suspended." }, { status: 403 });
  }

  // Get IP and UserAgent
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const userAgent = req.headers.get("user-agent") || "unknown";

  const { createSession } = await import("@/lib/session");
  const { accessToken, refreshToken } = await createSession(user.id, userAgent, ip);

  // Audit Log
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "LOGIN",
    }
  });

  const res = NextResponse.json({ message: "Logged in" });

  res.cookies.set("auth_access", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 600, // 10 minutes
  });

  res.cookies.set("auth_refresh", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 604800, // 7 days
  });

  return res;
}
