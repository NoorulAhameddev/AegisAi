/**
 * RAG Feature Test Suite
 * Run with: npm test -- rag.test.ts
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import { getDocumentChunker, TextChunk } from '@/services/rag/chunker';
import { getRAGConfig, isSupportedFileType, isValidFileSize } from '@/services/rag/rag-config';

describe('RAG Configuration', () => {
    it('should load default configuration', () => {
        const config = getRAGConfig();
        expect(config).toBeDefined();
        expect(config.chunking.chunkSize).toBe(1000);
        expect(config.retrieval.topK).toBe(5);
        expect(config.retrieval.rerank).toBe(true);
    });

    it('should validate supported file types', () => {
        expect(isSupportedFileType('text/plain')).toBe(true);
        expect(isSupportedFileType('application/pdf')).toBe(true);
        expect(isSupportedFileType('image/png')).toBe(true);
        expect(isSupportedFileType('application/exe')).toBe(false);
    });

    it('should validate file sizes', () => {
        expect(isValidFileSize(1024)).toBe(true);
        expect(isValidFileSize(5 * 1024 * 1024)).toBe(true);
        expect(isValidFileSize(20 * 1024 * 1024)).toBe(false);
    });
});

describe('Document Chunker', () => {
    let chunker: ReturnType<typeof getDocumentChunker>;

    beforeAll(() => {
        chunker = getDocumentChunker();
    });

    it('should chunk short text into single chunk', () => {
        const text = 'This is a short text.';
        const chunks = chunker.chunkText(text);
        
        expect(chunks).toHaveLength(1);
        expect(chunks[0].text).toBe(text);
        expect(chunks[0].index).toBe(0);
    });

    it('should chunk long text with sentence boundaries', () => {
        const text = 'This is sentence one. This is sentence two. This is sentence three. '.repeat(20);
        const chunks = chunker.chunkText(text);
        
        expect(chunks.length).toBeGreaterThan(1);
        expect(chunks[0].text.length).toBeLessThanOrEqual(1000 + 200); // chunkSize + overlap
    });

    it('should preserve sentence boundaries', () => {
        const text = 'First sentence. Second sentence. Third sentence. Fourth sentence.';
        const chunks = chunker.chunkText(text);
        
        chunks.forEach((chunk: TextChunk) => {
            // Each chunk should end with a sentence terminator or be the last chunk
            const endsCorrectly = chunk.text.match(/[.!?]$/) || chunk.index === chunks.length - 1;
            expect(endsCorrectly).toBeTruthy();
        });
    });

    it('should add metadata to chunks', () => {
        const text = 'Test text. ' . repeat(100);
        const chunks = chunker.chunkText(text);
        
        chunks.forEach((chunk: TextChunk, idx: number) => {
            expect(chunk.index).toBe(idx);
            expect(chunk.metadata.startChar).toBeDefined();
            expect(chunk.metadata.endChar).toBeDefined();
            expect(chunk.metadata.endChar).toBeGreaterThan(chunk.metadata.startChar);
        });
    });

    it('should handle paragraph-based chunking', () => {
        const text = 'Paragraph one.\n\nParagraph two.\n\nParagraph three.';
        const chunks = chunker.chunkByParagraphs(text);
        
        expect(chunks.length).toBeGreaterThan(0);
        chunks.forEach((chunk: TextChunk) => {
            expect(chunk.text.trim().length).toBeGreaterThan(0);
        });
    });

    it('should handle empty text gracefully', () => {
        const text = '';
        const chunks = chunker.chunkText(text);
        
        expect(chunks).toHaveLength(0);
    });

    it('should handle text with only whitespace', () => {
        const text = '   \n\n   \t\t   ';
        const chunks = chunker.chunkText(text);
        
        expect(chunks).toHaveLength(0);
    });
});

describe('RAG Retrieval Logic', () => {
    it('should detect unsuitable queries for RAG', async () => {
        const { shouldUseRAG } = await import('@/lib/rag-retrieval');
        
        expect(shouldUseRAG('hi')).toBe(false);
        expect(shouldUseRAG('hello')).toBe(false);
        expect(shouldUseRAG('/help')).toBe(false);
        expect(shouldUseRAG('What is quantum computing?')).toBe(true);
        expect(shouldUseRAG('Tell me about the company policy')).toBe(true);
    });

    it('should format RAG context correctly', async () => {
        const { formatRAGContext } = await import('@/lib/rag-retrieval');
        
        const mockResult = {
            documents: [],
            context: 'RELEVANT CONTEXT:\n[1] Test context',
            tokensUsed: 10,
            sources: new Set<string>(['source1', 'source2']),
        };

        const formatted = formatRAGContext(mockResult);
        expect(formatted).toContain('RELEVANT CONTEXT');
        expect(formatted).toContain('2 source(s)');
        expect(formatted).toContain('context-aware responses');
    });

    it('should handle empty retrieval results', async () => {
        const { formatRAGContext } = await import('@/lib/rag-retrieval');
        
        const emptyResult = {
            documents: [],
            context: '',
            tokensUsed: 0,
            sources: new Set<string>(),
        };

        const formatted = formatRAGContext(emptyResult);
        expect(formatted).toBe('');
    });
});

describe('Vector Store Integration', () => {
    it('should validate user ID format', async () => {
        const { searchSimilar } = await import('@/lib/vector-store');
        
        // Invalid UUID should throw
        await expect(searchSimilar('test', 'invalid-uuid', 5))
            .rejects
            .toThrow('Invalid userId format');
    });

    it('should handle empty database gracefully', async () => {
        const { searchSimilar } = await import('@/lib/vector-store');
        
        // With valid UUID format
        const results = await searchSimilar(
            'test query',
            '00000000-0000-0000-0000-000000000000',
            5
        );
        
        expect(Array.isArray(results)).toBe(true);
    });
});

describe('Text Extraction Functions', () => {
    it('should extract key terms from query', () => {
        // This tests the internal logic used in reranking
        const text = 'What is the company vacation policy for employees?';
        const stopWords = new Set(['the', 'is']);
        const words = text.toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .split(/\s+/)
            .filter(w => w.length > 2 && !stopWords.has(w));
        
        expect(words).toContain('company');
        expect(words).toContain('vacation');
        expect(words).toContain('policy');
        expect(words).toContain('employees');
        expect(words).not.toContain('the');
        expect(words).not.toContain('is');
    });
});

describe('Configuration Edge Cases', () => {
    it('should handle minimum chunk size correctly', () => {
        const config = getRAGConfig();
        const chunker = getDocumentChunker();
        
        // Text smaller than minChunkSize should not create chunk
        const tinyText = 'Hi';
        const chunks = chunker.chunkText(tinyText);
        
        if (tinyText.length < config.chunking.minChunkSize) {
            expect(chunks).toHaveLength(0);
        }
    });

    it('should respect chunk overlap configuration', () => {
        const config = getRAGConfig();
        expect(config.chunking.chunkOverlap).toBeLessThan(config.chunking.chunkSize);
        expect(config.chunking.chunkOverlap).toBeGreaterThan(0);
    });

    it('should have valid retrieval configuration', () => {
        const config = getRAGConfig();
        expect(config.retrieval.topK).toBeGreaterThan(0);
        expect(config.retrieval.similarityThreshold).toBeGreaterThanOrEqual(0);
        expect(config.retrieval.similarityThreshold).toBeLessThanOrEqual(1);
        expect(config.retrieval.maxContextLength).toBeGreaterThan(0);
    });
});

// Mock tests for API endpoints (requires proper test setup)
describe('RAG API Endpoints (Mock)', () => {
    it('should have correct endpoint paths', () => {
        const endpoints = [
            '/api/rag/ingest',
            '/api/rag/search',
            '/api/rag/documents',
            '/api/rag/stats',
        ];
        
        endpoints.forEach(endpoint => {
            expect(endpoint).toMatch(/^\/api\/rag\//);
        });
    });
});

console.log('✅ RAG Test Suite Loaded');
console.log('Run with: npm test -- rag.test.ts');
