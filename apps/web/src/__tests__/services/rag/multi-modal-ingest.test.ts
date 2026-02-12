/**
 * Multi-Modal Ingestion Integration Tests
 * Tests the complete multi-modal ingestion pipeline (text + images)
 * Run with: npm test -- multi-modal-ingest.test.ts
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock vector store
jest.mock('@/ai/rag/vector-store', () => ({
    addDocument: jest.fn(() => Promise.resolve({ success: true })),
    addMultiModalDocument: jest.fn(() => Promise.resolve({ success: true })),
}));

// Mock embeddings
jest.mock('@/services/rag/embeddings', () => ({
    generateEmbedding: jest.fn(() => Promise.resolve(Array(1536).fill(0.1))),
    generateImageEmbedding: jest.fn(() => Promise.resolve(Array(1536).fill(0.2))),
}));

// Mock chunker
const mockChunker = {
    chunkText: jest.fn(),
    chunkWithImages: jest.fn(),
};

jest.mock('@/services/rag/chunker', () => ({
    getDocumentChunker: jest.fn(() => mockChunker),
}));

// Mock config
jest.mock('@/services/rag/rag-config', () => ({
    getRAGConfig: jest.fn(() => ({
        embeddings: {
            imageSupport: true,
        },
    })),
}));

import { ingestFile } from '@/services/rag/ingest';
import { addDocument, addMultiModalDocument } from '@/ai/rag/vector-store';
import { getDocumentChunker } from '@/services/rag/chunker';

describe('Multi-Modal Ingestion Integration', () => {
    const mockUserId = 'test-user-123';
    const mockFileId = 'file-abc-456';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Text-Only Ingestion', () => {
        it('should ingest text-only content successfully', async () => {
            const textContent = 'This is a simple text document for testing.';

            // Mock chunker to return text-only chunks
            mockChunker.chunkWithImages.mockReturnValue({
                chunks: [
                    {
                        text: textContent,
                        index: 0,
                        metadata: {
                            startChar: 0,
                            endChar: textContent.length,
                        },
                    },
                ],
                images: [],
            });

            const result = await ingestFile(mockFileId, textContent, mockUserId, {
                fileName: 'test.txt',
                fileType: 'text/plain',
            });

            expect(result.success).toBe(true);
            expect(result.chunksIngested).toBe(1);
            expect(result.imagesIngested).toBe(0);
            expect(result.totalDocuments).toBe(1);
            expect(addDocument).toHaveBeenCalledTimes(1);
            expect(addMultiModalDocument).not.toHaveBeenCalled();
        });

        it('should handle multi-chunk text documents', async () => {
            const longText = 'Paragraph 1. '.repeat(100) + 'Paragraph 2. '.repeat(100);

            mockChunker.chunkWithImages.mockReturnValue({
                chunks: [
                    {
                        text: 'Paragraph 1. '.repeat(100),
                        index: 0,
                        metadata: { startChar: 0, endChar: 1300 },
                    },
                    {
                        text: 'Paragraph 2. '.repeat(100),
                        index: 1,
                        metadata: { startChar: 1300, endChar: 2600 },
                    },
                ],
                images: [],
            });

            const result = await ingestFile(mockFileId, longText, mockUserId);

            expect(result.chunksIngested).toBe(2);
            expect(result.imagesIngested).toBe(0);
            expect(addDocument).toHaveBeenCalledTimes(2);
        });

        it('should handle empty content', async () => {
            mockChunker.chunkWithImages.mockReturnValue({
                chunks: [],
                images: [],
            });

            const result = await ingestFile(mockFileId, '', mockUserId);

            expect(result.chunksIngested).toBe(0);
            expect(result.imagesIngested).toBe(0);
            expect(result.totalDocuments).toBe(0);
        });
    });

    describe('Multi-Modal Ingestion (Text + Images)', () => {
        it('should ingest document with embedded images', async () => {
            const content = 'Document with an embedded image.';
            const mockImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

            mockChunker.chunkWithImages.mockReturnValue({
                chunks: [
                    {
                        text: content,
                        index: 0,
                        metadata: {
                            startChar: 0,
                            endChar: content.length,
                            imageData: mockImageBase64,
                            imageMimeType: 'image/png',
                        },
                    },
                ],
                images: [],
            });

            const result = await ingestFile(mockFileId, content, mockUserId, {
                fileName: 'doc.pdf',
                fileType: 'application/pdf',
                enableImageEmbedding: true,
            });

            expect(result.success).toBe(true);
            expect(result.chunksIngested).toBe(1);
            expect(result.imagesIngested).toBe(0); // Embedded in chunk, not standalone
            expect(addMultiModalDocument).toHaveBeenCalledTimes(1);
            expect(addMultiModalDocument).toHaveBeenCalledWith(
                content,
                expect.objectContaining({
                    fileId: mockFileId,
                    type: 'document',
                    chunkIndex: 0,
                }),
                mockUserId,
                mockImageBase64,
                'image/png'
            );
        });

        it('should ingest standalone images', async () => {
            const content = 'Document text';
            const mockImage1 = {
                id: 'img1',
                base64: 'base64data1',
                mimeType: 'image/jpeg',
            };
            const mockImage2 = {
                id: 'img2',
                base64: 'base64data2',
                mimeType: 'image/png',
            };

            mockChunker.chunkWithImages.mockReturnValue({
                chunks: [
                    {
                        text: content,
                        index: 0,
                        metadata: { startChar: 0, endChar: content.length },
                    },
                ],
                images: [mockImage1, mockImage2],
            });

            const result = await ingestFile(mockFileId, content, mockUserId, {
                fileName: 'doc-with-images.pdf',
                fileType: 'application/pdf',
                enableImageEmbedding: true,
            });

            expect(result.chunksIngested).toBe(1);
            expect(result.imagesIngested).toBe(2);
            expect(result.totalDocuments).toBe(3);
            expect(addDocument).toHaveBeenCalledTimes(1); // Text chunk
            expect(addMultiModalDocument).toHaveBeenCalledTimes(2); // Two images
        });

        it('should respect enableImageEmbedding flag', async () => {
            const content = 'Document with an image.';
            const mockImageBase64 = 'base64imagedata';

            mockChunker.chunkWithImages.mockReturnValue({
                chunks: [
                    {
                        text: content,
                        index: 0,
                        metadata: {
                            startChar: 0,
                            endChar: content.length,
                            imageData: mockImageBase64,
                            imageMimeType: 'image/png',
                        },
                    },
                ],
                images: [],
            });

            const result = await ingestFile(mockFileId, content, mockUserId, {
                enableImageEmbedding: false, // Disable images
            });

            expect(result.chunksIngested).toBe(1);
            expect(result.imagesIngested).toBe(0);
            // Should use text-only ingestion despite image being present
            expect(addDocument).toHaveBeenCalledTimes(1);
            expect(addMultiModalDocument).not.toHaveBeenCalled();
        });
    });

    describe('Complex Multi-Modal Scenarios', () => {
        it('should handle mixed chunks (some with images, some without)', async () => {
            mockChunker.chunkWithImages.mockReturnValue({
                chunks: [
                    {
                        text: 'Chunk 1 without image',
                        index: 0,
                        metadata: { startChar: 0, endChar: 23 },
                    },
                    {
                        text: 'Chunk 2 with image',
                        index: 1,
                        metadata: {
                            startChar: 23,
                            endChar: 41,
                            imageData: 'base64data',
                            imageMimeType: 'image/png',
                        },
                    },
                    {
                        text: 'Chunk 3 without image',
                        index: 2,
                        metadata: { startChar: 41, endChar: 62 },
                    },
                ],
                images: [],
            });

            const result = await ingestFile(
                mockFileId,
                'Chunk 1 without imageChunk 2 with imageChunk 3 without image',
                mockUserId,
                { enableImageEmbedding: true }
            );

            expect(result.chunksIngested).toBe(3);
            expect(addDocument).toHaveBeenCalledTimes(2); // Chunks 1 and 3
            expect(addMultiModalDocument).toHaveBeenCalledTimes(1); // Chunk 2
        });

        it('should handle large documents with multiple images', async () => {
            const chunks = Array.from({ length: 20 }, (_, i) => ({
                text: `Chunk ${i} text content`,
                index: i,
                metadata: {
                    startChar: i * 100,
                    endChar: (i + 1) * 100,
                    ...(i % 5 === 0 && {
                        imageData: `imagedata${i}`,
                        imageMimeType: 'image/jpeg',
                    }),
                },
            }));

            const images = Array.from({ length: 5 }, (_, i) => ({
                id: `standalone-img-${i}`,
                base64: `standalonedata${i}`,
                mimeType: 'image/png',
            }));

            mockChunker.chunkWithImages.mockReturnValue({ chunks, images });

            const result = await ingestFile(
                mockFileId,
                'Large document content...',
                mockUserId,
                { enableImageEmbedding: true }
            );

            expect(result.chunksIngested).toBe(20);
            expect(result.imagesIngested).toBe(5);
            expect(result.totalDocuments).toBe(25);
        });
    });

    describe('Error Handling', () => {
        it('should propagate errors from vector store', async () => {
            mockChunker.chunkWithImages.mockReturnValue({
                chunks: [
                    {
                        text: 'Test content',
                        index: 0,
                        metadata: { startChar: 0, endChar: 12 },
                    },
                ],
                images: [],
            });

            (addDocument as jest.Mock).mockRejectedValueOnce(
                new Error('Vector store connection failed')
            );

            await expect(
                ingestFile(mockFileId, 'Test content', mockUserId)
            ).rejects.toThrow('Vector store connection failed');
        });

        it('should handle chunker errors', async () => {
            mockChunker.chunkWithImages.mockImplementation(() => {
                throw new Error('Chunking failed');
            });

            await expect(
                ingestFile(mockFileId, 'Test content', mockUserId)
            ).rejects.toThrow('Chunking failed');
        });

        it('should handle embedding generation errors gracefully', async () => {
            mockChunker.chunkWithImages.mockReturnValue({
                chunks: [
                    {
                        text: 'Test content',
                        index: 0,
                        metadata: {
                            startChar: 0,
                            endChar: 12,
                            imageData: 'invalidbase64',
                            imageMimeType: 'image/png',
                        },
                    },
                ],
                images: [],
            });

            (addMultiModalDocument as jest.Mock).mockRejectedValueOnce(
                new Error('Failed to generate image embedding')
            );

            await expect(
                ingestFile(mockFileId, 'Test content', mockUserId, {
                    enableImageEmbedding: true,
                })
            ).rejects.toThrow('Failed to generate image embedding');
        });
    });

    describe('Metadata Handling', () => {
        it('should preserve all metadata fields', async () => {
            const content = 'Test document';
            mockChunker.chunkWithImages.mockReturnValue({
                chunks: [
                    {
                        text: content,
                        index: 0,
                        metadata: { startChar: 0, endChar: content.length },
                    },
                ],
                images: [],
            });

            await ingestFile(mockFileId, content, mockUserId, {
                fileName: 'important-doc.pdf',
                fileType: 'application/pdf',
            });

            expect(addDocument).toHaveBeenCalledWith(
                content,
                expect.objectContaining({
                    fileId: mockFileId,
                    type: 'document',
                    fileName: 'important-doc.pdf',
                    fileType: 'application/pdf',
                    chunkIndex: 0,
                    startChar: 0,
                    endChar: content.length,
                }),
                mockUserId
            );
        });

        it('should assign correct chunk indices for standalone images', async () => {
            mockChunker.chunkWithImages.mockReturnValue({
                chunks: [
                    { text: 'Chunk 1', index: 0, metadata: { startChar: 0, endChar: 7 } },
                    { text: 'Chunk 2', index: 1, metadata: { startChar: 7, endChar: 14 } },
                ],
                images: [
                    { id: 'img1', base64: 'data1', mimeType: 'image/png' },
                    { id: 'img2', base64: 'data2', mimeType: 'image/jpeg' },
                ],
            });

            await ingestFile(mockFileId, 'Chunk 1Chunk 2', mockUserId, {
                enableImageEmbedding: true,
            });

            // Images should have chunk indices 2 and 3 (after chunks 0 and 1)
            expect(addMultiModalDocument).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({ chunkIndex: 2 }),
                mockUserId,
                'data1',
                'image/png'
            );

            expect(addMultiModalDocument).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({ chunkIndex: 3 }),
                mockUserId,
                'data2',
                'image/jpeg'
            );
        });
    });

    describe('Performance', () => {
        it('should handle batch ingestion efficiently', async () => {
            const largeChunks = Array.from({ length: 100 }, (_, i) => ({
                text: `Chunk ${i} with ${Math.random()} content`,
                index: i,
                metadata: { startChar: i * 100, endChar: (i + 1) * 100 },
            }));

            mockChunker.chunkWithImages.mockReturnValue({
                chunks: largeChunks,
                images: [],
            });

            const startTime = Date.now();
            const result = await ingestFile(
                mockFileId,
                'Large document content...',
                mockUserId
            );
            const duration = Date.now() - startTime;

            expect(result.chunksIngested).toBe(100);
            // Should complete in reasonable time (< 5 seconds for mocked operations)
            expect(duration).toBeLessThan(5000);
        });
    });
});
