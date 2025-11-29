#!/bin/bash

# Safe Deployment Script for MatSplash Financial Calculator
# This script ensures data preservation during deployments

set -e  # Exit on any error

# Configuration
PROJECT_ID="matsplash-fin-cal"
SERVICE_NAME="default"
GCS_BUCKET="matsplash-financial-db"
DB_FILE="database.sqlite"
BACKUP_PREFIX="backup-$(date +%Y%m%d-%H%M%S)"

echo "🚀 Starting safe deployment for MatSplash Financial Calculator..."

# Step 1: Create backup of current database
echo "📦 Creating database backup..."
gsutil cp gs://${GCS_BUCKET}/${DB_FILE} gs://${GCS_BUCKET}/backups/${BACKUP_PREFIX}-${DB_FILE} || {
    echo "⚠️  No existing database found in cloud storage, proceeding with deployment..."
}

# Step 2: Build and deploy the application
echo "🔨 Building and deploying application..."
gcloud app deploy --quiet --project=${PROJECT_ID}

# Step 3: Wait for deployment to be ready
echo "⏳ Waiting for deployment to be ready..."
sleep 30

# Step 4: Check if the new deployment is healthy
echo "🔍 Checking deployment health..."
HEALTH_CHECK_URL="https://${PROJECT_ID}.appspot.com/api/health"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" ${HEALTH_CHECK_URL} || echo "000")

if [ "$HTTP_STATUS" != "200" ]; then
    echo "❌ Deployment health check failed (HTTP ${HTTP_STATUS})"
    echo "🔄 Rolling back to previous version..."
    
    # Get previous version
    PREVIOUS_VERSION=$(gcloud app versions list --service=${SERVICE_NAME} --project=${PROJECT_ID} --format="value(id)" --sort-by="~createTime" --limit=2 | tail -n 1)
    
    if [ ! -z "$PREVIOUS_VERSION" ]; then
        echo "📦 Rolling back to version: ${PREVIOUS_VERSION}"
        gcloud app services set-traffic ${SERVICE_NAME} --splits=${PREVIOUS_VERSION}=1 --project=${PROJECT_ID}
        echo "✅ Rollback completed"
    else
        echo "⚠️  No previous version found for rollback"
    fi
    
    exit 1
fi

echo "✅ Deployment completed successfully!"
echo "🔗 Application URL: https://${PROJECT_ID}.appspot.com"
echo "💾 Database backup created: gs://${GCS_BUCKET}/backups/${BACKUP_PREFIX}-${DB_FILE}"

# Step 5: Clean up old backups (keep last 10)
echo "🧹 Cleaning up old backups..."
gsutil ls gs://${GCS_BUCKET}/backups/ | sort -r | tail -n +11 | gsutil -m rm -I || {
    echo "ℹ️  No old backups to clean up"
}

echo "🎉 Safe deployment completed!"
