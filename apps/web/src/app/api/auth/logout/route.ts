import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/response";
import { rateLimit } from "@/lib/rate-limit";
import { verifyAccessToken } from "@/services/auth/auth";
import { invalidateTokenVersion } from "@/lib/token-version-cache";

export async function POST(req: NextRequest) {
  // Rate limiting: 20 logouts per minute (prevent spam)
  const rateLimitResult = await rateLimit(req, { limit: 20, window: 60 });
  if (!rateLimitResult.success) {
    return errorResponse("Rate limit exceeded", { status: 429 });
  }

  let userId: string | undefined;
  
  try {
    const token = req.cookies.get("auth_access")?.value;
    if (token) {
      const payload = verifyAccessToken(token);
      userId = payload.userId;
      
      // Invalidate token version cache for immediate revocation
      if (userId) {
        await invalidateTokenVersion(userId);
      }
    }
    
    if (userId) {
      // Increment token version to revoke all sessions
      await prisma.user.update({
        where: { id: userId },
        data: { tokenVersion: { increment: 1 } },
      });
    }
    
    const refreshToken = req.cookies.get("auth_refresh")?.value;
    if (refreshToken) {
      const { hashToken } = await import("@/services/auth/session");
      const hashed = hashToken(refreshToken);
      // Best effort delete, don't fail if missing
      await prisma.session.delete({ where: { token: hashed } }).catch(() => {});
    }
  } catch (e) {
    // Ignore errors but attempt logout cleanup
  }

  const res = successResponse({ message: "Logged out" });
  res.cookies.set("auth_access", "", { maxAge: 0, path: "/" });
  res.cookies.set("auth_refresh", "", { maxAge: 0, path: "/" });
  return res;
}
