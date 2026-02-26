import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/services/auth/auth";
import {
  errorResponse,
  successResponse,
  unauthorizedResponse,
} from "@/lib/response";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  // Rate limiting: 60 requests per minute (frequently polled endpoint)
  const rateLimitResult = await rateLimit(req, { limit: 60, window: 60 });
  if (!rateLimitResult.success) {
    return errorResponse("Rate limit exceeded", { status: 429 });
  }

  const auth = await verifyAuth(req);
  if (!auth) return unauthorizedResponse();

  const user = await prisma.user.findUnique({
    where: { id: auth.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
  });

  if (!user) return errorResponse("User not found", { status: 404 });

  try {
    return successResponse(user);
  } catch (error) {
    logger.error("Auth me failed", error as Error);
    return errorResponse("Failed to fetch user", { status: 500 });
  }
}
