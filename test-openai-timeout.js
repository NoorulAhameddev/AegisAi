require('dotenv').config();
const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 10000 // 10 seconds
});

async function test() {
    try {
        console.log("Testing OpenAI...");
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
