#!/bin/bash

# Database Backup Script for MatSplash Financial Calculator
# Creates manual backups of the production database

set -e  # Exit on any error

# Configuration
GCS_BUCKET="matsplash-financial-db"
DB_FILE="database.sqlite"
BACKUP_PREFIX="manual-backup-$(date +%Y%m%d-%H%M%S)"

echo "💾 Creating manual database backup..."

# Check if database exists in cloud storage
if gsutil ls gs://${GCS_BUCKET}/${DB_FILE} > /dev/null 2>&1; then
    # Create backup
    gsutil cp gs://${GCS_BUCKET}/${DB_FILE} gs://${GCS_BUCKET}/backups/${BACKUP_PREFIX}-${DB_FILE}
    echo "✅ Backup created: gs://${GCS_BUCKET}/backups/${BACKUP_PREFIX}-${DB_FILE}"
    
    # Show backup size
    BACKUP_SIZE=$(gsutil du -h gs://${GCS_BUCKET}/backups/${BACKUP_PREFIX}-${DB_FILE} | cut -f1)
    echo "📊 Backup size: ${BACKUP_SIZE}"
else
    echo "❌ No database found in cloud storage: gs://${GCS_BUCKET}/${DB_FILE}"
    exit 1
fi

# List recent backups
echo ""
echo "📋 Recent backups:"
gsutil ls -l gs://${GCS_BUCKET}/backups/ | tail -n 5
