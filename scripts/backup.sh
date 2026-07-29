#!/bin/bash
set -euo pipefail

# Aegis AI Database Backup Script
# Usage: ./scripts/backup.sh
# Cron: 0 2 * * * /path/to/scripts/backup.sh >> /var/log/aegis-backup.log 2>&1

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${PROJECT_DIR}/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/aegis_db_${TIMESTAMP}.sql.gz"
ENCRYPTED_FILE="${BACKUP_FILE}.gpg"
RETENTION_DAYS=7
GPG_RECIPIENT="${BACKUP_GPG_RECIPIENT:-}"

# Load environment variables
if [ -f "${PROJECT_DIR}/.env" ]; then
  export $(grep -v '^#' "${PROJECT_DIR}/.env" | xargs)
fi

# Validate DATABASE_URL is set
if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL is not set"
  exit 1
fi

# Extract connection details from DATABASE_URL
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's|.*://[^:]*:[^@]*@\([^:]*\):.*|\1|p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's|.*://[^:]*:[^@]*@[^:]*:\([0-9]*\)/.*|\1|p')
DB_NAME=$(echo "$DATABASE_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')
DB_USER=$(echo "$DATABASE_URL" | sed -n 's|.*://\([^:]*\):.*|\1|p')
DB_PASS=$(echo "$DATABASE_URL" | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')

# Default port if not specified
DB_PORT="${DB_PORT:-5432}"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting database backup..."
echo "Database: ${DB_NAME} on ${DB_HOST}:${DB_PORT}"

# Run pg_dump with compression
PGPASSWORD="$DB_PASS" pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  --format=plain \
  | gzip > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
  BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo "[$(date)] Backup created: ${BACKUP_FILE} (${BACKUP_SIZE})"
else
  echo "[$(date)] ERROR: pg_dump failed"
  exit 1
fi

# Encrypt backup with GPG if recipient is configured
if [ -n "$GPG_RECIPIENT" ]; then
  echo "[$(date)] Encrypting backup..."
  gpg --batch --yes --trust-model always --recipient "$GPG_RECIPIENT" --encrypt "$BACKUP_FILE"
  
  if [ $? -eq 0 ]; then
    echo "[$(date)] Encrypted backup: ${ENCRYPTED_FILE}"
    # Remove unencrypted file after successful encryption
    rm "$BACKUP_FILE"
    FINAL_FILE="$ENCRYPTED_FILE"
  else
    echo "[$(date)] WARNING: GPG encryption failed, keeping unencrypted backup"
    FINAL_FILE="$BACKUP_FILE"
  fi
else
  echo "[$(date)] GPG recipient not set, keeping unencrypted backup"
  FINAL_FILE="$BACKUP_FILE"
fi

# Clean up old backups (keep last 7 days)
echo "[$(date)] Cleaning up backups older than ${RETENTION_DAYS} days..."
find "$BACKUP_DIR" -name "aegis_db_*" -type f -mtime +${RETENTION_DAYS} -delete

# List remaining backups
echo "[$(date)] Current backups:"
ls -lh "$BACKUP_DIR"/aegis_db_* 2>/dev/null || echo "  No backups found"

echo "[$(date)] Backup completed successfully"
exit 0
