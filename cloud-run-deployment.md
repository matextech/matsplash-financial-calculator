# Cloud Run Deployment Guide

## Why Cloud Run?
- **Cheaper**: Pay only for requests (scales to zero)
- **More Flexible**: Better control over static file serving
- **Faster Cold Starts**: Better than App Engine Standard
- **Same Region**: Can deploy in `africa-south1` (same as your preference)

## Deployment Steps

### 1. Create Dockerfile
```dockerfile
FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy built files
COPY dist ./dist
COPY server ./server
COPY tsconfig.json ./

# Install tsx for running TypeScript
RUN npm install -g tsx

# Expose port
EXPOSE 8080

# Start server
CMD ["tsx", "server/index.ts"]
```

### 2. Build and Deploy
```bash
# Build the app
npm run build

# Build Docker image
gcloud builds submit --tag gcr.io/host-dev-378703/matsplash-fin

# Deploy to Cloud Run
gcloud run deploy matsplash-fin \
  --image gcr.io/host-dev-378703/matsplash-fin \
  --region africa-south1 \
  --platform managed \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 1 \
  --set-env-vars NODE_ENV=production,PORT=8080 \
  --set-env-vars DATABASE_PATH=/tmp/database.sqlite \
  --set-env-vars GCS_BUCKET_NAME=matsplash-financial-db \
  --set-env-vars DB_FILE_NAME=database.sqlite \
  --set-env-vars JWT_SECRET=Hs34gmCQl6xYrMSAiOtczpRywUVoILJE \
  --set-env-vars FRONTEND_URL=https://www.matsplash.com \
  --set-env-vars CORS_ORIGIN=https://www.matsplash.com \
  --set-env-vars VITE_LOGIN_SECRET_PATH=matsplash-fin-2jg1wCHqcMOEhlBr
```

### 3. Set up Custom Domain (Optional)
```bash
# Map custom domain
gcloud run domain-mappings create \
  --service matsplash-fin \
  --domain app.matsplash.com \
  --region africa-south1
```

## Cost Comparison
- **App Engine Standard**: ~$0.05/hour for F1 instance (even when idle with min_instances: 1)
- **Cloud Run**: $0.00 when idle (scales to zero), ~$0.00002400 per request

## Advantages
1. **Better Static File Serving**: No routing issues
2. **Docker-based**: More control
3. **Scales to Zero**: Truly pay-per-use
4. **Better Logging**: Cloud Run logs are easier to debug

