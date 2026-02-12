import crypto from "crypto";
import { openai } from "@/services/ai/openai";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { getCachedRerankScores, setCachedRerankScores } from "@/lib/rerank-cache";
import { getRAGConfig } from "./config";
import type { Document } from "@/ai/rag/vector-store";

type RerankOptions = {
    model?: string;
    maxDocs?: number;
    maxCharsPerDoc?: number;
};

type ScoredDocument = {
    doc: Document;
    score: number;
};

export type RerankResult = {
    documents: Document[];
    scores: Map<string, number>;
};

export type RerankerStatus = {
    status: "ok" | "degraded" | "unavailable";
    model: string;
    latencyMs: number | null;
    usedFallback: boolean;
    reason?: string;
};

const DEFAULT_MODEL = "openai/gpt-4o-mini";
const DEFAULT_MAX_DOCS = 20;
const DEFAULT_MAX_CHARS = 1200;
const DEFAULT_CACHE_TTL_SECONDS = 900;

const normalizeDocText = (text: string, maxChars: number): string => {
    const normalized = text.replace(/\s+/g, " ").trim();
    return normalized.length > maxChars ? `${normalized.slice(0, maxChars)}...` : normalized;
};

const normalizeQuery = (query: string): string => query.replace(/\s+/g, " ").trim().toLowerCase();

const createCacheKey = (model: string, query: string, docId: string): string => {
    const normalizedQuery = normalizeQuery(query);
    const hash = crypto.createHash("sha256").update(`${model}:${normalizedQuery}:${docId}`).digest("hex");
    return `rerank:${hash}`;
};

const parseScoreArray = (raw: string, expectedLength: number): number[] | null => {
    const cleaned = raw
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();

    try {
        const parsed = JSON.parse(cleaned);
        if (!Array.isArray(parsed)) return null;
        if (parsed.length !== expectedLength) return null;
        if (!parsed.every(value => typeof value === "number")) return null;
        return parsed.map(value => Math.max(0, Math.min(1, value)));
    } catch {
        return null;
    }
};

const scoreDocumentsHeuristic = (query: string, documents: Document[]): ScoredDocument[] => {
    const queryTerms = extractKeyTerms(query.toLowerCase());

    const scored = documents.map(doc => {
        const docText = doc.text.toLowerCase();
        let score = 0;

        // Keyword overlap score
        for (const term of queryTerms) {
            const count = (docText.match(new RegExp(term, "g")) || []).length;
            score += count * 2;
        }

        // Position bias
        if (doc.chunkIndex !== undefined) {
            score += Math.max(0, 10 - doc.chunkIndex);
        }

        // Recency bias
        const ageInDays = (Date.now() - doc.createdAt) / (1000 * 60 * 60 * 24);
        if (ageInDays < 7) {
            score += 5;
        }

        return { doc, score };
    });

    scored.sort((a, b) => b.score - a.score);

    return scored;
};

export async function rerankDocumentsCrossEncoder(
    query: string,
    documents: Document[],
    options: RerankOptions = {}
): Promise<Document[]> {
    const result = await rerankDocumentsCrossEncoderWithScores(query, documents, options);
    return result.documents;
}

