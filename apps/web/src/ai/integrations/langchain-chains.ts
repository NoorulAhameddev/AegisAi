/**
 * LangChain Chains
 * Pre-built chains for common tasks
 */

import { LLMChain } from "langchain/chains";
import { PromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { createLangChainClient } from "./langchain-client";

/**
 * Create a summarization chain
 */
export async function createSummarizationChain() {
  const llm = createLangChainClient({ temperature: 0.3 }) as InstanceType<
    typeof ChatOpenAI
  >;

  const prompt = PromptTemplate.fromTemplate(
    "Summarize the following text concisely:\n\n{text}\n\nSummary:",
  );

  const chain = new LLMChain({ llm, prompt });
  return chain;
}

/**
 * Create a question answering chain
 */
export async function createQAChain() {
  const llm = createLangChainClient({ temperature: 0.2 }) as InstanceType<
    typeof ChatOpenAI
  >;

  const prompt = PromptTemplate.fromTemplate(
    "Answer the following question based on the context:\n\nContext: {context}\n\nQuestion: {question}\n\nAnswer:",
  );

  const chain = new LLMChain({ llm, prompt });
  return chain;
}

/**
 * Create a code generation chain
 */
export async function createCodeChain() {
  const llm = createLangChainClient({ temperature: 0.1 }) as InstanceType<
    typeof ChatOpenAI
  >;

  const prompt = PromptTemplate.fromTemplate(
    "Generate {language} code for the following task:\n\n{task}\n\nCode:",
  );

  const chain = new LLMChain({ llm, prompt });
  return chain;
}
