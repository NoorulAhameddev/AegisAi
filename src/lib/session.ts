import { verifyAccessToken, signAccessToken, signRefreshToken, TokenPayload } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// Helper to hash token for storage
export function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function createSession(userId: string, userAgent?: string, ip?: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  // Generate tokens
  // We use a unique ID for the session/refresh token
  const sessionId = crypto.randomUUID();

  const refreshPayload = {
    userId,
    role: user.role,
    tokenVersion: user.tokenVersion,
    tokenId: sessionId
  };

  const refreshToken = signRefreshToken(refreshPayload);
  const accessToken = signAccessToken({
    userId,
    role: user.role,
    tokenVersion: user.tokenVersion
  });

  // Store Session
  // We store the Hash of the refresh token or just the sessionId?
  // Use the TokenId as the primary key or part of the record?
  // Schema has `token String @unique`. We'll store hash of the ACTUAL jwt string or just the ID?
  // Security best practice: Store hash of the refresh token string.

  await prisma.session.create({
    data: {
      userId,
      token: hashToken(refreshToken),
      userAgent,
      ipAddress: ip,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    }
  });

  return { accessToken, refreshToken };
}


export async function getUserFromRequest(req: Request | NextRequest) {
  let token: string | undefined;

  // Check Helper
  const getCookie = (name: string) => {
    if ("cookies" in req && typeof (req as any).cookies?.get === "function") {
      return (req as any).cookies.get(name)?.value;
    }
    const cookieHeader = req.headers.get("cookie");
    if (cookieHeader) {
      const match = cookieHeader.match(new RegExp(`${name}=([^;]+)`));
      return match ? match[1] : undefined;
    }
    return undefined;
  };

  token = getCookie("auth_access");

  if (!token) return null;

  try {
    const payload = verifyAccessToken(token);
    // Optional: Check if tokenVersion is still valid in DB?
    // Doing a DB call on every request is expensive, but for high security "revoke immediately" it is needed.
    // For now, we trust the short-lived access token (15m).
    // If strict mode is requested, we could check cache/Redis.
    return payload;
  } catch (err) {
    return null;
  }
}
