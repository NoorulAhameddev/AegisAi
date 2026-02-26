import { createAgent, runAgent } from "../src/ai/integrations/langchain-agent";
import { retrieveContext } from "../src/lib/rag-retrieval";
import { getLangChainTools } from "../src/ai/integrations/langchain-tools";

async function main() {
  console.log("\n=============================================");
  console.log("   Agie-Ai LangChain & RAG Capability Check   ");
  console.log("=============================================\n");

  // 1. Check Tools
  console.log("[1] Checking Available Tools...");
  try {
    const tools = getLangChainTools();
    console.log(`✅ Success: ${tools.length} tools registered.`);
    tools.forEach((t) => console.log(`   - ${t.name}: ${t.description}`));
  } catch (e: any) {
    console.error(`❌ Tool Registry Error: ${e.message}`);
  }

  // 2. Check RAG Functionality
  // (We use a dummy query. Connection depends on Vector Store/DB)
  console.log("\n[2] Checking RAG Retrieval System...");
  const query = "What are the security protocols?";
  const userId = "debug-check-user";
  try {
    console.log(`   Querying: "${query}"...`);
    const context = await retrieveContext(query, userId, { topK: 1 });

    if (context.documents.length > 0) {
      console.log(
        `✅ Success: Found ${context.documents.length} relevant documents.`,
      );
      console.log(`   Context Preview: ${context.context.substring(0, 50)}...`);
    } else {
      console.log("⚠️  Notice: Retrieval returned 0 documents.");
      console.log(
        "   (This is expected if the vector database is empty, but confirms the query ran without crashing.)",
      );
    }
  } catch (e: any) {
    console.error(`❌ RAG Retrieval Error: ${e.message}`);
    console.log("   (Ensure Database and Vector Store are reachable)");
  }

  // 3. Check LangChain Agent
  console.log("\n[3] Checking LangChain Agent (OpenAI Connection)...");
  try {
    const chatId = "debug-chat-" + Date.now();
    const systemPrompt = "You are a test agent. confirm you are online.";

    console.log("   Creating Agent...");
    const executor = await createAgent(chatId, systemPrompt);

    console.log(
      "   Sending Prompt: 'Calculate 5 + 5 using your tools if needed.'",
    );
    const result = await runAgent(executor, "Calculate 5 + 5");

    if (result.success) {
      console.log(`✅ Success: Agent responded.`);
      console.log(`   Output: ${result.output}`);
      console.log(
        `   Intermediate Steps: ${result.intermediateSteps?.length || 0}`,
      );
    } else {
      console.error(`❌ Agent Failed: ${result.error}`);
    }
  } catch (e: any) {
    console.error(`❌ Agent Creation/Execution Error: ${e.message}`);
    if (e.message.includes("OPENAI_API_KEY")) {
      console.log("   (Missing OpenAI API Key in .env)");
    }
  }

  console.log("\n=============================================");
}

main().catch(console.error);
