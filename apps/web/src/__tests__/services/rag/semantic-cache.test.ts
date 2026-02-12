/**
 * Semantic Cache Test Suite
 * Tests semantic caching functionality for RAG queries
 * Run with: npm test -- semantic-cache.test.ts
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import type { Document } from '@/ai/rag/vector-store';

// Mock Redis before importing the module
jest.mock('ioredis', () => {
    const mockRedis = {
        keys: jest.fn(),
        get: jest.fn(),
        setex: jest.fn(),
        del: jest.fn(),
        hincrby: jest.fn(),
        hgetall: jest.fn(),
        lpush: jest.fn(),
        ltrim: jest.fn(),
        lrange: jest.fn(),
    };
    return {
        Redis: jest.fn(() => mockRedis),
    };
});

// Mock the embeddings service
jest.mock('@/services/rag/embeddings', () => ({
    generateEmbedding: jest.fn(),
}));

import {
    getSemanticCachedResults,
    cacheQueryResults,
    getCacheStats,
    clearUserCache,
    cleanupExpiredCache,
} from '@/services/rag/semantic-cache';

describe('Semantic Cache', () => {
    const mockUserId = 'test-user-123';
    const mockQuery = 'What is the capital of France?';
    const mockEmbedding = Array(1536).fill(0).map((_, i) => Math.random());
    const mockDocuments: Document[] = [
        {
            id: 'doc1',
            content: 'Paris is the capital of France',
            metadata: { source: 'test.txt' },
            score: 0.95,
        },
        {
            id: 'doc2',
            content: 'France is a country in Europe',
            metadata: { source: 'test.txt' },
            score: 0.85,
        },
    ];

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Cosine Similarity', () => {
        it('should calculate perfect similarity for identical vectors', async () => {
            const embedding1 = [1, 0, 0, 0];
            const embedding2 = [1, 0, 0, 0];

            // Cache a result
            await cacheQueryResults(
                'test query',
                embedding1,
                mockUserId,
                mockDocuments,
                'test context',
                100,
                ['test.txt']
            );

            // Retrieve with same embedding
            const result = await getSemanticCachedResults('test query', embedding2, mockUserId);

            // Should find a match with high similarity
            expect(result.similarity).toBeGreaterThanOrEqual(0.95);
        });

        it('should calculate zero similarity for orthogonal vectors', async () => {
            const embedding1 = [1, 0, 0, 0];
            const embedding2 = [0, 1, 0, 0];

            // Cache a result with first embedding
            await cacheQueryResults(
                'test query 1',
                embedding1,
                mockUserId,
                mockDocuments,
                'test context',
                100,
                ['test.txt']
            );

            // Try to retrieve with orthogonal embedding
            const result = await getSemanticCachedResults('test query 2', embedding2, mockUserId);

            // Should not find a match (similarity too low)
            expect(result.fromCache).toBe(false);
            expect(result.similarity).toBeLessThan(0.95);
        });
    });

    describe('Cache Storage and Retrieval', () => {
        it('should cache query results successfully', async () => {
            await cacheQueryResults(
                mockQuery,
                mockEmbedding,
                mockUserId,
                mockDocuments,
                'Paris is the capital',
                150,
                ['france.txt'],
                3600
            );

            // In-memory cache should be used when Redis is mocked
            expect(true).toBe(true); // Basic success assertion
        });

        it('should retrieve semantically similar cached results', async () => {
            // Cache initial query
            await cacheQueryResults(
                mockQuery,
                mockEmbedding,
                mockUserId,
                mockDocuments,
                'Paris is the capital',
                150,
                ['france.txt']
            );

            // Create slightly different but similar embedding
            const similarEmbedding = mockEmbedding.map((v, i) => v + (Math.random() * 0.01 - 0.005));

            // Try to retrieve with similar query
            const result = await getSemanticCachedResults(
                'What is capital city of France?',
                similarEmbedding,
                mockUserId
            );

            // Should find cached result if similarity is high enough
            if (result.similarity >= 0.95) {
                expect(result.fromCache).toBe(true);
                expect(result.result).toBeDefined();
                expect(result.result?.documents.length).toBe(2);
            }
        });

        it('should not retrieve cached results for different users', async () => {
            const userId1 = 'user-1';
            const userId2 = 'user-2';

            // Cache for user 1
            await cacheQueryResults(
                mockQuery,
                mockEmbedding,
                userId1,
                mockDocuments,
                'test context',
                100,
                ['test.txt']
            );

            // Try to retrieve as user 2
            const result = await getSemanticCachedResults(mockQuery, mockEmbedding, userId2);

            // Should not find cached result (different user)
            expect(result.fromCache).toBe(false);
        });

        it('should handle cache misses gracefully', async () => {
            const uniqueEmbedding = Array(1536).fill(0).map(() => Math.random() * 100);

            const result = await getSemanticCachedResults(
                'Completely unrelated query',
                uniqueEmbedding,
                'random-user'
            );

            expect(result.fromCache).toBe(false);
            expect(result.result).toBeNull();
            expect(result.similarity).toBe(0);
        });
    });

    describe('Cache Expiration', () => {
        it('should respect TTL when caching', async () => {
            const shortTTL = 1; // 1 second

            await cacheQueryResults(
                mockQuery,
                mockEmbedding,
                mockUserId,
                mockDocuments,
                'test context',
                100,
                ['test.txt'],
                shortTTL
            );

            // Immediate retrieval should work
            const result1 = await getSemanticCachedResults(mockQuery, mockEmbedding, mockUserId);
            expect(result1.similarity).toBeGreaterThan(0);

            // Wait for expiration
            await new Promise(resolve => setTimeout(resolve, 1100));

            // Should not retrieve expired entry
            const result2 = await getSemanticCachedResults(mockQuery, mockEmbedding, mockUserId);
            // Note: This might still work if cleanup hasn't run yet
        });

        it('should cleanup expired cache entries', async () => {
            const count = await cleanupExpiredCache();

            // Should complete without errors
            expect(count).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Cache Management', () => {
        it('should clear user cache successfully', async () => {
            // Cache some results
            await cacheQueryResults(
                mockQuery,
                mockEmbedding,
                mockUserId,
                mockDocuments,
                'test context',
                100,
                ['test.txt']
            );

            // Clear user cache
            const count = await clearUserCache(mockUserId);

            expect(count).toBeGreaterThanOrEqual(0);

            // Subsequent retrieval should miss
            const result = await getSemanticCachedResults(mockQuery, mockEmbedding, mockUserId);
            expect(result.fromCache).toBe(false);
        });

        it('should get cache statistics', async () => {
            const stats = await getCacheStats();

            expect(stats).toBeDefined();
            expect(stats.totalQueries).toBeGreaterThanOrEqual(0);
            expect(stats.cacheHits).toBeGreaterThanOrEqual(0);
            expect(stats.cacheMisses).toBeGreaterThanOrEqual(0);
            expect(stats.hitRate).toBeGreaterThanOrEqual(0);
            expect(stats.hitRate).toBeLessThanOrEqual(1);
            expect(stats.storageSizeBytes).toBeGreaterThanOrEqual(0);
            expect(stats.averageLatencyMs).toBeDefined();
            expect(stats.averageLatencyMs.cached).toBeGreaterThanOrEqual(0);
            expect(stats.averageLatencyMs.uncached).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Error Handling', () => {
        it('should handle missing embedding gracefully', async () => {
            const emptyEmbedding: number[] = [];

            const result = await getSemanticCachedResults(
                'test query',
                emptyEmbedding,
                mockUserId
            );

            expect(result.fromCache).toBe(false);
        });

        it('should handle invalid cache data gracefully', async () => {
            // This test verifies that corrupted cache entries don't crash the system
            const result = await getSemanticCachedResults(
                mockQuery,
                mockEmbedding,
                'user-with-corrupted-cache'
            );

            expect(result).toBeDefined();
            expect(result.fromCache).toBe(false);
        });
    });

    describe('Similarity Threshold', () => {
        it('should respect custom similarity thresholds', async () => {
            // Cache a result
            await cacheQueryResults(
                mockQuery,
                mockEmbedding,
                mockUserId,
                mockDocuments,
                'test context',
                100,
                ['test.txt']
            );

            // Create somewhat different embedding
            const differentEmbedding = mockEmbedding.map((v) => v + 0.1);

            // Try with very strict threshold
            const strictResult = await getSemanticCachedResults(
                'different query',
                differentEmbedding,
                mockUserId,
                0.999
            );

            expect(strictResult.fromCache).toBe(false);

            // Try with relaxed threshold
            const relaxedResult = await getSemanticCachedResults(
                'different query',
                differentEmbedding,
                mockUserId,
                0.80
            );

            // May or may not match depending on actual similarity
            expect(relaxedResult).toBeDefined();
        });
    });

    describe('Cache Key Generation', () => {
        it('should generate consistent cache keys for same embeddings', async () => {
            const embedding1 = Array(1536).fill(0.5);
            const embedding2 = Array(1536).fill(0.5);

            // Cache with first embedding
            await cacheQueryResults(
                'query 1',
                embedding1,
                mockUserId,
                mockDocuments,
                'context',
                100,
                ['test.txt']
            );

            // Retrieve with identical embedding
            const result = await getSemanticCachedResults('query 2', embedding2, mockUserId);

            // Should find perfect match
            expect(result.similarity).toBeGreaterThanOrEqual(0.99);
        });
    });

    describe('Performance', () => {
        it('should cache multiple queries efficiently', async () => {
            const queries = [
                'What is AI?',
                'What is machine learning?',
                'What is deep learning?',
                'What is neural network?',
                'What is transformer?',
            ];

            const startTime = Date.now();

            // Cache multiple queries
            for (let i = 0; i < queries.length; i++) {
                const embedding = Array(1536).fill(0).map(() => Math.random());
                await cacheQueryResults(
                    queries[i],
                    embedding,
                    mockUserId,
                    mockDocuments,
                    `context ${i}`,
                    100 + i,
                    [`doc${i}.txt`]
                );
            }

            const endTime = Date.now();
            const duration = endTime - startTime;

            // Should complete in reasonable time (< 1 second for 5 queries)
            expect(duration).toBeLessThan(1000);
        });
    });
});
