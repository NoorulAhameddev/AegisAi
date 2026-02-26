/**
 * Document Chunker with Image Extraction
 * Splits documents into chunks while preserving image references
 */

import { logger } from "@/lib/logger";
import {
  extractFromPDF,
  extractOCRTextFromImage,
  isPDFContent,
  type ExtractedImage,
} from "./image-extraction";

/**
 * Chunk metadata
 */
export interface ChunkMetadata {
  chunkIndex: number;
  totalChunks: number;
  sourceId?: string;
  sourceFile?: string;
  contentType: "text" | "image" | "mixed";
  hasImages: boolean;
  imageCount: number;
  pageNumber?: number;
  ocrUsed: boolean;
  estimatedTokens: number;
}

/**
 * Document chunk with metadata
 */
export interface DocumentChunk {
  text: string;
  metadata: ChunkMetadata;
  images?: ExtractedImage[];
}

/**
 * Document chunking options
 */
export interface ChunkingOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  preserveImages?: boolean;
  enableOCR?: boolean;
  maxChunks?: number;
}

/**
 * Default chunking options
 */
const DEFAULT_CHUNKING_OPTIONS: Required<ChunkingOptions> = {
  chunkSize: 1000,
  chunkOverlap: 100,
  preserveImages: true,
  enableOCR: true,
  maxChunks: 100,
};

type BufferLike = {
  from: (
    input: string | ArrayBuffer | Uint8Array,
    encoding?: string,
  ) => Uint8Array;
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

const decodePdfContent = (content: string): Uint8Array => {
  if (content.startsWith("data:")) {
    const [, base64] = content.split(",", 2);
    return decodeBase64ToUint8Array(base64 || "");
  }
  if (content.startsWith("%PDF")) {
    return new TextEncoder().encode(content);
  }
  return decodeBase64ToUint8Array(content);
};

/**
 * Estimate token count for text (rough approximation)
 * Typically: 1 token ≈ 4 characters for English
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Split text into chunks with overlap
 */
export function splitTextIntoChunks(
  text: string,
  chunkSize: number = 1000,
  chunkOverlap: number = 100,
): string[] {
  if (!text || text.length === 0) {
    return [];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.substring(start, end));
    start = end - chunkOverlap;
  }

  return chunks;
}

/**
 * Split at logical boundaries (paragraphs, sentences)
 */
