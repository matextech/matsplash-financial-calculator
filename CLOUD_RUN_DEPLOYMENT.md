# Cloud Run Deployment Guide

## Why Cloud Run?
- ✅ **Cheaper**: Scales to zero, pay only for requests (~$0.00002400 per request)
- ✅ **Better Performance**: Faster cold starts than App Engine
- ✅ **More Flexible**: Full Docker control
- ✅ **Custom Domain**: Can use `app.matsplash.com` instead of project ID URL
- ✅ **Same Region**: Deploy in `africa-south1` (Nigeria)

## Prerequisites
- GCP Project: `host-dev-378703`
- Cloud Storage bucket: `matsplash-financial-db` (already exists)
- Domain: `www.matsplash.com` (already configured)

## Deployment Steps

### 1. Build and Deploy
```bash
# Build the frontend
npm run build

# Build and deploy to Cloud Run (using the script)
bash cloud-run-deploy.sh

# Or manually:
gcloud builds submit --tag gcr.io/host-dev-378703/matsplash-fin --project=host-dev-378703

gcloud run deploy matsplash-fin \
  --image gcr.io/host-dev-378703/matsplash-fin \
  --region africa-south1 \
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
  --project=host-dev-378703
```

### 2. Set Up Custom Domain (Optional)
```bash
# Map custom domain (e.g., app.matsplash.com)
gcloud run domain-mappings create \
  --service matsplash-fin \
  --domain app.matsplash.com \
  --region africa-south1 \
  --project=host-dev-378703
```

Then add the CNAME record in Squarespace DNS pointing to the provided Cloud Run domain.

### 3. Verify Deployment
```bash
# Get the service URL
gcloud run services describe matsplash-fin \
  --region africa-south1 \
  --project=host-dev-378703 \
  --format="value(status.url)"
```

## Cost Comparison
- **App Engine Standard**: ~$0.05/hour for F1 instance (even when idle with min_instances: 1) = ~$36/month
- **Cloud Run**: $0.00 when idle (scales to zero), ~$0.00002400 per request = ~$0-5/month for low usage

## Advantages
1. **Better Static File Serving**: No routing issues
2. **Docker-based**: More control over the environment
3. **Scales to Zero**: Truly pay-per-use
4. **Better Logging**: Cloud Run logs are easier to debug
5. **Custom Domain**: No project ID in URL

## Environment Variables
All environment variables are set during deployment. The service account automatically has permissions to access Cloud Storage.

## Database Persistence
The database syncs with Cloud Storage automatically on startup/shutdown (same as App Engine).

