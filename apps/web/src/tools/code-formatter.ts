import { Tool } from "./index";

/**
 * Code Formatter Tool - Formats code for readability
 * Does NOT execute code
 */
export const CodeFormatterTool: Tool = {
    name: "format_code",
    description: "Formats code for better readability with proper indentation and structure. Does NOT execute code.",
    parameters: {
        type: "object",
        properties: {
            code: {
                type: "string",
                description: "The source code to format"
            },
            language: {
                type: "string",
                description: "Programming language: 'python', 'javascript', 'typescript', 'java', 'cpp', 'sql'",
                enum: ["python", "javascript", "typescript", "java", "cpp", "sql"]
            },
            indentSize: {
                type: "number",
                description: "Number of spaces for indentation (default: 4 for Python, 2 for JS)",
                default: 4
            }
        },
        required: ["code", "language"]
    },
    execute: async ({ code, language, indentSize = language === "python" ? 4 : 2 }) => {
        if (!code || code.trim().length === 0) {
            return { error: "Code cannot be empty" };
        }

        try {
            const formatted = formatCode(code, language, indentSize);
            return {
                success: true,
                language,
                indentSize,
                original: code,
                formatted: formatted,
                note: "This is formatted code for readability. Copy it and test locally in your IDE."
            };
        } catch (error: any) {
            return {
                error: `Formatting failed: ${error.message}`,
                original: code
            };
        }
    }
};

function formatCode(code: string, language: string, indentSize: number): string {
    const indent = " ".repeat(indentSize);

    if (language === "python") {
        return formatPython(code, indent);
    } else if (language === "javascript" || language === "typescript") {
        return formatJavaScript(code, indent);
    } else if (language === "java" || language === "cpp") {
        return formatCStyle(code, indent);
    } else if (language === "sql") {
        return formatSQL(code, indent);
    }

    return code; // Fallback: return as-is
}

function formatPython(code: string, indent: string): string {
    const lines = code.split("\n");
    const formatted: string[] = [];
    let indentLevel = 0;

    for (const line of lines) {
        const trimmed = line.trim();

        if (!trimmed) {
            formatted.push("");
            continue;
        }

        // Decrease indent for elif/else/except
        if (trimmed.startsWith("elif ") || trimmed.startsWith("else:") || trimmed.startsWith("except")) {
            indentLevel = Math.max(0, indentLevel - 1);
        }

        // Add line with current indentation
        formatted.push(indent.repeat(indentLevel) + trimmed);

        // Increase indent for colons
        if (trimmed.endsWith(":")) {
            indentLevel++;
        }
    }

    return formatted.join("\n");
}

function formatJavaScript(code: string, indent: string): string {
    const lines = code.split("\n");
    const formatted: string[] = [];
    let indentLevel = 0;
    let inString = false;
    let stringChar = "";

    for (const line of lines) {
        let trimmed = line.trim();

        if (!trimmed) {
            formatted.push("");
            continue;
        }

        // Count braces (simplistic approach)
        let closingBraces = 0;
        for (const char of trimmed) {
            if (char === "{") indentLevel++;
            if (char === "}") {
                indentLevel = Math.max(0, indentLevel - 1);
                closingBraces++;
            }
        }

        formatted.push(indent.repeat(indentLevel) + trimmed);

        // Adjust for next line
        if (!trimmed.includes("}") && trimmed.includes("{")) {
            // Already counted above
        }
    }

    return formatted.join("\n");
}

function formatCStyle(code: string, indent: string): string {
    // Similar to JavaScript formatting
    return formatJavaScript(code, indent);
}

function formatSQL(code: string, indent: string): string {
    const keywords = ["SELECT", "FROM", "WHERE", "JOIN", "LEFT", "RIGHT", "INNER", "OUTER", "GROUP", "BY", "ORDER", "LIMIT"];
    let result = code;

    // Add newlines before major keywords
    for (const keyword of keywords) {
        const regex = new RegExp(`\\b${keyword}\\b`, "gi");
        result = result.replace(regex, `\n${keyword}`);
    }

    return result
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .join("\n");
}
