import OpenAI from "openai";

const rawKey = process.env.OPENAI_API_KEY || "";
const cleanKey = rawKey.trim().replace(/^["']|["']$/g, '');

const isValidKey = cleanKey.startsWith("sk-") && cleanKey.length > 20;

if (!isValidKey) {
    if (process.env.NODE_ENV === "production") {
        console.error("[CRITICAL] Invalid OPENAI_API_KEY format. Key must start with 'sk-'.");
        // In strict mode, we might want to crash, but for now we'll log heavily.
    } else {
        console.warn("[WARN] Invalid OPENAI_API_KEY format. AI features will fail.");
    }
} else {
    // Log masked key for debugging
    console.log(`[SYSTEM] OpenAI Service Initialized. Key: ${cleanKey.substring(0, 3)}...${cleanKey.slice(-4)}`);
}

export const openai = new OpenAI({
    apiKey: cleanKey || "dummy_key", // Prevent crash on init, fail on request
    timeout: 30000,
    maxRetries: 2,
});
