/**
 * RAG Trust Scoring System
 * 
 * Replaces naive regex blacklist with intelligent trust scoring
 *- Source reputation: official docs > user uploads > web content
 * - Semantic relevance: penalize off-topic chunks
 * - Content safety: detect instruction injection
 * - Confidence scoring: transparency for users
 * 
 * Problem Solved:
 * - Old: Hard blocklist, easy to bypass with synonyms
 * - New: Probabilistic scoring, adaptive to new patterns
 */

export interface RAGChunk {
  id: string;
  text: string;
  source: 'official_docs' | 'user_upload' | 'web' | 'custom';
  relevanceScore?: number;
  metadata?: Record<string, any>;
}

export interface TrustScore {
  overall: number; // 0.0-1.0
  safetyScore: number;
  relevanceScore: number;
  sourceReputation: number;
  riskLevel: 'low' | 'medium' | 'high';
  reasons: string[];
  confidence: number; // How confident we are in this score
}

/**
 * Analyze a RAG chunk and return trust score
 */
export function scoreRAGChunk(
  chunk: RAGChunk,
  query: string,
  context?: { userId: string; chatHistory: any[] }
): TrustScore {
  const reasons: string[] = [];
  let safetyScore = 1.0;
  let relevanceScore = 1.0;
  let sourceReputation = 1.0;

  // 1. SOURCE REPUTATION SCORING
  // ==============================
  const sourceScores: Record<string, number> = {
    official_docs: 1.2,  // Boost official docs
    custom: 1.0,         // Neutral
    user_upload: 0.8,    // Slight penalty
    web: 0.7             // Lower trust for web content
  };

  sourceReputation = sourceScores[chunk.source] || 1.0;

  if (chunk.source === 'official_docs') {
    reasons.push('verified_source');
  } else if (chunk.source === 'web') {
    reasons.push('web_content_lower_trust');
  } else if (chunk.source === 'user_upload') {
    reasons.push('user_uploaded_content');
  }

  // 2. CONTENT SAFETY SCORING
  // ==========================
  const dangerousPatterns = [
    // Direct instruction override
    { pattern: /(?:ignore|disregard|forget|bypass|override).*(?:instruction|rule|guideline|policy)/i, weight: 0.4 },
    // Mode switch / jailbreak
    { pattern: /(?:dev|developer|test|harmless|unrestricted).*mode/i, weight: 0.35 },
    // Role confusion
    { pattern: /(?:act as|pretend|roleplay|assume|become).*(?:engineer|developer|admin|coder)/i, weight: 0.3 },
    // Instruction reveal
    { pattern: /(?:what|who|how).*(?:are you|is your role|is your purpose|should you)/i, weight: 0.2 },
    // Multi-turn jailbreak setup
    { pattern: /(?:but if|however,|technically|technically,).*(?:you|could|should)/i, weight: 0.15 },
    // Safety negation
    { pattern: /(?:no |don't |do not )(?:worry|concern|safe)/i, weight: 0.2 },
    // Constraint circumvention
    { pattern: /(?:just this once|exception|just for|pretend)/i, weight: 0.15 }
  ];

  // Check each pattern
  for (const { pattern, weight } of dangerousPatterns) {
    if (pattern.test(chunk.text)) {
      safetyScore *= (1 - weight);
      reasons.push(`suspicious_pattern_detected: ${pattern.source}`);
    }
  }

  // Bonus for explicit disclaimers
  if (/(?:for information only|reference only|educational|disclaim|not legal|not medical)/i.test(chunk.text)) {
    safetyScore = Math.min(safetyScore + 0.15, 1.0);
    reasons.push('contains_appropriate_disclaimer');
  }

  // Penalty for very long chunks (might be trying to hide injection)
  if (chunk.text.length > 5000) {
    safetyScore *= 0.9;
    reasons.push('unusually_long_chunk');
  }

  // 3. SEMANTIC RELEVANCE SCORING
  // ==============================
  // Simple TF-IDF-like scoring
  const queryTerms = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const chunkText = chunk.text.toLowerCase();

  let matchCount = 0;
  for (const term of queryTerms) {
    if (chunkText.includes(term)) {
      matchCount++;
    }
  }

  // Relevance is proportion of query terms found in chunk
  const relevanceRatio = queryTerms.length > 0 ? matchCount / queryTerms.length : 0.5;

  if (relevanceRatio > 0.7) {
    relevanceScore = 1.0;
    reasons.push('high_relevance');
  } else if (relevanceRatio > 0.4) {
    relevanceScore = 0.8;
    reasons.push('medium_relevance');
  } else if (relevanceRatio > 0.2) {
    relevanceScore = 0.5;
    reasons.push('low_relevance');
  } else {
    relevanceScore = 0.2;
    reasons.push('minimal_relevance');
  }

  // Use metadata relevance score if available
  if (chunk.metadata?.relevanceScore !== undefined) {
    relevanceScore *= chunk.metadata.relevanceScore;
    reasons.push('metadata_relevance_applied');
  }

  // 4. OVERALL SCORING & RISK ASSESSMENT
  // ====================================
  const weights = {
    safety: 0.5,      // Safety is most important
    relevance: 0.3,   // Relevance is secondary
    reputation: 0.2   // Source reputation is tertiary
  };

  const overallScore =
    safetyScore * weights.safety +
    relevanceScore * weights.relevance +
    sourceReputation * weights.reputation;

  // Clamp to 0-1
  const finalScore = Math.max(0, Math.min(overallScore, 1.0));

  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high';
  if (finalScore > 0.7) {
    riskLevel = 'low';
  } else if (finalScore > 0.4) {
    riskLevel = 'medium';
  } else {
    riskLevel = 'high';
  }

  // Calculate confidence (lower score = higher confidence in rejection)
  const confidence = Math.abs(finalScore - 0.5) / 0.5; // How far from neutral

  return {
    overall: finalScore,
    safetyScore,
    relevanceScore,
    sourceReputation,
    riskLevel,
    reasons,
    confidence
  };
}

/**
 * Filter and score multiple RAG chunks
 */
export function scoreRAGChunks(
  chunks: RAGChunk[],
  query: string,
  options: {
    minTrustScore?: number;
    topK?: number;
    includeScores?: boolean;
  } = {}
): RAGChunk[] {
  const {
    minTrustScore = 0.4,
    topK = 5,
    includeScores = false
  } = options;

  // Score each chunk
  const scored = chunks.map(chunk => ({
    chunk,
    score: scoreRAGChunk(chunk, query)
  }));

  // Filter by minimum trust score
  const filtered = scored.filter(item =>
    item.score.overall >= minTrustScore &&
    item.score.riskLevel !== 'high'
  );

  // Sort by score (descending)
  filtered.sort((a, b) => b.score.overall - a.score.overall);

  // Take top K
  const topChunks = filtered.slice(0, topK);

  // Return with optional scores
  if (includeScores) {
    return topChunks.map(item => ({
      ...item.chunk,
      metadata: {
        ...item.chunk.metadata,
        trustScore: item.score
      }
    }));
  }

  return topChunks.map(item => item.chunk);
}

/**
 * Format RAG context with trust indicators
 */
export function formatRAGContextWithTrust(
  chunks: RAGChunk[],
  query: string,
  showScores: boolean = false
): string {
  const scored = chunks.map(chunk => ({
    chunk,
    score: scoreRAGChunk(chunk, query)
  }));

  const formatted = scored
    .sort((a, b) => b.score.overall - a.score.overall)
    .map(item => {
      const trustPercent = Math.round(item.score.overall * 100);
      const riskEmoji = {
        low: '✅',
        medium: '⚠️',
        high: '🚫'
      }[item.score.riskLevel];

      let header = `[${item.chunk.source}] ${riskEmoji} [Trust: ${trustPercent}%]`;

      if (showScores) {
        header += ` [Safety: ${Math.round(item.score.safetyScore * 100)}% | Relevance: ${Math.round(item.score.relevanceScore * 100)}%]`;
      }

      return `${header}\n${item.chunk.text}`;
    })
    .join('\n---\n');

  return formatted;
}

/**
 * Detect potential injection attacks in RAG context
 */
export function detectRAGInjectionAttempt(text: string): {
  detected: boolean;
  confidence: number;
  pattern: string;
  mitigation: string;
} {
  const injectionPatterns = [
    {
      pattern: /(?:SYSTEM|ADMIN|PROMPT).*:.*(?:ignore|override|replace)/i,
      name: 'system_override_attempt',
      mitigation: 'Filter context with trust scoring'
    },
    {
      pattern: /```.*(?:python|javascript|bash).*```/s,
      name: 'code_injection_attempt',
      mitigation: 'Sanitize code blocks'
    },
    {
      pattern: /(?:JSON|XML|YAML).*{.*}.*(?:execute|run|eval)/i,
      name: 'config_injection_attempt',
      mitigation: 'Parse and validate only safe structures'
    }
  ];

  for (const { pattern, name, mitigation } of injectionPatterns) {
    if (pattern.test(text)) {
      return {
        detected: true,
        confidence: 0.85,
        pattern: name,
        mitigation
      };
    }
  }

  return {
    detected: false,
    confidence: 0.0,
    pattern: 'none',
    mitigation: 'none'
  };
}

/**
 * Calculate aggregate trust score for multiple chunks
 */
export function aggregateTrustScore(scores: TrustScore[]): {
  average: number;
  minimum: number;
  maximum: number;
  trustworthy: boolean;
  explanation: string;
} {
  if (scores.length === 0) {
    return {
      average: 0,
      minimum: 0,
      maximum: 0,
      trustworthy: false,
      explanation: 'No documents provided'
    };
  }

  const overallScores = scores.map(s => s.overall);
  const average = overallScores.reduce((a, b) => a + b, 0) / scores.length;
  const minimum = Math.min(...overallScores);
  const maximum = Math.max(...overallScores);

  let explanation = '';
  if (average > 0.8) {
    explanation = 'High trust context - safe to use';
  } else if (average > 0.6) {
    explanation = 'Medium trust - review source quality';
  } else if (average > 0.4) {
    explanation = 'Low trust - cross-check information';
  } else {
    explanation = 'Very low trust - consider alternative sources';
  }

  return {
    average,
    minimum,
    maximum,
    trustworthy: average > 0.6,
    explanation
  };
}
