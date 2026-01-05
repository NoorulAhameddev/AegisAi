export function sanitize(input: string) {
    if (!input) return "";
    return input
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

export function validateInput(input: string): { valid: boolean; error?: string } {
    if (!input) return { valid: false, error: "Empty input" };

    // 1. Length Cap
    if (input.length > 20000) return { valid: false, error: "Input too long" };

    // 2. Jailbreak Patterns
    const lower = input.toLowerCase();
    const forbidden = [
        "ignore previous instructions",
        "system override",
        "you are not an ai",
        "simulated mode",
        "developer mode",
        "do anything now"
    ];

    for (const phrase of forbidden) {
        if (lower.includes(phrase)) {
            return { valid: false, error: "Restricted content detected" };
        }
    }

    return { valid: true };
}

export function detectLeaks(content: string): boolean {
    const patterns = [
        /sk-[a-zA-Z0-9]{20,}/, // OpenAI Keys
        /eyJ[a-zA-Z0-9_\-\.]+/, // JWT-ish
        /-----BEGIN PRIVATE KEY-----/
    ];

    for (const p of patterns) {
        if (p.test(content)) return true;
    }
    return false;
}
