# WordPress Migration to Cloud Run - Cost Optimization Plan

## Current Setup
- **WordPress:** `matsplash-vm` (e2-micro, us-central1-f) - ~$6-8/month
- **Financial App:** App Engine (europe-west) - ~$0-2/month
- **Total Cost:** ~$6-10/month

## Target Setup (After Migration)
- **WordPress:** Cloud Run (europe-west) - ~$0-2/month (scales to zero)
- **Financial App:** App Engine (europe-west) - ~$0-2/month
- **Total Cost:** ~$0-4/month
- **Savings:** ~$6/month (~$72/year)

## Migration Strategy

### Phase 1: Prepare Cloud Run Infrastructure

#### 1.1 Create Cloud SQL Instance (MySQL for WordPress)
```bash
# Create Cloud SQL instance (smallest/cheapest tier)
gcloud sql instances create matsplash-wordpress-db \
  --database-version=MYSQL_8_0 \
  --tier=db-f1-micro \
  --region=europe-west \
  --project=host-dev-378703 \
  --storage-type=SSD \
  --storage-size=10GB \
  --backup-start-time=03:00 \
  --enable-bin-log
```

**Cost:** ~$7-10/month (can't avoid this for WordPress database)

#### 1.2 Create Cloud Storage Bucket for WordPress Files
```bash
# Create bucket for WordPress uploads, themes, plugins
gcloud storage buckets create gs://matsplash-wordpress-files \
  --project=host-dev-378703 \
  --location=EU \
  --uniform-bucket-level-access
```

**Cost:** ~$0.02/GB/month (very cheap for small sites)

#### 1.3 Create Cloud Run Service
We'll use a WordPress Docker image with Cloud Storage mount.

### Phase 2: Export WordPress Data

#### 2.1 Export Database
```bash
# SSH into VM
gcloud compute ssh matsplash-vm --zone=us-central1-f --project=host-dev-378703

# Export WordPress database
mysqldump -u [wordpress_user] -p [wordpress_db] > wordpress_backup.sql

# Exit and download
exit
gcloud compute scp matsplash-vm:wordpress_backup.sql . --zone=us-central1-f
```

#### 2.2 Export WordPress Files
```bash
# From VM
tar -czf wordpress-files.tar.gz /var/www/html/wordpress

# Download
gcloud compute scp matsplash-vm:wordpress-files.tar.gz . --zone=us-central1-f
```

### Phase 3: Import to Cloud Run

#### 3.1 Import Database to Cloud SQL
```bash
# Create database
gcloud sql databases create wordpress --instance=matsplash-wordpress-db

# Import data
gcloud sql import sql matsplash-wordpress-db \
  gs://matsplash-wordpress-files/wordpress_backup.sql \
  --database=wordpress
```

#### 3.2 Upload Files to Cloud Storage
```bash
# Extract and upload WordPress files
tar -xzf wordpress-files.tar.gz
gsutil -m cp -r wordpress/* gs://matsplash-wordpress-files/
```

### Phase 4: Deploy Cloud Run Service

#### 4.1 Create Dockerfile for WordPress
```dockerfile
FROM wordpress:latest

# Install Cloud Storage FUSE
RUN apt-get update && apt-get install -y \
    gcsfuse \
    && rm -rf /var/lib/apt/lists/*

# Mount Cloud Storage for wp-content
# This will be configured in Cloud Run
```

#### 4.2 Deploy to Cloud Run
```bash
# Build and deploy
gcloud run deploy matsplash-wordpress \
  --source . \
  --region=europe-west \
  --platform=managed \
  --allow-unauthenticated \
  --memory=512Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=2 \
  --timeout=300 \
  --set-env-vars="WORDPRESS_DB_HOST=[CLOUD_SQL_CONNECTION_NAME]" \
  --add-cloudsql-instances=[CLOUD_SQL_CONNECTION_NAME] \
  --project=host-dev-378703
```

### Phase 5: Update DNS

#### 5.1 Get Cloud Run URL
```bash
gcloud run services describe matsplash-wordpress \
  --region=europe-west \
  --format="value(status.url)"
```

#### 5.2 Update Squarespace DNS
- **CNAME:** `www` → `[CLOUD_RUN_URL]`
- Remove old VM IP address record

### Phase 6: Verify and Shut Down VM

1. Test WordPress site thoroughly
2. Verify all functionality
3. Check SEO and redirects
4. Monitor for 24-48 hours
5. Delete VM: `gcloud compute instances delete matsplash-vm --zone=us-central1-f`

## Security Improvements

### 1. Remove Project ID from Hostnames
- ✅ Updated bucket name: `matsplash-financial-db` (no project ID)
- ✅ Using custom domain: `www.matsplash.com` (no project ID exposure)

### 2. Security Headers
- ✅ Already implemented in `server/middleware/securityHeaders.ts`
- ✅ CORS properly configured
- ✅ Rate limiting enabled

### 3. Environment Variables
- ✅ Secrets stored in app.yaml (consider Secret Manager for production)
- ✅ JWT_SECRET is secure
- ✅ Custom login path implemented

## Cost Breakdown

### Current (VM + App Engine)
- VM (e2-micro): $6-8/month
- App Engine: $0-2/month
- **Total: $6-10/month**

### After Migration (Cloud Run + App Engine + Cloud SQL)
- Cloud Run: $0-2/month (scales to zero)
- App Engine: $0-2/month
- Cloud SQL (db-f1-micro): $7-10/month
- Cloud Storage: ~$0.10/month
- **Total: $7-12/month**

**Wait - Cloud SQL adds cost!**

### Alternative: Use SQLite for WordPress (if possible)
If WordPress can work with SQLite plugin:
- Cloud Run: $0-2/month
- App Engine: $0-2/month
- Cloud Storage: ~$0.10/month
- **Total: $0-4/month** ✅

## Recommended Approach

**Option A: Full Migration (WordPress on Cloud Run + Cloud SQL)**
- Cost: $7-12/month
- Full WordPress functionality
- Better scalability

**Option B: Keep WordPress on VM, Use Main Domain for Financial App**
- Cost: $6-10/month (same as now)
- No migration needed
- Financial app on www.matsplash.com
- WordPress on subdomain (blog.matsplash.com)

**Option C: Hybrid (Recommended for Cost)**
- WordPress: Keep on VM (it's already cheap at $6/month)
- Financial App: www.matsplash.com (App Engine)
- Use path-based routing or subdomain

## Next Steps

1. ✅ Secure bucket name (removed project ID)
2. ✅ Updated app.yaml for www.matsplash.com
3. ⏳ Create domain mapping in GCP
4. ⏳ Add DNS records in Squarespace
5. ⏳ Deploy and test

## DNS Records for Squarespace

After domain mapping is created, you'll need:

1. **CNAME Record:**
   - Name: `www`
   - Value: `[APP_ENGINE_URL]` (will be provided after domain mapping)
   - TTL: 3600

2. **TXT Record (for verification):**
   - Will be provided by GCP after running domain mapping command

