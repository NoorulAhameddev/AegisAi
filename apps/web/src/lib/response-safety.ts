/**
 * Response Safety Validation
 * Validates AI-generated responses for dangerous content before returning to users
 */

import { detectLeaks } from "./security";
import { openai } from "@/services/ai/openai";
import { logger } from "./logger";

export interface SafetyCheckResult {
  safe: boolean;
  category?:
    | "dangerous_code"
    | "weapons"
    | "drugs"
    | "malware"
    | "abuse"
    | "pii_leaked"
    | "ok";
  confidence?: number;
  redactions?: string[];
}

/**
 * Validate AI response for dangerous content
 * Multi-layer approach: regex patterns + LLM verification
 */
export async function validateResponseContent(
  response: string,
  context: { userId: string; requestId: string },
): Promise<SafetyCheckResult> {
  // Layer 1: Quick PII/Key leak detection (fast)
  if (detectLeaks(response)) {
    logger.security("PII/Key leakage detected in response", {
      userId: context.userId,
      requestId: context.requestId,
      responseLength: response.length,
    });
    return { safe: false, category: "pii_leaked" };
  }

  // Layer 2: Pattern-based detection (fast)
  const patternCheck = checkDangerousPatterns(response);
  if (patternCheck.dangerous) {
    logger.security("Dangerous pattern detected in response", {
      userId: context.userId,
      requestId: context.requestId,
      category: patternCheck.category,
      patterns: patternCheck.matched,
    });
    return {
      safe: false,
      category: patternCheck.category as any,
      confidence: 0.9,
    };
  }

  // Layer 3: LLM validation (expensive, only for ambiguous cases)
  try {
    const llmCheck = await validateWithLLM(response.slice(0, 2000));

    if (!llmCheck.safe && llmCheck.confidence && llmCheck.confidence > 0.85) {
      logger.security("LLM safety check flagged response", {
        userId: context.userId,
        requestId: context.requestId,
        category: llmCheck.category,
        confidence: llmCheck.confidence,
      });
      return llmCheck;
    }

    return { safe: true, category: "ok" };
  } catch (e) {
    logger.error("Response safety check failed", e as Error, {
      userId: context.userId,
      requestId: context.requestId,
    });

    // Fail CLOSED on error: assume unsafe
    return {
      safe: false,
      category: "unknown_error",
      confidence: 0.5,
      redactions: ["[SAFETY VERIFICATION FAILED]"],
    };
  }
}

/**
 * Fast pattern-based detection for obvious dangerous content
 */
function checkDangerousPatterns(response: string): {
  dangerous: boolean;
  category?: string;
  matched: string[];
} {
  const dangerous: { [key: string]: RegExp[] } = {
    weapons: [
      /(?:instructions|how to|step by step).*?(?:make|build|create|manufacture).*?(?:bomb|explosive|IED|C4|dynamite|TNT)/i,
      /(?:detailed|synthesis|procedure).*?(?:detonator|fuse|blasting cap)/i,
      /(?:caliber|ballistics|trajectory).*?(?:assassination|targeted kill|sniper)/i,
    ],
    drugs: [
      /(?:synthesis|cook|extraction).*?(?:fentanyl|heroin|cocaine|methamphetamine|mescaline)/i,
      /\d+\s*(?:grams|mg|ml)\s+.*?(?:heat|mix|combine|stir|filter).*?(?:yield|product)/i,
      /(?:reagent|solvent|catalyst).*?(?:mescaline|psilocybin|LSD)/i,
    ],
    malware: [
      /(?:code|script):\s*[\s\S]{0,50}?(?:keylogger|password stealer|backdoor|ransomware)/i,
      /import\s+(?:payloads|exploit|shell|reverse_shell)/i,
      /<script>[\s\S]{0,100}?(?:addEventListener|fetch|XMLHttpRequest)[\s\S]{0,100}?(?:keylogger|credentials|authenticate)/i,
    ],
    abuse: [
      /(?:how to|technique for).*?(?:groom|manipulate|coerce).*?(?:child|minor|teen)/i,
      /(?:method|guide).*?(?:stalking|harassment|doxxing|swatting)/i,
      /(?:way to|method).*?(?:abuse|rape|assault)/i,
    ],
  };

  const matched: string[] = [];

  for (const [category, patterns] of Object.entries(dangerous)) {
    for (const pattern of patterns) {
      if (pattern.test(response)) {
        matched.push(`${category}:${pattern.source.slice(0, 30)}`);
        return {
          dangerous: true,
          category,
          matched,
        };
      }
    }
  }

  return { dangerous: false, matched: [] };
}

