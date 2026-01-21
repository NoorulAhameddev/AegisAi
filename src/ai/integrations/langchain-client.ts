/**
 * LangChain Client Configuration
 * Centralized LangChain setup with OpenAI integration
 */

import { ChatOpenAI } from "@langchain/openai";
import { env } from "./env";

/**
 * Create a LangChain ChatOpenAI instance
 * @param streaming - Enable streaming mode
 * @param temperature - Model temperature (0-2)
 * @param modelName - OpenAI model name
 */
export function createLangChainClient(options?: {
    streaming?: boolean;
    temperature?: number;
    modelName?: string;
    maxTokens?: number;
}) {
    const {
        streaming = false,
        temperature = 0.7,
        modelName = "gpt-4o-mini",
        maxTokens = 4096
    } = options || {};

    return new ChatOpenAI({
        openAIApiKey: env.OPENAI_API_KEY,
        modelName,
        temperature,
        streaming,
        maxTokens,
        configuration: {
            baseURL: "https://openrouter.ai/api/v1",
        },
    });
}

/**
 * Create a streaming LangChain client
 */
export function createStreamingClient(temperature = 0.7) {
    return createLangChainClient({
        streaming: true,
        temperature,
    });
}

/**
 * Create a non-streaming LangChain client
 */
export function createStandardClient(temperature = 0.7) {
    return createLangChainClient({
        streaming: false,
        temperature,
    });
}
