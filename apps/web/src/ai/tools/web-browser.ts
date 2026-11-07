import { Tool } from "./index";
import { searchWeb } from "@/lib/search";
import { validateAndFetchSafeUrl } from "@/lib/security/ssrf-guard";
import * as cheerio from "cheerio";

export const WebSearchTool: Tool = {
  name: "search_web",
  description:
    "Searches the internet for current information. Use this when you need facts, news, or knowledge not in your training data.",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "The search query." },
    },
    required: ["query"],
  },
  execute: async ({ query }) => {
    return await searchWeb(query);
  },
};

export const WebReadTool: Tool = {
  name: "read_web_page",
  description:
    "Visits a specific URL and reads its content. Use this to dive deeper into search results.",
  parameters: {
    type: "object",
    properties: {
      url: { type: "string", description: "The URL to visit." },
    },
    required: ["url"],
  },
  execute: async ({ url }) => {
    try {
      const res = await validateAndFetchSafeUrl(url, 3);
      const html = typeof res.data === "string" ? res.data : await res.text();
      const $ = cheerio.load(html);

      // Cleanup
      $("script").remove();
      $("style").remove();
      $("nav").remove();
      $("footer").remove();

      // Extract text
      const text = $("body").text().replace(/\s+/g, " ").trim();
      return text.substring(0, 5000) + (text.length > 5000 ? "..." : ""); // Limit context
    } catch (e: any) {
      return `Error reading page: ${e.message}`;
    }
  },
};

// Lightweight wrappers used by LangChain tools
export async function performSearch(query: string) {
  return WebSearchTool.execute({ query });
}

export async function readWebpage(url: string) {
  return WebReadTool.execute({ url });
}
