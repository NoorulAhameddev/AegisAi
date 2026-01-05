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

export function registerAllTools() {
    registerTool(CalculatorTool);
    registerTool(ImageGeneratorTool);
    registerTool(WebSearchTool);
    registerTool(WebReadTool);
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
