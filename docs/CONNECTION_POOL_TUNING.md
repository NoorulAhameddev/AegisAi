# Database Connection Pool Tuning Guide

## Overview

PostgreSQL connection pools are critical for scaling Aegis AI. Without proper configuration, the system will experience:
- **Symptom**: `FATAL: sorry, too many clients already`
- **Impact**: New requests timeout waiting for available connections
- **Recovery**: Manual API restart required
- **Frequency**: Every 24-48 hours at 50+ concurrent users

This guide explains how to configure connection pools for your deployment.

---

## Quick Calculation: How Many Connections Do You Need?

Use this formula:

```
total_connections = 
  (num_workers × concurrent_jobs_per_worker) + 
  (num_api_instances × concurrent_requests_per_instance) + 
  5 (buffer for miscellaneous)
```

### Examples

**Single Developer Machine** (1 API instance, 1 worker, local testing)
```
(1 worker × 4 jobs) + (1 API × 5 requests) + 5 = 14 connections
→ Use: connection_limit=15
```

**Staging Server** (1 API instance, 2 workers, ~10 concurrent users)
```
(2 workers × 4 jobs) + (1 API × 10 requests) + 5 = 23 connections
→ Use: connection_limit=25
```

**Production Single Instance** (1 API instance, 4 workers, ~50 concurrent users)
```
(4 workers × 4 jobs) + (1 API × 15 requests) + 5 = 36 connections
→ Use: connection_limit=40
```

**Production Multi-Instance** (2 API instances + 4 workers each, ~200 concurrent users)
```
Per instance: (4 workers × 4 jobs) + (1 API × 15 requests) + 5 = 36 connections
→ Use: connection_limit=40 per instance (36 + 4 safety margin)
→ Total database pool: 40 × 2 = 80 connections consumed
```

---

## DATABASE_URL Format

### Current Configuration

```
postgresql://user:password@host:port/database?param1=value1&param2=value2
```

### Required Parameters for Production

```
DATABASE_URL=postgresql://user:password@host:5432/db_name?connection_limit=30&pool_timeout=10&socket_timeout=30&schema_search_path=public
```

**Parameter Explanations:**

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `connection_limit` | 20-40 | Max connections to maintain (see calculation above) |
| `pool_timeout` | 10 | Seconds to wait for available connection before failing |
| `socket_timeout` | 30 | Seconds allowed for a single query to complete |
| `schema_search_path` | public | Default schema (avoid implicit search overhead) |

### Production Configuration by Deployment Type

#### AWS RDS (Single VPC)
```
postgresql://admin:SecurePass123@prod-db.xyz.amazonaws.com:5432/aegis_ai?connection_limit=35&pool_timeout=10&socket_timeout=30&schema_search_path=public
```

#### Managed PostgreSQL (Heroku, Railway, Supabase)
```
postgresql://user:pass@ec2-123-456.us-east-1.compute.amazonaws.com:5432/db_name?connection_limit=30&pool_timeout=10&socket_timeout=30&schema_search_path=public&sslmode=require
```
⚠️ Note: Add `&sslmode=require` for managed services (required for SSL)

#### Self-Hosted PostgreSQL
```
postgresql://postgres:password@192.168.1.100:5432/aegis_ai?connection_limit=30&pool_timeout=10&socket_timeout=30&schema_search_path=public
```

---

## Understanding Prisma Connection Pooling

Prisma does NOT implement its own connection pool - it delegates to the PostgreSQL driver.

### How Prisma Uses Connections

1. **Query Execution**: Each `await prisma.query()` acquires a connection
2. **Duration**: Connection held for query duration (ms - seconds)
3. **Release**: Connection returned to pool after query completes
4. **Reuse**: Same connection reused for next query from another request

### Connection Lifecycle

```
[Request 1] → Acquire conn_1 → Query → Release conn_1
[Request 2] → Acquire conn_1 (reused) → Query → Release conn_1
[Request 3] → Acquire conn_2 (if conn_1 busy) → Query → Release conn_2
...
[Request 11] → Wait for available connection (conn_1-10 all in use)
              → After pool_timeout with no connection → ERROR: Connection timeout
```

---

## Monitoring Connection Pool Health

### Check Current Connections (PostgreSQL)

```sql
-- Connect to your database and run:
SELECT 
  count(*) as total_connections,
  count(*) FILTER (where state = 'active') as active_connections,
  count(*) FILTER (where state = 'idle') as idle_connections,
  count(*) FILTER (where state = 'idle in transaction') as idle_in_transaction
FROM pg_stat_activity
WHERE datname = 'aegis_ai';
```

### Expected Results

**Health:**
- Active connections < 50% of connection_limit
- Idle connections stable (not accumulating)
- Idle in transaction: 0 (indicates unreleased connections)

**Warning Signs:**
- Activity queries blocked (many idle in transaction)
- Connections hovering near connection_limit
- Rapid connection/disconnect cycles (indicates pool thrashing)

### Monitor from Application

In development, Prisma logs query times to identify slow queries:

```bash
# Development only - shows all queries
DATABASE_DEBUG=true npm run dev
```

Slow queries (>100ms) consume connections longer, reduce effective pool size:

