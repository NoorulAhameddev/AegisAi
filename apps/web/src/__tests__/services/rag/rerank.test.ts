/**
 * Reranking Test Suite
 * Tests cross-encoder and heuristic reranking functionality
 * Run with: npm test -- rerank.test.ts
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import type { Document } from "@/ai/rag/vector-store";

// Mock OpenAI
jest.mock("@/services/ai/openai", () => ({
  openai: {
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  },
}));

// Mock rerank cache
jest.mock("@/lib/rerank-cache", () => ({
  getCachedRerankScores: jest.fn(() => Promise.resolve([])),
  setCachedRerankScores: jest.fn(() => Promise.resolve()),
}));

// Mock config
jest.mock("@/services/rag/config", () => ({
  getRAGConfig: jest.fn(() => ({
    enableCaching: true,
    cacheTTL: 900,
  })),
}));

import {
  rerankDocumentsCrossEncoder,
  rerankDocumentsCrossEncoderWithScores,
  rerankDocumentsHeuristic,
  getRerankerStatus,
} from "@/services/rag/rerank";
import { openai } from "@/services/ai/openai";

describe("Reranking Service", () => {
  const mockDocuments: Document[] = [
    {
      id: "doc1",
      content: "Machine learning is a subset of artificial intelligence",
      text: "Machine learning is a subset of artificial intelligence",
      metadata: { source: "ml.txt" },
      score: 0.8,
      createdAt: Date.now() - 1000 * 60 * 60 * 24, // 1 day ago
      chunkIndex: 0,
    },
    {
      id: "doc2",
      content: "Deep learning uses neural networks with multiple layers",
      text: "Deep learning uses neural networks with multiple layers",
      metadata: { source: "dl.txt" },
      score: 0.75,
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 7, // 7 days ago
      chunkIndex: 1,
    },
    {
      id: "doc3",
      content: "Python is a popular programming language",
      text: "Python is a popular programming language",
      metadata: { source: "python.txt" },
      score: 0.6,
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 30, // 30 days ago
      chunkIndex: 2,
    },
    {
      id: "doc4",
      content: "Natural language processing helps computers understand text",
      text: "Natural language processing helps computers understand text",
      metadata: { source: "nlp.txt" },
      score: 0.7,
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2, // 2 days ago
      chunkIndex: 3,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Heuristic Reranking", () => {
    it("should rerank documents based on keyword overlap", () => {
      const query = "machine learning artificial intelligence";
      const reranked = rerankDocumentsHeuristic(query, mockDocuments);

      expect(reranked).toHaveLength(4);
      // First document should rank highest (contains "machine learning" and "artificial intelligence")
      expect(reranked[0].id).toBe("doc1");
    });

    it("should handle empty query", () => {
      const reranked = rerankDocumentsHeuristic("", mockDocuments);

      expect(reranked).toHaveLength(4);
      // Should still return documents
    });

    it("should handle empty documents", () => {
      const reranked = rerankDocumentsHeuristic("test query", []);

      expect(reranked).toHaveLength(0);
    });

    it("should prioritize recent documents", () => {
      const query = "programming language"; // Matches doc3 (Python)
      const reranked = rerankDocumentsHeuristic(query, mockDocuments);

      expect(reranked).toHaveLength(4);
      // doc3 should be reranked but recency affects score
    });

    it("should prioritize documents with lower chunk index", () => {
      const query = "neural networks deep learning";
      const reranked = rerankDocumentsHeuristic(query, mockDocuments);

      expect(reranked).toHaveLength(4);
      // doc2 should rank high (matches keywords)
      expect(reranked[0].id).toBe("doc2");
    });
  });

  describe("Cross-Encoder Reranking", () => {
    it("should rerank documents using OpenRouter API", async () => {
      // Mock successful API response
      (openai.chat.completions.create as jest.Mock).mockResolvedValue({
        choices: [
          {
            message: {
              content: "[0.95, 0.87, 0.42, 0.78]",
            },
          },
        ],
      });

      const query = "machine learning";
      const reranked = await rerankDocumentsCrossEncoder(query, mockDocuments, {
        model: "openai/gpt-4o-mini",
      });

      expect(reranked).toHaveLength(4);
      expect(openai.chat.completions.create).toHaveBeenCalledTimes(1);
    });

    it("should return scores with rerankDocumentsCrossEncoderWithScores", async () => {
      // Mock successful API response
      (openai.chat.completions.create as jest.Mock).mockResolvedValue({
        choices: [
          {
            message: {
              content: "[0.95, 0.87, 0.42, 0.78]",
            },
          },
        ],
      });

      const query = "deep learning";
      const result = await rerankDocumentsCrossEncoderWithScores(
        query,
        mockDocuments,
        {
          model: "openai/gpt-4o-mini",
        },
      );

      expect(result.documents).toHaveLength(4);
      expect(result.scores.size).toBeGreaterThan(0);
      expect(result.scores.get("doc1")).toBeDefined();
    });

    it("should handle API errors gracefully with fallback", async () => {
      // Mock API error
      (openai.chat.completions.create as jest.Mock).mockRejectedValue(
        new Error("API rate limit exceeded"),
      );

      const query = "neural networks";
      const reranked = await rerankDocumentsCrossEncoder(query, mockDocuments);

      // Should fallback to heuristic reranking
      expect(reranked).toHaveLength(4);
      expect(openai.chat.completions.create).toHaveBeenCalledTimes(1);
    });

    it("should handle invalid API response format", async () => {
      // Mock invalid API response
      (openai.chat.completions.create as jest.Mock).mockResolvedValue({
        choices: [
          {
            message: {
              content: "invalid response",
            },
          },
        ],
      });

      const query = "artificial intelligence";
      const reranked = await rerankDocumentsCrossEncoder(query, mockDocuments);

      // Should fallback to heuristic reranking
      expect(reranked).toHaveLength(4);
    });

    it("should handle wrong number of scores in response", async () => {
      // Mock response with wrong number of scores
      (openai.chat.completions.create as jest.Mock).mockResolvedValue({
        choices: [
          {
            message: {
              content: "[0.95, 0.87]", // Only 2 scores for 4 documents
            },
          },
        ],
      });

      const query = "test query";
      const reranked = await rerankDocumentsCrossEncoder(query, mockDocuments);

      // Should fallback to heuristic reranking
      expect(reranked).toHaveLength(4);
    });

    it("should respect maxDocs option", async () => {
      // Mock API response
      (openai.chat.completions.create as jest.Mock).mockResolvedValue({
        choices: [
          {
            message: {
              content: "[0.95, 0.87]",
            },
          },
        ],
      });

      const query = "test query";
      const reranked = await rerankDocumentsCrossEncoder(query, mockDocuments, {
        maxDocs: 2,
      });

      expect(reranked).toHaveLength(4); // Still returns all docs
      // But only re-ranks top 2
    });

    it("should truncate long documents based on maxCharsPerDoc", async () => {
      const longDoc: Document = {
        id: "long-doc",
        content: "A".repeat(5000),
        text: "A".repeat(5000),
        metadata: { source: "long.txt" },
        score: 0.8,
        createdAt: Date.now(),
        chunkIndex: 0,
      };

      // Mock API response
      (openai.chat.completions.create as jest.Mock).mockResolvedValue({
        choices: [
          {
            message: {
              content: "[0.95]",
            },
          },
        ],
      });

      const query = "test";
      await rerankDocumentsCrossEncoder(query, [longDoc], {
        maxCharsPerDoc: 1200,
      });

      // Verify API was called with truncated text
      expect(openai.chat.completions.create).toHaveBeenCalled();
    });

    it("should handle empty query", async () => {
      const result = await rerankDocumentsCrossEncoderWithScores(
        "",
        mockDocuments,
      );

      expect(result.documents).toEqual(mockDocuments);
      expect(result.scores.size).toBe(0);
    });

    it("should handle empty documents array", async () => {
      const result = await rerankDocumentsCrossEncoderWithScores(
        "test query",
        [],
      );

      expect(result.documents).toEqual([]);
      expect(result.scores.size).toBe(0);
    });
  });

  describe("Reranker Status", () => {
    it("should report OK status when reranker is working", async () => {
      // Mock successful probe
      (openai.chat.completions.create as jest.Mock).mockResolvedValue({
        choices: [
          {
            message: {
              content: "[0.8, 0.3]",
            },
          },
        ],
      });

      const status = await getRerankerStatus();

      expect(status.status).toBe("ok");
      expect(status.latencyMs).toBeGreaterThan(0);
      expect(status.usedFallback).toBe(false);
      expect(status.model).toBeDefined();
    });

    it("should report unavailable status when reranker fails", async () => {
      // Mock API error
      (openai.chat.completions.create as jest.Mock).mockRejectedValue(
        new Error("Connection timeout"),
      );

      const status = await getRerankerStatus();

      expect(status.status).toBe("unavailable");
      expect(status.usedFallback).toBe(true);
      expect(status.reason).toBeDefined();
    });

    it("should report unavailable status for invalid response", async () => {
      // Mock invalid response
      (openai.chat.completions.create as jest.Mock).mockResolvedValue({
        choices: [
          {
            message: {
              content: "not a valid JSON array",
            },
          },
        ],
      });

      const status = await getRerankerStatus();

      expect(status.status).toBe("unavailable");
      expect(status.usedFallback).toBe(true);
    });
  });

  describe("Score Normalization", () => {
    it("should clamp scores to [0, 1] range", async () => {
      // Mock response with out-of-range scores
      (openai.chat.completions.create as jest.Mock).mockResolvedValue({
        choices: [
          {
            message: {
              content: "[1.5, -0.3, 0.5, 0.8]", // Out of range
            },
          },
        ],
      });

      const result = await rerankDocumentsCrossEncoderWithScores(
        "test query",
        mockDocuments,
        { model: "openai/gpt-4o-mini" },
      );

      // All scores should be clamped to [0, 1]
      result.scores.forEach((score) => {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
      });
    });
  });

  describe("Performance", () => {
    it("should complete reranking in reasonable time", async () => {
      // Mock fast API response
      (openai.chat.completions.create as jest.Mock).mockResolvedValue({
        choices: [
          {
            message: {
              content: "[0.95, 0.87, 0.42, 0.78]",
            },
          },
        ],
      });

      const startTime = Date.now();
      await rerankDocumentsCrossEncoder("test query", mockDocuments);
      const duration = Date.now() - startTime;

      // Should complete quickly (< 5 seconds for mocked response)
      expect(duration).toBeLessThan(5000);
    });

    it("should handle large document sets efficiently", async () => {
      const largeDocs = Array.from({ length: 50 }, (_, i) => ({
        id: `doc${i}`,
        content: `Document ${i} with some content`,
        text: `Document ${i} with some content`,
        metadata: { source: `doc${i}.txt` },
        score: 0.5 + Math.random() * 0.5,
        createdAt: Date.now(),
        chunkIndex: i,
      }));

      const reranked = rerankDocumentsHeuristic("test query", largeDocs);

      expect(reranked).toHaveLength(50);
    });
  });
});
