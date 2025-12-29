import fs from "fs";
const pdf = require("pdf-parse");
import Tesseract from "tesseract.js";

export async function extractText(filePath: string, mime: string) {
    if (mime === "application/pdf") {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdf(dataBuffer);
        return data.text;
    }

    if (mime.startsWith("image/")) {
        const result = await Tesseract.recognize(filePath, "eng");
        return result.data.text;
    }

    return "";
}
