/**
 * Enhanced Document Ingestion Service
 * Handles extracting text from various document types with image support
 */

import { logger } from "@/lib/logger";
import {
  chunkDocument,
  processChunkImages,
  type DocumentChunk,
  type ChunkingOptions,
} from "./document-chunker";
import {
  extractOCRTextFromImage,
  extractFromPDF,
  type ExtractedImage,
} from "./image-extraction";

type BufferFromResult = Uint8Array & {
  toString: (encoding?: string) => string;
};
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

const decodeBase64ToUint8Array = (base64: string): Uint8Array => {
  const buffer = getGlobalBuffer();
  if (buffer) {
    return new Uint8Array(buffer.from(base64, "base64"));
  }
  const binary = globalThis.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
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

const normalizeBinaryContent = (content: string | Uint8Array): Uint8Array => {
  if (typeof content !== "string") {
    return content;
  }
  if (content.startsWith("data:")) {
    const [, base64] = content.split(",", 2);
    return decodeBase64ToUint8Array(base64 || "");
  }
  if (content.startsWith("%PDF")) {
    return new TextEncoder().encode(content);
  }
  return decodeBase64ToUint8Array(content);
};

const toNodeBufferLike = (data: Uint8Array): Uint8Array | ArrayBuffer => {
  const buffer = getGlobalBuffer();
  if (buffer) {
    return buffer.from(data);
  }
  return data.buffer as ArrayBuffer;
};

/**
 * File type detector
 */
export type SupportedFileType = "pdf" | "text" | "image" | "docx" | "unknown";

/**
 * File info after processing
 */
export interface ProcessedFileInfo {
  fileType: SupportedFileType;
  textLength: number;
  imageCount: number;
  pageCount?: number;
  confidence: {
    textExtraction: number; // 0-100
    imageExtraction: number; // 0-100
  };
  hasImages: boolean;
  hasText: boolean;
  metadata?: Record<string, any>;
}

/**
 * Ingestion result
 */
export interface IngestionResult {
  chunks: DocumentChunk[];
  fileInfo: ProcessedFileInfo;
  totalTokens: number;
  processingTimeMs: number;
}

/**
 * Ingestion options
 */
export interface IngestionOptions extends ChunkingOptions {
  sourceId?: string;
  sourceFile?: string;
  userId?: string;
  extractImages?: boolean;
  extractOCR?: boolean;
}

/**
 * Detect file type from MIME type or extension
 */
export function detectFileType(
  filename: string,
  mimeType?: string,
): SupportedFileType {
  const lowerName = filename.toLowerCase();
  const lowerMime = mimeType?.toLowerCase() || "";

  if (lowerMime.includes("pdf") || lowerName.endsWith(".pdf")) {
    return "pdf";
  }

  if (
    lowerMime.includes("image/") ||
    lowerName.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/)
  ) {
    return "image";
  }

  if (
    lowerMime.includes("word") ||
    lowerMime.includes("document") ||
    lowerName.endsWith(".docx") ||
    lowerName.endsWith(".doc")
  ) {
    return "docx";
  }

  if (
    lowerMime.includes("text") ||
    lowerMime.includes("plain") ||
    lowerName.endsWith(".txt")
  ) {
    return "text";
  }

  return "unknown";
}

/**
 * Extract text from PDF with error handling
 */
export async function extractTextFromPDF(
  fileBuffer: Uint8Array,
  filename?: string,
): Promise<{
  text: string;
  images: ExtractedImage[];
  metadata?: Record<string, any>;
}> {
  try {
    logger.info("[DocumentIngest] Extracting text from PDF", { filename });

    const result = await extractFromPDF(fileBuffer);

    logger.info("[DocumentIngest] PDF extraction complete", {
      filename,
      textLength: result.text.length,
      imageCount: result.images.length,
    });

    return {
      text: result.text,
      images: result.images,
      metadata: result.metadata,
    };
  } catch (error) {
    logger.error("[DocumentIngest] PDF extraction failed", error as Error, {
      filename,
    });
    return { text: "", images: [] };
  }
}

