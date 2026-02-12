/**
 * Enhanced Multi-Modal Embeddings Service with Robustness
 * Generates embeddings for both text and images
 * Features: Retry logic, error handling, type safety
 */

import {
    generateEmbedding,
    generateImageEmbedding,
    generateEmbeddingsBatch,
    getEmbeddingModelConfig,
    EmbeddingConfig,
} from './embeddings';
import { logger } from '@/lib/logger';

/**
 * Merge strategy for combining text and image embeddings
 */
export type MergeStrategy = 'concat' | 'avg' | 'text-only';

/**
 * Configuration for multi-modal embedding with error handling
 */
export interface MultiModalOptions {
    mergeStrategy?: MergeStrategy;
    skipImageProcessing?: boolean;
    skipTextProcessing?: boolean;
    useCache?: boolean;
    embeddingConfig?: EmbeddingConfig;
}

/**
 * Content type classification
 */
export type ContentType = 'text' | 'image' | 'mixed';

/**
 * Result of multi-modal embedding generation
 */
export interface MultiModalEmbeddingResult {
    textEmbedding: number[] | null;
    imageEmbedding: number[] | null;
    mergedEmbedding: number[];
    contentType: ContentType;
    hasText: boolean;
    hasImage: boolean;
    strategy: MergeStrategy;
    error?: string;
    warnings?: string[];
}

/**
 * Detect content type from text and images
 */
export function detectContentType(
    text?: string,
    hasImages?: boolean
): ContentType {
    const hasText = text && text.trim().length > 0;

    if (hasText && hasImages) return 'mixed';
    if (hasImages) return 'image';
    return 'text';
}

/**
 * Extract base64-encoded images from content string
 */
export function extractImageBase64(content: string): string[] {
    const imageMatches = content.matchAll(/data:image\/[^;]+;base64,([A-Za-z0-9+/=]+)/g);
    const images: string[] = [];

    for (const match of imageMatches) {
        if (match[1]) {
            images.push(match[1]);
        }
    }

    return images;
}

/**
 * Check if content has text
 */
export function hasTextContent(content: string): boolean {
    const cleaned = content
        .replace(/\s+/g, '')
        .replace(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/g, '');
    return cleaned.length > 0;
}

/**
 * Check if content has images
 */
export function hasImageContent(content: string): boolean {
    return /data:image\/[^;]+;base64,/.test(content);
}

/**
 * Get expected output dimensions for a merge strategy
 */
export function getExpectedOutputDimensions(strategy: MergeStrategy): number {
    switch (strategy) {
        case 'concat':
            return 3072; // 1536 + 1536
        case 'avg':
        case 'text-only':
        default:
            return 1536;
    }
}

/**
 * Merge embeddings using specified strategy
 * - concat: Concatenate embeddings (3072 dims)
 * - avg: Element-wise average (1536 dims)
 * - text-only: Use text only (1536 dims, default)
 */
export function mergeEmbeddings(
    textEmbedding: number[] | null,
    imageEmbedding: number[] | null,
    strategy: MergeStrategy = 'text-only'
): number[] {
    const outputDims = getExpectedOutputDimensions(strategy);

    // Both missing
    if (!textEmbedding && !imageEmbedding) {
        console.warn('[MultiModalEmbeddings] No embeddings available, returning zero vector');
        return Array(outputDims).fill(0);
    }

    // Text only strategy or missing image
    if (strategy === 'text-only' || !imageEmbedding) {
        const result = textEmbedding || Array(1536).fill(0);
        return result.slice(0, outputDims);
    }

    // Concat strategy
    if (strategy === 'concat') {
        const text = (textEmbedding || Array(1536).fill(0)).slice(0, 1536);
        const image = (imageEmbedding || Array(1536).fill(0)).slice(0, 1536);
        return [...text, ...image];
    }

    // Avg strategy
    if (strategy === 'avg') {
        const text = (textEmbedding || Array(1536).fill(0)).slice(0, 1536);
        const image = (imageEmbedding || Array(1536).fill(0)).slice(0, 1536);
        return text.map((v, i) => (v + (image[i] || 0)) / 2);
    }

    // Default fallback
    return textEmbedding ? textEmbedding.slice(0, outputDims) : Array(outputDims).fill(0);
}

/**
 * Generate multi-modal embedding for content with full error handling
 */
