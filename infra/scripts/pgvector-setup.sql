-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add vector columns to Document table (if migrating from previous schema)
-- ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS vector vector(1536);
-- ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "textEmbedding" vector(3072);
-- ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "imageEmbedding" vector(1536);

-- Create HNSW indexes for fast similarity search (production-ready)
-- HNSW (Hierarchical Navigable Small World) provides orders of magnitude faster search than IVFFlat

-- Index for primary vector (text-embedding-3-small, 1536 dims)
CREATE INDEX IF NOT EXISTS "Document_vector_idx" 
ON "Document" USING hnsw (vector vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
-- m = 16: Number of connections per node (good balance of speed/accuracy)
-- ef_construction = 64: Quality of index construction (higher = better but slower build)

-- Index for text embeddings (text-embedding-3-large, 3072 dims)
CREATE INDEX IF NOT EXISTS "Document_textEmbedding_idx" 
ON "Document" USING hnsw ("textEmbedding" vector_cosine_ops)
WHERE "textEmbedding" IS NOT NULL
WITH (m = 16, ef_construction = 64);

-- Index for image embeddings (CLIP, 1536 dims)
CREATE INDEX IF NOT EXISTS "Document_imageEmbedding_idx" 
ON "Document" USING hnsw ("imageEmbedding" vector_cosine_ops)
WHERE "imageEmbedding" IS NOT NULL
WITH (m = 16, ef_construction = 64);

-- Create helper function for similarity search
CREATE OR REPLACE FUNCTION search_documents_by_vector(
    query_vector vector(1536),
    user_id_filter text,
    top_k integer DEFAULT 5,
    similarity_threshold float DEFAULT 0.7
)
RETURNS TABLE (
    id text,
    text text,
    similarity float,
    metadata jsonb,
    "sourceId" text,
    "chunkIndex" integer,
    "createdAt" timestamp
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        d.text,
        1 - (d.vector <=> query_vector) as similarity,
        d.metadata::jsonb,
        d."sourceId",
        d."chunkIndex",
        d."createdAt"
    FROM "Document" d
    WHERE d."userId" = user_id_filter
        AND d.vector IS NOT NULL
        AND (1 - (d.vector <=> query_vector)) >= similarity_threshold
    ORDER BY d.vector <=> query_vector
    LIMIT top_k;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create helper function for multi-modal search (text + image embeddings)
CREATE OR REPLACE FUNCTION search_documents_multimodal(
    query_text_vector vector(1536),
    query_image_vector vector(1536),
    user_id_filter text,
    text_weight float DEFAULT 0.7,
    image_weight float DEFAULT 0.3,
    top_k integer DEFAULT 5,
    similarity_threshold float DEFAULT 0.6
)
RETURNS TABLE (
    id text,
    text text,
    combined_similarity float,
    text_similarity float,
    image_similarity float,
    metadata jsonb,
    "sourceId" text,
    "chunkIndex" integer
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        d.text,
        (
            COALESCE(text_weight * (1 - (d.vector <=> query_text_vector)), 0) +
            COALESCE(image_weight * (1 - (d."imageEmbedding" <=> query_image_vector)), 0)
        ) as combined_similarity,
        (1 - (d.vector <=> query_text_vector)) as text_similarity,
        CASE 
            WHEN d."imageEmbedding" IS NOT NULL 
            THEN (1 - (d."imageEmbedding" <=> query_image_vector))
            ELSE NULL
        END as image_similarity,
        d.metadata::jsonb,
        d."sourceId",
        d."chunkIndex"
    FROM "Document" d
    WHERE d."userId" = user_id_filter
        AND d.vector IS NOT NULL
    HAVING (
        COALESCE(text_weight * (1 - (d.vector <=> query_text_vector)), 0) +
        COALESCE(image_weight * (1 - (d."imageEmbedding" <=> query_image_vector)), 0)
    ) >= similarity_threshold
    ORDER BY combined_similarity DESC
    LIMIT top_k;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create stats function for monitoring vector storage
CREATE OR REPLACE FUNCTION get_vector_stats()
RETURNS TABLE (
    total_documents bigint,
    documents_with_vectors bigint,
    documents_with_text_embeddings bigint,
    documents_with_image_embeddings bigint,
    avg_vector_dimensions float,
    index_size text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::bigint as total_documents,
        COUNT(d.vector)::bigint as documents_with_vectors,
        COUNT(d."textEmbedding")::bigint as documents_with_text_embeddings,
        COUNT(d."imageEmbedding")::bigint as documents_with_image_embeddings,
        AVG(array_length(d.vector, 1))::float as avg_vector_dimensions,
        pg_size_pretty(pg_total_relation_size('Document')) as index_size
    FROM "Document" d;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant permissions (adjust as needed for your setup)
-- GRANT EXECUTE ON FUNCTION search_documents_by_vector TO aegis_app_user;
-- GRANT EXECUTE ON FUNCTION search_documents_multimodal TO aegis_app_user;
-- GRANT EXECUTE ON FUNCTION get_vector_stats TO aegis_app_user;

-- Performance optimization: Set better index build parameters
-- Run this after initial data ingestion to rebuild indexes with optimal settings
-- ALTER INDEX "Document_vector_idx" SET (ef_construction = 128);
-- REINDEX INDEX CONCURRENTLY "Document_vector_idx";
