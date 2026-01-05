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
    const { verifyRefreshToken, signAccessToken, signRefreshToken } = await import("@/lib/auth");
    const { hashToken, createSession } = await import("@/lib/session");

    // 1. Verify Signature
    const payload = verifyRefreshToken(token);

    // 2. Check DB for this exact token usage
    const hashed = hashToken(token);
    const session = await prisma.session.findUnique({ where: { token: hashed } });

    if (!session) {
      // TOKEN REUSE DETECTED!
      // The token is valid (crypto-wise) but not in DB.
      // This means it was likely already used and rotated, or it's a stolen old token.
      // SECURITY ACTION: Invalidate all sessions for this user?
      // YES, aggressive security is required.
      await prisma.session.deleteMany({ where: { userId: payload.userId } });
      console.warn(`[Security] Refresh Token Reuse attempt for User: ${payload.userId}. ALL SESSIONS REVOKED.`);
      return NextResponse.json({ error: "Invalid Session - Reuse Detected" }, { status: 401 });
    }

    // 3. Check Expiry (DB side)
    if (new Date() > session.expiresAt) {
      await prisma.session.delete({ where: { id: session.id } });
      return NextResponse.json({ error: "Session Expired" }, { status: 401 });
    }

    // 4. Fetch User to check Version
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 401 });

    if (user.tokenVersion !== payload.tokenVersion) {
      // Global revocation occurred
      await prisma.session.delete({ where: { id: session.id } });
      return NextResponse.json({ error: "Session Revoked" }, { status: 401 });
    }

    if ((user as any).isBanned) return NextResponse.json({ error: "Banned" }, { status: 403 });

    // 5. ROTATION: Delete old, Create New
    // Transactional consistency is best
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    // We can use a transaction, but separate calls are "okay" here if we don't mind tiny race window.
    // Deleting first ensures we don't have duplicates.
    await prisma.session.delete({ where: { id: session.id } });

    // Create New Session
    const { accessToken, refreshToken } = await createSession(user.id, userAgent, ip);

    const res = NextResponse.json({ message: "Refreshed" });

    res.cookies.set("auth_access", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 600, // 10m
    });

    res.cookies.set("auth_refresh", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 604800, // 7d
    });

    return res;
  } catch (e) {
    console.error("Refresh Error", e);
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}
