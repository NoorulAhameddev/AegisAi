# Task 14: RAG Idempotency - Implementation Report

**Status**: ✅ COMPLETE  
**Date**: February 2026  
**Production Gap Addressed**: RAG ingestion could create duplicate chunks on re-ingest

---

## Summary

RAG ingestion is now idempotent. Chunks are uniquely keyed by `(userId, sourceId, chunkIndex)` and upserted. Stale chunks are removed on re-ingest.

---

## What Changed

### 1. Unique Constraint + Content Hash

**File**: [prisma/schema.prisma](../../prisma/schema.prisma)

- Added `contentHash` to `Document`
- Added unique constraint: `@@unique([userId, sourceId, chunkIndex])`

### 2. Upsert Logic for Chunks

**File**: [apps/web/src/lib/vector-providers/pgvector-provider.ts](../../apps/web/src/lib/vector-providers/pgvector-provider.ts)

- Computes SHA-256 content hash
- Uses upsert when `sourceId` + `chunkIndex` are present

### 3. Stale Chunk Cleanup

**File**: [apps/web/src/services/rag/ingest.ts](../../apps/web/src/services/rag/ingest.ts)

- Tracks valid chunk indexes during ingestion
- Deletes stale chunks for the same `sourceId` after ingest completes

---

## Required Migration

```bash
npx prisma migrate dev --name add_rag_idempotency_fields
```

---

## Acceptance Criteria

- ✅ Re-ingesting the same file no longer duplicates chunks
- ✅ Stale chunks are removed on re-ingest
- ✅ Chunk identity is deterministic per source

---

**Task 14 Status**: ✅ COMPLETE
