import fs from "fs";

export async function extractText(filePath: string, mime: string) {
    try {
        if (mime === "application/pdf") {
            const pdf = require("pdf-parse");
            const dataBuffer = fs.readFileSync(filePath);
            const data = await pdf(dataBuffer);
            return data.text;
        }

        if (mime.startsWith("image/")) {
            // Tesseract.js is usually a default export or named export depending on version
            // Safer to use dynamic import if possible, or require
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
