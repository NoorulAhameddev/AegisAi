import { searchSimilar, Document } from "../../ai/rag/vector-store";
import { getRAGConfig } from "./rag-config";

/**
 * Advanced RAG retrieval with reranking and context optimization
 */

export interface RetrievalResult {
    documents: Document[];
    context: string;
    tokensUsed: number;
    sources: Set<string>;
}

/**
 * Retrieve and rank documents for RAG
 */
export async function retrieveContext(
    query: string,
    userId: string,
    options?: {
        topK?: number;
        filters?: any;
        includeMetadata?: boolean;
    }
): Promise<RetrievalResult> {
    const config = getRAGConfig();
    const topK = options?.topK || config.retrieval.topK;

    // 1. Retrieve documents from vector store
    const documents = await searchSimilar(
        query,
        userId,
        topK * 2, // Get more for reranking
        options?.filters
    );

    if (documents.length === 0) {
        return {
            documents: [],
            context: "",
            tokensUsed: 0,
            sources: new Set(),
        };
    }

    // 2. Rerank documents (if enabled)
    let rankedDocs = documents;
    if (config.retrieval.rerank) {
        rankedDocs = await rerankDocuments(query, documents);
    }

    // 3. Build context string with deduplication
    const { context, tokensUsed, sources } = buildContext(
        rankedDocs.slice(0, topK),
        config.retrieval.maxContextLength,
        options?.includeMetadata
    );

    return {
        documents: rankedDocs.slice(0, topK),
        context,
        tokensUsed,
        sources,
    };
}

/**
 * Rerank documents using relevance scoring
 * Simple approach: score based on keyword overlap and position
 */
async function rerankDocuments(query: string, documents: Document[]): Promise<Document[]> {
    const queryTerms = extractKeyTerms(query.toLowerCase());

    const scored = documents.map(doc => {
        const docText = doc.text.toLowerCase();
        let score = 0;

        // 1. Keyword overlap score
        for (const term of queryTerms) {
            const count = (docText.match(new RegExp(term, 'g')) || []).length;
            score += count * 2; // Weight keyword matches
        }

        // 2. Position bias (earlier chunks might be more important)
        if (doc.chunkIndex !== undefined) {
            score += Math.max(0, 10 - doc.chunkIndex); // Prefer earlier chunks
        }

        // 3. Recency bias (newer documents might be more relevant)
        const ageInDays = (Date.now() - doc.createdAt) / (1000 * 60 * 60 * 24);
        if (ageInDays < 7) {
            score += 5; // Boost recent documents
        }

        return { doc, score };
    });

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    return scored.map(s => s.doc);
}

/**
 * Extract key terms from query (simple keyword extraction)
 */
function extractKeyTerms(text: string): string[] {
    // Remove common stop words
    const stopWords = new Set([
        'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
        'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should',
        'could', 'may', 'might', 'must', 'can', 'of', 'at', 'by', 'for', 'with',
        'about', 'against', 'between', 'into', 'through', 'during', 'before',
        'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out',
        'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once',
        'here', 'there', 'when', 'where', 'why', 'how', 'all', 'both', 'each',
        'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not',
        'only', 'own', 'same', 'so', 'than', 'too', 'very', 'what', 'which',
        'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'i', 'you',
        'he', 'she', 'it', 'we', 'they', 'them', 'their', 'if', 'or', 'because',
        'as', 'until', 'while', 'just', 'but', 'and'
    ]);

    const words = text
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 2 && !stopWords.has(word));

    return [...new Set(words)]; // Remove duplicates
}

/**
 * Build context string from documents
 */
function buildContext(
    documents: Document[],
    maxLength: number,
    includeMetadata?: boolean
): { context: string; tokensUsed: number; sources: Set<string> } {
    const contextParts: string[] = [];
    let currentLength = 0;
    const sources = new Set<string>();

    for (let i = 0; i < documents.length; i++) {
        const doc = documents[i];
        let docText = doc.text;

        // Add metadata if requested
        if (includeMetadata && doc.metadata) {
            try {
                const meta = JSON.parse(doc.metadata);
                if (meta.fileName) {
                    docText = `[Source: ${meta.fileName}]\n${docText}`;
                }
            } catch (e) {
                // Ignore metadata parse errors
            }
        }

        // Check if adding this document would exceed limit
        if (currentLength + docText.length > maxLength && contextParts.length > 0) {
            break; // Stop adding more documents
        }

        contextParts.push(docText);
        currentLength += docText.length;

        // Track sources
        if (doc.sourceId) {
            sources.add(doc.sourceId);
        }
    }

    const context = contextParts.length > 0
        ? `RELEVANT CONTEXT:\n${contextParts.map((text, i) => `[${i + 1}] ${text}`).join('\n\n')}`
        : '';

    // Rough token estimation (1 token ≈ 4 characters)
    const tokensUsed = Math.ceil(context.length / 4);

    return { context, tokensUsed, sources };
}

/**
 * Format RAG context for system prompt injection
 */
export function formatRAGContext(retrievalResult: RetrievalResult): string {
    if (!retrievalResult.context) {
        return '';
    }

    let formatted = retrievalResult.context;

    // Add source information
    if (retrievalResult.sources.size > 0) {
        formatted += `\n\n---\nContext retrieved from ${retrievalResult.sources.size} source(s).`;
        formatted += `\nUse this information to provide accurate, context-aware responses.`;
        formatted += `\nIf the context doesn't contain relevant information, rely on your general knowledge.`;
    }

    return formatted;
}

/**
 * Simple function to check if RAG should be used for this query
 */
export function shouldUseRAG(message: string): boolean {
    // Don't use RAG for very short queries or greetings
    const lowerMessage = message.toLowerCase().trim();
    
    const greetings = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening'];
    if (greetings.includes(lowerMessage) || message.length < 10) {
        return false;
    }

    // Don't use RAG for system commands
    const systemCommands = ['/help', '/clear', '/reset'];
    if (systemCommands.some(cmd => lowerMessage.startsWith(cmd))) {
        return false;
    }

    return true;
}
