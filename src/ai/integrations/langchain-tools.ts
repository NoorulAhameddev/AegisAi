/**
 * LangChain Tools Integration
 * Convert existing Aegis AI tools to LangChain format
 */

import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

/**
 * Calculator Tool (LangChain format)
 */
export const calculatorTool = new DynamicStructuredTool({
    name: "calculator",
    description: "Perform mathematical calculations. Input should be a mathematical expression as a string.",
    schema: z.object({
        expression: z.string().describe("The mathematical expression to evaluate"),
    }),
    func: async ({ expression }) => {
        try {
            // Safe evaluation using Function constructor
            const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '');
            const result = Function(`"use strict"; return (${sanitized})`)();
            return `The result of ${expression} is ${result}`;
        } catch (error: any) {
            return `Error calculating: ${error.message}`;
        }
    },
});

/**
 * Web Search Tool (LangChain format)
 */
export const webSearchTool = new DynamicStructuredTool({
    name: "web_search",
    description: "Search the web for current information. Use this when you need up-to-date information or facts.",
    schema: z.object({
        query: z.string().describe("The search query"),
    }),
    func: async ({ query }) => {
        try {
            const { searchWeb } = await import("@/lib/search");
            const results = await searchWeb(query);
            return JSON.stringify(results);
        } catch (error: any) {
            return `Error searching: ${error.message}`;
        }
    },
});

/**
 * Web Reader Tool (LangChain format)
 */
export const webReaderTool = new DynamicStructuredTool({
    name: "web_reader",
    description: "Read and extract content from a specific URL. Use this to get detailed information from a webpage.",
    schema: z.object({
        url: z.string().describe("The URL to read"),
    }),
    func: async ({ url }) => {
        try {
            const { readWebpage } = await import("../tools/web-browser");
            const content = await readWebpage(url);
            return content;
        } catch (error: any) {
            return `Error reading webpage: ${error.message}`;
        }
    },
});

/**
 * Image Generator Tool (LangChain format)
 */
export const imageGeneratorTool = new DynamicStructuredTool({
    name: "image_generator",
    description: "Generate images using DALL-E based on a text description.",
    schema: z.object({
        prompt: z.string().describe("The description of the image to generate"),
        size: z.enum(["256x256", "512x512", "1024x1024"]).optional().describe("Image size"),
        style: z.enum(["vivid", "natural"]).optional().describe("Styling preference"),
    }),
    func: async ({ prompt, size = "1024x1024", style = "vivid" }) => {
        try {
            const { openai } = await import("@/services/ai/openai");
            const response = await openai.images.generate({
                model: "dall-e-3",
                prompt,
                n: 1,
                size,
                quality: "standard",
                style: style as "vivid" | "natural",
            });
            if (!response.data || !response.data[0]) throw new Error("No image generated.");
            return `Image generated successfully: ${response.data[0].url}`;
        } catch (error: any) {
            return `Error generating image: ${error.message}`;
        }
    },
});

/**
 * Get all LangChain tools
 */
export function getLangChainTools() {
    return [
        calculatorTool,
        webSearchTool,
        webReaderTool,
        imageGeneratorTool,
    ];
}

/**
 * Get tools by name
 */
export function getToolByName(name: string) {
    const tools = getLangChainTools();
    return tools.find(tool => tool.name === name);
}
