/**
 * LangChain Agent System
 * Advanced agent with tool calling and reasoning capabilities
 */

import { AgentExecutor, createOpenAIFunctionsAgent } from "langchain/agents";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { createLangChainClient } from "./langchain-client";
import { getLangChainTools } from "./langchain-tools";
import { createChatMemory } from "./langchain-memory";

/**
 * Create a LangChain agent with tools
 * @param chatId - Chat ID for memory context
 * @param systemPrompt - System prompt for the agent
 */
export async function createAgent(chatId: string, systemPrompt: string) {
    // Create LLM
    const llm = createLangChainClient({
        temperature: 0.7,
        modelName: "gpt-4o-mini",
    });

    // Get tools
    const tools = getLangChainTools();

    // Create memory
    const memory = await createChatMemory(chatId);

    // Create prompt template
    const prompt = ChatPromptTemplate.fromMessages([
        ["system", systemPrompt],
        new MessagesPlaceholder("chat_history"),
        ["human", "{input}"],
        new MessagesPlaceholder("agent_scratchpad"),
    ]);

    // Create agent
    const agent = await createOpenAIFunctionsAgent({
        llm,
        tools,
        prompt,
    });

    // Create executor
    const executor = new AgentExecutor({
        agent,
        tools,
        memory,
        verbose: true,
        maxIterations: 5,
        returnIntermediateSteps: true,
    });

    return executor;
}

/**
 * Run agent with input
 * @param executor - Agent executor
 * @param input - User input
 */
export async function runAgent(executor: AgentExecutor, input: string) {
    try {
        // Get chat history from memory if available
        const memory = (executor as any).memory;
        let chat_history: any[] = [];
        
        if (memory) {
            try {
                const memoryVariables = await memory.loadMemoryVariables({});
                chat_history = memoryVariables.chat_history || [];
            } catch (e) {
                console.warn("Failed to load memory variables:", e);
            }
        }

        const result = await executor.invoke({
            input,
            chat_history,
        });

        return {
            success: true,
            output: result.output,
            intermediateSteps: result.intermediateSteps || [],
        };
    } catch (error: any) {
        console.error("[LangChain Agent] Error:", error);
        return {
            success: false,
            error: error.message,
            output: "I encountered an error while processing your request.",
        };
    }
}

/**
 * Create a streaming agent (for real-time responses)
 */
export async function createStreamingAgent(chatId: string, systemPrompt: string) {
    const llm = createLangChainClient({
        streaming: true,
        temperature: 0.7,
        modelName: "gpt-4o-mini",
    });

    const tools = getLangChainTools();
    const memory = await createChatMemory(chatId);

    const prompt = ChatPromptTemplate.fromMessages([
        ["system", systemPrompt],
        new MessagesPlaceholder("chat_history"),
        ["human", "{input}"],
        new MessagesPlaceholder("agent_scratchpad"),
    ]);

    const agent = await createOpenAIFunctionsAgent({
        llm,
        tools,
        prompt,
    });

    const executor = new AgentExecutor({
        agent,
        tools,
        memory,
        verbose: true,
        maxIterations: 5,
    });

    return executor;
}
