# Redis Graceful Degradation Guide

## Overview

Aegis AI implements graceful degradation when Redis becomes unavailable. Instead of complete failure, the application switches to **PostgreSQL-backed fallbacks** for critical functions.

### Fallback Strategies

| Feature | Primary (Redis) | Fallback (When Redis Down) |
|---------|-----------------|----------------------------|
| **Job Queues** | BullMQ (Redis-backed) | PostgreSQL `fallback_queue` table |
| **Rate Limiting** | Redis counters | In-memory per-instance LRU cache |
| **Caching** | Redis cache | In-memory cache with TTL |
| **Session Tracking** | Redis store | PostgreSQL sessions table |

---

## Architecture

### Files

```
apps/web/src/lib/
├── redis-fallback.ts         # In-memory cache + rate limiter + health tracking
├── fallback-queue.ts          # PostgreSQL-based job queue
├── queue-operations.ts        # Wrapper functions with automatic fallback
└── queue.ts                   # BullMQ setup with health monitoring
```

### Database Schema

```sql
CREATE TABLE fallback_queue (
  id VARCHAR PRIMARY KEY,
  queue_name VARCHAR(100) NOT NULL,
  data JSONB NOT NULL,
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  status VARCHAR(50) DEFAULT 'pending',
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP
);

CREATE INDEX idx_fallback_queue_lookup 
  ON fallback_queue(queue_name, status, created_at);
```

---

## Usage

### 1. Adding Jobs with Fallback

```typescript
import { addJobWithFallback } from '@/lib/queue-operations';
import { chatQueue } from '@/lib/queue';

// Automatically falls back to PostgreSQL if Redis unavailable
const jobId = await addJobWithFallback(
  chatQueue,
  'job-123',
  { userId: 'user-456', message: 'Hello' },
  { attempts: 3 }
);
```

### 2. Rate Limiting with Fallback

```typescript
import { withRedisFallback, memoryRateLimiter } from '@/lib/redis-fallback';

// Try Redis, fall back to in-memory
const result = await withRedisFallback(
  async () => {
    // Redis rate limit check
    const count = await redis.incr(`ratelimit:${userId}`);
    return { allowed: count <= 100 };
  },
  async () => {
    // In-memory fallback
    return await memoryRateLimiter.check(userId);
  },
  'rate-limit-check'
);

if (!result.allowed) {
  return res.status(429).json({ error: 'Rate limit exceeded' });
}
```

### 3. Caching with Fallback

```typescript
import { withRedisFallback, memoryCache } from '@/lib/redis-fallback';

const userData = await withRedisFallback(
  async () => {
    // Try Redis cache
    const cached = await redis.get(`user:${userId}`);
    return cached ? JSON.parse(cached) : null;
  },
  () => {
    // Fall back to in-memory cache
    return memoryCache.get(`user:${userId}`);
  },
  'user-cache-lookup'
);

if (!userData) {
  // Cache miss - fetch from database
  userData = await prisma.user.findUnique({ where: { id: userId } });
  
  // Store in cache
  memoryCache.set(`user:${userId}`, userData, 300); // 5 min TTL
}
```

### 4. Queue Depth Monitoring

```typescript
import { getQueueDepthWithFallback } from '@/lib/queue-operations';
import { chatQueue } from '@/lib/queue';

const depth = await getQueueDepthWithFallback(chatQueue);

if (depth > 500) {
  // Backpressure: reject new requests
  return res.status(503).json({ error: 'System overloaded' });
}
```

---

## Health Monitoring

### Health Check Response

When Redis is unavailable, health check returns `degraded` status:

```json
{
  "status": "degraded",
  "checks": {
    "redis": {
      "status": "degraded",
      "message": "Redis unavailable - using PostgreSQL fallback",
      "failureCount": 3,
      "lastFailure": "2025-01-08T10:30:00Z"
    }
  }
}
```

### Redis Health Tracker

```typescript
import { redisHealthTracker, isRedisHealthy } from '@/lib/redis-fallback';

// Check Redis health
if (!isRedisHealthy()) {
  logger.warn('Redis degraded, using fallback mechanisms');
}

// Get detailed health info
const health = redisHealthTracker.getHealth();
console.log(health);
// {
//   isHealthy: false,
//   failureCount: 5,
//   lastFailure: "2025-01-08T10:30:00Z"
// }
```

---

## Worker Integration

### Polling Fallback Queue

Workers should check both Redis (BullMQ) and PostgreSQL fallback:

```typescript
import { Worker } from 'bullmq';
import { getNextFallbackJob, completeFallbackJob, failFallbackJob } from '@/lib/fallback-queue';
import { processChatJob } from './processor';

// BullMQ worker (primary)
const worker = new Worker('chat-queue', processChatJob, {
  connection: redisConnection,
});

// Fallback poller (runs when Redis unavailable)
async function pollFallbackQueue() {
  if (isRedisHealthy()) return; // Skip if Redis working

  const job = await getNextFallbackJob('chat-queue');
  if (!job) return;

  try {
    await processChatJob(job);
    await completeFallbackJob(job.id);
  } catch (error) {
    await failFallbackJob(job.id, (error as Error).message);
  }
}

// Poll every 5 seconds when Redis down
setInterval(pollFallbackQueue, 5000);
```

