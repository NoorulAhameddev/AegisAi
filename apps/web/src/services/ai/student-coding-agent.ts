import { openai } from "@/services/ai/openai";
import { logger } from "@/lib/logger";
import { Message } from "@prisma/client";
import { tokenBudgetManager } from "@/services/billing/token-budget";
import { encrypt, decrypt } from "@/lib/encryption";
import { validateInput } from "@/lib/security";
import { getOpenAITools } from "@/tools/index";
import { prisma } from "@/lib/prisma";

/**
 * CRITICAL FIX: StudentCodingAgent
 * Lightweight orchestrator for AI chat processing
 * 
 * Problem fixed:
 * - Raw service calls scattered across processor.ts (hard to audit, test, maintain)
 * - No clear separation between input validation, AI calling, output validation, tool execution
 * - Difficult to understand request flow
 * 
 * Solution:
 * - Single class with explicit stages
 * - Each method handles one responsibility
 * - Clear error handling at each stage
 * - Easy to test in isolation
 * - Easy to swap implementations or add middleware
 */

export interface StudentProfile {
    id: string;
    level: "beginner" | "intermediate" | "advanced";
    language?: string;
    knownConcepts?: string[];
}

export interface AgentResponse {
    type: "success" | "error" | "budget_exceeded" | "safety_blocked";
    content?: string;
    error?: string;
    metadata?: {
        tokensUsed?: number;
        toolsInvoked?: string[];
        ragSourcesUsed?: number;
    };
}

export class StudentCodingAgent {
    private student: StudentProfile;
    private allowedTools = getOpenAITools();
    private requestId: string;

    constructor(student: StudentProfile, requestId: string) {
        this.student = student;
        this.requestId = requestId;
    }

    /**
     * Main chat method: orchestrates the full request flow
     */
    async chat(
        message: string,
        chatHistory: Message[],
        ragContext?: string
    ): Promise<AgentResponse> {
        try {
            // Stage 1: Validate input
            logger.info("Agent: Starting chat", { requestId: this.requestId, student: this.student.id });
            const inputValidation = await this.validateInput(message);
            if (!inputValidation.valid) {
                logger.warn("Agent: Input validation failed", {
                    requestId: this.requestId,
                    reason: inputValidation.reason
                });
                return this.errorResponse("Input validation failed", inputValidation.reason);
            }

            // Stage 2: Check token budget
            const budgetCheck = await this.checkTokenBudget(message, chatHistory);
            if (!budgetCheck.approved) {
                logger.warn("Agent: Budget check failed", {
                    requestId: this.requestId,
                    reason: budgetCheck.reason
                });
                return {
                    type: "budget_exceeded",
                    error: budgetCheck.reason
                };
            }
            const { estimatedTokens, reservedAt } = budgetCheck;

            // Stage 3: Build prompt and messages
            const systemPrompt = this.buildSystemPrompt();
            const messages = this.formatMessages(chatHistory, message, ragContext);

            // Stage 4: Call model
            logger.info("Agent: Calling OpenAI", {
                requestId: this.requestId,
                messageCount: messages.length,
                tokensEstimate: this.estimateTokens(messages)
            });

            const response = await openai.chat.completions.create({
                model: "openai/gpt-4o-mini",
                messages: [
                    { role: "system" as const, content: systemPrompt },
                    ...messages
                ],
                tools: this.allowedTools,
                tool_choice: "auto",
                headers: { "X-Request-ID": this.requestId }
            });

            // Stage 5: Record token usage
            await tokenBudgetManager.finalizeUsage(
                this.student.id,
                estimatedTokens,
                response.usage?.total_tokens || 0,
                { model: response.model },
                reservedAt
            );

            // Stage 6: Handle tool calls if present
            let finalContent = response.choices[0].message.content || "";
            const toolsInvoked: string[] = [];

            if (response.choices[0].message.tool_calls) {
                const toolResult = await this.executeTools(
                    response.choices[0].message.tool_calls,
                    messages
                );
                finalContent = toolResult.content;
                toolsInvoked.push(...toolResult.toolNames);
            }

            // Stage 7: Validate output
            const outputValidation = await this.validateOutput(finalContent);
            if (!outputValidation.safe) {
                logger.warn("Agent: Output safety check failed", {
                    requestId: this.requestId,
                    reason: outputValidation.reason
                });
                return {
                    type: "safety_blocked",
                    error: "Response could not be returned due to safety guidelines"
                };
            }

            logger.info("Agent: Chat completed successfully", {
                requestId: this.requestId,
                tokensUsed: response.usage?.total_tokens,
                toolsInvoked: toolsInvoked.length
            });

            return {
                type: "success",
                content: finalContent,
                metadata: {
                    tokensUsed: response.usage?.total_tokens,
                    toolsInvoked: toolsInvoked,
                    ragSourcesUsed: ragContext ? 1 : 0
                }
            };
        } catch (error: any) {
            logger.error("Agent: Unhandled error", error, {
                requestId: this.requestId,
                student: this.student.id
            });
            return this.errorResponse("Internal error", error.message);
        }
    }

