import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("auth_refresh")?.value;
    if (token) {
      const { hashToken } = await import("@/lib/session");
      const hashed = hashToken(token);
      // Best effort delete, don't fail if missing
      await prisma.session.delete({ where: { token: hashed } }).catch(() => { });
    }
  } catch (e) {
    // Ignore
  }

  const res = NextResponse.json({ message: "Logged out" });
  res.cookies.set("auth_access", "", { maxAge: 0, path: '/' });
  res.cookies.set("auth_refresh", "", { maxAge: 0, path: '/' });
  return res;
}
