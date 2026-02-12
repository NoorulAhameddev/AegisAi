# 🔄 Backup & Recovery Guide

**Purpose:** Ensure data integrity and enable disaster recovery for Aegis AI  
**Last Updated:** February 10, 2026

---

## 📋 Backup Strategy Overview

Aegis AI uses a **3-tier backup approach** for high availability:

| Layer | Data | Frequency | Retention | RPO | RTO |
|-------|------|-----------|-----------|-----|-----|
| **Primary** | PostgreSQL | Real-time | Live | 0 min | 0 min |
| **Automated** | PostgreSQL + LanceDB | Daily | 30 days | 24 hrs | 1 hour |
| **Archive** | Full export | Weekly | 1+ year | 7 days | 4 hours |

**Definitions:**
- **RPO** (Recovery Point Objective): Max data loss acceptable
- **RTO** (Recovery Time Objective): Max downtime acceptable

---

## 🔐 PostgreSQL Backup

### Automated Daily Backups (Recommended)

#### Option 1: AWS RDS Automated Backups
If running on AWS RDS (recommended for production):

```bash
# RDS automatically provides:
# - Daily automated backups (7-35 day retention)
# - Point-in-time restore (within backup window)
# - No manual configuration needed

# Manual backup:
aws rds create-db-snapshot \
  --db-instance-identifier aegis-ai-prod \
  --db-snapshot-identifier aegis-ai-backup-$(date +%Y%m%d)

# Restore from snapshot:
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier aegis-ai-restore \
  --db-snapshot-identifier aegis-ai-backup-20260210
```

#### Option 2: Docker Compose (Local Dev)

Add automated backup service to `docker-compose.yml`:

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    environment:
      POSTGRES_PASSWORD: ${DATABASE_PASSWORD}

  postgres-backup:
    image: postgres:16-alpine
    depends_on:
      - postgres
    volumes:
      - ./backups:/backups
    environment:
      PGPASSWORD: ${DATABASE_PASSWORD}
    command: |
      sh -c 'while true; do
        pg_dump -h postgres -U postgres aegis_db | 
        gzip > /backups/db-$(date +\%Y\%m\%d-\%H\%M\%S).sql.gz
        find /backups -name "db-*.sql.gz" -mtime +30 -delete
        sleep 86400
      done'
    restart: always

volumes:
  postgres_data:
```

#### Option 3: Manual pg_dump Script

```bash
#!/bin/bash
# scripts/backup-database.sh

BACKUP_DIR="./backups/$(date +%Y%m%d)"
mkdir -p $BACKUP_DIR

# Full database backup
pg_dump $DATABASE_URL | gzip > "$BACKUP_DIR/full-backup-$(date +%H%M%S).sql.gz"

# Compressed size
du -h "$BACKUP_DIR"

# Cleanup old backups (keep 30 days)
find ./backups -type d -mtime +30 -exec rm -rf {} \;

echo "✅ Backup created: $BACKUP_DIR"
```

**Run as cron job (Linux/Mac):**
```bash
# Every day at 2 AM
0 2 * * * /app/scripts/backup-database.sh
```

**Run as scheduled task (Windows):**
```powershell
# Task Scheduler → Create Basic Task
# Trigger: Daily at 2:00 AM
# Action: Run script: C:\Aegis-AI\scripts\backup-database.ps1
```

---

## 📦 Vector Database Backup (LanceDB)

### Location
LanceDB is stored at `data/lancedb/` - this is critical data.

### Backup Strategy

```bash
#!/bin/bash
# scripts/backup-lancedb.sh

BACKUP_DIR="./backups/lancedb-$(date +%Y%m%d-%H%M%S)"

# Copy LanceDB directory
cp -r data/lancedb "$BACKUP_DIR"

# Compress
tar -czf "${BACKUP_DIR}.tar.gz" "$BACKUP_DIR"
rm -rf "$BACKUP_DIR"

# Verify backup
tar -tzf "${BACKUP_DIR}.tar.gz" > /dev/null && echo "✅ LanceDB backup verified"

# Cleanup old backups (keep 14 days of vector store)
find ./backups -name "lancedb-*.tar.gz" -mtime +14 -delete
```

**Schedule:** Daily, 15 minutes after PostgreSQL backup

---

## 💾 Full System Backup (Production)

### Backup All Data
```bash
#!/bin/bash
# scripts/full-system-backup.sh