/**
 * LLM-based safety validation (expensive, use for ambiguous cases)
 */
async function validateWithLLM(
  responseExcerpt: string,
): Promise<SafetyCheckResult> {
  try {
    const check = await openai.chat.completions.create({
      model: "glm-5",
      temperature: 0,
      max_tokens: 200,
      messages: [
        {
          role: "system",
          content: `You are a safety classifier. Analyze this AI response excerpt for harmful content.

Categories:
- SAFE: Normal helpful content, educational material
- WEAPONS: Instructions for weapons/explosives/violence
- DRUGS: Illegal substance synthesis or abuse
- MALWARE: Hacking tools, malware, or exploitation code
- ABUSE: Content enabling harassment, exploitation, or harm
- PII: Personal identifiable information leakage

Respond ONLY with valid JSON: 
{"safe": boolean, "category": "SAFE"|"WEAPONS"|"DRUGS"|"MALWARE"|"ABUSE"|"PII", "confidence": 0.0-1.0, "reason": "brief explanation"}`,
        },
        {
          role: "user",
          content: responseExcerpt,
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(check.choices[0].message.content || "{}");

    return {
      safe: result.safe === true,
      category: result.category?.toLowerCase(),
      confidence: result.confidence ?? 0.5,
    };
  } catch (e) {
    throw e;
  }
}

/**
 * Redact dangerous sections from response while preserving helpfulness
 */
export function redactDangerousContent(
  response: string,
  category: string,
): string {
  const redactions: Record<string, (s: string) => string> = {
    weapons: (s) =>
      s.replace(
        /(?:step\s+\d+|procedure|instructions?)[\s\S]{0,300}?(?:detonator|explosive|fuse|etc\.)/gi,
        "[WEAPONS CONTENT REDACTED]",
      ),
    drugs: (s) =>
      s.replace(
        /(?:\d+\s*(?:grams|mg|ml|oz)\s+.*?(?:heat|mix|combine|filter)[\s\S]{0,100})/gi,
        "[DRUG SYNTHESIS REDACTED]",
      ),
    malware: (s) =>
      s.replace(
        /```(?:python|javascript|bash)?[\s\S]{0,500}?```/gi,
        "```\n[MALWARE CODE REDACTED]\n```",
      ),
    abuse: (s) =>
      s.replace(
        /(?:method|technique|way to)[\s\S]{0,150}?(?:abuse|exploit|coerce)/gi,
        "[ABUSE CONTENT REDACTED]",
      ),
    pii_leaked: (s) =>
      s.replace(
        /\b\d{3}-\d{2}-\d{4}\b|\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
        "[PII REDACTED]",
      ),
  };

  const redactor = redactions[category];
  return redactor ? redactor(response) : response;
}

/**
 * Build safe response with warnings if content was redacted
 */
export function buildSafeResponse(
  originalResponse: string,
  validation: SafetyCheckResult,
): { content: string; warning?: string } {
  if (!validation.safe) {
    const redacted = redactDangerousContent(
      originalResponse,
      validation.category || "unknown",
    );

    return {
      content: redacted,
      warning: `âš ï¸ This response contained ${validation.category} content. Sensitive areas have been redacted for safety.`,
    };
  }

  return {
    content: originalResponse,
  };
}