/**
 * Extract text from image with OCR
 */
export async function extractTextFromImage(
  base64Image: string,
  mimeType: string = "image/png",
  filename?: string,
): Promise<{ text: string; hasText: boolean }> {
  try {
    logger.info("[DocumentIngest] Extracting text from image with OCR", {
      filename,
    });

    const text = await extractOCRTextFromImage(base64Image, mimeType);

    if (!text) {
      logger.warn("[DocumentIngest] OCR returned no text", { filename });
      return { text: "", hasText: false };
    }

    logger.info("[DocumentIngest] OCR extraction complete", {
      filename,
      textLength: text.length,
    });

    return { text, hasText: true };
  } catch (error) {
    logger.error(
      "[DocumentIngest] Image OCR extraction failed",
      error as Error,
      { filename },
    );
    return { text: "", hasText: false };
  }
}

/**
 * Extract text from DOCX file (requires integration with mammoth or similar)
 */
export async function extractTextFromDOCX(
  fileBuffer: Uint8Array,
  filename?: string,
): Promise<{ text: string; success: boolean }> {
  try {
    // Note: This requires installing mammoth library
    // npm install mammoth

    let mammoth;
    try {
      mammoth = await import("mammoth");
    } catch {
      logger.warn(
        "[DocumentIngest] Mammoth library not available for DOCX extraction",
        { filename },
      );
      return { text: "", success: false };
    }

    logger.info("[DocumentIngest] Extracting text from DOCX", { filename });

    const result = await mammoth.extractRawText({
      buffer: toNodeBufferLike(fileBuffer),
    });

    logger.info("[DocumentIngest] DOCX extraction complete", {
      filename,
      textLength: result.value?.length || 0,
    });

    return {
      text: result.value || "",
      success: true,
    };
  } catch (error) {
    logger.error("[DocumentIngest] DOCX extraction failed", error as Error, {
      filename,
    });
    return { text: "", success: false };
  }
}

/**
 * Main document ingestion function
 */
