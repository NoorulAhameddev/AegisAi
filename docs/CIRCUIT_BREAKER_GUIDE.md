# Circuit Breaker Implementation Guide

## Overview

Aegis AI uses production-grade circuit breakers (via [opossum](https://nodeshift.dev/opossum/)) to prevent cascading failures when external services (OpenAI, Redis, Moderation API) are degraded.

### What is a Circuit Breaker?

A circuit breaker monitors failures and **prevents requests to a failing service**, allowing it time to recover while providing fallback responses to users.

**States:**
- **CLOSED** (Normal): All requests go through
- **OPEN** (Failing): Requests fail fast (<1ms), fallback used
- **HALF_OPEN** (Testing): Limited requests to test recovery

---

## Architecture

### Files

```
apps/web/src/
├── lib/
│   └── circuit-breaker.ts          # Circuit breaker factory + global instances
├── services/ai/
│   └── openai.ts                   # OpenAI client with circuit breaker
└── app/api/
    ├── health/route.ts             # Health check includes circuit state
    └── monitoring/
        └── circuit-breakers/route.ts  # Detailed monitoring endpoint
```

### Circuit Breakers

| Name | Protected Service | Timeout | Error Threshold | Reset Timeout | Fallback |
|------|-------------------|---------|-----------------|---------------|----------|
| `openaiCircuitBreaker` | OpenAI/OpenRouter API | 30s | 50% | 60s | Degraded message |
| `moderationCircuitBreaker` | OpenAI Moderation | 10s | 60% | 30s | Bypass check (⚠️) |
| `ragCircuitBreaker` | RAG embeddings/search | 5s | 50% | 60s | Empty context |

---

## Usage

### Wrapping External Calls

```typescript
import { openaiCircuitBreaker } from '@/lib/circuit-breaker';

// Wrap async function
const result = await openaiCircuitBreaker.fire(async () => {
  return await externalAPI.call();
});
```

### Creating New Circuit Breakers

```typescript
import { createCircuitBreaker } from '@/lib/circuit-breaker';

export const myServiceBreaker = createCircuitBreaker({
  name: 'MyService',
  timeout: 10000, // 10s
  errorThresholdPercentage: 50, // Open at 50% error rate
  resetTimeout: 30000, // Try recovery after 30s
  volumeThreshold: 10, // Need 10 requests before threshold applies
  fallback: () => {
    return { error: 'Service temporarily unavailable' };
  }
});

// Use it
const result = await myServiceBreaker.fire(() => myAPI.call());
```

---

## Configuration

### Thresholds

- **Error Threshold Percentage**: Circuit opens when error rate exceeds this % in rolling window
- **Volume Threshold**: Minimum requests required before threshold is checked (prevents opening on low traffic)
- **Reset Timeout**: Time circuit stays OPEN before testing HALF_OPEN
- **Timeout**: Max time for individual request (exceeding this counts as failure)

### Tuning Guidelines

| Service Type | Timeout | Error % | Reset | Reasoning |
|--------------|---------|---------|-------|-----------|
| Critical AI (OpenAI) | 30s | 50% | 60s | Balance availability vs. quality |
| Non-critical API | 10s | 60% | 30s | More lenient, faster recovery |
| Internal service | 5s | 40% | 15s | Strict, quick feedback loop |

---

## Monitoring

### Health Check

Circuit breaker state included in `/api/health`:

```json
{
  "status": "healthy|degraded|unhealthy",
  "checks": {
    "circuitBreakers": {
      "openai": {
        "state": "CLOSED",
        "status": "ok",
        "stats": {
          "successes": 1250,
          "failures": 3,
          "rejects": 0,
          "latencyMean": 1823
        }
      }
    }
  }
}
```

**Status Mapping:**
- `healthy`: All circuits CLOSED, core systems OK
- `degraded`: Circuits OPEN but service functional (fallbacks active)
- `unhealthy`: Core systems (DB/Redis) down

### Detailed Monitoring

Authenticated endpoint: `GET /api/monitoring/circuit-breakers`

```json
{
  "timestamp": "2025-01-08T10:30:00Z",
  "circuitBreakers": {
    "openai": {
      "state": "OPEN",
      "fires": 1500,
      "successes": 1200,
      "failures": 300,
      "timeouts": 50,
      "fallbacks": 250,
      "rejects": 200,
      "latencyMean": 2341,
      "percentiles": {
        "p50": 1800,
        "p90": 3500,
        "p99": 5200
      }
    }
  },
  "summary": {
    "totalFires": 2500,
    "totalSuccesses": 2100,
    "totalFailures": 400,
    "totalRejects": 200,
    "openCircuits": 1
  }
}
```

### CloudWatch Metrics

Circuit breakers publish to CloudWatch (EMF format):

```typescript
Namespace: Aegis/CircuitBreakers
Dimensions: [Service]

Metrics:
- CircuitState: 0 (CLOSED), 0.5 (HALF_OPEN), 1 (OPEN)
- CircuitSuccess: Count of successful calls
- CircuitFailure: Count of failed calls (includes errorType dimension)
- CircuitTimeout: Count of timeouts
- CircuitFallback: Count of fallback invocations
- CircuitLatency: Latency in milliseconds
```

**CloudWatch Dashboard Query:**
```sql
fields @timestamp, service, state, latencyMs
| filter namespace = "Aegis/CircuitBreakers"
| stats count() as calls, avg(latencyMs) as avgLatency by service, state
```

---

## Fallback Strategies

### OpenAI Circuit Breaker

**Fallback**: Return degraded message

```typescript
fallback: () => ({
  choices: [{
    message: {
      role: 'assistant',
      content: 'I apologize, but I am experiencing technical difficulties...'
    },
    finish_reason: 'stop'
  }]
})
```

**User Experience**: Clear error message instead of timeout

### Moderation Circuit Breaker

**Fallback**: Bypass check (⚠️ security risk)

```typescript
fallback: () => ({
  results: [{ flagged: false, categories: {}, category_scores: {} }]
})
```

**Rationale**: Allows chat to continue when moderation API down (logged as warning)

### RAG Circuit Breaker

**Fallback**: Empty context (chat without retrieval)

```typescript
fallback: () => ({ results: [], context: '' })
```

**User Experience**: Chat continues without knowledge base augmentation

---

## Testing

### Simulating Circuit OPEN

```typescript
// Force failures to open circuit
for (let i = 0; i < 10; i++) {
  try {
    await openaiCircuitBreaker.fire(() => 
      Promise.reject(new Error('Simulated failure'))
    );
  } catch {}
}

// Check state
const stats = getCircuitStats(openaiCircuitBreaker);
console.log(stats.state); // Should be 'OPEN'
```

### Testing Fallback

```typescript
// When circuit OPEN, fallback is used
const result = await openaiCircuitBreaker.fire(() => 
  Promise.reject(new Error('Service down'))
);

console.log(result.choices[0].message.content); 
// "I apologize, but I am experiencing technical difficulties..."
```

### Testing Recovery

```typescript
// Wait for resetTimeout (60s for OpenAI)
await new Promise(r => setTimeout(r, 60000));

// Next call transitions to HALF_OPEN
const result = await openaiCircuitBreaker.fire(() => 
  Promise.resolve({ success: true })
);

// After 2 successes (successThreshold), circuit CLOSES
```

---

## Operations

### Manual Circuit Reset

```typescript
// Emergency reset (use with caution)
openaiCircuitBreaker.close();

// Or via monitoring endpoint (future feature)
POST /api/admin/circuit-breakers/openai/reset
```

### Troubleshooting

| Symptom | Cause | Solution |
|---------|-------|----------|
| Circuit constantly OPEN | External service degraded | Check service status, adjust thresholds |
| Circuit flapping OPEN/CLOSED | Threshold too sensitive | Increase `volumeThreshold` or `errorThresholdPercentage` |
| Requests timing out | Timeout too aggressive | Increase `timeout` value |
| Users seeing degraded messages | Circuit OPEN | Check CloudWatch logs for root cause |

### Logs

Circuit breaker events are logged:

```
[WARN] Circuit breaker OPEN: OpenAI
[INFO] Circuit breaker HALF_OPEN: OpenAI
[INFO] Circuit breaker CLOSED: OpenAI
[ERROR] Circuit breaker failure: OpenAI - Error: Request timeout
[INFO] Circuit breaker using fallback: OpenAI
```

---

## Integration with Workers

Circuit breakers are **per-process** (not shared across workers by default).

### Future: Redis-Based Circuit State

For cross-worker coordination:

```typescript
import Redis from 'ioredis';

export function createDistributedCircuitBreaker(config: CircuitBreakerConfig) {
  const redis = new Redis(env.REDIS_URL);
  const breaker = createCircuitBreaker(config);

  // Sync state to Redis
  breaker.on('open', () => redis.set(`circuit:${config.name}`, 'OPEN', 'EX', 60));
  breaker.on('close', () => redis.del(`circuit:${config.name}`));

  // Check Redis before firing
  return {
    async fire<T>(fn: () => Promise<T>): Promise<T> {
      const state = await redis.get(`circuit:${config.name}`);
      if (state === 'OPEN') {
        throw new Error(`Circuit ${config.name} is OPEN across cluster`);
      }
      return breaker.fire(fn);
    }
  };
}
```

---

## Best Practices

1. **Always provide fallbacks**: Circuit breakers should degrade gracefully, not crash
2. **Monitor metrics**: Set CloudWatch alarms for `CircuitState = 1` (OPEN)
3. **Tune thresholds per environment**: 
   - Dev: Lenient (avoid false positives)
   - Prod: Strict (protect user experience)
4. **Test failure scenarios**: Simulate service outages in staging
5. **Document fallback behavior**: Users should understand degraded mode
6. **Log circuit events**: Include context (error type, latency) for debugging

---

## Related Documentation

- [CloudWatch Metrics Guide](./CLOUDWATCH_METRICS.md)
- [Resilience Architecture](../docs/RESILIENCE.md)
- [Health Check API](../docs/API_REFERENCE.md#health)
- [opossum Documentation](https://nodeshift.dev/opossum/)
