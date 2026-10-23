import { getRAGConfig } from "./rag-config";
import { logger } from "@/lib/logger";

/**
 * Advanced text chunking strategies for RAG
 * Supports text, code, and multi-modal content with image extraction
 */

export interface TextChunk {
  text: string;
  index: number;
  metadata: {
    startChar: number;
    endChar: number;
    tokens?: number;
    imageData?: string; // Base64 encoded image
    imageMimeType?: string;
  };
}

export interface ImageExtraction {
  id: string;
  base64: string;
  mimeType: string;
  page?: number;
  position?: string; // "top", "middle", "bottom"
}

/**
 * Smart text splitter that preserves sentence boundaries
 * Also extracts images from documents
 */
export class DocumentChunker {
  private config = getRAGConfig().chunking;

  /**
   * Split text into chunks with overlap, preserving sentence boundaries
   */
  chunkText(text: string): TextChunk[] {
    const { chunkSize, chunkOverlap, minChunkSize } = this.config;
    const chunks: TextChunk[] = [];

    // Normalize whitespace
    const normalizedText = text.replace(/\s+/g, " ").trim();

    // Skip empty or too-small inputs
    if (normalizedText.length === 0) {
      return [];
    }

    if (normalizedText.length < minChunkSize) {
      return [];
    }

    if (normalizedText.length <= chunkSize) {
      // Text fits in one chunk
      return [
        {
          text: normalizedText,
          index: 0,
          metadata: {
            startChar: 0,
            endChar: normalizedText.length,
          },
        },
      ];
    }

    // Split into sentences first
    const sentences = this.splitIntoSentences(normalizedText);

    let currentChunk = "";
    let chunkStartChar = 0;
    let chunkIndex = 0;

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const potentialChunk =
        currentChunk + (currentChunk ? " " : "") + sentence;

      if (
        potentialChunk.length > chunkSize &&
        currentChunk.length >= minChunkSize
      ) {
        // Save current chunk
        chunks.push({
          text: currentChunk.trim(),
          index: chunkIndex++,
          metadata: {
            startChar: chunkStartChar,
            endChar: chunkStartChar + currentChunk.length,
          },
        });

        // Start new chunk with overlap
        const overlapText = this.getOverlapText(currentChunk, chunkOverlap);
        currentChunk = overlapText + (overlapText ? " " : "") + sentence;
        chunkStartChar =
          chunkStartChar +
          currentChunk.length -
          overlapText.length -
          sentence.length -
          1;
      } else {
        currentChunk = potentialChunk;
      }
    }

    // Add final chunk if it exists
    if (currentChunk.trim().length >= minChunkSize) {
      chunks.push({
        text: currentChunk.trim(),
        index: chunkIndex,
        metadata: {
          startChar: chunkStartChar,
          endChar: chunkStartChar + currentChunk.length,
        },
      });
    }

    return chunks;
  }

  /**
   * Extract images from document content
   * Supports base64 encoded images embedded in content
   */
  extractImages(content: string): ImageExtraction[] {
    const images: ImageExtraction[] = [];

    // Match data URLs (base64 encoded images)
    const dataUrlRegex = /data:(image\/[a-zA-Z]+);base64,([a-zA-Z0-9+/=]+)/g;
    let match;
    let imageIndex = 0;

    while ((match = dataUrlRegex.exec(content)) !== null) {
      const mimeType = match[1];
      const base64Data = match[2];

      images.push({
        id: `image-${imageIndex++}`,
        base64: base64Data,
        mimeType,
      });
    }

    logger.info(
      `[DocumentChunker] Extracted ${images.length} images from content`,
    );
    return images;
  }

  /**
   * Chunk document with image awareness
   * Associates nearby images with text chunks
   */
  chunkWithImages(text: string): {
    chunks: TextChunk[];
    images: ImageExtraction[];
  } {
    const textChunks = this.chunkText(text);
    const images = this.extractImages(text);

    // Associate images with nearby text chunks
    for (const image of images) {
      // Simple heuristic: attach to first chunk
      if (textChunks.length > 0) {
        if (!textChunks[0].metadata.imageData) {
          textChunks[0].metadata.imageData = image.base64;
          textChunks[0].metadata.imageMimeType = image.mimeType;
        }
      }
    }

    return { chunks: textChunks, images };
  }

  /**
   * Split text into sentences using multiple delimiters
   */
  private splitIntoSentences(text: string): string[] {
    // Split on sentence boundaries (.!?) followed by space and capital letter
    const sentenceRegex = /[.!?]+(?=\s+[A-Z]|\s*$)/g;
    const sentences: string[] = [];
    let lastIndex = 0;

    let match;
    while ((match = sentenceRegex.exec(text)) !== null) {
      const endIndex = match.index + match[0].length;
      const sentence = text.slice(lastIndex, endIndex).trim();
      if (sentence) {
        sentences.push(sentence);
      }
      lastIndex = endIndex;
    }

    // Add remaining text
    const remaining = text.slice(lastIndex).trim();
    if (remaining) {
      sentences.push(remaining);
    }

    return sentences.length > 0 ? sentences : [text];
  }

  /**
   * Get overlap text from end of chunk
   */
  private getOverlapText(text: string, overlapSize: number): string {
    if (text.length <= overlapSize) {
      return text;
    }

    // Try to break at sentence boundary within overlap window
    const overlapText = text.slice(-overlapSize);
    const sentenceMatch = overlapText.match(/[.!?]\s+/);

    if (sentenceMatch && sentenceMatch.index !== undefined) {
      return overlapText.slice(sentenceMatch.index + sentenceMatch[0].length);
    }

    return overlapText;
  }

  /**
   * Chunk by paragraphs (for markdown/structured text)
   */
  chunkByParagraphs(text: string, maxChunkSize?: number): TextChunk[] {
    const size = maxChunkSize || this.config.chunkSize;
    const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
    const chunks: TextChunk[] = [];

    let currentChunk = "";
    let chunkIndex = 0;
    let chunkStartChar = 0;

    for (const paragraph of paragraphs) {
      const normalizedPara = paragraph.trim();

      if (
        currentChunk.length + normalizedPara.length > size &&
        currentChunk.length > 0
      ) {
        chunks.push({
          text: currentChunk.trim(),
          index: chunkIndex++,
          metadata: {
            startChar: chunkStartChar,
            endChar: chunkStartChar + currentChunk.length,
          },
        });
        currentChunk = normalizedPara;
        chunkStartChar += currentChunk.length;
      } else {
        currentChunk += (currentChunk ? "\n\n" : "") + normalizedPara;
      }
    }

    if (currentChunk.trim().length >= this.config.minChunkSize) {
      chunks.push({
        text: currentChunk.trim(),
        index: chunkIndex,
        metadata: {
          startChar: chunkStartChar,
          endChar: chunkStartChar + currentChunk.length,
        },
      });
    }

    return chunks;
  }

  /**
   * Chunk code files (preserves function boundaries)
   */
  chunkCode(code: string, language: string): TextChunk[] {
    // For now, use paragraph-based chunking
    // Can be enhanced with AST parsing for better code-aware chunking
    return this.chunkByParagraphs(code);
  }
}

/**
 * Factory function to get chunker instance
 */
export function getDocumentChunker(): DocumentChunker {
  return new DocumentChunker();
}
