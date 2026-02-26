# Task 12: Worker Concurrency Tuning - Implementation Report

**Status**: ✅ **COMPLETE**  
**Date**: February 2026  
**Production Gap Addressed**: Worker concurrency not tuned or configurable for scale

---

## Executive Summary

Configured BullMQ workers to use a centralized, environment-driven concurrency setting. This enables predictable scaling and aligns worker throughput with database and OpenAI rate limits. Both chat and RAG workers now respect `WORKER_CONCURRENCY`.

---

## What Changed

### 1. Chat Worker Concurrency

**File**: [apps/web/src/workers/chat.worker.ts](../../apps/web/src/workers/chat.worker.ts)

**Before**: Concurrency defaulted to BullMQ's internal default (1).  
**After**: Concurrency explicitly set from environment.

```typescript
const worker = new Worker(chatQueue.name, async (job) => processChatJob(job), {
  connection,
  concurrency: env.WORKER_CONCURRENCY,
  settings: {
    stalledInterval: 60000,
    maxStalledCount: 2,
  },
  lockDuration: 180000,
});
```

### 2. RAG Worker Concurrency

**File**: [apps/web/src/workers/rag.worker.ts](../../apps/web/src/workers/rag.worker.ts)

**Before**: Concurrency defaulted to BullMQ's internal default (1).  
**After**: Concurrency explicitly set from environment.

```typescript
const worker = new Worker(
  ragQueue.name,
  async (job) => {
    // ...
  },
  {
    connection,
    concurrency: env.WORKER_CONCURRENCY,
    settings: {
      stalledInterval: 60000,
      maxStalledCount: 2,
    },
    lockDuration: 300000,
  },
);
```

---

## Configuration

### Environment Variable

**File**: [apps/web/src/lib/env.ts](../../apps/web/src/lib/env.ts)

```typescript
WORKER_CONCURRENCY: z.coerce.number().int().positive().default(5);
```

### Recommended Starting Values

| Environment | Suggested Concurrency | Rationale                      |
| ----------- | --------------------- | ------------------------------ |
| Development | 1-2                   | Avoid local CPU/DB contention  |
| Staging     | 3-4                   | Validate stability under load  |
| Production  | 5                     | Balanced throughput vs DB pool |

---

## Capacity Planning Guidance

Use the formula from the existing pool guidance in [apps/web/src/lib/prisma.ts](../../apps/web/src/lib/prisma.ts):

```
Total DB connections ≈ (workers × concurrency) + (api_instances × expected_requests) + buffer
```

Example (current docs):

- Workers: 4
- Concurrency: 5
- API instances: 2
- Expected concurrent requests: 20
- Buffer: 15

Total: $(4 × 5) + (2 × 20) + 15 = 75$ connections

Update `DATABASE_URL` connection limit accordingly:

```
postgresql://user:pass@host:5432/db?connection_limit=75&pool_timeout=30&connect_timeout=10
```

---

## Validation Checklist

- ✅ Chat and RAG workers both read `WORKER_CONCURRENCY`
- ✅ No changes to processing logic or error handling
- ✅ Concurrency is now tunable via environment
- ✅ Compatible with existing pool monitoring

---

## Next Steps

- **Task 13**: Token Budget Atomicity
- Review worker throughput vs DB pool saturation in CloudWatch
- Consider separate `WORKER_CONCURRENCY_RAG` in future if RAG needs independent tuning

---

**Task 12 Status**: ✅ COMPLETE  
**Next Task**: Task 13 - Token Budget Atomicity
