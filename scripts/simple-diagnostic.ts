
// scripts/simple-diagnostic.ts
import 'dotenv/config';

async function test() {
    console.log("Starting diagnostic...");
    try {
        console.log("Importing tools...");
        const { getLangChainTools } = await import('../src/lib/langchain-tools');
        console.log("Tools imported. Count:", getLangChainTools().length);
    } catch (e) {
        console.error("Failed to import tools:", e);
    }

    try {
        console.log("Importing agent...");
        const agentModule = await import('../src/lib/langchain-agent');
        console.log("Agent module imported.");
    } catch (e) {
        console.error("Failed to import agent:", e);
    }

    try {
        console.log("Importing retrieval...");
        const retrieval = await import('../src/lib/rag-retrieval');
        console.log("Retrieval module imported.");
    } catch (e) {
        console.error("Failed to import retrieval:", e);
    }
}

test();
