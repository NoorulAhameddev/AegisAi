import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/response";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  // Rate limiting: 20 logouts per minute (prevent spam)
  const rateLimitResult = await rateLimit(req, { limit: 20, window: 60 });
  if (!rateLimitResult.success) {
    return errorResponse("Rate limit exceeded", { status: 429 });
  }

  try {
    const token = req.cookies.get("auth_refresh")?.value;
    if (token) {
      const { hashToken } = await import("@/services/auth/session");
      const hashed = hashToken(token);
      // Best effort delete, don't fail if missing
      await prisma.session.delete({ where: { token: hashed } }).catch(() => {});
    }
  } catch (e) {
    // Ignore
  }

  const res = successResponse({ message: "Logged out" });
  res.cookies.set("auth_access", "", { maxAge: 0, path: "/" });
  res.cookies.set("auth_refresh", "", { maxAge: 0, path: "/" });
  return res;
}
