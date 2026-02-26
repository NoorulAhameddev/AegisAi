import { readPrisma } from "@/lib/read-replicas";
import { NextRequest } from "next/server";
import { verifyAuth } from "@/services/auth/auth";
import {
  errorResponse,
  forbiddenResponse,
  successResponse,
  unauthorizedResponse,
} from "@/lib/response";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";

import { requirePermission } from "@/services/auth/rbac";
import { Role } from "@prisma/client";

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

export async function GET(req: NextRequest) {
  // Rate limiting: 100 req/min for admin operations
  const rateLimitResult = await rateLimit(req, { limit: 100, window: 60 });
  if (!rateLimitResult.success) {
    return errorResponse("Rate limit exceeded", { status: 429 });
  }

  const user = await verifyAuth(req);
  if (!user) return unauthorizedResponse();

  try {
    requirePermission(user.role as Role, "user:read");
  } catch (e) {
    return forbiddenResponse();
  }

  try {
    // Parse pagination params from query string
    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor");
    const pageSize = Math.min(
      parseInt(searchParams.get("limit") || String(DEFAULT_PAGE_SIZE), 10),
      MAX_PAGE_SIZE,
    );

    // Cursor-based pagination
    const users = await readPrisma.user.findMany({
      take: pageSize + 1, // Fetch one extra to determine if there's a next page
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isBanned: true,
        createdAt: true,
        _count: {
          select: { Chat: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Determine if there's a next page
    const hasMore = users.length > pageSize;
    const results = hasMore ? users.slice(0, -1) : users;
    const nextCursor = hasMore ? results[results.length - 1]?.id : null;

    // Transform to match frontend expectation (lowercase 'chats')
    const formattedUsers = results.map((user) => ({
      ...user,
      _count: {
        chats: user._count.Chat,
      },
    }));

    return successResponse({
      users: formattedUsers,
      nextCursor,
      hasMore,
    });
  } catch (error) {
    logger.error("Admin users fetch failed", error as Error, {
      adminId: user.id,
    });
    return errorResponse("Internal Server Error", { status: 500 });
  }
}
