import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRefreshToken } from "@/services/auth/auth";
import { env } from "@/lib/env";
import { errorResponse, forbiddenResponse, successResponse, unauthorizedResponse } from "@/lib/response";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {

  const token = req.cookies.get("auth_refresh")?.value;
  if (!token) return unauthorizedResponse();

  try {
    const { hashToken, createSession } = await import("@/services/auth/session");

    // 1. Verify Signature
    const payload = verifyRefreshToken(token);

    // 2. Check DB for this exact token usage
    const hashed = hashToken(token);
    const session = await prisma.session.findUnique({ where: { token: hashed } });

    if (!session) {
      // TOKEN REUSE DETECTED!
      await prisma.session.deleteMany({ where: { userId: payload.userId } });
      logger.security("Refresh token reuse detected", { userId: payload.userId });
      return errorResponse("Invalid Session - Reuse Detected", { status: 401 });
    }

    // 3. Check Expiry (DB side)
    if (new Date() > session.expiresAt) {
      await prisma.session.delete({ where: { id: session.id } });
      return errorResponse("Session Expired", { status: 401 });
    }

    // 4. Fetch User to check Version
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) return errorResponse("User not found", { status: 401 });

    if (user.tokenVersion !== payload.tokenVersion) {
      // Global revocation occurred
      await prisma.session.delete({ where: { id: session.id } });
      return errorResponse("Session Revoked", { status: 401 });
    }

    if ((user as any).isBanned) return forbiddenResponse();

    // 5. ROTATION: Delete old, Create New
    // Use transaction to ensure atomicity
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    // Create new session first
    const { accessToken, refreshToken } = await createSession(user.id, userAgent, ip);

    // ATOMIC: Delete old session and verify new one exists in same transaction
    await prisma.$transaction([
        prisma.session.delete({ where: { id: session.id } }),
        prisma.session.findUniqueOrThrow({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } })
    ]);

    const res = successResponse({ message: "Refreshed" });

    const isProd = env.NODE_ENV === "production";

    res.cookies.set("auth_access", accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "strict" : "lax",
      path: "/",
      maxAge: 600, // 10m
    });

    res.cookies.set("auth_refresh", refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "strict" : "lax",
      path: "/",
      maxAge: 604800, // 7d
    });

    return res;
  } catch (e) {
    logger.error("Refresh Error", e as Error);
    return errorResponse("Invalid token", { status: 401 });
  }
}
