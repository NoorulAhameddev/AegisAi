import { Tool } from "./index";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export const CodeCompilerTool: Tool = {
    name: "code_compiler",
    description: "Compiles and executes code snippets in JavaScript, Python, or TypeScript. Returns compilation output and execution results.",
    parameters: {
        type: "object",
        properties: {
            language: {
                type: "string",
                description: "Programming language: 'javascript', 'python', 'typescript'",
                enum: ["javascript", "python", "typescript"]
            },
            code: {
                type: "string",
                description: "The source code to compile and execute"
            },
            timeout: {
                type: "number",
                description: "Timeout in milliseconds (default: 10000)",
                default: 10000
            }
        },
        required: ["language", "code"]
    },
    execute: async ({ language, code, timeout = 10000 }) => {
        const tempDir = os.tmpdir();
        let tempFile: string | null = null;
        
        try {
            // Sanitize and validate code
            if (!code || code.trim().length === 0) {
                return { error: "Code cannot be empty" };
            }

            // Prevent dangerous operations
            const dangerousPatterns = [
                /require\s*\(\s*['"`]fs['"`]\s*\)/gi,
                /import\s+.*\s+from\s+['"`]fs['"`]/gi,
                /process\.exit/gi,
                /require\s*\(\s*['"`]child_process['"`]\s*\)/gi,
                /exec\s*\(\s*['"`]/gi,
                /spawn/gi,
                /rm\s+-rf/gi,
            ];

            for (const pattern of dangerousPatterns) {
                if (pattern.test(code)) {
                    return { error: "Code contains potentially dangerous operations" };
                }
            }

            let result: any;

            if (language === "javascript") {
                result = await executeJavaScript(code, timeout);
            } else if (language === "python") {
                result = await executePython(code, tempDir, timeout);
                tempFile = result.tempFile || null;
            } else if (language === "typescript") {
                result = await executeTypeScript(code, tempDir, timeout);
                tempFile = result.tempFile || null;
            }

            return result;
        } catch (error: any) {
            return {
                error: `Compilation/Execution failed: ${error.message}`,
                stderr: error.stderr || ""
            };
        } finally {
            // Cleanup temp files
            if (tempFile && fs.existsSync(tempFile)) {
                try {
                    fs.unlinkSync(tempFile);
                } catch (e) {
                    // Ignore cleanup errors
                }
            }
        }
    }
};

async function executeJavaScript(code: string, timeout: number): Promise<any> {
    return new Promise((resolve) => {
        try {
            let capturedOutput = "";
            const originalLog = console.log;
            const originalError = console.error;

            // Override console methods to capture output
            console.log = (...args: any[]) => {
                capturedOutput += args.join(" ") + "\n";
            };
            
            console.error = (...args: any[]) => {
                capturedOutput += "[ERROR] " + args.join(" ") + "\n";
            };

            const timeoutId = setTimeout(() => {
                console.log = originalLog;
                console.error = originalError;
                resolve({
                    error: "Execution timeout",
                    timeout: true
                });
            }, timeout);

            // Execute the code in an async context
            (async () => {
                try {
                    // Create async function from code
                    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
                    const fn = new AsyncFunction(code);
                    const result = await fn();
                    
                    clearTimeout(timeoutId);
                    console.log = originalLog;
                    console.error = originalError;
                    
                    resolve({
                        success: true,
                        output: capturedOutput,
                        result: typeof result !== 'undefined' ? String(result) : ''
                    });
                } catch (err: any) {
                    clearTimeout(timeoutId);
                    console.log = originalLog;
                    console.error = originalError;
                    
                    resolve({
                        success: false,
                        output: capturedOutput,
                        error: err instanceof Error ? err.message : String(err)
                    });
                }
            })();
        } catch (e: any) {
            resolve({
                success: false,
                error: e.message
            });
        }
    });
}

async function executePython(code: string, tempDir: string, timeout: number): Promise<any> {
    return new Promise((resolve) => {
        try {
            const tempFile = path.join(tempDir, `code_${Date.now()}.py`);
            fs.writeFileSync(tempFile, code);

            try {
                const output = execSync(`python "${tempFile}"`, {
                    timeout,
                    encoding: "utf-8",
                    maxBuffer: 1024 * 1024
                });

                resolve({
                    success: true,
                    output,
                    tempFile
                });
            } catch (error: any) {
                resolve({
                    success: false,
                    error: error.message,
                    stderr: error.stderr ? error.stderr.toString() : "",
                    stdout: error.stdout ? error.stdout.toString() : "",
                    tempFile
                });
            }
        } catch (e: any) {
            resolve({
                success: false,
                error: e.message
            });
        }
    });
}

async function executeTypeScript(code: string, tempDir: string, timeout: number): Promise<any> {
    return new Promise((resolve) => {
        try {
            const tempFile = path.join(tempDir, `code_${Date.now()}.ts`);
            const jsFile = tempFile.replace(/\.ts$/, ".js");

            fs.writeFileSync(tempFile, code);

            try {
                // Use ts-node for faster execution
                try {
                    // Try ts-node first (faster)
                    const result = execSync(`npx ts-node "${tempFile}"`, {
                        timeout,
                        encoding: "utf-8",
                        maxBuffer: 1024 * 1024
                    });

                    resolve({
                        success: true,
                        output: result,
                        tempFile
                    });
                } catch (tsNodeError: any) {
                    // Check if stdout has content (successful run but with warnings/errors)
                    const stdout = tsNodeError.stdout ? tsNodeError.stdout.toString() : '';
                    const stderr = tsNodeError.stderr ? tsNodeError.stderr.toString() : '';
                    
                    // If we have stdout, the code executed
                    if (stdout.trim()) {
                        resolve({
                            success: true,
                            output: stdout,
                            tempFile
                        });
                        return;
                    }

                    // Fallback to tsc compilation
                    execSync(`npx tsc "${tempFile}" --target ES2017 --module commonjs --lib ES2017 --skipLibCheck --outDir "${tempDir}"`, {
                        timeout: timeout * 2,
                        encoding: "utf-8"
                    });

                    // Execute the compiled JavaScript
                    const output = execSync(`node "${jsFile}"`, {
                        timeout: timeout / 2,
                        encoding: "utf-8",
                        maxBuffer: 1024 * 1024
                    });

                    // Cleanup
                    if (fs.existsSync(jsFile)) {
                        fs.unlinkSync(jsFile);
                    }

                    resolve({
                        success: true,
                        output,
                        tempFile
                    });
                }
            } catch (error: any) {
                // Cleanup compiled file if exists
                if (fs.existsSync(jsFile)) {
                    fs.unlinkSync(jsFile);
                }

                resolve({
                    success: false,
                    error: error.message,
                    stderr: error.stderr ? error.stderr.toString() : "",
                    stdout: error.stdout ? error.stdout.toString() : "",
                    tempFile
                });
            }
        } catch (e: any) {
            resolve({
                success: false,
                error: e.message
            });
        }
    });
}
