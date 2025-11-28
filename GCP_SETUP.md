# GCP Setup Guide for Cloud Storage Database Sync

## Prerequisites
- GCP Project with billing enabled
- Google Cloud SDK installed (`gcloud` command)
- Authenticated with GCP (`gcloud auth login`)

## Step 1: Create Cloud Storage Bucket

```bash
# Set your project ID
export PROJECT_ID="your-project-id"
gcloud config set project $PROJECT_ID

# Create Cloud Storage bucket for database
gcloud storage buckets create gs://matsplash-fin-db \
  --project=$PROJECT_ID \
  --location=us-central1 \
  --uniform-bucket-level-access
```

## Step 2: Set Up App Engine Service Account Permissions

App Engine uses a default service account. Grant it Cloud Storage permissions:

```bash
# Get the App Engine service account email
export SERVICE_ACCOUNT="${PROJECT_ID}@appspot.gserviceaccount.com"

# Grant Storage Object Admin role (for read/write database file)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/storage.objectAdmin"
```

## Step 3: Set Environment Variables

Set these in App Engine configuration or via `app.yaml`:

```bash
# Option 1: Set in app.yaml (already configured)
# Edit app.yaml and set:
# - GCS_BUCKET_NAME: 'matsplash-fin-db'
# - JWT_SECRET: (your secret)
# - LOGIN_SECRET_PATH: (your secret path)

# Option 2: Set via gcloud command
gcloud app deploy app.yaml --set-env-vars \
  GCS_BUCKET_NAME=matsplash-fin-db,\
  JWT_SECRET=your-jwt-secret-here,\
  LOGIN_SECRET_PATH=your-secret-path-here
```

## Step 4: Install Dependencies

Make sure `@google-cloud/storage` is installed:

```bash
npm install @google-cloud/storage
```

## Step 5: Build and Deploy

```bash
# Build the application
npm run build

# Deploy to App Engine
gcloud app deploy app.yaml

# Set custom domain (if not already set)
gcloud app domain-mappings create www.matsplash.com
```

## Step 6: Verify Deployment

```bash
# Check deployment status
gcloud app versions list

# View logs
gcloud app logs tail -s default

# Test health endpoint
curl https://www.matsplash.com/api/health
```

## How It Works

1. **On Startup**: App downloads database from Cloud Storage bucket
2. **During Runtime**: Database operates normally on local `/tmp` directory
3. **Periodic Backup**: Every 5 minutes, database is uploaded to Cloud Storage
4. **On Shutdown**: Database is uploaded to Cloud Storage before instance terminates

## Monitoring

- Check Cloud Storage bucket for database file: `gs://matsplash-fin-db/database.sqlite`
- Monitor App Engine logs for sync messages
- Set up alerts for database sync failures

## Troubleshooting

### Database not syncing
- Check service account permissions
- Verify bucket name is correct
- Check App Engine logs for errors

### Permission errors
```bash
# Re-grant permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/storage.objectAdmin"
```

### Bucket not found
```bash
# List buckets
gcloud storage buckets list

# Create if missing
gcloud storage buckets create gs://matsplash-fin-db \
  --location=us-central1
```

