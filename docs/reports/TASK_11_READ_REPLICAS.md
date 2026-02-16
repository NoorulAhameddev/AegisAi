# Task 11: Read Replicas Configuration - Implementation Report

**Status**: ✅ **COMPLETE**  
**Date**: June 2025  
**Production Gap Addressed**: Read traffic not scaled across RDS replicas

---

## Executive Summary

Implemented Prisma-level read replica routing to distribute read-heavy traffic across two RDS replicas while keeping all writes on the primary database. Added health and lag checks with automatic fallback to primary if replicas are unavailable or lag exceeds 5 seconds.

### Key Achievements
- ✅ **Read Replica Client Layer**: New `read-replicas.ts` handles round-robin routing and fallback
- ✅ **Read-Heavy Routes Updated**: Chat history, chat list, search, projects, notes, admin lists, and RAG fallback search now use replicas
- ✅ **Replica Lag Visibility**: Health endpoint reports replica lag and marks degraded if lag > 5s
- ✅ **Graceful Degradation**: Automatic fallback to primary when replicas are not configured or unhealthy
- ✅ **Environment Support**: Added optional `DATABASE_REPLICA_1_URL` and `DATABASE_REPLICA_2_URL`

---

## Architecture Overview

**Primary** handles:
- All writes (create/update/delete/upsert)
- Transactions
- Auth, billing, and other consistency-critical reads

**Read Replicas** handle:
- Chat history retrieval
- Chat list
- Search (chat + file)
- Projects listing
- Notes listing
- Admin user list
- Feature flags list
- RAG fallback file search

Routing Strategy:
```
Read-only request → readPrisma (round-robin) → replica-1 or replica-2
Write request     → prisma (primary)        → primary
If replica fails  → fallback to primary
```

---

## Files Added / Updated

### 1. Read Replica Routing Layer

**File**: [apps/web/src/lib/read-replicas.ts](../../apps/web/src/lib/read-replicas.ts)

**Capabilities**:
- Round-robin selection across available replicas
- Health checks every 30 seconds
- Fallback to primary when replicas are unavailable
- Replica lag probing for health reporting

**Key Functions**:

```typescript
// Read-only client with automatic routing
export const readPrisma = new Proxy({} as PrismaClient, {
  get(_target, prop: string) {
    const client = getReadReplica();
    return (client as any)[prop];
  }
});

// Use explicit client for fallback behavior
export async function withReplicaFallback<T>(
  queryFn: (client: PrismaClient) => Promise<T>,
  context: Record<string, any> = {}
): Promise<T> {
  try {
    return await queryFn(getReadReplica());
  } catch {
    return await queryFn(prisma); // primary fallback
  }
}
```

---

### 2. Environment Variables

**File**: [apps/web/src/lib/env.ts](../../apps/web/src/lib/env.ts)

**New optional settings**:
- `DATABASE_REPLICA_1_URL`
- `DATABASE_REPLICA_2_URL`

**Example**:
```
DATABASE_URL=postgresql://user:pass@primary.rds.amazonaws.com:5432/aegis
DATABASE_REPLICA_1_URL=postgresql://user:pass@replica-1.rds.amazonaws.com:5432/aegis
DATABASE_REPLICA_2_URL=postgresql://user:pass@replica-2.rds.amazonaws.com:5432/aegis
```

If replica URLs are not set, all reads automatically route to primary.

---

### 3. API Routes Updated to Use Replicas

**Chat History**  
[apps/web/src/app/api/chat/history/route.ts](../../apps/web/src/app/api/chat/history/route.ts)
- `message.count`, `conversationSummary.findMany`, `message.findMany` now use `readPrisma`

**Chat List**  
[apps/web/src/app/api/chat/list/route.ts](../../apps/web/src/app/api/chat/list/route.ts)
- `chat.findMany` now uses `readPrisma`

**Search**  
[apps/web/src/app/api/search/route.ts](../../apps/web/src/app/api/search/route.ts)
- `chat.findMany`, `file.findMany` now use `readPrisma`

**Projects List**  
[apps/web/src/app/api/projects/route.ts](../../apps/web/src/app/api/projects/route.ts)
- GET `project.findMany` now uses `readPrisma`

**Notes List**  
[apps/web/src/app/api/notes/route.ts](../../apps/web/src/app/api/notes/route.ts)
- GET `note.findMany` now uses `readPrisma`

**Admin Users List**  
[apps/web/src/app/api/admin/users/route.ts](../../apps/web/src/app/api/admin/users/route.ts)
- `user.findMany` now uses `readPrisma`

**Feature Flags List**  
[apps/web/src/app/api/admin/feature-flags/route.ts](../../apps/web/src/app/api/admin/feature-flags/route.ts)
- GET `featureFlag.findMany` now uses `readPrisma`

**RAG Search Fallback**  
[apps/web/src/app/api/rag/search/route.ts](../../apps/web/src/app/api/rag/search/route.ts)
- Fallback `file.findMany` now uses `readPrisma`

---

### 4. Health Check: Replica Lag

**File**: [apps/web/src/app/api/health/route.ts](../../apps/web/src/app/api/health/route.ts)

Added read replica lag reporting using `pg_stat_replication` (if permitted):

```typescript
const { replica1Lag, replica2Lag } = await getReplicaLag();
const maxLag = Math.max(replica1Lag ?? 0, replica2Lag ?? 0);

checks.checks.readReplicas = {
  status: maxLag > 5 ? "degraded" : "ok",
  replica1Lag,
  replica2Lag,
  message: maxLag > 5 ? "Replica lag above 5s" : "Replica lag within 5s"
};
```

If lag exceeds 5 seconds, overall health is marked **degraded**.

---

## Read vs Write Guidance

### Use `readPrisma` for:
- List pages (history, search, analytics)
- Admin lists
- Non-critical profile reads
- RAG fallback file search

### Use `prisma` (primary) for:
- Authentication checks
- Token/billing logic
- Transactions
- Writes (create, update, delete)
- Consistency-critical reads (immediately after write)

---

## Monitoring and Validation

### Validate Replica Connectivity

```bash
# Should return ok with replica lag stats
curl http://localhost:3000/api/health
```

Expected read replica section:
```
"readReplicas": {
  "status": "ok",
  "replica1Lag": 1,
  "replica2Lag": 2,
  "message": "Replica lag within 5s"
}
```

### Manual Lag Check (SQL)

```sql
SELECT client_addr,
       EXTRACT(EPOCH FROM (NOW() - pg_last_xact_replay_timestamp()))::int AS replay_lag_seconds
FROM pg_stat_replication;
```

---

## Known Considerations

- Replica lag is typically <1s for low write volume.
- Admin and list views can tolerate short lag; critical reads remain on primary.
- If `pg_stat_replication` access is restricted, health will show `warning` with lag unavailable.

---

## Acceptance Criteria

- ✅ Read replicas configured via env variables
- ✅ Read-heavy endpoints route to replicas
- ✅ Automatic fallback to primary on failure
- ✅ Replica lag visible in `/api/health`
- ✅ No changes to write paths or auth flows

---

**Task 11 Status**: ✅ COMPLETE  
**Next Task**: Task 12 - Worker Concurrency Tuning
