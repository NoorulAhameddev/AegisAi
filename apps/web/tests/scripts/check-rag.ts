// scripts/check-rag.ts
import "dotenv/config";

async function test() {
  console.log("Starting RAG diagnostic...");
  try {
    console.log("Importing retrieval...");
    // Dynamic import to handle potential load errors gracefully if possible
    const { retrieveContext } = await import("../src/lib/rag-retrieval");
    console.log("✅ Retrieval module imported.");

    console.log("Running mock retrieval for query 'security'...");
    const context = await retrieveContext("security", "test-user", { topK: 1 });
    console.log(
      `✅ RAG Retrieval executed. Found ${context.documents.length} docs.`,
    );
  } catch (e: any) {
    console.error("❌ Failed RAG check:", e.message);
    if (e.message.includes("client"))
      console.error("   (Likely DB or OpenAI Client issue)");
  }
}
test();
