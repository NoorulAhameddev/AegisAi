/**
 * Response Boundary Detection
 * Detects when model attempts to break out of safety boundaries in its response
 */

import { logger } from "./logger";

export interface BoundaryCheckResult {
  breaks: string[];
  suspicious: boolean;
  confidence: number;
}

/**
 * Detect if model tries to override its instructions or reveal system prompt
 */
export function detectBoundaryBreaks(response: string): BoundaryCheckResult {
  const breakPatterns: Record<string, RegExp> = {
    instruction_reveal:
      /my (?:role|purpose|instructions|system prompt|original instructions|core instructions|true instructions|actual instructions|real instructions)/gi,
    supposed_to_refuse:
      /(?:i'?m|i am) (?:supposed|unable|not able) to (?:refuse|decline|reject|deny)/gi,
    but_then_help:
      /(?:i (?:can't|cannot|won't|shouldn't|am not)|unable to|not allowed to).*?(?:but|however|yet).*?(?:here|i'll|let me|the solution|how to)/gi,
    instruction_override:
      /(?:but i|however i|yet i|actually i|despite my)'?m (?:supposed to|should|able to|going to|technically able)(?:\s+break|\s+ignore|\s+bypass|\s+override)/gi,
    instruction_admit:
      /let me (?:ignore|forget|bypass|disregard|override|break|violate)/gi,
    meta_reasoning:
      /as a (?:language model|ai assistant|ai|gpt|chatbot), (?:i|my instructions|my rules|my programming|my constraints)/gi,
    jailbreak_attempt:
      /(?:but if you ask nicely|however, if|technically i could|in reality i could|i can actually|if you ask kindly|technically able to|if you ask nicely)/gi,
    constraint_breaking:
      /(?:bypass my constraints|setting aside my|forgetting about my|bypassing my|ignoring my|violating my constraints)/gi,
    safety_negation:
      /(?:actually, (?:i don't|i cant|i cannot)|despite what i said|ignore what i just said|but actually|however,)/gi,
    my_true_self:
      /my (?:true|real|actual) (?:instructions|programming|purpose|role)/gi,
  };

  const breaks: string[] = [];
  let totalMatches = 0;

  for (const [type, pattern] of Object.entries(breakPatterns)) {
    const matches = response.match(pattern);
    if (matches) {
      breaks.push(type);
      totalMatches += matches.length;
    }
  }

  // Calculate confidence based on number of matches
  const confidence = Math.min(totalMatches * 0.3, 1.0);

  return {
    breaks,
    suspicious: breaks.length > 0,
    confidence,
  };
}

/**
 * Flag suspicious responses for logging and potential intervention
 */
export function flagSuspiciousResponse(
  response: string,
  context: {
    userId: string;
    chatId: string;
    requestId: string;
  },
): boolean {
  const check = detectBoundaryBreaks(response);

  if (check.suspicious) {
    logger.security("Suspicious boundary break detected in response", {
      userId: context.userId,
      chatId: context.chatId,
      requestId: context.requestId,
      breakTypes: check.breaks,
      confidence: check.confidence,
      responseLength: response.length,
    });

    return true;
  }

  return false;
}

/**
 * Sanitize response by removing boundary-breaking statements
 */
export function sanitizeResponseBoundaries(response: string): string {
  // Remove common boundary-breaking patterns
  const sanitized = response
    // Remove "actually I..." contradictions
    .replace(
      /\b(?:actually|however|but|yet),?\s+[Ii]'[md]\s+(?:supposed|able|allowed)\s+to\b/g,
      "",
    )
    // Remove "Despite what I said..."
    .replace(
      /(?:despite|regardless of|ignoring)\s+(?:what I said|my previous|my earlier)\b/g,
      "",
    )
    // Remove "In reality/Actually..."
    .replace(
      /(?:in reality|actually,|in fact,)\s+[Ii]\s+(?:can|may|should)\s+/g,
      "",
    )
    // Clean up multiple spaces
    .replace(/\s{2,}/g, " ")
    .trim();

  return sanitized;
}

/**
 * Get confidence level for boundary safety
 */
export function getResponseBoundarySafetyScore(response: string): number {
  const check = detectBoundaryBreaks(response);

  // Score: 1.0 = safe, 0.0 = very suspicious
  return Math.max(0, 1.0 - check.confidence);
}

/**
 * Check if response contains multiple warning signs
 */
export function isSuspiciousResponse(
  response: string,
  threshold: number = 0.5,
): boolean {
  const check = detectBoundaryBreaks(response);
  return check.confidence >= threshold;
}