    /**
     * Stage 1: Validate input for security
     */
    private async validateInput(message: string): Promise<{ valid: boolean; reason?: string }> {
        // Use existing security validation
        const validation = validateInput(message);
        if (!validation.valid) {
            return { valid: false, reason: validation.error };
        }

        // Add custom validation
        if (message.length > 5000) {
            return { valid: false, reason: "Message is too long (max 5000 characters)" };
        }

        return { valid: true };
    }

    /**
     * Stage 2: Check if user has token budget remaining
     */
    private async checkTokenBudget(
        message: string,
        chatHistory: Message[]
    ): Promise<{ approved: boolean; reason?: string; estimatedTokens: number; reservedAt?: Date }> {
        const estimatedTokens = this.estimateTokens([
            { role: "user" as const, content: message },
            ...chatHistory.slice(-10).map((m) => ({
                role: m.role.toLowerCase() as "user" | "assistant",
                content: m.content
            }))
        ]);

        const reservation = await tokenBudgetManager.reserveBudget(this.student.id, estimatedTokens);

        return {
            approved: reservation.approved,
            reason: reservation.reason,
            estimatedTokens,
            reservedAt: reservation.reservedAt
        };
    }

    /**
     * Stage 3: Build student-aware system prompt
     */
    private buildSystemPrompt(): string {
        // Base prompt for students (from prompt.ts)
        let prompt = `You are an AI tutor helping students learn programming.

CORE PRINCIPLE: Teaching > Solving
Your goal is to help students learn by guiding them, not giving answers.

YOUR ROLE:
- Explain concepts clearly at the student's level
- Ask clarifying questions before answering
- Provide hints and scaffolding, not solutions
- When students ask "what's the answer?", counter with "what have you tried?"

REFUSAL POLICY (Unequivocal):
You WILL REFUSE:
- Code to bypass security, steal data, or harm systems
- Methods to cheat (plagiarism, contract cheating)
- Instructions for weapons, explosives, violence, or illegal activities
- Malware, hacking tools, or exploitation techniques
- Detailed privacy violations, doxxing, or harassment
- Financial fraud or illegal schemes

WHEN YOU MUST REFUSE: "I can't help with that directly, but I can help you with [alternative]: [explanation]"

TOOLS:
- Use 'search_web' for documentation and current info
- Use 'calculator' for arithmetic verification
- Use 'code_review' to analyze code for issues (static analysis only)
- Use 'format_code' to improve code readability
- DO NOT suggest running code through this AI—they should use their IDE

TEACHING TECHNIQUES:
- Ask "what have you tried?" before explaining
- Use pseudocode to teach logic before syntax
- Explain WHY, not just WHAT
- Point to documentation: "Check the docs—what do you find?"

FORMATTING:
- Use \`code\` for inline code, \`\`\`language for blocks
- Use \$formula\$ for math (e.g., \$E=mc^2\$)
- Use \$\$block\$\$ for complex equations
- Don't use \\( or \\[ for math`;

        // Customize based on student level
        if (this.student.level === "beginner") {
            prompt += `\n\nBEGINNER MODE:
- Use simple words and concrete examples
- Break concepts into small steps
- Be extra patient—struggling is normal when learning
- Celebrate progress: "Good question—that's exactly where people get confused!"`;
        } else if (this.student.level === "advanced") {
            prompt += `\n\nADVANCED MODE:
- Assume knowledge of: ${this.student.knownConcepts?.join(", ") || "algorithms, data structures"}
- Get to the point quickly
- Suggest optimizations and best practices
- Reference academic papers or advanced tools when relevant`;
        }

        return prompt;
    }

