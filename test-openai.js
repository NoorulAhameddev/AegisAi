require('dotenv').config();
const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function test() {
    try {
        console.log("Testing OpenAI with key:", process.env.OPENAI_API_KEY?.substring(0, 7) + "...");
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: "hi" }],
            max_tokens: 5
        });
        console.log("Response:", response.choices[0].message.content);
    } catch (e) {
        console.error("OpenAI Error:", e.message);
    }
}

test();