export async function ingestDocument(
  content: string | Uint8Array,
  filename: string,
  mimeType?: string,
  options?: IngestionOptions,
): Promise<IngestionResult> {
  const startTime = Date.now();
  const fileType = detectFileType(filename, mimeType);

  logger.info("[DocumentIngest] Starting document ingestion", {
    filename,
    fileType,
    contentSize:
      typeof content === "string" ? content.length : content.byteLength,
  });

  try {
    let textContent = "";
    let images: ExtractedImage[] = [];
    let metadata: Record<string, any> = {};
    let pageCount: number | undefined;

    // Extract based on file type
    if (fileType === "pdf") {
      const buffer = normalizeBinaryContent(content);
      const extraction = await extractTextFromPDF(buffer, filename);
      textContent = extraction.text;
      images = extraction.images;
      metadata = extraction.metadata || {};
      pageCount = (extraction.metadata as any)?.pageCount;
    } else if (fileType === "image") {
      const base64 =
        typeof content === "string"
          ? content.includes("data:")
            ? content
            : `data:${mimeType};base64,${content}`
          : `data:${mimeType};base64,${uint8ArrayToBase64(content)}`;

      if (options?.extractOCR) {
        const extraction = await extractTextFromImage(
          base64,
          mimeType || "image/jpeg",
          filename,
        );
        textContent = extraction.text;
      } else {
        logger.info(
          "[DocumentIngest] Skipping OCR for image (disabled in options)",
          { filename },
        );
      }

      images = [
        {
          base64: base64.split(",")[1] || base64, // Remove data: prefix if present
          mimeType: mimeType || "image/jpeg",
        },
      ];
    } else if (fileType === "docx") {
      const buffer =
        typeof content === "string" ? normalizeBinaryContent(content) : content;

      const extraction = await extractTextFromDOCX(buffer, filename);
      textContent = extraction.text;

      if (!extraction.success) {
        logger.warn(
          "[DocumentIngest] DOCX extraction failed, returning empty",
          { filename },
        );
      }
    } else {
      // Treat as plain text
      textContent =
        typeof content === "string"
          ? content
          : new TextDecoder().decode(content);
    }

    if (!textContent && images.length === 0) {
      logger.warn("[DocumentIngest] No content extracted from document", {
        filename,
        fileType,
      });
      return {
        chunks: [],
        fileInfo: {
          fileType,
          textLength: 0,
          imageCount: 0,
          pageCount,
          confidence: { textExtraction: 0, imageExtraction: 0 },
          hasImages: false,
          hasText: false,
          metadata,
        },
        totalTokens: 0,
        processingTimeMs: Date.now() - startTime,
      };
    }

    // Chunk the content
    const chunkingOptions: ChunkingOptions = {
      chunkSize: options?.chunkSize || 1000,
      chunkOverlap: options?.chunkOverlap || 100,
      preserveImages: options?.extractImages !== false,
      enableOCR: options?.extractOCR !== false,
      maxChunks: options?.maxChunks || 100,
    };

    let chunks = await chunkDocument(
      textContent,
      chunkingOptions,
      options?.sourceId,
    );

    // If we have pre-extracted images, add them to appropriate chunks
    if (images.length > 0 && options?.extractImages !== false) {
      chunks = chunks.map((chunk, idx) => ({
        ...chunk,
        images: idx === 0 ? images : undefined, // Add images to first chunk
        metadata: {
          ...chunk.metadata,
          hasImages: idx === 0 && images.length > 0,
          imageCount: idx === 0 ? images.length : 0,
        },
      }));
    }

    // Process OCR for images if enabled
    if (options?.extractOCR !== false) {
      chunks = await processChunkImages(chunks, chunkingOptions);
    }

    const totalTokens = chunks.reduce(
      (sum, c) => sum + c.metadata.estimatedTokens,
      0,
    );

    logger.info("[DocumentIngest] Document ingestion complete", {
      filename,
      fileType,
      chunks: chunks.length,
      totalTokens,
      images: images.length,
      processingTimeMs: Date.now() - startTime,
    });

    return {
      chunks,
      fileInfo: {
        fileType,
        textLength: textContent.length,
        imageCount: images.length,
        pageCount,
        confidence: {
          textExtraction: textContent.length > 0 ? 100 : 0,
          imageExtraction: images.length > 0 ? 100 : 0,
        },
        hasImages: images.length > 0,
        hasText: textContent.length > 0,
        metadata,
      },
      totalTokens,
      processingTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    logger.error("[DocumentIngest] Document ingestion failed", error as Error, {
      filename,
      fileType,
    });

    return {
      chunks: [],
      fileInfo: {
        fileType,
        textLength: 0,
        imageCount: 0,
        confidence: { textExtraction: 0, imageExtraction: 0 },
        hasImages: false,
        hasText: false,
      },
      totalTokens: 0,
      processingTimeMs: Date.now() - startTime,
    };
  }
}

/**
 * Batch ingest multiple documents
 */
export async function batchIngestDocuments(
  documents: Array<{
    content: string | Uint8Array;
    filename: string;
    mimeType?: string;
  }>,
  options?: IngestionOptions,
): Promise<IngestionResult[]> {
  logger.info("[DocumentIngest] Starting batch ingestion", {
    documentCount: documents.length,
  });

  const results = await Promise.all(
    documents.map((doc) =>
      ingestDocument(doc.content, doc.filename, doc.mimeType, options),
    ),
  );

  const totalChunks = results.reduce((sum, r) => sum + r.chunks.length, 0);
  const totalTokens = results.reduce((sum, r) => sum + r.totalTokens, 0);
  const totalTime = results.reduce((sum, r) => sum + r.processingTimeMs, 0);

  logger.info("[DocumentIngest] Batch ingestion complete", {
    documentCount: documents.length,
    totalChunks,
    totalTokens,
    totalTimeMs: totalTime,
  });

  return results;
}

export default {
  detectFileType,
  extractTextFromPDF,
  extractTextFromImage,
  extractTextFromDOCX,
  ingestDocument,
  batchIngestDocuments,
};
