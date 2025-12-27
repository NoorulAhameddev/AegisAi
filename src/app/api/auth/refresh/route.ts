import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  verifyRefreshToken,
  signAccessToken,
  signRefreshToken,
} from "@/lib/auth";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("auth_refresh")?.value;
  if (!token) return NextResponse.json({ error: "No token" }, { status: 401 });

  try {
    const payload = verifyRefreshToken(token) as any;

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || user.refreshToken !== token)
      return NextResponse.json({ error: "Token mismatch" }, { status: 401 });

    const newAccess = signAccessToken({ userId: user.id, role: user.role });
    const newRefresh = signRefreshToken({ userId: user.id });

    await prisma.user.update({ where: { id: user.id }, data: { refreshToken: newRefresh } });

    const res = NextResponse.json({ message: "Refreshed" });

    res.cookies.set("auth_access", newAccess, {
      httpOnly: true,
      sameSite: "strict",
      path: "/",
      maxAge: 900,
    });

    res.cookies.set("auth_refresh", newRefresh, {
      httpOnly: true,
      sameSite: "strict",
      path: "/",
      maxAge: 604800,
    });

    return res;
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}
