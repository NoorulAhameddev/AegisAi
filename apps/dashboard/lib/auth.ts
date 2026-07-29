import jwt from "jsonwebtoken";
import { prisma } from "./prisma";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;

if (!ACCESS_SECRET) {
  throw new Error("JWT_ACCESS_SECRET is required for dashboard auth");
}

export async function verifyDashboardAuth(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const match = cookieHeader.match(/auth_access=([^;]+)/);
    if (!match) return null;

    const token = match[1];
    const payload = jwt.verify(token, ACCESS_SECRET);

    if (!payload || typeof payload !== "object" || !payload.userId) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isBanned: true,
        tokenVersion: true,
      },
    });

    if (!user || user.tokenVersion !== payload.tokenVersion || user.isBanned) {
      return null;
    }

    return user;
  } catch {
    return null;
  }
}

export function requireAuth(req: Request) {
  return verifyDashboardAuth(req);
}

export function unauthorizedResponse(message = "Unauthorized") {
  return new Response(JSON.stringify({ error: message }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

export function requireRole(user: any, allowedRoles: string[]) {
  if (!user || !allowedRoles.includes(user.role)) {
    return false;
  }
  return true;
}
