/**
 * AI Operations API Routes
 * Endpoints for summaries, notes, extracts, and transformations
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { verifyAuth } from "@/services/auth/auth";
import * as operations from "@/services/ai/operations.service";
import { parseBody } from "@/lib/request-validation";
import {
  errorResponse,
  successResponse,
  unauthorizedResponse,
} from "@/lib/response";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const authResult = await verifyAuth(req);
    if (!authResult) {
      return unauthorizedResponse();
    }

    const bodySchema = z.object({
      operation: z.string().min(1),
      text: z.string().min(1),
      projectId: z.string().optional(),
      style: z.string().optional(),
    });
    const { data, response } = await parseBody(req, bodySchema);
    if (response) return response;

    const { operation, text, projectId, style } = data;

    const userId = authResult.id;
    let result;

    switch (operation) {
      case "summary-short":
        result = await operations.generateShortSummary(text, userId, projectId);
        break;
      case "summary-detailed":
        result = await operations.generateDetailedSummary(
          text,
          userId,
          projectId,
        );
        break;
      case "structured-notes":
        result = await operations.generateStructuredNotes(
          text,
          userId,
          projectId,
        );
        break;
      case "bullet-points":
        result = await operations.extractBulletPoints(text, userId, projectId);
        break;
      case "key-concepts":
        result = await operations.extractKeyConcepts(text, userId, projectId);
        break;
      case "glossary":
        result = await operations.generateGlossary(text, userId, projectId);
        break;
      case "examples":
        result = await operations.generateExamples(text, userId, projectId);
        break;
      case "eli5":
        result = await operations.generateELI5(text, userId, projectId);
        break;
      case "rewrite":
        const rewritten = await operations.rewriteContent(
          text,
          style || "professional",
        );
        result = { content: rewritten };
        break;
      case "flashcards":
        result = await operations.generateFlashcards(text, userId, projectId);
        break;
      case "quiz":
        result = await operations.generateQuiz(text, userId, projectId);
        break;
      case "questions":
        result = await operations.generateQuestions(text, userId, projectId);
        break;
      case "exam-notes":
        result = await operations.generateExamNotes(text, userId, projectId);
        break;
      default:
        return errorResponse("Invalid operation", { status: 400 });
    }

    return successResponse(result);
  } catch (error) {
    logger.error("AI operation error", error as Error);
    return errorResponse("Internal server error", { status: 500 });
  }
}
