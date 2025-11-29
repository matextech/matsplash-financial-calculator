#!/bin/bash

# Safe Cloud Run Deployment Script for MatSplash Financial Calculator
# This script ensures data preservation during Cloud Run deployments

set -e  # Exit on any error

# Configuration - Based on your existing Cloud Run service
PROJECT_ID="host-dev-378703"  # Your actual project ID
SERVICE_NAME="matsplash-fin"  # Your existing Cloud Run service name
REGION="europe-west1"  # Your Cloud Run region
GCS_BUCKET="matsplash-financial-db"
DB_FILE="database.sqlite"
BACKUP_PREFIX="backup-$(date +%Y%m%d-%H%M%S)"

echo "🚀 Starting safe Cloud Run deployment for MatSplash Financial Calculator..."

# Step 1: Create backup of current database
echo "📦 Creating database backup..."
if gsutil ls gs://${GCS_BUCKET}/${DB_FILE} > /dev/null 2>&1; then
    gsutil cp gs://${GCS_BUCKET}/${DB_FILE} gs://${GCS_BUCKET}/backups/${BACKUP_PREFIX}-${DB_FILE}
    echo "✅ Database backup created: gs://${GCS_BUCKET}/backups/${BACKUP_PREFIX}-${DB_FILE}"
else
    echo "⚠️  No existing database found in cloud storage, proceeding with deployment..."
fi

# Step 2: Build and deploy to Cloud Run
echo "🔨 Building and deploying to Cloud Run..."

# Deploy using Cloud Run with the Dockerfile
gcloud run deploy ${SERVICE_NAME} \
    --source . \
    --project=${PROJECT_ID} \
    --region=${REGION} \
    --platform=managed \
    --allow-unauthenticated \
    --set-env-vars="NODE_ENV=production,GCS_BUCKET_NAME=${GCS_BUCKET},DB_FILE_NAME=${DB_FILE},JWT_SECRET=matsplash-financial-calculator-jwt-secret-2024-production" \
    --memory=1Gi \
    --cpu=1 \
    --timeout=300 \
    --max-instances=10 \
    --quiet

# Step 3: Get the service URL
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --project=${PROJECT_ID} --region=${REGION} --format="value(status.url)")
echo "🔗 Service URL: ${SERVICE_URL}"

# Step 4: Wait for deployment to be ready
echo "⏳ Waiting for deployment to be ready..."
sleep 30

# Step 5: Check if the new deployment is healthy
echo "🔍 Checking deployment health..."
HEALTH_CHECK_URL="${SERVICE_URL}/api/health"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" ${HEALTH_CHECK_URL} || echo "000")

if [ "$HTTP_STATUS" != "200" ]; then
    echo "❌ Deployment health check failed (HTTP ${HTTP_STATUS})"
    echo "🔄 Rolling back to previous revision..."
    
    # Get previous revision
    PREVIOUS_REVISION=$(gcloud run revisions list --service=${SERVICE_NAME} --project=${PROJECT_ID} --region=${REGION} --format="value(metadata.name)" --sort-by="~metadata.creationTimestamp" --limit=2 | tail -n 1)
    
    if [ ! -z "$PREVIOUS_REVISION" ]; then
        echo "📦 Rolling back to revision: ${PREVIOUS_REVISION}"
        gcloud run services update-traffic ${SERVICE_NAME} --to-revisions=${PREVIOUS_REVISION}=100 --project=${PROJECT_ID} --region=${REGION}
        echo "✅ Rollback completed"
    else
        echo "⚠️  No previous revision found for rollback"
    fi
    
    exit 1
fi

echo "✅ Deployment completed successfully!"
echo "🔗 Application URL: ${SERVICE_URL}"
echo "💾 Database backup created: gs://${GCS_BUCKET}/backups/${BACKUP_PREFIX}-${DB_FILE}"

# Step 6: Clean up old backups (keep last 10)
echo "🧹 Cleaning up old backups..."
gsutil ls gs://${GCS_BUCKET}/backups/ | sort -r | tail -n +11 | gsutil -m rm -I || {
    echo "ℹ️  No old backups to clean up"
}

# Step 7: Show current service status
echo ""
echo "📊 Current service status:"
gcloud run services describe ${SERVICE_NAME} --project=${PROJECT_ID} --region=${REGION} --format="table(status.url,status.conditions[0].type,status.conditions[0].status)"

echo "🎉 Safe Cloud Run deployment completed!"
