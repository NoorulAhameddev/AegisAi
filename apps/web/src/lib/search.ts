import fs from "fs";

export async function searchWeb(query: string) {
    try {
        fs.appendFileSync('server_debug.log', `[SEARCH] Custom/DDG Query: ${query}\n`);

        // Use dynamic require to act as a fallback if types are not present
        const axios = require("axios");
        const cheerio = require("cheerio");

        const res = await axios.get('https://html.duckduckgo.com/html/', {
            params: { q: query },
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const $ = cheerio.load(res.data);
        const results: any[] = [];

        $('.result').each((i: number, element: any) => {
            const title = $(element).find('.result__title a').text().trim();
            const url = $(element).find('.result__title a').attr('href');
            const description = $(element).find('.result__snippet').text().trim();

            if (title && url) {
                results.push({ title, url, description });
            }
        });

        if (results.length === 0) {
            fs.appendFileSync('server_debug.log', `[SEARCH] No results found in HTML.\n`);
            return { info: "No search results found." };
        }

        const simpleResults = results.slice(0, 5);
        fs.appendFileSync('server_debug.log', `[SEARCH] Found ${simpleResults.length} results.\n`);
        return simpleResults;

    } catch (error: any) {
        fs.appendFileSync('server_debug.log', `[SEARCH ERROR] ${error.message}\n`);
        console.error("Search failed:", error);
        return { error: "Search failed", details: error.message };
    }
}
