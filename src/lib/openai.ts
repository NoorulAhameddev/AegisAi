import OpenAI from "openai";

const rawKey = process.env.OPENAI_API_KEY || "";
const cleanKey = rawKey.trim().replace(/^["']|["']$/g, '');

const isValidKey = cleanKey.startsWith("sk-") && cleanKey.length > 20;

console.log(`[DEBUG] Raw API Key length: ${rawKey.length}`);
console.log(`[DEBUG] Clean API Key length: ${cleanKey.length}`);
console.log(`[DEBUG] Starts with sk-: ${cleanKey.startsWith("sk-")}`);
console.log(`[DEBUG] First 20 chars: ${cleanKey.substring(0, 20)}`);

if (!isValidKey) {
    console.error("[CRITICAL] Invalid OPENAI_API_KEY format. Key must start with 'sk-' and be > 20 chars.");
    console.error(`[DEBUG] Key validation failed - starts with sk-: ${cleanKey.startsWith("sk-")}, length: ${cleanKey.length}`);
} else {
    console.log(`[SYSTEM] OpenAI Service Initialized with valid key`);
}

export const openai = new OpenAI({
    apiKey: cleanKey || "dummy_key", // Prevent crash on init, fail on request
    timeout: 30000,
    maxRetries: 2,
});
