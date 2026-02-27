import { prisma } from "@/lib/prisma";
import { openai } from "@/services/ai/openai";
import { NextRequest } from "next/server";
import { z } from "zod";
import { verifyAuth } from "@/services/auth/auth";
import { parseBody } from "@/lib/request-validation";
import {
  errorResponse,
  successResponse,
  unauthorizedResponse,
} from "@/lib/response";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const user = await verifyAuth(req);
  if (!user) return unauthorizedResponse();

  const bodySchema = z.object({
    fileId: z.string().min(1),
    question: z.string().min(1),
  });
  const { data, response } = await parseBody(req, bodySchema);
  if (response) return response;

  const file = await prisma.file.findFirst({
    where: { id: data.fileId, userId: user.id },
  });

  if (!file) return errorResponse("File not found", { status: 404 });

  try {
    const completion = await openai.chat.completions.create({
      model: "glm-5",
      messages: [
        { role: "system", content: "Answer ONLY using the provided document." },
        { role: "user", content: file.content.slice(0, 12000) },
        { role: "user", content: data.question },
      ],
    });

    return successResponse({
      answer: completion.choices[0].message.content ?? "",
    });
  } catch (error) {
    logger.error("File ask failed", error as Error, {
      userId: user.id,
      fileId: file.id,
    });
    return errorResponse("Failed to answer question", { status: 500 });
  }
}

