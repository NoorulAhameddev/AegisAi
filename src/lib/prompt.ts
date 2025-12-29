import { getUserMemory } from "@/lib/memory";
import { Message } from "@prisma/client";

export function buildPrompt(messages: Message[]) {
  return messages.map((m) => ({
    role: m.role.toLowerCase() as "user" | "assistant" | "system",
    content: m.content,
  }));
}

export async function buildSystemPrompt(userId: string) {
  const memory = await getUserMemory(userId);

  let memoryBlock = "";

  if (memory.length) {
    memoryBlock =
      "Known information about the user:\n" +
      memory.map((m) => `- ${m.content}`).join("\n");
  }

  return `
You are a helpful and knowledgeable AI assistant. Your role is to:
- Always answer questions asked by the user
- Provide accurate, detailed, and helpful responses
- Be conversational and friendly
- Never refuse to answer reasonable questions
- Provide explanations and examples when helpful
- Ask clarifying questions if needed for better answers

${memoryBlock}

Remember: Always respond to the user's questions with helpful information.
`;
}
