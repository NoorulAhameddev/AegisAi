import { NextRequest } from "next/server";
import { z } from "zod";
import { readPrisma } from "@/lib/read-replicas";
import { verifyAuth } from "@/services/auth/auth";
import { parseQuery } from "@/lib/request-validation";
import {
  errorResponse,
  successResponse,
  unauthorizedResponse,
} from "@/lib/response";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  // Rate limiting: 30 searches per minute
  const rateLimitResult = await rateLimit(req, { limit: 30, window: 60 });
  if (!rateLimitResult.success) {
    return errorResponse("Rate limit exceeded", { status: 429 });
  }

  const user = await verifyAuth(req);
  if (!user) return unauthorizedResponse();

  const querySchema = z.object({ q: z.string().optional() });
  const { data, response } = parseQuery(new URL(req.url), querySchema);
  if (response) return response;

  const query = data.q?.trim();
  if (!query) {
    return successResponse({ results: [] });
  }

  try {
    // NOTE: Message.content is encrypted and cannot be searched with SQL LIKE.
    // Search is limited to chat titles and file names only.
    // For full-text search of message content, use the RAG search endpoint.
    const [chats, files] = await Promise.all([
      readPrisma.chat.findMany({
        where: {
          userId: user.id,
          deletedAt: null,
          title: { contains: query, mode: "insensitive" },
        },
        take: 10,
        select: { id: true, title: true, createdAt: true },
      }),
      readPrisma.file.findMany({
        where: {
          userId: user.id,
          deletedAt: null,
          name: { contains: query, mode: "insensitive" },
        },
        take: 10,
        select: { id: true, name: true, type: true },
      }),
    ]);

    const results = [
      ...chats.map((c) => ({
        id: c.id,
        type: "chat",
        title: c.title || "Untitled Chat",
        subtitle: new Date(c.createdAt).toLocaleDateString(),
      })),
      ...files.map((f) => ({
        id: f.id,
        type: "file",
        title: f.name,
        subtitle: f.type.toUpperCase(),
      })),
    ];

    return successResponse({ results });
  } catch (error) {
    logger.error("Search failed", error as Error, { userId: user.id });
    return errorResponse("Search failed", { status: 500 });
  }
}
