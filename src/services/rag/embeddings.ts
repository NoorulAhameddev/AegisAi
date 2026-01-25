const isTest = process.env.NODE_ENV === 'test';

export async function generateEmbedding(text: string): Promise<number[]> {
    const cleanText = text.replace(/\n/g, ' ');

    // Avoid hitting OpenAI during tests; return deterministic stub vector
    if (isTest) {
        const base = cleanText || 'test';
        const values = Array.from(base)
            .slice(0, 16)
            .map((char, idx) => ((char.charCodeAt(0) + idx) % 10) / 10);
        return values.length > 0 ? values : [0];
    }

    const { openai } = await import('../ai/openai');
    const response = await openai.embeddings.create({
        model: 'openai/text-embedding-ada-002', // OpenRouter supported model
        input: cleanText,
        encoding_format: 'float',
    });

    return response.data[0].embedding;
}
