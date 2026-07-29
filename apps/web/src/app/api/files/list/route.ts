import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { verifyAuth } from "@/services/auth/auth";
import { logger } from "@/lib/logger";
import { decrypt } from "@/lib/encryption";
import {
  errorResponse,
  successResponse,
  unauthorizedResponse,
} from "@/lib/response";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  try {
    // Rate limiting: 30 list requests per minute
    const rateLimitResult = await rateLimit(req, { limit: 30, window: 60 });
    if (!rateLimitResult.success) {
      return errorResponse("Rate limit exceeded", { status: 429 });
    }

    const user = await verifyAuth(req);
    if (!user) return unauthorizedResponse();

    // Only select non-encrypted fields + name (which needs decryption)
    const files = await prisma.file.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        type: true,
        size: true,
        projectId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Decrypt file names (they are stored encrypted)
    const decryptedFiles = await Promise.all(
      files.map(async (file) => ({
        ...file,
        name: await decrypt(file.name),
      })),
    );

    return successResponse(decryptedFiles);
  } catch (error) {
    logger.error("Files list fetch failed", error as Error);
    return errorResponse("Failed to fetch files", { status: 500 });
  }
}
