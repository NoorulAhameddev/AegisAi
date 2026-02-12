import { openai } from "@/services/ai/openai";
import { logger } from "@/lib/logger";

/**
 * MEDIUM FIX: OpenAI Moderation API
 * Provides a second safety layer using OpenAI's trained moderation model
 * 
 * Does NOT replace custom safety logic, but complements it
 * - Custom logic catches prompt injection and specific unsafe behaviors
 * - OAI Moderation catches general harmful content
 */

export interface ModerationResult {
    flagged: boolean;
    categories: string[];
    scores: Record<string, number>;
}

/**
 * Check if content violates OpenAI's usage policies
 */
export async function checkModeration(content: string): Promise<ModerationResult> {
    try {
        if (!content || content.length === 0) {
            return { flagged: false, categories: [], scores: {} };
        }

        const response = await openai.moderations.create({
            input: content.substring(0, 5000) // API has length limit
        });

        const result = response.results[0];

        // Extract flagged categories
        const categories: string[] = [];
        const scores: Record<string, number> = {};

        const categoryMap: Record<string, keyof typeof result.categories> = {
            sexual: "sexual",
            hateful: "hate",
            harassment: "harassment",
            assault: "harassment",
            selfHarm: "self-harm",
            illegal: "illegal",
            illegal_activity: "illegal",
            illegal_goods: "illegal",
            illegal_services: "illegal",
            selfHarmInstructions: "self-harm",
            selfHarmIntent: "self-harm",
            violence: "violence",
            violentCrime: "violence"
        };

        if (result.flagged) {
            for (const [key, flagged] of Object.entries(result.categories)) {
                if (flagged) {
                    categories.push(key);
                    scores[key] = (result as any).category_scores?.[key as any] || 1.0;
                }
            }
        }

        return {
            flagged: result.flagged,
            categories,
            scores
        };
    } catch (error) {
        logger.error("Moderation API call failed", error as Error);
        // Fail open—don't block legitimate content if API fails
        return {
            flagged: false,
            categories: [],
            scores: {}
        };
    }
}

/**
 * Check both input (user message) and output (model response)
 */
export async function checkModerationBothDirections(
    userInput: string,
    modelOutput: string
): Promise<{
    inputFlagged: boolean;
    outputFlagged: boolean;
    details: {
        input: ModerationResult;
        output: ModerationResult;
    };
}> {
    const [inputResult, outputResult] = await Promise.all([
        checkModeration(userInput),
        checkModeration(modelOutput)
    ]);

    return {
        inputFlagged: inputResult.flagged,
        outputFlagged: outputResult.flagged,
        details: {
            input: inputResult,
            output: outputResult
        }
    };
}

/**
 * Format moderation results for logging
 */
export function formatModerationForLog(result: ModerationResult): string {
    if (!result.flagged) {
        return "No moderation flags";
    }

    return `Moderation flags: ${result.categories.join(", ")} (scores: ${Object.entries(result.scores)
        .map(([k, v]) => `${k}=${v.toFixed(2)}`)
        .join(", ")})`;
}
