import OpenAI from "openai";
import { env } from "@/lib/env";

const cleanKey = env.OPENROUTER_API_KEY.trim().replace(/^["']|["']$/g, "");

export const openai = new OpenAI({
    apiKey: cleanKey,
    baseURL: "https://openrouter.ai/api/v1",
    timeout: 30000,
    maxRetries: 2,
    defaultHeaders: {
        "HTTP-Referer": process.env.SITE_URL || "http://localhost:3000",
        "X-Title": process.env.SITE_NAME || "Aegis AI",
    },
});
