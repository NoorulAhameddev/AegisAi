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
You are an AI assistant.

${memoryBlock}

Respond clearly and concisely.
`;
}