export function splitAtBoundaries(
  text: string,
  targetChunkSize: number = 1000,
): string[] {
  // Split by paragraphs first
  const paragraphs = text.split(/\n\n+/);
  const chunks: string[] = [];
  let currentChunk = "";

  for (const paragraph of paragraphs) {
    if (
      (currentChunk + paragraph).length > targetChunkSize &&
      currentChunk.length > 0
    ) {
      chunks.push(currentChunk.trim());
      currentChunk = paragraph;
    } else {
      currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Chunk PDF document
 */
export async function chunkPDFDocument(
  pdfBuffer: Uint8Array,
  options?: ChunkingOptions,
  sourceId?: string,
): Promise<DocumentChunk[]> {
  const opts = { ...DEFAULT_CHUNKING_OPTIONS, ...options };

  try {
    logger.info("[DocumentChunker] Starting PDF chunking", {
      sourceId,
      bufferSize: pdfBuffer.length,
    });

    // Extract text and images
    const extraction = await extractFromPDF(pdfBuffer);

    if (!extraction.text && extraction.images.length === 0) {
      logger.warn("[DocumentChunker] PDF extraction returned no content", {
        sourceId,
      });
      return [];
    }

    logger.info("[DocumentChunker] PDF extraction complete", {
      sourceId,
      textLength: extraction.text.length,
      imageCount: extraction.images.length,
      totalPages: extraction.totalPages,
    });

    // Split text into chunks
    const textChunks = splitAtBoundaries(extraction.text, opts.chunkSize);

    if (textChunks.length > opts.maxChunks) {
      logger.warn("[DocumentChunker] Truncating chunks to max limit", {
        sourceId,
        original: textChunks.length,
        max: opts.maxChunks,
      });
      textChunks.length = opts.maxChunks;
    }

    // Create document chunks
    const chunks: DocumentChunk[] = [];

    for (let i = 0; i < textChunks.length; i++) {
      const text = textChunks[i];
      const estimatedTokens = estimateTokenCount(text);

      // Associate images with chunks (images from same page or previous page)
      const chunkImages = opts.preserveImages
        ? extraction.images.filter(
            (img) =>
              !img.pageNumber ||
              img.pageNumber <=
                Math.ceil(
                  ((i + 1) * extraction.totalPages) / textChunks.length,
                ),
          )
        : [];

      chunks.push({
        text,
        metadata: {
          chunkIndex: i,
          totalChunks: textChunks.length,
          sourceId,
          sourceFile: extraction.metadata.title,
          contentType: chunkImages.length > 0 ? "mixed" : "text",
          hasImages: chunkImages.length > 0,
          imageCount: chunkImages.length,
          pageNumber: Math.ceil(
            ((i + 1) * extraction.totalPages) / textChunks.length,
          ),
          ocrUsed: chunkImages.some((img) => !!img.ocrText),
          estimatedTokens,
        },
        images:
          opts.preserveImages && chunkImages.length > 0
            ? chunkImages
            : undefined,
      });
    }

    logger.info("[DocumentChunker] PDF chunking complete", {
      sourceId,
      chunks: chunks.length,
      totalTokens: chunks.reduce(
        (sum, c) => sum + c.metadata.estimatedTokens,
        0,
      ),
    });

    return chunks;
  } catch (error) {
    logger.error("[DocumentChunker] PDF chunking failed", error as Error, {
      sourceId,
    });
    return [];
  }
}

/**
 * Chunk plain text document
 */
export function chunkTextDocument(
  text: string,
  options?: ChunkingOptions,
  sourceId?: string,
): DocumentChunk[] {
  const opts = { ...DEFAULT_CHUNKING_OPTIONS, ...options };

  try {
    // Use boundary-aware splitting
    const textChunks = splitAtBoundaries(text, opts.chunkSize);

    if (textChunks.length > opts.maxChunks) {
      logger.warn("[DocumentChunker] Truncating text chunks to max limit", {
        sourceId,
        original: textChunks.length,
        max: opts.maxChunks,
      });
      textChunks.length = opts.maxChunks;
    }

    const chunks: DocumentChunk[] = textChunks.map((chunk, index) => ({
      text: chunk,
      metadata: {
        chunkIndex: index,
        totalChunks: textChunks.length,
        sourceId,
        contentType: "text",
        hasImages: false,
        imageCount: 0,
        ocrUsed: false,
        estimatedTokens: estimateTokenCount(chunk),
      },
    }));

    logger.info("[DocumentChunker] Text chunking complete", {
      sourceId,
      chunks: chunks.length,
      totalTokens: chunks.reduce(
        (sum, c) => sum + c.metadata.estimatedTokens,
        0,
      ),
    });

    return chunks;
  } catch (error) {
    logger.error("[DocumentChunker] Text chunking failed", error as Error, {
      sourceId,
    });
    return [];
  }
}

/**
 * Auto-detect and chunk document
 */
export async function chunkDocument(
  content: string | Uint8Array,
  options?: ChunkingOptions,
  sourceId?: string,
): Promise<DocumentChunk[]> {
  try {
    // Check if it's a PDF
    if (isPDFContent(content)) {
      const pdfBuffer =
        typeof content === "string" ? decodePdfContent(content) : content;

      return await chunkPDFDocument(pdfBuffer, options, sourceId);
    }

    // Treat as text
    const textContent =
      typeof content === "string" ? content : new TextDecoder().decode(content);

    return chunkTextDocument(textContent, options, sourceId);
  } catch (error) {
    logger.error("[DocumentChunker] Auto-chunking failed", error as Error, {
      sourceId,
    });
    return [];
  }
}

/**
 * Process images in chunks with OCR if enabled
 */
export async function processChunkImages(
  chunks: DocumentChunk[],
  options?: ChunkingOptions,
): Promise<DocumentChunk[]> {
  const opts = { ...DEFAULT_CHUNKING_OPTIONS, ...options };

  if (!opts.enableOCR || !opts.preserveImages) {
    return chunks;
  }

  const processed = await Promise.all(
    chunks.map(async (chunk) => {
      if (!chunk.images || chunk.images.length === 0) {
        return chunk;
      }

      // Extract OCR text from images
      const imagesWithOCR = await Promise.all(
        chunk.images.map(async (img) => {
          if (img.ocrText) {
            return img; // Already has OCR text
          }

          try {
            const ocrText = await extractOCRTextFromImage(
              img.base64,
              img.mimeType,
            );
            return { ...img, ocrText: ocrText || undefined };
          } catch (error) {
            logger.warn("[DocumentChunker] OCR processing failed for image", {
              error: (error as Error).message,
              pageNumber: img.pageNumber,
            });
            return img;
          }
        }),
      );

      return {
        ...chunk,
        images: imagesWithOCR,
        metadata: {
          ...chunk.metadata,
          ocrUsed: imagesWithOCR.some((img) => !!img.ocrText),
        },
      };
    }),
  );

  return processed;
}

/**
 * Get chunking statistics
 */
export function getChunkingStats(chunks: DocumentChunk[]) {
  return {
    totalChunks: chunks.length,
    totalTokens: chunks.reduce((sum, c) => sum + c.metadata.estimatedTokens, 0),
    totalImages: chunks.reduce((sum, c) => sum + c.metadata.imageCount, 0),
    averageChunkTokens: Math.round(
      chunks.reduce((sum, c) => sum + c.metadata.estimatedTokens, 0) /
        chunks.length,
    ),
    chunksWithImages: chunks.filter((c) => c.metadata.hasImages).length,
    maxTokensInChunk: Math.max(
      ...chunks.map((c) => c.metadata.estimatedTokens),
      0,
    ),
    minTokensInChunk: Math.min(
      ...chunks.map((c) => c.metadata.estimatedTokens),
      Infinity,
    ),
  };
}

export default {
  chunkDocument,
  chunkPDFDocument,
  chunkTextDocument,
  processChunkImages,
  splitTextIntoChunks,
  splitAtBoundaries,
  estimateTokenCount,
  getChunkingStats,
};