BACKUP_DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_ROOT="/mnt/backup/aegis-ai/$BACKUP_DATE"
mkdir -p "$BACKUP_ROOT"

echo "📦 Starting full system backup..."

# 1. Database
echo "1️⃣ Backing up PostgreSQL..."
pg_dump $DATABASE_URL | gzip > "$BACKUP_ROOT/database.sql.gz"

# 2. Vector store
echo "2️⃣ Backing up LanceDB..."
tar -czf "$BACKUP_ROOT/lancedb.tar.gz" data/lancedb/

# 3. Uploaded files
echo "3️⃣ Backing up user files..."
tar -czf "$BACKUP_ROOT/uploads.tar.gz" uploads/

# 4. Configuration (non-sensitive)
echo "4️⃣ Backing up configuration..."
cp .env.local "$BACKUP_ROOT/.env.local.encrypted"

# 5. Create manifest
cat > "$BACKUP_ROOT/MANIFEST.json" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "version": "1.0",
  "components": {
    "database": "database.sql.gz",
    "vectorstore": "lancedb.tar.gz",
    "files": "uploads.tar.gz",
    "config": ".env.local.encrypted"
  },
  "size": "$(du -sh $BACKUP_ROOT | cut -f1)"
}
EOF

# 6. Upload to cloud (S3)
echo "☁️ Uploading to S3..."
aws s3 sync "$BACKUP_ROOT" "s3://aegis-ai-backups/$BACKUP_DATE/"

# 7. Verify
echo "✅ Backup complete: $BACKUP_ROOT"
echo "📊 Total size: $(du -sh $BACKUP_ROOT | cut -f1)"
```

**Retention Policy:**
- Daily backups: 30 days (1 month)
- Weekly backups: 90 days (3 months)  
- Monthly backups: 1 year
- Compliance backups: 7 years (if needed)

---

## 🔄 Recovery Procedures

### Scenario 1: Database Corruption (RPO: 24 hours)

**Time to recover:** ~15 minutes

```bash
#!/bin/bash
# scripts/restore-database.sh

BACKUP_FILE="backups/20260210/database.sql.gz"

echo "⚠️  Restoring database from $BACKUP_FILE..."

# 1. Stop application
docker-compose down

# 2. Drop current database
PGPASSWORD=$DB_PASSWORD psql -h localhost -U postgres -c "DROP DATABASE aegis_db;"

# 3. Create new database
PGPASSWORD=$DB_PASSWORD psql -h localhost -U postgres -c "CREATE DATABASE aegis_db;"

# 4. Restore from backup
gunzip < "$BACKUP_FILE" | PGPASSWORD=$DB_PASSWORD psql -h localhost -U postgres aegis_db

# 5. Verify
PGPASSWORD=$DB_PASSWORD psql -h localhost -U aegis_user aegis_db -c "SELECT COUNT(*) FROM \"User\";"

# 6. Restart application
docker-compose up -d

echo "✅ Database restored successfully"
```

### Scenario 2: Complete System Failure (RTO: 1 hour)

**Time to recover:** ~45 minutes

```bash
#!/bin/bash
# scripts/full-system-restore.sh

RESTORE_DATE="20260210-020000"  # From backup
BACKUP_ROOT="/mnt/backup/aegis-ai/$RESTORE_DATE"

echo "🚨 Initiating full system restore..."

# 1. Provision new infrastructure
echo "1️⃣ Provisioning infrastructure..."
docker-compose down --remove-orphans
rm -rf data/lancedb uploads/

# 2. Restore database
echo "2️⃣ Restoring PostgreSQL..."
gunzip < "$BACKUP_ROOT/database.sql.gz" | \
  PGPASSWORD=$DB_PASSWORD psql -h localhost -U postgres aegis_db

# 3. Restore vector store
echo "3️⃣ Restoring LanceDB..."
tar -xzf "$BACKUP_ROOT/lancedb.tar.gz"

# 4. Restore files
echo "4️⃣ Restoring user files..."
tar -xzf "$BACKUP_ROOT/uploads.tar.gz"

# 5. Start services
echo "5️⃣ Starting services..."
docker-compose up -d

# 6. Health check
echo "6️⃣ Verifying health..."
sleep 10
curl http://localhost:3000/api/health

