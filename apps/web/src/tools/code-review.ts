import { Tool } from "./index";

/**
 * Code Review Tool - Static analysis only, no execution
 * Provides feedback on code quality, potential bugs, and best practices
 */
export const CodeReviewTool: Tool = {
  name: "code_review",
  description:
    "Analyzes code for potential bugs, style issues, and best practices. Does NOT execute code. Use this to get feedback on your code before you test it locally.",
  parameters: {
    type: "object",
    properties: {
      code: {
        type: "string",
        description: "The source code to review",
      },
      language: {
        type: "string",
        description:
          "Programming language: 'python', 'javascript', 'typescript', 'java', 'cpp'",
        enum: ["python", "javascript", "typescript", "java", "cpp"],
      },
      focusAreas: {
        type: "array",
        items: { type: "string" },
        description:
          "Optional focus areas: 'bugs', 'performance', 'style', 'security', 'readability'",
        default: ["bugs", "readability"],
      },
    },
    required: ["code", "language"],
  },
  execute: async ({ code, language, focusAreas = ["bugs", "readability"] }) => {
    if (!code || code.trim().length === 0) {
      return { error: "Code cannot be empty" };
    }

    // Perform basic static analysis
    const issues = performStaticAnalysis(code, language, focusAreas);
    const suggestions = generateSuggestions(code, language);

    return {
      success: true,
      language,
      issuesFound: issues.length,
      issues: issues.slice(0, 10), // Limit to 10 most important
      suggestions: suggestions.slice(0, 5),
      note: "This is static analysis only. Test your code locally in your IDE to verify behavior.",
    };
  },
};

function performStaticAnalysis(
  code: string,
  language: string,
  focusAreas: string[],
): Array<{
  severity: "high" | "medium" | "low";
  type: string;
  line: string;
  suggestion: string;
}> {
  const issues: Array<{
    severity: "high" | "medium" | "low";
    type: string;
    line: string;
    suggestion: string;
  }> = [];

  if (focusAreas.includes("bugs")) {
    // Check for common bugs
    if (code.includes("== undefined")) {
      issues.push({
        severity: "medium",
        type: "Loose equality",
        line: "Comparing with == undefined",
        suggestion: "Use === undefined or check with === null",
      });
    }

    if (language === "python" && code.includes("except:")) {
      issues.push({
        severity: "medium",
        type: "Broad exception",
        line: "Using bare except:",
        suggestion:
          "Catch specific exceptions instead, e.g., except ValueError:",
      });
    }

    if (code.includes("TODO") || code.includes("FIXME")) {
      issues.push({
        severity: "low",
        type: "Incomplete code",
        line: "Found TODO/FIXME comment",
        suggestion: "Address these before shipping",
      });
    }
  }

  if (focusAreas.includes("performance")) {
    // Check for performance anti-patterns
    if (
      code.match(/\.push\s*\(\s*\)\s*in\s+loop/) ||
      code.match(/for.*append\s*in\s+\w+/)
    ) {
      issues.push({
        severity: "low",
        type: "Potential inefficiency",
        line: "Appending in a loop",
        suggestion:
          "Consider using list comprehension (Python) or array methods (JS)",
      });
    }
  }

  if (focusAreas.includes("style")) {
    // Check for style issues
    if (language === "python") {
      if (code.match(/^[a-z_]*[A-Z]+[a-z]/m)) {
        issues.push({
          severity: "low",
          type: "Style",
          line: "Variable naming",
          suggestion: "Use snake_case for Python variables, not camelCase",
        });
      }
    }

    if (code.length > 5000) {
      issues.push({
        severity: "low",
        type: "Readability",
        line: "Code size",
        suggestion: "Consider breaking this into smaller functions",
      });
    }
  }

  if (focusAreas.includes("security")) {
    // Check for obvious security issues
    if (code.includes("eval(") || code.includes("exec(")) {
      issues.push({
        severity: "high",
        type: "Security",
        line: "Using eval/exec",
        suggestion: "Never use eval() or exec(). Use safer alternatives.",
      });
    }

    if (
      code.includes("hardcoded password") ||
      code.match(/password\s*=\s*["']/)
    ) {
      issues.push({
        severity: "high",
        type: "Security",
        line: "Hardcoded credentials",
        suggestion:
          "Never hardcode passwords. Use environment variables or secrets management.",
      });
    }
  }

  return issues;
}

function generateSuggestions(code: string, language: string): string[] {
  const suggestions: string[] = [];

  if (language === "python") {
    if (!code.includes('"""') && !code.includes("'''") && code.length > 100) {
      suggestions.push("Add docstrings to functions to explain what they do");
    }
  }

  if (!code.includes("type") && language === "typescript") {
    suggestions.push(
      "Add explicit type annotations for better IDE support and error catching",
    );
  }

  if (code.match(/function\s+[a-z]/)) {
    suggestions.push(
      "Consider naming functions with descriptive verbs (e.g., calculateTotal, validateInput)",
    );
  }

  suggestions.push(
    "Test your code locally using your IDE's built-in tools before deployment",
  );

  return suggestions;
}