export async function rerankDocumentsCrossEncoderWithScores(
    query: string,
    documents: Document[],
    options: RerankOptions = {}
): Promise<RerankResult> {
    if (!query || documents.length === 0) {
        return { documents, scores: new Map() };
    }

    const model = options.model || env.CROSS_ENCODER_MODEL || DEFAULT_MODEL;
    const maxDocs = options.maxDocs ?? DEFAULT_MAX_DOCS;
    const maxCharsPerDoc = options.maxCharsPerDoc ?? DEFAULT_MAX_CHARS;
    const config = getRAGConfig();
    const cacheTTL = Math.min(config.cacheTTL || DEFAULT_CACHE_TTL_SECONDS, DEFAULT_CACHE_TTL_SECONDS);

    if (!model.startsWith("openai/") && !model.startsWith("gpt")) {
        logger.warn("[Rerank] CROSS_ENCODER_MODEL is not an OpenRouter model; falling back to heuristic rerank", { model });
        const scored = scoreDocumentsHeuristic(query, documents);
        const scores = new Map<string, number>();
        scored.forEach(item => scores.set(item.doc.id, item.score));
        return { documents: scored.map(item => item.doc), scores };
    }

    const limitedDocs = documents.slice(0, maxDocs);
    let cachedScores: (number | null)[] = new Array(limitedDocs.length).fill(null);
    let cacheKeys: string[] = [];
    if (config.enableCaching) {
        cacheKeys = limitedDocs.map(doc => createCacheKey(model, query, doc.id));
        cachedScores = await getCachedRerankScores(cacheKeys);
    }

    const missingIndices = cachedScores
        .map((score, idx) => (typeof score === "number" ? null : idx))
        .filter((idx): idx is number => idx !== null);

    if (missingIndices.length === 0 && limitedDocs.length > 0) {
        const scoredDocs: ScoredDocument[] = limitedDocs.map((doc, idx) => ({
            doc,
            score: cachedScores[idx] ?? 0,
        }));

        scoredDocs.sort((a, b) => b.score - a.score);
        const remaining = documents.slice(maxDocs);
        const scores = new Map<string, number>();
        scoredDocs.forEach(item => scores.set(item.doc.id, item.score));
        remaining.forEach(doc => scores.set(doc.id, 0));
        return { documents: [...scoredDocs.map(item => item.doc), ...remaining], scores };
    }

    const payload = missingIndices.map((idx) => ({
        index: idx,
        id: limitedDocs[idx].id,
        text: normalizeDocText(limitedDocs[idx].text, maxCharsPerDoc),
    }));

    const systemPrompt = "You are a reranking model. Score each document for relevance to the query. Return ONLY a JSON array of numbers in [0,1], in the same order as the documents list.";
    const userPrompt = JSON.stringify({ query, documents: payload });

    try {
        const response = await openai.chat.completions.create({
            model,
            temperature: 0,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
        });

        const content = response.choices[0]?.message?.content || "";
        const scores = parseScoreArray(content, payload.length);

        if (!scores) {
            logger.warn("[Rerank] Invalid cross-encoder response; falling back to heuristic rerank", { model });
            const scored = scoreDocumentsHeuristic(query, documents);
            const scoreMap = new Map<string, number>();
            scored.forEach(item => scoreMap.set(item.doc.id, item.score));
            return { documents: scored.map(item => item.doc), scores: scoreMap };
        }

        scores.forEach((score, scoreIdx) => {
            const docIdx = missingIndices[scoreIdx];
            cachedScores[docIdx] = score;
        });

        if (config.enableCaching && cacheKeys.length > 0) {
            const entries = missingIndices.map((docIdx) => ({
                key: cacheKeys[docIdx],
                value: cachedScores[docIdx] ?? 0,
            }));
            await setCachedRerankScores(entries, cacheTTL);
        }

        const scoredDocs: ScoredDocument[] = limitedDocs.map((doc, idx) => ({
            doc,
            score: cachedScores[idx] ?? 0,
        }));

        scoredDocs.sort((a, b) => b.score - a.score);

        const remaining = documents.slice(maxDocs);
        const scoreMap = new Map<string, number>();
        scoredDocs.forEach(item => scoreMap.set(item.doc.id, item.score));
        remaining.forEach(doc => scoreMap.set(doc.id, 0));
        return { documents: [...scoredDocs.map(item => item.doc), ...remaining], scores: scoreMap };
    } catch (error) {
        logger.warn("[Rerank] Cross-encoder rerank failed; falling back to heuristic", {
            error: (error as Error).message,
            model,
        });
        const scored = scoreDocumentsHeuristic(query, documents);
        const scoreMap = new Map<string, number>();
        scored.forEach(item => scoreMap.set(item.doc.id, item.score));
        return { documents: scored.map(item => item.doc), scores: scoreMap };
    }
}

export async function getRerankerStatus(): Promise<RerankerStatus> {
    const model = env.CROSS_ENCODER_MODEL || DEFAULT_MODEL;

    if (!model.startsWith("openai/") && !model.startsWith("gpt")) {
        return {
            status: "degraded",
            model,
            latencyMs: null,
            usedFallback: true,
            reason: "Model is not OpenRouter-compatible; heuristic rerank is used.",
        };
    }

    const payload = [
        { index: 0, id: "probe-1", text: "Short test document about vector search." },
        { index: 1, id: "probe-2", text: "Unrelated test content for rerank probe." },
    ];
    const systemPrompt = "You are a reranking model. Score each document for relevance to the query. Return ONLY a JSON array of numbers in [0,1], in the same order as the documents list.";
    const userPrompt = JSON.stringify({ query: "vector search", documents: payload });

    const startTime = Date.now();
    try {
        const response = await openai.chat.completions.create({
            model,
            temperature: 0,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
        });

        const content = response.choices[0]?.message?.content || "";
        const scores = parseScoreArray(content, payload.length);
        const latencyMs = Date.now() - startTime;

        if (!scores) {
            return {
                status: "unavailable",
                model,
                latencyMs,
                usedFallback: true,
                reason: "Invalid response format from reranker.",
            };
        }

        return {
            status: "ok",
            model,
            latencyMs,
            usedFallback: false,
        };
    } catch (error) {
        return {
            status: "unavailable",
            model,
            latencyMs: Date.now() - startTime,
            usedFallback: true,
            reason: (error as Error).message,
        };
    }
}

export function rerankDocumentsHeuristic(query: string, documents: Document[]): Document[] {
    const scored = scoreDocumentsHeuristic(query, documents);
    return scored.map(item => item.doc);
}

function extractKeyTerms(text: string): string[] {
    const stopWords = new Set([
        "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
        "have", "has", "had", "do", "does", "did", "will", "would", "should",
        "could", "may", "might", "must", "can", "of", "at", "by", "for", "with",
        "about", "against", "between", "into", "through", "during", "before",
        "after", "above", "below", "to", "from", "up", "down", "in", "out",
        "on", "off", "over", "under", "again", "further", "then", "once",
        "here", "there", "when", "where", "why", "how", "all", "both", "each",
        "few", "more", "most", "other", "some", "such", "no", "nor", "not",
        "only", "own", "same", "so", "than", "too", "very", "what", "which",
        "who", "whom", "this", "that", "these", "those", "am", "i", "you",
        "he", "she", "it", "we", "they", "them", "their", "if", "or", "because",
        "as", "until", "while", "just", "but", "and",
    ]);

    const words = text
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter(word => word.length > 2 && !stopWords.has(word));

    return [...new Set(words)];
}
