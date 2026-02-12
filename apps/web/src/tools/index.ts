export interface Tool {
    name: string;
    description: string;
    parameters: any; // JSON Schema
    execute: (args: any, context?: any) => Promise<any>;
}

export const toolsRegistry: Map<string, Tool> = new Map();

export function registerTool(tool: Tool) {
    toolsRegistry.set(tool.name, tool);
}

import { CalculatorTool } from "./calculator";
import { ImageGeneratorTool } from "./image-generator";
import { WebSearchTool, WebReadTool } from "./web-browser";
import { CodeReviewTool } from "./code-review";
import { CodeFormatterTool } from "./code-formatter";

/**
 * CRITICAL FIX: Removed CodeCompilerTool (unsafe for students)
 * Students should run code locally using their IDE or terminal
 * 
 * Replaced with:
 * - CodeReviewTool: Static analysis, no execution
 * - CodeFormatterTool: Code formatting for readability
 * 
 * Rationale:
 * - Code execution undermines learning (students need to use their IDE)
 * - Safety risks from execution sandbox bypass
 * - No pedagogical benefit vs local development
 */
export function registerAllTools() {
    registerTool(CalculatorTool);
    registerTool(ImageGeneratorTool);
    registerTool(WebSearchTool);
    registerTool(WebReadTool);
    registerTool(CodeReviewTool);      // ← Safe: static analysis only
    registerTool(CodeFormatterTool);   // ← Safe: formatting only
    // DO NOT register CodeCompilerTool - removed for security and pedagogy
}

export function getOpenAITools() {
    // Ensure tools are registered
    if (toolsRegistry.size === 0) registerAllTools();

    return Array.from(toolsRegistry.values()).map(tool => ({
        type: "function" as const,
        function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters
        }
    }));
}
