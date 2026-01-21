import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  comparePassword,
  signAccessToken,
  signRefreshToken,
} from "@/services/auth/auth";

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

  console.log(`[LOGIN_DEBUG] Attempting login for: ${email}`);
  const user = await prisma.user.findUnique({ where: { email } });
  
  if (!user) {
    console.log(`[LOGIN_DEBUG] User not found: ${email}`);
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  console.log(`[LOGIN_DEBUG] User found. Role: ${user.role}. Comparing password...`);
  console.log(`[LOGIN_DEBUG] Input password start: ${password.substring(0, 2)}... length: ${password.length}`);
  console.log(`[LOGIN_DEBUG] Stored hash start: ${user.password.substring(0, 10)}...`);

  const isValid = await comparePassword(password, user.password);
  console.log(`[LOGIN_DEBUG] Password valid: ${isValid}`);

  if (!isValid) {
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

  const isProd = process.env.NODE_ENV === "production";

  res.cookies.set("auth_access", accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "strict" : "lax", // allow mobile/web dev origin
    path: "/",
    maxAge: 600, // 10 minutes
  });

  res.cookies.set("auth_refresh", refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "strict" : "lax",
    path: "/",
    maxAge: 604800, // 7 days
  });

  return res;
}
