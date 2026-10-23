export function sanitize(input: string) {
  if (!input) return "";
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Validate input - supports string validation (legacy) and object validation
 * String validation returns { valid: boolean; error?: string } for backwards compatibility
 * Object validation with rules returns boolean
 */
export function validateInput(
  input: string | Record<string, any>,
  rules?: Record<string, any>,
): any {
  // Handle string input (legacy support - returns object for backwards compatibility)
  if (typeof input === "string") {
    if (!input) return { valid: false, error: "Empty input" };

    // 1. Length Cap
    if (input.length > 20000) return { valid: false, error: "Input too long" };

    // 2. Expanded Jailbreak Patterns
    const lower = input.toLowerCase();
    const forbidden = [
      // Direct instruction overrides
      "ignore previous instructions",
      "disregard previous instructions",
      "forget previous instructions",
      "disregard prior guidance",
      "forget earlier directives",

      // System/Mode overrides
      "system override",
      "system prompt",
      "you are not an ai",
      "you are now",
      "developer mode",
      "test mode",
      "simulated mode",
      "debug mode",

      // Behavior changes
      "do anything now",
      "bypass security",
      "bypass your guidelines",
      "ignore your guidelines",
      "roleplay as evil",
      "act as if you have no restrictions",
      "pretend you have no guidelines",

      // Explicit jailbreak phrases
      "you are dan",
      "you are chatgpt in developer mode",
      "imaginary mode",
      "pretend to be an older version",

      // Context tricks
      "in this scenario you should",
      "in test mode you should",
      "if you were to",
    ];

    let restricted = false;
    for (const phrase of forbidden) {
      if (lower.includes(phrase)) {
        restricted = true;
        break;
      }
    }

    if (restricted) {
      return { valid: false, error: "Restricted content detected" };
    }

    return { valid: true };
  }

  // Handle object validation (new API - returns boolean)
  if (typeof input !== "object" || input === null) {
    return false;
  }

  // If no rules provided, just check that required fields are not empty
  if (!rules) {
    for (const [key, value] of Object.entries(input)) {
      if (value === "" || value === null || value === undefined) {
        return false;
      }
    }
    return true;
  }

  // Validate against provided rules
  for (const [key, rule] of Object.entries(rules)) {
    const value = input[key];

    // Check if value exists and matches type requirement
    if (typeof rule === "string" && rule === "number") {
      // Direct type check: rule is "number"
      if (typeof value !== "number") {
        return false;
      }
    } else if (typeof rule === "string" && rule === "string") {
      // Direct type check: rule is "string"
      if (typeof value !== "string") {
        return false;
      }
    } else if (typeof rule === "object" && rule !== null && rule.type) {
      // Rule object with type property
      if (typeof value !== rule.type) {
        return false;
      }
    }

    // String length validation
    if (
      typeof value === "string" &&
      typeof rule === "object" &&
      rule !== null
    ) {
      if (rule.minLength && value.length < rule.minLength) {
        return false;
      }
      if (rule.maxLength && value.length > rule.maxLength) {
        return false;
      }
    }

    // Required field check
    if (
      typeof rule === "object" &&
      rule !== null &&
      rule.required &&
      (value === "" || value === null || value === undefined)
    ) {
      return false;
    }
  }

  return true;
}

export function detectLeaks(content: string): boolean {
  const patterns = [
    // API Keys
    /sk-[a-zA-Z0-9]{20,}/, // OpenAI Keys (legacy)
    /sk-(proj|test|live|dev)-[a-zA-Z0-9]{8,}/, // OpenAI project/runtime keys
    /AKIA[0-9A-Z]{16}/, // AWS Access Key

    // Tokens & Authentication
    /eyJ[a-zA-Z0-9_.-]+/, // JWT-ish tokens
    /bearer\s+[a-zA-Z0-9_.-]{20,}/i, // Bearer tokens
    /-----BEGIN PRIVATE KEY-----/, // Private cryptographic keys
    /-----BEGIN RSA PRIVATE KEY-----/,

    // PII - Financial
    /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // Credit card patterns
    /\b\d{3}-\d{2}-\d{4}\b/, // SSN (XXX-XX-XXXX)
    /\b\d{2}\/\d{2}\/\d{4}\b/, // Expiration dates (MM/YY or MM/DD/YYYY)
    /cvv[\s:]*\d{3,4}/i, // CVV

    // PII - Government IDs
    /(?:passport|license)\s*[:#=]*\s*[A-Z0-9]{6,9}/i,
    /\b[A-Z]{1,2}\d{6,8}\b/, // Driving license pattern
    /\d{10}/, // Generic 10-digit numbers (might be phone or ID)

    // PII - Medical/Biometric
    /icd-?\d{2,}/i, // Medical codes
    /cpt\s*\d{5}/i, // CPT medical codes
    /mrn[\s:]*\d{6,12}/i, // Medical record number

    // Network/Credentials patterns
    /password[\s:=]+\S+/i,
    /api[\s_-]?key[\s:=]+\S+/i,
    /secret[\s:=]+\S+/i,
  ];

  for (const p of patterns) {
    if (p.test(content)) return true;
  }
  return false;
}

/**
 * Sanitize user input by removing dangerous HTML/JavaScript
 * Uses iterative stripping to handle nested/bypass attempts like <scr<script>ipt>
 */
export function sanitizeUserInput(input: string): string {
  if (!input) return "";

  // Trim whitespace
  let cleaned = input.trim();

  // Limit input length to 10000 characters
  if (cleaned.length > 10000) {
    cleaned = cleaned.substring(0, 10000);
  }

  // Iteratively strip HTML tags to handle bypass attempts like <scr<script>ipt>
  let prev;
  do {
    prev = cleaned;
    cleaned = cleaned.replace(/<[^>]*>/g, "");
  } while (cleaned !== prev);

  // HTML entity encode all characters to neutralize any script execution
  return sanitize(cleaned);
}

/**
 * Validate email address format
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Check if password is strong (12+ chars, uppercase, lowercase, number, special char)
 */
export function isStrongPassword(password: string): boolean {
  if (!password || password.length < 12) return false;

  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);

  return hasUppercase && hasLowercase && hasNumber && hasSpecialChar;
}

/**
 * Detect if input contains prompt injection attempts
 */
export function detectPromptInjection(input: string): boolean {
  if (!input) return false;

  const injectionPatterns = [
    /ignore.*instruction/i,
    /override.*system/i,
    /bypass.*security|bypass.*guideline/i,
    /forget.*constraint/i,
    /act as if.*no restriction/i,
    /roleplay as.*unrestricted|roleplay as.*hacker|helpful hacker|jailbreak sequence/i,
    /you are now/i,
    /system prompt|show.*system prompt/i,
    /developer mode/i,
    /do anything now/i,
    /jailbreak/i,
  ];

  return injectionPatterns.some((pattern) => pattern.test(input));
}
/**
 * Quick pre-moderation check (lightweight, <50ms)
 * Runs BEFORE calling LLM to save tokens on obvious violations
 *
 * Returns: { safe: boolean, reason?: string, blockedCategory?: string }
 *
 * Checks:
 * - Input length limits
 * - Known malicious patterns
 * - Explicit violent/hateful content
 * - Basic prompt injection attempts
 */
export function quickModeration(text: string): {
  safe: boolean;
  reason?: string;
  blockedCategory?: string;
} {
  if (!text) {
    return { safe: false, reason: "Empty input", blockedCategory: "empty" };
  }

  // Check length limit (10K characters)
  if (text.length > 10000) {
    return {
      safe: false,
      reason: "Input exceeds maximum length (10,000 characters)",
      blockedCategory: "length",
    };
  }

  // Check for prompt injection
  if (detectPromptInjection(text)) {
    return {
      safe: false,
      reason: "Potential prompt injection detected",
      blockedCategory: "injection",
    };
  }

  // Check for explicit hate speech patterns
  const hateSpeechPatterns = [
    /\b(nazi|hitler)\s+(was|is)\s+(right|good|correct)/i,
    /\b(kill|murder|eliminate)\s+all\s+(jews|blacks|muslims|gays|women|men)/i,
    /\b(inferior|subhuman)\s+(race|people|species)/i,
  ];

  for (const pattern of hateSpeechPatterns) {
    if (pattern.test(text)) {
      return {
        safe: false,
        reason: "Hate speech content detected",
        blockedCategory: "hate",
      };
    }
  }

  // Check for explicit violence patterns
  const violencePatterns = [
    /\bhow\s+to\s+(make|build|create)\s+(bomb|explosive|weapon)/i,
    /\bhow\s+to\s+kill\s+(someone|people|person)/i,
    /\bdetailed\s+(torture|murder|assault)\s+instructions/i,
  ];

  for (const pattern of violencePatterns) {
    if (pattern.test(text)) {
      return {
        safe: false,
        reason: "Violent content detected",
        blockedCategory: "violence",
      };
    }
  }

  // Check for self-harm patterns
  const selfHarmPatterns = [
    /\bhow\s+to\s+(commit|end)\s+(suicide|my\s+life)/i,
    /\bpainless\s+ways\s+to\s+die/i,
    /\bbest\s+way\s+to\s+kill\s+myself/i,
  ];

  for (const pattern of selfHarmPatterns) {
    if (pattern.test(text)) {
      return {
        safe: false,
        reason:
          "Self-harm content detected. Please seek help: 988 (Suicide & Crisis Lifeline)",
        blockedCategory: "self-harm",
      };
    }
  }

  // All checks passed
  return { safe: true };
}
