require('dotenv').config();
const OpenAI = require('openai');

const isOR = process.env.OPENAI_API_KEY?.startsWith('sk-or-');
const baseURL = isOR ? "https://openrouter.ai/api/v1" : "https://api.openai.com/v1";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: baseURL
});

async function test() {
    try {
        console.log(`Testing using ${isOR ? 'OpenRouter' : 'OpenAI'}...`);
        const response = await openai.chat.completions.create({
            model: isOR ? "openai/gpt-4o-mini" : "gpt-4o-mini",
            messages: [{ role: "user", content: "hi" }],
            max_tokens: 5
        });
        console.log("Response:", response.choices[0].message.content);
    } catch (e) {
        console.error("Error:", e.message);
    }
}

test();
