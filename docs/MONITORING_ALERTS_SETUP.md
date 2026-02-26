# Monitoring & Alerting Setup Guide

**Status**: Infrastructure Ready, Alerts Not Configured  
**Priority**: 🟡 Important (Next Milestone)  
**Impact**: Production incidents may go unnoticed without active monitoring

---

## Current State

### ✅ Implemented

- **CloudWatch Metrics**: AWS EMF integration (`src/lib/cloudwatch-metrics.ts`)
  - Queue depth tracking
  - Request latency
  - Error rates
  - Custom dimensions (environment, region)
- **Sentry Error Tracking**: Full integration (`instrumentation.ts`, `next.config.js`)
  - Automatic error capture
  - Performance monitoring ready
  - Source maps upload configured
- **Structured Logging**: Comprehensive logging system (`src/lib/logger.ts`)
  - `logger.auth()` - Authentication events
  - `logger.db()` - Database operations
  - `logger.security()` - Security incidents
  - `logger.worker()` - Background job tracking
  - `logger.error()` - Error tracking with context

- **Database Pool Monitoring**: Connection pool tracking (`src/lib/db-pool-monitor.ts`)
- **Request Tracing**: Distributed tracing ready (`src/lib/request-tracer.ts`)
- **Circuit Breakers**: Resilience patterns implemented (`src/lib/circuit-breaker.ts`)

### ❌ Missing

- **Alert Rules**: No CloudWatch alarms configured
- **Dashboard**: No visualization of metrics
- **On-Call Configuration**: No PagerDuty/Opsgenie integration
- **Runbooks**: No incident response procedures

---

## Quick Setup: CloudWatch Alarms

### 1. High Priority Alerts (P1 - Immediate Action)

**Worker Queue Depth Critical**

- **Metric**: `QueueDepth`
- **Threshold**: > 1000 messages for 5 minutes
- **Action**: Auto-scale workers, page on-call

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name aegis-queue-depth-critical \
  --metric-name QueueDepth \
  --namespace AegisAI \
  --statistic Average \
  --period 300 \
  --threshold 1000 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT_ID:aegis-critical
```

**Error Rate Spike**

- **Metric**: `ErrorCount`
- **Threshold**: > 50 errors/minute
- **Action**: Investigate immediately

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name aegis-error-rate-critical \
  --metric-name ErrorCount \
  --namespace AegisAI \
  --statistic Sum \
  --period 60 \
  --threshold 50 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2
```

**Database Connection Pool Exhaustion**

- **Metric**: `DatabaseConnectionPoolSize`
- **Threshold**: > 90% utilization for 3 minutes
- **Action**: Scale database or increase pool size

**Redis Connection Failures**

- **Metric**: `RedisConnectionErrors`
- **Threshold**: > 10 failures in 5 minutes
- **Action**: Check Redis health, activate fallback queue

### 2. Medium Priority Alerts (P2 - Business Hours)

**Worker Processing Time**

- **Metric**: `WorkerProcessingTime`
- **Threshold**: P95 > 30 seconds
- **Action**: Investigate slow jobs

**API Response Time**

- **Metric**: `APILatency`
- **Threshold**: P99 > 5 seconds
- **Action**: Profile slow endpoints

**Token Budget Exhaustion Rate**

- **Metric**: `TokenBudgetExhausted`
- **Threshold**: > 100 users/hour hitting limits
- **Action**: Review tier limits or investigate abuse

### 3. Low Priority Alerts (P3 - Daily Review)

**Soft Delete Growth**

- **Metric**: `SoftDeletedRecordsCount`
- **Threshold**: > 10,000 records
- **Action**: Schedule cleanup job

**Cache Hit Rate**

- **Metric**: `CacheHitRate`
- **Threshold**: < 60%
- **Action**: Review caching strategy

---

## Sentry Configuration

### Current Setup

```javascript
// apps/web/instrumentation.ts
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0, // ⚠️ PRODUCTION: Reduce to 0.1 for cost control
  profilesSampleRate: 1.0, // ⚠️ PRODUCTION: Reduce to 0.1
});
```

### Action Required

1. **Create Sentry Project**: https://sentry.io/organizations/YOUR_ORG/projects/
2. **Set Environment Variables**:
   ```bash
   SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
   SENTRY_ORG=your-org-slug
   SENTRY_PROJECT=aegis-ai
   SENTRY_AUTH_TOKEN=your_auth_token  # For CI/CD source maps
   ```
3. **Reduce Sampling Rates** (cost optimization):
   ```javascript
   tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
   profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
   ```
4. **Configure Alert Rules** in Sentry dashboard:
   - Error rate > 10/minute → Slack notification
   - New error type → Email notification
   - Performance regression > 2x baseline → Slack notification

---

## Dashboard Creation

### Recommended CloudWatch Dashboard Widgets

**1. System Health Overview**

- Queue depth (line chart, 1-hour window)
- Error count (bar chart, hourly aggregation)
- API latency P50/P95/P99 (line chart)
- Active worker count

**2. Database Metrics**

- Connection pool utilization %
- Query duration P95
- Deadlock count
- Replication lag (if using read replicas)