```
[Prisma] Query: UPDATE chats SET ... (453ms) ← SLOW! Holds connection 453ms
[Prisma] Query: SELECT * FROM users ... (12ms) ← GOOD. Holds connection 12ms
```

---

## Troubleshooting Connection Issues

### Symptom: "Connection timeout" errors appearing in logs

**Diagnosis:**
```sql
-- Check pool exhaustion
SELECT usename, state, query 
FROM pg_stat_activity 
WHERE datname = 'aegis_ai' 
ORDER BY state, query_start DESC;
```

**Causes & Fixes:**

| Cause | Symptom | Fix |
|-------|---------|-----|
| connection_limit too low | 90%+ connections always in use | Increase connection_limit by 10-20 |
| Slow queries | Idle connections accumulating | Add indexes, optimize queries |
| Connection leak | Idle in transaction never decrements | Debug app code, may have missing `$disconnect()` |
| Too many workers | (workers × jobs) exceeding limit | Reduce concurrent jobs per worker, or increase connection_limit |

### Symptom: Random disconnections

**Diagnosis:** Check logs for "FATAL: sorry, too many clients already"

**Causes:**
- Spike in concurrent users exceeding pool_timeout window
- Worker process not respecting pool limits

**Fixes:**
1. Increase connection_limit by 20%
2. Reduce pool_timeout (fail faster rather than queue) - set to 5-15s
3. Reduce MAX_CONCURRENT_JOBS_PER_WORKER in `src/lib/queue.ts`

### Symptom: "Deadlock detected" errors

**Root Cause:** Connection starvation causing transactions to timeout

**Fix:**
1. Increase connection_limit
2. Add `socket_timeout=30` to DATABASE_URL
3. Review slow queries (identify and index missing columns)

---

## Environment-Specific Configurations

### Development (.env.local)
```
# Safe for local testing, no impact on prod
DATABASE_URL=postgresql://postgres:password@localhost:5432/aegis_ai?connection_limit=10&pool_timeout=10&socket_timeout=30
```
- connection_limit: 10 (safe for single machine)
- pool_timeout: 10s (generous for debugging)

### Staging (.env.staging)
```
# Close to production, test scaling
DATABASE_URL=postgresql://user:pass@staging-db:5432/aegis_ai?connection_limit=25&pool_timeout=10&socket_timeout=30
```
- connection_limit: 25 (simulate prod load)
- pool_timeout: 10s (consistent with prod)

### Production (.env.production)
```
# Based on actual infrastructure
DATABASE_URL=postgresql://user:pass@prod-db:5432/aegis_ai?connection_limit=40&pool_timeout=10&socket_timeout=30
```
- connection_limit: 40 (calculated for expected load)
- pool_timeout: 10s (fail fast on timeout)
- socket_timeout: 30s (allow long queries)

---

## Prisma Schema Indexing

Connection pools are only effective if queries complete quickly. Ensure your schema has proper indexes:

```sql
-- Currently in schema.prisma:
-- ✅ User queries indexed (userId, email)
-- ✅ Chat queries indexed (userId, createdAt)
-- ⚠️ RAG queries might need optimization if retrieving large contexts
-- ⚠️ AuditLog queries might be slow (no index on action type)

-- Recommended additional indexes:
CREATE INDEX idx_chats_userid_createdat ON chats(user_id, created_at DESC);
CREATE INDEX idx_auditlog_action ON audit_logs(action) INCLUDE (created_at);
```

See `prisma/schema.prisma` for current indexes.

---

## Advanced: PgBouncer for Connection Pooling

For multi-instance deployments, PgBouncer (middleware connection pooler) highly recommended:

```ini
# pgbouncer.ini
[database]
aegis_ai = host=prod-db port=5432 dbname=aegis_ai

[pgbouncer]
pool_mode = transaction      ; transaction-level pooling (better connection reuse)
max_client_conn = 200        ; max app connections
default_pool_size = 25       ; pooled connections per database
reserve_pool_size = 5        ; buffer for spikes
```

This allows each app instance to connect to PgBouncer (instead of PostgreSQL directly), which multiplexes connections efficiently.

---

## Checklist for Production Deployment

- [ ] Calculate required connection_limit using formula above
- [ ] Add connection_limit, pool_timeout, socket_timeout to DATABASE_URL
- [ ] Test with staging database for 48+ hours
- [ ] Monitor `SELECT * FROM pg_stat_activity` for connection patterns
- [ ] Set up alerts for 80%+ connection utilization
- [ ] Document actual connection_limit used in deployment runbook
- [ ] Review and optimize slow queries (>100ms)
- [ ] For multi-instance: consider PgBouncer middleware
- [ ] Enable database query logging in production (track slow queries)

---

## References

- [Prisma Connection Management](https://www.prisma.io/docs/reference/api-reference/connection_url#connection-pool)
- [PostgreSQL pg_stat_activity](https://www.postgresql.org/docs/current/monitoring-stats.html)
- [PostgreSQL Connection Limits](https://www.postgresql.org/docs/current/runtime-config-connection.html)
- [PgBouncer Documentation](https://www.pgbouncer.org/)
