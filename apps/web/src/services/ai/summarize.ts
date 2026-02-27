import { openai } from "./openai";

export async function summarizeConversation(messages: string[]) {
  const prompt = `
Summarize the following conversation in 5 concise bullet points.
Focus on facts, goals, and decisions.

Conversation:
${messages.join("\n")}
`;

  const completion = await openai.chat.completions.create({
    model: "glm-5",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
  });

  return completion.choices[0].message.content;
}

