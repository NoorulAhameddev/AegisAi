/**
 * AI Operations API Routes
 * Endpoints for summaries, notes, extracts, and transformations
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/services/auth/auth";
import * as operations from "@/services/ai/operations.service";

export async function POST(req: NextRequest) {
    try {
        const authResult = await verifyAuth(req);
        if (!authResult) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { operation, text, projectId, style } = body;

        if (!operation || !text) {
            return NextResponse.json(
                { error: "Missing required fields: operation, text" },
                { status: 400 }
            );
        }

        const userId = authResult.id;
        let result;

        switch (operation) {
            case "summary-short":
                result = await operations.generateShortSummary(text, userId, projectId);
                break;
            case "summary-detailed":
                result = await operations.generateDetailedSummary(text, userId, projectId);
                break;
            case "structured-notes":
                result = await operations.generateStructuredNotes(text, userId, projectId);
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
                const rewritten = await operations.rewriteContent(text, style || "professional");
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
                return NextResponse.json({ error: "Invalid operation" }, { status: 400 });
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error("AI operation error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}
