import { openai } from "./openai";

export async function generateEmbedding(text: string): Promise<number[]> {
    const cleanText = text.replace(/\n/g, " ");
    const response = await openai.embeddings.create({
        model: "text-embedding-3-small", // Cost effective
        input: cleanText,
        encoding_format: "float",
    });

    return response.data[0].embedding;
}
