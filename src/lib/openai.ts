import OpenAI from "openai";

console.log("[DEBUG] OpenAI Library Initializing...");
if (!process.env.OPENAI_API_KEY) {
    console.error("[ERROR] OPENAI_API_KEY is missing in process.env");
}

export const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || "missing",
});