**3. Security Metrics**

- Authentication failures (rate limiting triggers)
- Jailbreak attempt blocks
- Moderation flags
- Unusual pattern detections

**4. Business Metrics**

- Active users (hourly)
- Messages processed
- Token consumption by tier
- RAG queries vs. direct queries

### Quick Setup (Terraform Example)

```hcl
resource "aws_cloudwatch_dashboard" "aegis_ai" {
  dashboard_name = "AegisAI-Production"

  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric"
        properties = {
          metrics = [
            ["AegisAI", "QueueDepth", { stat = "Average" }]
          ]
          period = 300
          stat = "Average"
          region = "us-east-1"
          title = "Worker Queue Depth"
        }
      }
    ]
  })
}
```

---

## On-Call Setup

### Integration Points

1. **SNS Topics** → PagerDuty/Opsgenie
   - `aegis-critical` - P1 incidents (page immediately)
   - `aegis-warning` - P2 incidents (business hours)
   - `aegis-info` - P3 incidents (daily digest)

2. **Slack Notifications**
   - CloudWatch Alarms → SNS → AWS Chatbot → Slack
   - Sentry Alerts → Direct Slack integration

3. **Runbook Links**
   - Include in alarm descriptions
   - Link to wiki/Confluence for incident response

---

## Incident Response Runbooks

### Queue Depth Critical

**Symptoms**: Queue depth > 1000, messages backing up  
**Immediate Actions**:

1. Check worker health: `docker ps | grep aegis-worker`
2. Scale workers: `docker-compose up -d --scale worker=5`
3. Check Redis: `redis-cli ping`
4. Review DLQ: `redis-cli LLEN dlq-queue`

**Root Cause Investigation**:

- Check worker logs: `docker logs aegis-worker-1`
- Monitor job processing times
- Look for stuck jobs: `GET /api/chat/status/{jobId}`

### High Error Rate

**Symptoms**: Error rate > 50/minute  
**Immediate Actions**:

1. Check Sentry for error type trends
2. Review recent deployments (rollback if needed)
3. Check external dependencies (OpenRouter API, PostgreSQL)
4. Enable circuit breakers if third-party service is down

### Database Connection Exhaustion

**Symptoms**: `Connection pool exhausted` errors  
**Immediate Actions**:

1. Check active connections: `SELECT count(*) FROM pg_stat_activity;`
2. Kill long-running queries: `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle in transaction';`
3. Increase pool size temporarily (emergency)
4. Review slow queries: `SELECT query FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;`

---

## Cost Optimization

### Logging Costs

- **CloudWatch Logs**: $0.50/GB ingested, $0.03/GB stored
- **Recommendation**: Set 7-day retention for DEBUG logs, 30-day for ERROR logs
- **Filter Pattern**: Only send ERROR/WARN to CloudWatch, keep INFO/DEBUG local

### Metrics Costs

- **CloudWatch Custom Metrics**: $0.30/metric/month (first 10k)
- **Recommendation**: Publish aggregated metrics (hourly rollups) vs. per-request

### Sentry Costs

- **Free Tier**: 5k errors/month, 10k transactions/month
- **Growth Plan**: $26/month for 50k errors
- **Optimization**: Sample rates (10% for traces, 100% for errors)

---

## Next Steps (Priority Order)

1. **Week 1** (Critical):
   - [ ] Set up Sentry project and configure DSN
   - [ ] Create CloudWatch alarms for queue depth and error rate
   - [ ] Configure Slack webhook for critical alerts

2. **Week 2** (Important):
   - [ ] Build CloudWatch dashboard (4-6 key widgets)
   - [ ] Document runbooks for top 3 incident types
   - [ ] Set up on-call rotation (PagerDuty/Opsgenie)

3. **Week 3** (Nice-to-Have):
   - [ ] Add distributed tracing (OpenTelemetry)
   - [ ] Create business metrics dashboard
   - [ ] Set up log aggregation (CloudWatch Insights queries)

4. **Week 4** (Polish):
   - [ ] Performance profiling integration
   - [ ] Cost optimization for logging/metrics
   - [ ] Chaos engineering tests (kill worker, simulate Redis outage)

---

## Health Check Endpoint

**Location**: `apps/web/src/app/api/health/route.ts`

**Usage**:

```bash
curl https://yourdomain.com/api/health
```

**Expected Response**:

```json
{
  "status": "healthy",
  "timestamp": "2026-02-18T12:34:56.789Z",
  "services": {
    "database": "up",
    "redis": "up",
    "workers": "running"
  }
}
```

**Monitoring Integration**:

- UptimeRobot: Ping every 5 minutes
- AWS Route 53 Health Check: Multi-region monitoring
- Internal: Worker cron job validates endpoint every minute

---

## Summary

**Status**: Infrastructure is production-ready, but alerts are not actively monitored.

**Risk Level**: Medium - Silent failures possible without active alerting.

**Effort Required**: 2-3 days to set up comprehensive monitoring.

**Business Impact**: Without monitoring, production incidents increase MTTR (Mean Time To Recovery) from minutes to hours.

**Recommendation**: Prioritize Week 1 tasks before scaling to production traffic.