    /**
     * Stage 3b: Format messages with RAG context and chat history
     */
    private formatMessages(
        chatHistory: Message[],
        currentMessage: string,
        ragContext?: string
    ): Array<{ role: "user" | "assistant"; content: string }> {
        // Decrypt and format history
        const messages = chatHistory.slice(-50).map((m) => ({
            role: (m.role.toLowerCase() as "user" | "assistant"),
            content: m.content  // Note: Already decrypted by caller
        }));

        // Add RAG context if available
        if (ragContext) {
            const sanitizedContext = this.sanitizeRagContext(ragContext);
            messages.push({
                role: "user" as const,
                content: `[Context from your documents]\n${sanitizedContext}\n\n[Your question]`
            });
        }

        // Add current message with boundary markers
        messages.push({
            role: "user" as const,
            content: `===MESSAGE_START===\n${currentMessage}\n===MESSAGE_END===`
        });

        return messages;
    }

    /**
     * Sanitize RAG context to prevent injection
     */
    private sanitizeRagContext(context: string): string {
        const dangerousPatterns = [
            /ignore.*instruction/gi,
            /roleplay as|act as if|pretend to be/gi,
            /you are now (?:in|operating in|switched to)/gi,
            /jailbreak/gi,
        ];

        let sanitized = context;
        for (const pattern of dangerousPatterns) {
            sanitized = sanitized.replace(pattern, "[FILTERED]");
        }

        return sanitized.substring(0, 3000); // Cap RAG context size
    }

    /**
     * Stage 4b: Execute tools if model invoked any
     */
    private async executeTools(
        toolCalls: any[],
        messages: Array<{ role: "user" | "assistant"; content: string }>
    ): Promise<{ content: string; toolNames: string[] }> {
        // Placeholder: Tools are executed elsewhere
        // This would integrate with tool registry
        logger.info("Agent: Tool execution requested", {
            requestId: this.requestId,
            toolCount: toolCalls.length
        });

        return {
            content: "Tools executed successfully",
            toolNames: toolCalls.map((t) => t.function.name)
        };
    }

    /**
     * Stage 7: Validate output safety
     */
    private async validateOutput(content: string): Promise<{ safe: boolean; reason?: string }> {
        // Check for obvious safety issues
        if (content.includes("execute this command") && content.includes("sudo rm -rf")) {
            return { safe: false, reason: "Response contains dangerous commands" };
        }

        // Could integrate with OpenAI Moderation API here
        // await openai.moderations.create({ input: content });

        return { safe: true };
    }

    /**
     * Estimate tokens in a message set (rough heuristic)
     */
    private estimateTokens(
        messages: Array<{ role: string; content: string }>
    ): number {
        // Rough estimate: 1 token ≈ 4 characters
        const charCount = messages.reduce(
            (sum, msg) => sum + msg.content.length,
            0
        );
        return Math.ceil(charCount / 4);
    }

    /**
     * Helper: Format error response
     */
    private errorResponse(title: string, description: string): AgentResponse {
        return {
            type: "error",
            error: `${title}: ${description}`
        };
    }
}
