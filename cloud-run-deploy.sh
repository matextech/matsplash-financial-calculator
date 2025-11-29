#!/bin/bash
# Cloud Run Deployment Script

PROJECT_ID="host-dev-378703"
SERVICE_NAME="matsplash-fin"
REGION="africa-south1"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

echo "🔨 Building Docker image..."
gcloud builds submit --tag ${IMAGE_NAME} --project=${PROJECT_ID}

echo "🚀 Deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
  --image ${IMAGE_NAME} \
  --region ${REGION} \
  --platform managed \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 1 \
  --timeout 300 \
  --set-env-vars NODE_ENV=production,PORT=8080 \
  --set-env-vars DATABASE_PATH=/tmp/database.sqlite \
  --set-env-vars GCS_BUCKET_NAME=matsplash-financial-db \
  --set-env-vars DB_FILE_NAME=database.sqlite \
  --set-env-vars JWT_SECRET=Hs34gmCQl6xYrMSAiOtczpRywUVoILJE \
  --set-env-vars FRONTEND_URL=https://www.matsplash.com \
  --set-env-vars CORS_ORIGIN=https://www.matsplash.com \
  --set-env-vars VITE_LOGIN_SECRET_PATH=matsplash-fin-2jg1wCHqcMOEhlBr \
  --project=${PROJECT_ID}

echo "✅ Deployment complete!"
echo "🌐 Service URL will be displayed above"

