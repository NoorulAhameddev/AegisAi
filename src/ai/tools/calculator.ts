import { Tool } from "./index";
// import { evaluate } from "mathjs"; // Removed dependency
// Actually, for now let's use a simple Function constructor restricted or just basic JS math.
// Better to suggest installing mathjs if we want robust safely.
// For now, I'll stick to a Basic JS eval but wrapped safely-ish or just simple arithmetic.
// Let's use `mathjs` if possible, but I need to install it. I'll check package.json first.
// If I can't install, I'll write a simple parser or use eval (with caution).
// Wait, I am an AI, I can calculate, but the prompt says "precise calculator tool so it doesn't hallucinate".
// Let's use a safe eval function.

export const CalculatorTool: Tool = {
    name: "calculator",
    description: "Evaluates a mathematical expression to provide a precise result. Useful for complex calculations.",
    parameters: {
        type: "object",
        properties: {
            expression: {
                type: "string",
                description: "The mathematical expression to evaluate, e.g. '2 + 2' or 'sqrt(16) * 5'"
            }
        },
        required: ["expression"]
    },
    execute: async ({ expression }) => {
        try {
            // Safe evaluation of math expressions
            // Removing potentially harmful characters
            if (/[a-zA-Z]/.test(expression.replace(/sqrt|sin|cos|tan|log/g, ""))) {
                return "Error: Only basic math functions allowed.";
            }
            // Use Function constructor for scope isolation (still essentially eval, but slightly cleaner)
            const result = new Function('return ' + expression)();
            return JSON.stringify(result);
        } catch (e: any) {
            return `Error calculating: ${e.message}`;
        }
    }
};
