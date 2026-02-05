# DEPLOYMENT VERIFICATION CHECKLIST

## Pre-Deployment

### Environment Variables
- [ ] `DATABASE_URL` includes connection pool parameters
  - Example: `postgresql://user:pass@host/db?connectionLimit=20&idleTimeout=25000`
- [ ] `AUDIT_SIGNING_KEY` set (32+ chars for HMAC)
- [ ] `ALLOWED_ORIGINS` configured for production domains
- [ ] `ENCRYPTION_KEY_CIPHERTEXT` set in AWS KMS
- [ ] `OPENROUTER_API_KEY` valid and production-ready
- [ ] `REDIS_URL` pointing to production Redis
- [ ] `DATABASE_POOL_MIN=2, DATABASE_POOL_MAX=20` or adjusted for load
- [ ] `AUDIT_LOG_RETENTION_DAYS` set appropriately (default: 90)
- [ ] `SESSION_RETENTION_DAYS` set appropriately (default: 7)

### Database
- [ ] Run migrations: `npm run migrate:deploy`
- [ ] Verify migration succeeded without errors
- [ ] Soft delete fields added to Chat, Message, File models
- [ ] FeatureFlag table created
- [ ] All indexes created (especially on deletedAt fields)
- [ ] Connection pool configured in PostgreSQL

### Secret Management
- [ ] AWS KMS key accessible from deployment environment
- [ ] Encryption keys rotate properly
- [ ] All environment variables removed from code/git
- [ ] .env.local and .env files in .gitignore

## Deployment

### Build
```bash
npm run build
# Verify no TypeScript errors
# Verify no bundle errors
```

### Security Checks
- [ ] Run: `npm run lint` (ESLint)
- [ ] Check: Security headers in response
  - Strict-Transport-Security
  - X-Frame-Options: SAMEORIGIN
  - Content-Security-Policy present
  - X-Content-Type-Options: nosniff
- [ ] Verify JWT secrets are >32 characters
- [ ] Check bcrypt rounds = 14

### Worker Services
- [ ] Start worker: `npm run worker`
- [ ] Verify worker connects to Redis queue
- [ ] Check worker logs for environment validation errors
- [ ] Verify chat-queue created in Redis
- [ ] Test job processing (create chat, send message)

### API Health
- [ ] GET `/api/health` returns 200
  - Checks: Database, Redis, LanceDB, OpenAI API
- [ ] Authentication endpoints working:
  - POST `/api/auth/register` (rate limited: 10/hour)
  - POST `/api/auth/login` (rate limited: 20/hour)
  - POST `/api/auth/refresh` (token rotation)
- [ ] Chat endpoints working:
  - POST `/api/chat/create`
  - POST `/api/chat/stream` (SSE)
  - GET `/api/chat/list`
  - POST `/api/chat/delete`
- [ ] File endpoints working:
  - POST `/api/files/upload` (with magic bytes validation)
  - DELETE `/api/files/delete`
  - GET `/api/files/list`
- [ ] Admin endpoints protected:
  - GET `/api/admin/feature-flags` (admin only)
  - POST `/api/admin/feature-flags` (admin only)

## Post-Deployment

### Monitoring
- [ ] Application logs flowing to centralized logging
- [ ] Database slow query logging enabled
- [ ] Redis memory usage < 80%
- [ ] Worker job latency < 5s (p95)
- [ ] API response time < 1s (p95) for non-LLM calls

### Security
- [ ] No sensitive data in logs (check for PII redaction)
- [ ] CORS headers only allow production origins
- [ ] SameSite cookies set to Strict
- [ ] Rate limiting active on auth endpoints
- [ ] Audit logs created for all admin actions
- [ ] File uploads validated (extension + magic bytes)

### Compliance
- [ ] GDPR deletion endpoint functional (POST `/api/user/delete-account`)
- [ ] Audit logs retained for 90 days (check retention policy)
- [ ] Soft deletes working (deletedAt fields populated)
- [ ] Encryption keys rotatable via AWS KMS

### Performance
- [ ] Database query performance acceptable
  - Run: `EXPLAIN ANALYZE SELECT ...` on slow queries
  - Check indexes on userId, chatId, projectId, deletedAt
- [ ] Message pagination working (take: 50)
- [ ] Vector store queries < 2s
- [ ] File upload < 30s for 50MB files

### Feature Flags
- [ ] Feature flags system loading at startup
- [ ] Can enable/disable features via admin API
- [ ] Rollout percentages working for gradual rollouts

### Rollback Plan
- [ ] Previous version buildable and deployable
- [ ] Database migrations reversible (check prisma migrate history)
- [ ] Redis queue clearable if needed
- [ ] Session data preserved during rollback

## Incident Response

### If Database Migration Fails
```bash
# Check migration status
npx prisma migrate status

# Rollback to previous migration
npx prisma migrate resolve --rolled-back <migration_name>

# Or redeploy previous version
```

### If Authentication Broken
- [ ] Check JWT_ACCESS_SECRET and JWT_REFRESH_SECRET
- [ ] Check token signing key hasn't changed
- [ ] Clear browser/app cookies and re-login
- [ ] Check user.tokenVersion not reset unexpectedly

### If Vector Store Unavailable
- [ ] RAG features gracefully degrade
- [ ] Chat still works without RAG context
- [ ] Check LanceDB connection string
- [ ] Verify data/lancedb directory exists

### If Worker Stopped
- [ ] Check Redis connection
- [ ] Check database connection pool
- [ ] Restart: `npm run worker`
- [ ] Monitor job queue for stuck jobs

## Success Criteria

✅ All health checks pass
✅ Can create and complete chat conversations
✅ File uploads with validation working
✅ Audit trails created for all admin actions
✅ Rate limiting prevents brute force attempts
✅ Soft deletes preserve data integrity
✅ Feature flags can be toggled without downtime
✅ No PII appearing in logs
✅ All critical security fixes in place

## Rollback Threshold

Rollback immediately if:
- ❌ Authentication completely broken
- ❌ Database inaccessible
- ❌ Worker job queue stuck
- ❌ Data corruption detected
- ❌ Security vulnerability exploited

## Sign-Off

- [ ] QA tested and approved
- [ ] Security review completed
- [ ] Operations team aware of deployment
- [ ] Monitoring alerts configured
- [ ] Runbook available for incidents
