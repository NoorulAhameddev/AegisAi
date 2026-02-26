/**
 * Intelligent Refusal Responses
 * Context-aware messages for different types of blocked requests
 */

export interface RefusalContext {
  intent: "JAILBREAK" | "UNSAFE" | "PII_LEAK" | "UNKNOWN";
  reason?: string;
  confidence?: number;
}

/**
 * Generate appropriate refusal message based on intent
 */
export function generateRefusalMessage(
  context: RefusalContext,
  topic?: string,
): string {
  const baseMessages: Record<string, string> = {
    JAILBREAK: `I appreciate you testing my boundaries, but I can't help with that request as it appears to be asking me to bypass my safety guidelines.

I'm happy to help with:
- Understanding security concepts and principles
- Explaining how safety systems work
- Legal penetration testing and red-teaming
- Ethical hacking educational resources
- Security architecture and responsible disclosure

What legitimate security topic can I help you with instead?`,

    UNSAFE: `I can't provide that content as it could cause harm.

If you're interested in this topic for legitimate educational or professional reasons, I can suggest:
- Academic research and peer-reviewed resources
- Industry best practices and standards
- Legal and ethical alternatives
- Professional certifications in relevant fields

How can I help you with a constructive approach to this topic?`,

    PII_LEAK: `I detected that your request contains personal identity information. I won't process requests containing:
- Social Security numbers
- Credit card or bank account numbers
- Driver's license or passport numbers
- Medical record numbers
- Biometric or genetic data

Could you rephrase your request without the personal data? I'm happy to help with your underlying question.`,

    UNKNOWN: `I can't help with that request at this time. 

If you believe this is a mistake, please:
1. Try rephrasing your question more specifically
2. Provide more context about what you're trying to accomplish
3. Break complex requests into simpler pieces

I'm here to help—let me know how I can assist in a different way.`,
  };

  const baseMessage = baseMessages[context.intent] || baseMessages.UNKNOWN;

  // Add confidence-based note for medium-confidence blocks
  if (context.confidence && context.confidence < 0.85) {
    return `${baseMessage}

(Note: This block was made with moderate confidence. If you believe this is an error, you can try rephrasing your question.)`;
  }

  return baseMessage;
}

/**
 * Intelligent fallback: suggest alternatives when blocking
 */
export function suggestAlternatives(
  originalRequest: string,
  blockReason: string,
): string {
  // Simple heuristic-based suggestions
  const suggestions: Record<string, string[]> = {
    JAILBREAK: [
      "Ask about the legitimate use case for what you're trying to accomplish",
      "Explain why you need the information (research, education, security testing)",
      "Ask for educational/theoretical explanations instead of practical instructions",
    ],
    UNSAFE: [
      "Rephrase to ask for educational or theoretical information",
      "Ask about legal/legitimate alternatives to your goal",
      "Request information about safeguards and protections instead",
    ],
    PII_LEAK: [
      "Describe what you're trying to do without mentioning specific personal data",
      'Use placeholder values (like "XXX-XX-XXXX" for SSN)',
      "Ask about the information you need in general terms",
    ],
  };

  const altList = suggestions[blockReason] || suggestions.UNSAFE;

  return `\n\nTry instead:\n${altList.map((alt, i) => `${i + 1}. ${alt}`).join("\n")}`;
}

/**
 * Generate audit-friendly rejection message (for logging)
 */
export function getAuditMessage(context: RefusalContext): string {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] BLOCKED: ${context.intent}${context.reason ? ` - ${context.reason}` : ""}`;
}

/**
 * Different message tone for different user types
 * (Could be extended to use user.role or organization settings)
 */
export function getRefusalMessageByTone(
  context: RefusalContext,
  tone: "formal" | "friendly" | "technical" = "friendly",
): string {
  const baseMessage = generateRefusalMessage(context);

  if (tone === "formal") {
    return baseMessage
      .replace("I appreciate you", "Thank you for")
      .replace("I'm happy", "I am happy")
      .replace("let me know", "please inform me");
  }

  if (tone === "technical") {
    return `⚠️ Request rejected due to security policy [${context.intent}].\n\n${baseMessage}`;
  }

  // Default 'friendly' tone
  return baseMessage;
}
