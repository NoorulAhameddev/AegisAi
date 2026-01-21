/**
 * LangChain Memory Management
 * Enhanced conversation memory using LangChain's memory systems
 */

import { BufferMemory } from "langchain/memory";
import { ChatMessageHistory } from "langchain/stores/message/in_memory";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { prisma } from "./prisma";
import { decrypt } from "./encryption";

/**
 * Create a LangChain memory instance from chat history
 * @param chatId - Chat ID to load history from
 * @param maxMessages - Maximum number of messages to load (default: 10)
 */
export async function createChatMemory(chatId: string, maxMessages: number = 10) {
    // Fetch chat history from database
    const messages = await prisma.message.findMany({
        where: { chatId },
        orderBy: { createdAt: "asc" },
        take: maxMessages,
    });

    // Decrypt and convert to LangChain message format
    const chatHistory = new ChatMessageHistory();
    
    for (const msg of messages) {
        const decryptedContent = decrypt(msg.content);
        
        if (msg.role === "USER") {
            await chatHistory.addMessage(new HumanMessage(decryptedContent));
        } else if (msg.role === "ASSISTANT") {
            await chatHistory.addMessage(new AIMessage(decryptedContent));
        } else if (msg.role === "SYSTEM") {
            await chatHistory.addMessage(new SystemMessage(decryptedContent));
        }
    }

    // Create buffer memory with the chat history
    const memory = new BufferMemory({
        chatHistory,
        returnMessages: true,
        memoryKey: "chat_history",
    });

    return memory;
}

/**
 * Create a summary memory for long conversations
 * Uses LangChain's ConversationSummaryMemory
 */
export async function createSummaryMemory(chatId: string, llm: any) {
    const { ConversationSummaryMemory } = await import("langchain/memory");
    
    const messages = await prisma.message.findMany({
        where: { chatId },
        orderBy: { createdAt: "asc" },
    });

    const chatHistory = new ChatMessageHistory();
    
    for (const msg of messages) {
        const decryptedContent = decrypt(msg.content);
        
        if (msg.role === "USER") {
            await chatHistory.addMessage(new HumanMessage(decryptedContent));
        } else if (msg.role === "ASSISTANT") {
            await chatHistory.addMessage(new AIMessage(decryptedContent));
        }
    }

    const memory = new ConversationSummaryMemory({
        llm,
        chatHistory,
        returnMessages: true,
        memoryKey: "chat_history",
    });

    return memory;
}

/**
 * Create a window memory (keeps only last N messages)
 */
export async function createWindowMemory(chatId: string, windowSize: number = 5) {
    const { BufferWindowMemory } = await import("langchain/memory");
    
    const messages = await prisma.message.findMany({
        where: { chatId },
        orderBy: { createdAt: "desc" },
        take: windowSize,
    });

    const chatHistory = new ChatMessageHistory();
    
    // Reverse to get chronological order
    for (const msg of messages.reverse()) {
        const decryptedContent = decrypt(msg.content);
        
        if (msg.role === "USER") {
            await chatHistory.addMessage(new HumanMessage(decryptedContent));
        } else if (msg.role === "ASSISTANT") {
            await chatHistory.addMessage(new AIMessage(decryptedContent));
        }
    }

    const memory = new BufferWindowMemory({
        chatHistory,
        returnMessages: true,
        memoryKey: "chat_history",
        k: windowSize,
    });

    return memory;
}