### Automatic Migration on Recovery

When Redis recovers, migrate pending jobs back:

```typescript
import { migrateFallbackJobsToRedis } from '@/lib/fallback-queue';
import { chatQueue } from '@/lib/queue';

// Triggered on Redis reconnect
redisConnection.on('ready', async () => {
  logger.info('Redis recovered - migrating fallback jobs');
  
  const migrated = await migrateFallbackJobsToRedis('chat-queue', chatQueue);
  logger.info(`Migrated ${migrated} jobs back to Redis`);
});
```

---

## Performance Considerations

### In-Memory Fallback Limits

**Memory Cache**:
- Max size: 5,000 items
- Eviction: LRU (oldest first)
- TTL: Per-item expiry

**Rate Limiter**:
- Per-instance tracking (not cluster-wide)
- Less accurate than Redis
- Max ~10,000 tracked users per instance

**Trade-off**: In-memory fallbacks lose data on restart, but prevent complete outage.

### PostgreSQL Fallback Queue

**Performance**:
- ~100-500 jobs/sec (vs Redis 10K+/sec)
- Uses `FOR UPDATE SKIP LOCKED` for concurrency
- Indexed lookup by `(queue_name, status, created_at)`

**Cleanup**: Run periodic cleanup to prevent table bloat:

```typescript
import { cleanupFallbackQueue } from '@/lib/fallback-queue';

// Delete completed/failed jobs older than 24 hours
setInterval(async () => {
  const deleted = await cleanupFallbackQueue(24);
  logger.info(`Cleaned up ${deleted} old fallback jobs`);
}, 3600000); // Every hour
```

---

## Migration Steps

### 1. Apply Database Migration

```bash
# Add FallbackQueue model to Prisma schema (already done)
npm run migrate
```

### 2. Update API Routes

Replace direct queue usage with fallback wrappers:

```diff
- await chatQueue.add('job-123', data, { jobId: 'job-123' });
+ await addJobWithFallback(chatQueue, 'job-123', data);
```

### 3. Update Workers

Add fallback queue polling:

```typescript
// In src/workers/chat.worker.ts
import { pollFallbackQueue } from './fallback-poller';

// Start polling in parallel with BullMQ worker
pollFallbackQueue('chat-queue');
```

### 4. Test Failure Scenarios

```bash
# Stop Redis
docker stop aegis-redis

# Verify API continues to work (degraded mode)
curl http://localhost:3000/api/health
# Response: { "status": "degraded", ... }

# Add job (should use PostgreSQL)
curl -X POST http://localhost:3000/api/chat/stream \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"message": "Test"}'

# Check fallback queue
psql -d aegis -c "SELECT * FROM fallback_queue;"

# Restart Redis
docker start aegis-redis

# Jobs should migrate back automatically
```

---

## Monitoring & Alerts

### CloudWatch Metrics

```typescript
// Published automatically by redisHealthTracker
RedisHealthy = 0 | 1  // 0 = down, 1 = up
FallbackQueueDepth = <number>
```

### Alarms

```hcl
# Terraform alarm example
resource "aws_cloudwatch_metric_alarm" "redis_unhealthy" {
  alarm_name          = "aegis-redis-unhealthy"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "RedisHealthy"
  namespace           = "Aegis/System"
  period              = 300
  statistic           = "Average"
  threshold           = 1
  alarm_description   = "Redis has been unavailable for 10 minutes"
  alarm_actions       = [aws_sns_topic.alerts.arn]
}
```

### Logs

```
[WARN] Redis connection failed { failureCount: 1, lastFailure: "..." }
[INFO] Redis connection recovered
[INFO] Job added to PostgreSQL fallback queue { queueName: "chat-queue", jobId: "..." }
[WARN] Redis queue add failed, using PostgreSQL fallback
[INFO] Migrated 42 jobs back to Redis
```

---

## Limitations

### Fallback Scope

| Feature | Fallback Supported | Notes |
|---------|-------------------|-------|
| Job Queues | ✅ Full | PostgreSQL fallback |
| Rate Limiting | ⚠️ Partial | Per-instance only (not cluster-wide) |
| Caching | ⚠️ Partial | In-memory (lost on restart) |
| Session Store | ✅ Full | Already PostgreSQL-backed |
| Real-time Features | ❌ No | Pub/sub requires Redis |

### Performance Impact

When using fallbacks:
- **Job processing**: 5-10x slower (but functional)
- **Rate limiting**: Less accurate (may allow burst traffic)
- **Caching**: Cache misses more frequent
- **Memory usage**: +50-100MB per instance (in-memory caches)

---

## Best Practices

1. **Monitor Redis availability**: Set alerts for Redis health
2. **Test fallback paths**: Regularly simulate Redis outages
3. **Cleanup fallback queue**: Prevent PostgreSQL table bloat
4. **Document degraded behavior**: Users should know features are limited
5. **Auto-migrate on recovery**: Move jobs back to Redis when available

---

## Related Documentation

- [Queue Architecture](./QUEUE_ARCHITECTURE.md)
- [Health Check API](./API_REFERENCE.md#health)
- [CloudWatch Metrics](./CLOUDWATCH_METRICS.md)
- [Worker Deployment](../infra/aws/terraform/README.md#workers)
