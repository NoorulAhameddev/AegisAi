import fs from "fs";
import { logger } from "@/lib/logger";

type PdfParseResult = {
  text: string;
  numpages?: number;
  info?: Record<string, unknown>;
};

async function parsePdfBuffer(buffer: Buffer): Promise<PdfParseResult> {
  let pdfModule: any;

  try {
    // pdf-parse v2 requires its worker entry to be initialized before loading
    // the parser in Node/Next.js server runtimes. v1 has no worker subpath.
    require("pdf-parse/worker");
  } catch {
    // Expected for the legacy v1 API.
  }
  pdfModule = require("pdf-parse");

  // pdf-parse v1 exports a callable function; v2 exports the PDFParse class.
  if (typeof pdfModule === "function") {
    return pdfModule(buffer);
  }

  const PDFParse = pdfModule.PDFParse ?? pdfModule.default?.PDFParse;
  if (typeof PDFParse !== "function") {
    throw new Error("Unsupported pdf-parse API");
  }

  const parser = new PDFParse({ data: buffer });
  try {
    const [textResult, infoResult] = await Promise.all([
      parser.getText(),
      parser.getInfo(),
    ]);
    return {
      text: textResult.text ?? "",
      numpages: textResult.total ?? infoResult.total,
      info: infoResult.infoData ?? infoResult.info ?? {},
    };
  } finally {
    await parser.destroy();
  }
}

type TesseractModule = {
  recognize: (
    image: string,
    lang: string,
  ) => Promise<{ data: { text: string } }>;
};

let tesseractModule: TesseractModule | null = null;
let tesseractLoadError: Error | null = null;

async function getTesseract(): Promise<TesseractModule | null> {
  if (tesseractModule) return tesseractModule;
  if (tesseractLoadError) return null;

  try {
    const mod = await import("tesseract.js");
    tesseractModule = mod.default as TesseractModule;
    return tesseractModule;
  } catch (error) {
    tesseractLoadError = error as Error;
    logger.error("Tesseract.js failed to load:", tesseractLoadError);
    return null;
  }
}

export async function extractText(
  filePath: string,
  mime: string,
): Promise<string> {
  try {
    // PDF Extraction
    if (mime === "application/pdf") {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await parsePdfBuffer(dataBuffer);
      return data.text;
    }

    // DOCX Extraction
    if (
      mime ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const mammoth = require("mammoth");
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    }

    // Plain Text & Markdown
    if (
      mime === "text/plain" ||
      mime === "text/markdown" ||
      mime === "text/x-markdown"
    ) {
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
      const tesseract = await getTesseract();
      if (!tesseract) {
        return "";
      }

      const result = await tesseract.recognize(filePath, "eng");
      return result.data.text;
    }
  } catch (e: any) {
    logger.error("Content extraction failed", e as Error);
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
export async function extractMetadata(
  filePath: string,
  mime: string,
): Promise<Record<string, any>> {
  const metadata: Record<string, any> = {
    mimeType: mime,
    size: fs.statSync(filePath).size,
    createdAt: fs.statSync(filePath).birthtime,
  };

  try {
    // PDF metadata
    if (mime === "application/pdf") {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await parsePdfBuffer(dataBuffer);
      metadata.pages = data.numpages;
      metadata.info = data.info;
    }

    // DOCX metadata
    if (
      mime ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      // Could extract core properties using mammoth or docx-parser
      metadata.format = "docx";
    }
  } catch (e) {
    logger.error("Metadata extraction failed", e as Error);
  }

  return metadata;
}
