import { Tool } from "./index";

const SAFE_OPERATORS = ["+", "-", "*", "/", "%", "(", ")"];
const SAFE_FUNCTIONS = [
  "sqrt",
  "sin",
  "cos",
  "tan",
  "log",
  "log10",
  "exp",
  "pow",
  "abs",
  "floor",
  "ceil",
  "round",
  "PI",
  "E",
];

function isSafeNumber(value: string): boolean {
  return /^-?\d+\.?\d*$/.test(value);
}

function tokenize(expression: string): string[] {
  const tokens: string[] = [];
  let current = "";

  for (const char of expression) {
    if (SAFE_OPERATORS.includes(char) || char === ".") {
      if (current) {
        tokens.push(current);
        current = "";
      }
      if (char !== " " && char !== "\t") {
        tokens.push(char);
      }
    } else if (/[a-zA-Z0-9]/.test(char)) {
      current += char;
    } else if (current) {
      tokens.push(current);
      current = "";
    }
  }
  if (current) tokens.push(current);

  return tokens.filter((t) => t.trim());
}

function evaluate(expression: string): number {
  const tokens = tokenize(expression);
  let current = 0;
  let lastNumber = 0;
  let lastOperator = "+";

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (isSafeNumber(token)) {
      const num = parseFloat(token);

      if (lastOperator === "+") {
        current += num;
      } else if (lastOperator === "-") {
        current -= num;
      } else if (lastOperator === "*") {
        current = lastNumber * num;
      } else if (lastOperator === "/") {
        if (num === 0) throw new Error("Division by zero");
        current = lastNumber / num;
      } else if (lastOperator === "%") {
        current = lastNumber % num;
      }
      lastNumber = num;
    } else if (token === "+") {
      lastOperator = "+";
    } else if (token === "-") {
      lastOperator = "-";
    } else if (token === "*") {
      lastOperator = "*";
    } else if (token === "/") {
      lastOperator = "/";
    } else if (token === "%") {
      lastOperator = "%";
    } else if (token === "(") {
      let depth = 1;
      let end = i + 1;
      while (end < tokens.length && depth > 0) {
        if (tokens[end] === "(") depth++;
        if (tokens[end] === ")") depth--;
        end++;
      }
      const subExpr = tokens.slice(i + 1, end - 1).join("");
      const result = evaluate(subExpr);
      current =
        lastOperator === "+"
          ? current + result
          : lastOperator === "-"
            ? current - result
            : lastOperator === "*"
              ? lastNumber * result
              : lastOperator === "/"
                ? lastNumber / result
                : result;
      i = end - 1;
    } else if (SAFE_FUNCTIONS.includes(token.toLowerCase())) {
      let args: number[] = [];
      if (tokens[i + 1] === "(") {
        let depth = 1;
        let end = i + 2;
        while (end < tokens.length && depth > 0) {
          if (tokens[end] === "(") depth++;
          if (tokens[end] === ")") depth--;
          end++;
        }
        const subExpr = tokens.slice(i + 2, end - 1).join("");
        args = [evaluate(subExpr)];
        i = end - 1;
      }
      const fn = token.toLowerCase();
      let result: number;
      if (fn === "sqrt") result = Math.sqrt(args[0] || 0);
      else if (fn === "sin") result = Math.sin(args[0] || 0);
      else if (fn === "cos") result = Math.cos(args[0] || 0);
      else if (fn === "tan") result = Math.tan(args[0] || 0);
      else if (fn === "log") result = Math.log(args[0] || 0);
      else if (fn === "log10") result = Math.log10(args[0] || 0);
      else if (fn === "exp") result = Math.exp(args[0] || 0);
      else if (fn === "pow") result = Math.pow(args[0] || 0, args[1] || 2);
      else if (fn === "abs") result = Math.abs(args[0] || 0);
      else if (fn === "floor") result = Math.floor(args[0] || 0);
      else if (fn === "ceil") result = Math.ceil(args[0] || 0);
      else if (fn === "round") result = Math.round(args[0] || 0);
      else if (fn === "pi" || token === "PI") result = Math.PI;
      else if (fn === "e" || token === "E") result = Math.E;
      else result = 0;

      current =
        lastOperator === "+"
          ? current + result
          : lastOperator === "-"
            ? current - result
            : lastOperator === "*"
              ? lastNumber * result
              : lastOperator === "/"
                ? lastNumber / result
                : result;
      lastNumber = result;
    }
  }

  return current;
}

export const CalculatorTool: Tool = {
  name: "calculator",
  description:
    "Evaluates a mathematical expression to provide a precise result. Useful for complex calculations.",
  parameters: {
    type: "object",
    properties: {
      expression: {
        type: "string",
        description:
          "The mathematical expression to evaluate, e.g. '2 + 2' or 'sqrt(16) * 5'",
      },
    },
    required: ["expression"],
  },
  execute: async ({ expression }) => {
    try {
      // Final safety check - reject anything not basic math
      if (
        /[^0-9+\-*/%().\s sqrtSINCOTANLOGEXPOWABSFLCEI]/.test(
          expression.toLowerCase(),
        )
      ) {
        return "Error: Invalid characters in expression.";
      }

      const result = evaluate(expression);

      if (!isFinite(result)) {
        return "Error: Result is not a finite number.";
      }

      return JSON.stringify(result);
    } catch (e: any) {
      return `Error calculating: ${e.message}`;
    }
  },
};
