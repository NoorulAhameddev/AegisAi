import { Tool } from "./index";
import { searchWeb } from "../lib/search";
import axios from "axios";
import * as cheerio from "cheerio";

export const WebSearchTool: Tool = {
    name: "search_web",
    description: "Searches the internet for current information. Use this when you need facts, news, or knowledge not in your training data.",
    parameters: {
        type: "object",
        properties: {
            query: { type: "string", description: "The search query." }
        },
        required: ["query"]
    },
    execute: async ({ query }) => {
        return await searchWeb(query);
    }
};

export const WebReadTool: Tool = {
    name: "read_web_page",
    description: "Visits a specific URL and reads its content. Use this to dive deeper into search results.",
    parameters: {
        type: "object",
        properties: {
            url: { type: "string", description: "The URL to visit." }
        },
        required: ["url"]
    },
    execute: async ({ url }) => {
        try {
            const res = await axios.get(url, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' },
                timeout: 10000
            });
            const $ = cheerio.load(res.data);

            // Cleanup
            $('script').remove();
            $('style').remove();
            $('nav').remove();
            $('footer').remove();

            // Extract text
            let text = $('body').text().replace(/\s+/g, ' ').trim();
            return text.substring(0, 5000) + (text.length > 5000 ? "..." : ""); // Limit context
        } catch (e: any) {
            return `Error reading page: ${e.message}`;
        }
    }
};
