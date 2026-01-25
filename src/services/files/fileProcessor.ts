import fs from "fs";

export async function extractText(filePath: string, mime: string): Promise<string> {
    try {
        // PDF Extraction
        if (mime === "application/pdf") {
            const pdf = require("pdf-parse");
            const dataBuffer = fs.readFileSync(filePath);
            const data = await pdf(dataBuffer);
            return data.text;
        }

        // DOCX Extraction
        if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
            const mammoth = require("mammoth");
            const result = await mammoth.extractRawText({ path: filePath });
            return result.value;
        }

        // Plain Text & Markdown
        if (mime === "text/plain" || mime === "text/markdown" || mime === "text/x-markdown") {
            return fs.readFileSync(filePath, "utf-8");
        }

        // JSON (pretty print)
        if (mime === "application/json") {
            const content = fs.readFileSync(filePath, "utf-8");
            try {
                const parsed = JSON.parse(content);
                return JSON.stringify(parsed, null, 2);
            } catch {
                return content;
            }
        }

        // CSV to formatted text
        if (mime === "text/csv") {
            const content = fs.readFileSync(filePath, "utf-8");
            return content; // Could be enhanced with CSV parsing
        }

        // Image OCR
        if (mime.startsWith("image/")) {
            const Tesseract = require("tesseract.js");
            const result = await Tesseract.recognize(filePath, "eng");
            return result.data.text;
        }
    } catch (e: any) {
        console.error("Content extraction failed:", e.message);
        return `[Error extracting content: ${e.message}]`;
    }

    return "";
}

/**
 * Detect language of text content
 */
export function detectLanguage(text: string): string {
    // Simple heuristic - can be enhanced with proper language detection library
    const sample = text.slice(0, 500).toLowerCase();
    
    // Check for common language patterns
    const patterns = {
        english: /\b(the|and|is|in|to|of|a|that|it|with|for)\b/g,
        spanish: /\b(el|la|de|que|y|en|es|por|para|con)\b/g,
        french: /\b(le|la|de|et|est|dans|pour|avec|sur)\b/g,
        german: /\b(der|die|das|und|in|von|zu|den|mit)\b/g,
    };

    let maxMatches = 0;
    let detectedLang = "en";

    for (const [lang, pattern] of Object.entries(patterns)) {
        const matches = sample.match(pattern)?.length || 0;
        if (matches > maxMatches) {
            maxMatches = matches;
            detectedLang = lang === "english" ? "en" : lang.slice(0, 2);
        }
    }

    return detectedLang;
}

/**
 * Extract metadata from file
 */
export async function extractMetadata(filePath: string, mime: string): Promise<Record<string, any>> {
    const metadata: Record<string, any> = {
        mimeType: mime,
        size: fs.statSync(filePath).size,
        createdAt: fs.statSync(filePath).birthtime,
    };

    try {
        // PDF metadata
        if (mime === "application/pdf") {
            const pdf = require("pdf-parse");
            const dataBuffer = fs.readFileSync(filePath);
            const data = await pdf(dataBuffer);
            metadata.pages = data.numpages;
            metadata.info = data.info;
        }

        // DOCX metadata
        if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
            // Could extract core properties using mammoth or docx-parser
            metadata.format = "docx";
        }
    } catch (e) {
        console.error("Metadata extraction failed:", e);
    }

    return metadata;
}