export async function generateMultiModalEmbedding(
    content: string,
    options: MultiModalOptions = {}
): Promise<MultiModalEmbeddingResult> {
    const {
        mergeStrategy = 'text-only',
        skipImageProcessing = false,
        skipTextProcessing = false,
        embeddingConfig,
    } = options;

    if (!content || content.trim().length === 0) {
        console.warn('[MultiModalEmbeddings] Empty content provided');
        return {
            textEmbedding: null,
            imageEmbedding: null,
            mergedEmbedding: Array(getExpectedOutputDimensions(mergeStrategy)).fill(0),
            contentType: 'text',
            hasText: false,
            hasImage: false,
            strategy: mergeStrategy,
            error: 'Empty content',
        };
    }

    const warnings: string[] = [];

    const hasText = hasTextContent(content);
    const hasImage = hasImageContent(content);
    const contentType = detectContentType(content, hasImage);

    let textEmbedding: number[] | null = null;
    let imageEmbedding: number[] | null = null;

    // Generate text embedding with error handling
    if (!skipTextProcessing && hasText) {
        try {
            textEmbedding = await generateEmbedding(content, embeddingConfig);
            if (!textEmbedding || textEmbedding.length === 0) {
                warnings.push('Text embedding returned empty array');
                textEmbedding = null;
            }
        } catch (error) {
            const message = (error as Error).message;
            warnings.push(`Text embedding failed: ${message}`);
            logger.warn('Text embedding failed', { error: message, contentLength: content.length });
        }
    }

    // Generate image embedding with error handling
    if (!skipImageProcessing && hasImage) {
        const images = extractImageBase64(content);

        if (images.length > 0) {
            try {
                imageEmbedding = await generateImageEmbedding(images[0], embeddingConfig);
                if (!imageEmbedding) {
                    warnings.push('Image embedding API unavailable or disabled');
                }
            } catch (error) {
                const message = (error as Error).message;
                warnings.push(`Image embedding failed: ${message}`);
                logger.warn('Image embedding failed', { error: message });
            }
        } else {
            warnings.push('No base64 images found in content');
        }
    }

    // Merge embeddings
    const mergedEmbedding = mergeEmbeddings(textEmbedding, imageEmbedding, mergeStrategy);

    return {
        textEmbedding,
        imageEmbedding,
        mergedEmbedding,
        contentType,
        hasText,
        hasImage,
        strategy: mergeStrategy,
        error: warnings.length > 0 ? warnings[0] : undefined,
        warnings: warnings.length > 1 ? warnings.slice(1) : undefined,
    };
}

/**
 * Batch generate multi-modal embeddings with progress tracking
 */
export async function generateMultiModalEmbeddingsBatch(
    contents: string[],
    options: MultiModalOptions = {}
): Promise<MultiModalEmbeddingResult[]> {
    if (!contents || contents.length === 0) {
        return [];
    }

    console.log(
        `[MultiModalEmbeddings] Batch processing ${contents.length} items (strategy: ${options.mergeStrategy || 'text-only'})`
    );

    const results: MultiModalEmbeddingResult[] = [];
    const batchSize = 10; // Process in batches to avoid overwhelming

    for (let i = 0; i < contents.length; i += batchSize) {
        const batch = contents.slice(i, Math.min(i + batchSize, contents.length));

        // Process batch in parallel
        const batchResults = await Promise.all(
            batch.map(content => generateMultiModalEmbedding(content, options))
        );

        results.push(...batchResults);

        const progress = Math.min(i + batchSize, contents.length);
        if ((progress % batchSize === 0 && progress > 0) || progress === contents.length) {
            console.log(
                `[MultiModalEmbeddings] Processed ${progress}/${contents.length} items`
            );
        }
    }

    return results;
}

/**
 * Legacy interface for backward compatibility
 */
export interface MultiModalContent {
    type: 'text' | 'image' | 'mixed';
    text?: string;
    imageBase64?: string;
    imageUrl?: string;
    mimeType?: string;
}

/**
 * Legacy interface for backward compatibility
 */
export interface MultiModalEmbedding {
    textEmbedding: number[];
    imageEmbedding?: number[];
    contentType: 'text' | 'image' | 'mixed';
}

/**
 * Helper for legacy multi-modal content checks
 */
export function hasImage(content: MultiModalContent): boolean {
    return !!(content.imageBase64 || content.imageUrl);
}

/**
 * Helper for legacy multi-modal content checks
 */
export function hasText(content: MultiModalContent): boolean {
    return !!(content.text && content.text.trim().length > 0);
}
