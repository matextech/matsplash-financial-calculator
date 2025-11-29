# Cloud Run Deployment Complete! ✅

## Service Information
- **Service Name**: `matsplash-fin`
- **Region**: `africa-south1` (Nigeria)
- **Service URL**: `https://matsplash-fin-816277611494.africa-south1.run.app`
- **Status**: ✅ Deployed and serving 100% of traffic

## Test URLs
1. **Root URL** (should redirect to login): 
   https://matsplash-fin-816277611494.africa-south1.run.app

2. **Login URL** (direct access):
   https://matsplash-fin-816277611494.africa-south1.run.app/login/matsplash-fin-2jg1wCHqcMOEhlBr

## Custom Domain Setup (Optional)

To use a custom domain like `app.matsplash.com` instead of the Cloud Run URL:

### Step 1: Create Domain Mapping
```bash
gcloud run domain-mappings create \
  --service matsplash-fin \
  --domain app.matsplash.com \
  --region africa-south1 \
  --project=host-dev-378703
```

### Step 2: Add DNS Record in Squarespace
After running the command above, you'll get DNS records to add. Typically:
- **CNAME**: `app` → `ghs.googlehosted.com` (or similar)
- **TXT**: Verification record (if needed)

Add these in Squarespace DNS settings.

## Cost Benefits
- **App Engine**: ~$36/month (F1 instance running 24/7)
- **Cloud Run**: ~$0-5/month (scales to zero, pay per request)
- **Savings**: ~$30-35/month

## Advantages Over App Engine
1. ✅ **No project ID in URL** (cleaner URL)
2. ✅ **Scales to zero** (truly pay-per-use)
3. ✅ **Better static file serving** (no routing issues)
4. ✅ **Faster cold starts** (better performance)
5. ✅ **More flexible** (Docker-based)

## Environment Variables
All environment variables are configured:
- `NODE_ENV=production`
- `PORT=8080`
- `DATABASE_PATH=/tmp/database.sqlite`
- `GCS_BUCKET_NAME=matsplash-financial-db`
- `DB_FILE_NAME=database.sqlite`
- `JWT_SECRET=Hs34gmCQl6xYrMSAiOtczpRywUVoILJE`
- `FRONTEND_URL=https://www.matsplash.com`
- `CORS_ORIGIN=https://www.matsplash.com`
- `VITE_LOGIN_SECRET_PATH=matsplash-fin-2jg1wCHqcMOEhlBr`

## Database Persistence
The database automatically syncs with Cloud Storage on startup/shutdown (same as App Engine).

## Next Steps
1. Test the service URL above
2. (Optional) Set up custom domain if desired
3. Monitor usage and costs in GCP Console

## Updating the Service
To update the service after making code changes:
```bash
# Build new image
npm run build
gcloud builds submit --tag gcr.io/host-dev-378703/matsplash-fin --project=host-dev-378703

# Deploy new revision
gcloud run deploy matsplash-fin \
  --image gcr.io/host-dev-378703/matsplash-fin \
  --region africa-south1 \
  --project=host-dev-378703
```