echo "✅ System restore complete"
```

### Scenario 3: Ransomware Attack (RPO: 7 days)

In case of ransomware:

```bash
#!/bin/bash
# scripts/restore-from-archive.sh

# 1. Download from immutable archive
aws s3 sync s3://aegis-ai-archive-immutable/20260203-000000/ ./immutable-restore/

# 2. Verify archive integrity
shasum -c ./immutable-restore/MANIFEST.sha256

# 3. Restore to new isolated environment
# Create new server/container
docker-compose -f docker-compose.restore.yml up -d

# 4. Restore data
restore-database.sh "./immutable-restore/database.sql.gz"
tar -xzf "./immutable-restore/lancedb.tar.gz"
tar -xzf "./immutable-restore/uploads.tar.gz"

# 5. Verify no malicious code
# Scan uploaded files for malware
clamscan -r uploads/

echo "✅ Restored from clean archive"
```

---

## 📊 Backup Verification Checklist

Weekly verification to ensure backups are usable:

```bash
#!/bin/bash
# scripts/verify-backups.sh

echo "🔍 Verifying backups..."

# 1. Check backup exists
LATEST_BACKUP=$(ls -t backups/*/database.sql.gz | head -1)
if [ -z "$LATEST_BACKUP" ]; then
  echo "❌ No backups found!"
  exit 1
fi
echo "✅ Latest backup: $LATEST_BACKUP"

# 2. Test restore on temporary database
echo "Testing restore..."
TEMP_DB="aegis_test_$(date +%s)"
createdb $TEMP_DB
gunzip < "$LATEST_BACKUP" | psql $TEMP_DB
TEST_COUNT=$(psql $TEMP_DB -c "SELECT COUNT(*) FROM \"User\";" -t)
dropdb $TEMP_DB

if [ "$TEST_COUNT" -gt 0 ]; then
  echo "✅ Backup restore test passed: $TEST_COUNT users"
else
  echo "❌ Backup test failed!"
  exit 1
fi

# 3. Check backup age
BACKUP_AGE=$(($(date +%s) - $(stat -f%m "$LATEST_BACKUP" 2>/dev/null || stat -c%Y "$LATEST_BACKUP")))
HOURS_OLD=$((BACKUP_AGE / 3600))

if [ $HOURS_OLD -le 25 ]; then
  echo "✅ Backup is current ($HOURS_OLD hours old)"
else
  echo "⚠️  Backup is stale ($HOURS_OLD hours old)"
fi

echo "🎯 Verification complete"
```

---

## 📈 Monitoring & Alerts

Add to your monitoring system (Datadog, New Relic, etc.):

```typescript
// src/services/backup/backup-monitor.ts
import { logger } from '@/lib/logger';

export async function checkBackupHealth() {
  const backupDir = './backups';
  const backups = fs.readdirSync(backupDir).sort().reverse();

  if (backups.length === 0) {
    logger.error('NO_BACKUPS_FOUND', new Error('No backups exist'));
    alert.criticality = 'CRITICAL';
    return false;
  }

  // Check most recent backup age
  const latestBackup = backups[0];
  const backupAge = Date.now() - fs.statSync(latestBackup).mtime;
  const hoursOld = backupAge / (1000 * 60 * 60);

  if (hoursOld > 25) {
    logger.warn('BACKUP_STALE', { hoursOld });
    return false;
  }

  return true;
}

// Schedule daily check
setInterval(checkBackupHealth, 24 * 60 * 60 * 1000);
```

---

## ✅ Backup Checklist

Use this before each production deploy:

- [ ] PostgreSQL backup created within 24 hours
- [ ] LanceDB backup created within 24 hours
- [ ] S3/cloud backup verified
- [ ] Backup test restore completed successfully
- [ ] Backup size reasonable (not corrupted)
- [ ] Retention policy enforced (old backups deleted)
- [ ] Monitoring alerts configured
- [ ] Team trained on recovery procedures
- [ ] Recovery scripts tested in staging
- [ ] Documentation up to date

---

## 🆘 Support

For backup/recovery issues:
1. Check backup logs: `tail -f logs/backup.log`
2. Verify disk space: `df -h`
3. Test connectivity: `psql $DATABASE_URL -c "SELECT 1"`
4. Contact DevOps team with recent backup manifest

---

**Last tested:** Feb 10, 2026  
**Next test:** Feb 17, 2026  
**Status:** ✅ All backups current
