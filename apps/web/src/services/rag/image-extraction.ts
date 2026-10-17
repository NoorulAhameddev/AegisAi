/**
 * Image Extraction Service for RAG
 * Handles extracting images from PDFs and OCR text from images
 */

import { logger } from "@/lib/logger";

type BufferFromResult = { toString: (encoding?: string) => string };
type BufferLike = {
  from: (
    input: string | ArrayBuffer | Uint8Array,
    encoding?: string,
  ) => BufferFromResult;
};

const getGlobalBuffer = (): BufferLike | null => {
  const buffer = (globalThis as { Buffer?: BufferLike }).Buffer;
  if (buffer && typeof buffer.from === "function") {
    return buffer;
  }
  return null;
};

const uint8ArrayToBase64 = (data: Uint8Array): string => {
  const buffer = getGlobalBuffer();
  if (buffer) {
    return buffer.from(data).toString("base64");
  }
  let binary = "";
  for (let i = 0; i < data.length; i += 1) {
    binary += String.fromCharCode(data[i]);
  }
  return globalThis.btoa(binary);
};

const arrayBufferToBase64 = (data: ArrayBuffer): string =>
  uint8ArrayToBase64(new Uint8Array(data));

/**
 * Extracted image metadata
 */
export interface ExtractedImage {
  base64: string;
  mimeType: string;
  width?: number;
  height?: number;
  ocrText?: string;
  pageNumber?: number;
  position?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * PDF extraction result
 */
export interface PDFExtractionResult {
  text: string;
  images: ExtractedImage[];
  totalPages: number;
  metadata: {
    title?: string;
    author?: string;
    creationDate?: string;
    modificationDate?: string;
  };
}

/**
 * Extract text from base64-encoded image using OCR
 * Requires Tesseract.js for OCR capabilities
 */
export async function extractOCRTextFromImage(
  base64Image: string,
  mimeType: string = "image/png",
): Promise<string | null> {
  try {
    // OCR with Tesseract.js (supports browser and Node runtimes)
    try {
      const Tesseract = (await import("tesseract.js")).default;

      logger.info("[ImageExtraction] Starting OCR on image...");

      const result = await Tesseract.recognize(
        `data:${mimeType};base64,${base64Image}`,
        "eng",
        {
          logger: (m: any) => {
            if (m.status === "recognizing text") {
              logger.info(
                `[ImageExtraction] OCR Progress: ${(m.progress * 100).toFixed(0)}%`,
              );
            }
          },
        },
      );

      const text = result.data.text;
      const confidence = result.data.confidence;

      if (!text || text.trim().length === 0) {
        logger.warn("[ImageExtraction] OCR returned empty text");
        return null;
      }

      logger.info(
        `[ImageExtraction] OCR completed with ${confidence.toFixed(0)}% confidence`,
      );
      return text;
    } catch (error) {
      logger.warn("Tesseract.js OCR failed", {
        error: (error as Error).message,
      });
      return null;
    }
  } catch (error) {
    logger.warn("Image OCR extraction failed", {
      error: (error as Error).message,
    });
    return null;
  }
}

/**
 * Extract images from PDF binary data
 * Requires PDF.js for extraction
 */
export async function extractImagesFromPDF(
  pdfBuffer: Uint8Array,
): Promise<ExtractedImage[]> {
  logger.warn(
    "[ImageExtraction] PDF image extraction requires pdfjs-dist; returning no images",
  );
  void pdfBuffer;
  return [];
}

/**
 * Extract text and images from PDF
 */
export async function extractFromPDF(
  pdfBuffer: Uint8Array,
): Promise<PDFExtractionResult> {
  try {
    // v2's worker entry must load before the parser in Node/Next.js.
    try {
      await import("pdf-parse/worker");
    } catch {
      // pdf-parse v1 has no worker subpath.
    }
    const pdfModule = await import("pdf-parse");
    const pdfDefault = pdfModule.default as unknown;
    let text = "";
    let totalPages = 0;
    let info: Record<string, unknown> = {};

    // Support both the callable v1 API and the PDFParse class in v2.
    if (typeof pdfDefault === "function") {
      const result = await (pdfDefault as (data: Uint8Array) => Promise<any>)(pdfBuffer);
      text = result.text || "";
      totalPages = result.numpages || 0;
      info = result.info || {};
    } else if (typeof pdfModule.PDFParse === "function") {
      const parser = new pdfModule.PDFParse({ data: pdfBuffer });
      try {
        const [textResult, infoResult] = await Promise.all([
          parser.getText(),
          parser.getInfo(),
        ]);
        text = textResult.text || "";
        totalPages = textResult.total || infoResult.total || 0;
        info = infoResult.infoData || infoResult.info || {};
      } finally {
        await parser.destroy();
      }
    } else {
      throw new Error("Unsupported pdf-parse API");
    }

    const images = await extractImagesFromPDF(pdfBuffer);

    return {
      text: text.trim(),
      images,
      totalPages,
      metadata: {
        title: typeof info.Title === "string" ? info.Title : undefined,
        author: typeof info.Author === "string" ? info.Author : undefined,
        creationDate: typeof info.CreationDate === "string" ? info.CreationDate : undefined,
        modificationDate: typeof info.ModDate === "string" ? info.ModDate : undefined,
      },
    };
  } catch (error) {
    logger.error("PDF extraction failed", error as Error);
    return {
      text: "",
      images: [],
      totalPages: 0,
      metadata: {},
    };
  }
}

/**
 * Convert image URL to base64
 */
export async function imageURLToBase64(
  imageUrl: string,
  timeoutMs: number = 5000,
): Promise<string | null> {
  try {
    if (typeof fetch === "undefined") {
      logger.warn(
        "[ImageExtraction] Fetch not available, cannot convert image URL",
      );
      return null;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(imageUrl, {
        signal: controller.signal as any,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const buffer = await response.arrayBuffer();
      const base64 = arrayBufferToBase64(buffer);

      // Detect MIME type from response header or url
      const mimeType = response.headers.get("content-type") || "image/jpeg";

      return `data:${mimeType};base64,${base64}`;
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    logger.warn("Image URL to base64 conversion failed", {
      error: (error as Error).message,
    });
    return null;
  }
}

/**
 * Detect if content is likely a PDF
 */
export function isPDFContent(content: string | Uint8Array): boolean {
  if (typeof content === "string") {
    return content.startsWith("%PDF") || content.includes("application/pdf");
  }

  if (content instanceof Uint8Array) {
    // Check for PDF magic bytes (%PDF)
    return (
      content[0] === 0x25 &&
      content[1] === 0x50 &&
      content[2] === 0x44 &&
      content[3] === 0x46
    );
  }

  return false;
}

/**
 * Get appropriate MIME type from file extension
 */
export function getMimeTypeFromExtension(filename: string): string {
  const ext = filename.toLowerCase().split(".").pop();

  const mimeTypes: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    pdf: "application/pdf",
    txt: "text/plain",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };

  return mimeTypes[ext || ""] || "application/octet-stream";
}

/**
 * Validate image dimensions are reasonable
 */
export function validateImageDimensions(
  width?: number,
  height?: number,
): boolean {
  if (!width || !height) return true; // Skip validation if not provided

  const minDim = 50;
  const maxDim = 4096;

  return (
    width >= minDim && width <= maxDim && height >= minDim && height <= maxDim
  );
}

/**
 * Compress base64 image for storage (simple approach)
 */
export async function compressBase64Image(
  base64: string,
  maxWidth: number = 800,
  maxHeight: number = 600,
  quality: number = 0.8,
): Promise<string | null> {
  try {
    if (typeof window === "undefined") {
      logger.warn(
        "[ImageExtraction] Image compression requested on server-side, skipping",
      );
      return null;
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const img = new Image();

    return new Promise((resolve) => {
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate scaling
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        const compressed = canvas.toDataURL("image/jpeg", quality);
        resolve(compressed);
      };

      img.onerror = () => {
        logger.warn("[ImageExtraction] Failed to load image for compression");
        resolve(null);
      };

      img.src = base64;
    });
  } catch (error) {
    logger.warn("Image compression failed", {
      error: (error as Error).message,
    });
    return null;
  }
}

export default {
  extractOCRTextFromImage,
  extractImagesFromPDF,
  extractFromPDF,
  imageURLToBase64,
  isPDFContent,
  getMimeTypeFromExtension,
  validateImageDimensions,
  compressBase64Image,
};
