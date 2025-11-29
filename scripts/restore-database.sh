#!/bin/bash

# Database Restore Script for MatSplash Financial Calculator
# Restores database from a backup

set -e  # Exit on any error

# Configuration
GCS_BUCKET="matsplash-financial-db"
DB_FILE="database.sqlite"

# Check if backup file is provided
if [ -z "$1" ]; then
    echo "❌ Usage: $0 <backup-filename>"
    echo ""
    echo "📋 Available backups:"
    gsutil ls gs://${GCS_BUCKET}/backups/ | grep -E "backup-.*\.sqlite$" | sort -r | head -10
    exit 1
fi

BACKUP_FILE="$1"

echo "🔄 Restoring database from backup..."
echo "📂 Backup file: ${BACKUP_FILE}"

# Verify backup exists
if ! gsutil ls gs://${GCS_BUCKET}/backups/${BACKUP_FILE} > /dev/null 2>&1; then
    echo "❌ Backup file not found: gs://${GCS_BUCKET}/backups/${BACKUP_FILE}"
    exit 1
fi

# Create a backup of current database before restore
CURRENT_BACKUP="pre-restore-$(date +%Y%m%d-%H%M%S)-${DB_FILE}"
if gsutil ls gs://${GCS_BUCKET}/${DB_FILE} > /dev/null 2>&1; then
    echo "💾 Creating backup of current database..."
    gsutil cp gs://${GCS_BUCKET}/${DB_FILE} gs://${GCS_BUCKET}/backups/${CURRENT_BACKUP}
    echo "✅ Current database backed up as: ${CURRENT_BACKUP}"
fi

# Restore the backup
echo "🔄 Restoring backup..."
gsutil cp gs://${GCS_BUCKET}/backups/${BACKUP_FILE} gs://${GCS_BUCKET}/${DB_FILE}

echo "✅ Database restored successfully!"
echo "📊 Restored file size: $(gsutil du -h gs://${GCS_BUCKET}/${DB_FILE} | cut -f1)"
echo "⚠️  Note: Application restart may be required for changes to take effect"
