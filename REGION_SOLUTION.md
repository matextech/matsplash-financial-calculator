# Solution: Region Limitation for Domain Mappings

## Problem

Domain mappings are **not available** in `africa-south1`. Google Cloud Run domain mappings are only supported in specific regions.

## Supported Regions for Domain Mappings

- `us-central1` (Iowa, USA)
- `us-east1` (South Carolina, USA)
- `us-east4` (Virginia, USA)
- `us-west1` (Oregon, USA)
- `europe-west1` (Belgium)
- `europe-west4` (Netherlands)
- `asia-northeast1` (Tokyo, Japan)
- `asia-southeast1` (Singapore)

## Recommended Solution: Redeploy to Europe (Closest to Africa)

### Option 1: Redeploy to europe-west1 (Belgium) - RECOMMENDED

**Pros:**
- ✅ Domain mappings work
- ✅ Same cost (~$8-10/month)
- ✅ Closest supported region to Africa
- ✅ Low latency for most of Africa

**Cons:**
- ⚠️ Slightly higher latency than africa-south1
- ⚠️ Need to redeploy services

### Steps to Redeploy

#### 1. Redeploy Financial App to europe-west1

```bash
# Build and push (same as before)
gcloud builds submit --tag gcr.io/host-dev-378703/matsplash-fin --project=host-dev-378703

# Deploy to europe-west1
gcloud run deploy matsplash-fin \
  --image gcr.io/host-dev-378703/matsplash-fin:latest \
  --region europe-west1 \
  --platform managed \
  --allow-unauthenticated \
  --project=host-dev-378703
```

#### 2. Create Domain Mapping

```bash
# Now this will work!
gcloud beta run domain-mappings create \
  --service matsplash-fin \
  --domain app.matsplash.com \
  --region europe-west1 \
  --project=host-dev-378703
```

#### 3. Deploy WordPress to europe-west1

```bash
# Deploy WordPress to same region
gcloud run deploy wordpress \
  --image gcr.io/host-dev-378703/wordpress:latest \
  --region europe-west1 \
  --platform managed \
  --allow-unauthenticated \
  --add-cloudsql-instances=YOUR_CONNECTION_NAME \
  --set-env-vars="DB_NAME=wordpress,DB_USER=wordpress,DB_PASSWORD=YOUR_PASSWORD,DB_HOST=/cloudsql/YOUR_CONNECTION_NAME" \
  --set-env-vars="WP_HOME=https://www.matsplash.com,WP_SITEURL=https://www.matsplash.com" \
  --project=host-dev-378703

# Map domain
gcloud beta run domain-mappings create \
  --service wordpress \
  --domain www.matsplash.com \
  --region europe-west1 \
  --project=host-dev-378703
```

#### 4. Update Cloud SQL Connection

If Cloud SQL is in africa-south1, you have two options:

**Option A: Keep Cloud SQL in africa-south1** (Recommended)
- Cloud SQL can be accessed from europe-west1
- Slightly higher latency but acceptable
- No migration needed

**Option B: Move Cloud SQL to europe-west1**
- Lower latency
- Requires database migration
- More complex

### Option 2: Use Load Balancer (Expensive)

Keep services in africa-south1 and use a load balancer:

**Pros:**
- ✅ Services stay in africa-south1 (lowest latency)
- ✅ Custom domains work

**Cons:**
- ❌ Expensive: ~$18/month for load balancer
- ❌ Total cost: ~$25-30/month

### Option 3: Use Cloud Run URLs (Temporary)

Use direct Cloud Run URLs without custom domains:

**Pros:**
- ✅ No changes needed
- ✅ Same cost (~$8-10/month)

**Cons:**
- ❌ No custom domain
- ❌ URLs like: `matsplash-fin-XXXXX-europe-west1.run.app`
- ❌ Not ideal for production

## Recommended Action Plan

### Step 1: Redeploy Financial App to europe-west1

```bash
# Build (if not already done)
gcloud builds submit --tag gcr.io/host-dev-378703/matsplash-fin --project=host-dev-378703

# Deploy to europe-west1
gcloud run deploy matsplash-fin \
  --image gcr.io/host-dev-378703/matsplash-fin:latest \
  --region europe-west1 \
  --platform managed \
  --allow-unauthenticated \
  --project=host-dev-378703
```

### Step 2: Verify Domain and Create Mapping

```bash
# Verify domain first (if not already done)
# Go to: https://console.cloud.google.com/run/domains?project=host-dev-378703

# Create domain mapping (this will work now!)
gcloud beta run domain-mappings create \
  --service matsplash-fin \
  --domain app.matsplash.com \
  --region europe-west1 \
  --project=host-dev-378703
```

### Step 3: Update Cloud SQL Connection

If Cloud SQL is in africa-south1, update the connection string to use the full connection name:

```bash
# Get connection name
gcloud sql instances describe wordpress-db \
  --project=host-dev-378703 \
  --format="value(connectionName)"

# Use this in Cloud Run deployment with --add-cloudsql-instances
```

### Step 4: Deploy WordPress to Same Region

Deploy WordPress to europe-west1 for consistency.

### Step 5: Delete Old Service (Optional)

After verifying everything works:

```bash
# Delete old service in africa-south1 (optional, saves no cost but cleans up)
gcloud run services delete matsplash-fin \
  --region africa-south1 \
  --project=host-dev-378703
```

## Cost Comparison

| Solution | Monthly Cost | Latency | Custom Domain |
|----------|-------------|---------|---------------|
| **europe-west1 (Recommended)** | **~$8-10** | Medium | ✅ Yes |
| Load Balancer | ~$25-30 | Low | ✅ Yes |
| Cloud Run URLs | ~$8-10 | Low | ❌ No |

## Latency Impact

- **africa-south1 → Africa:** ~10-50ms
- **europe-west1 → Africa:** ~50-150ms
- **Difference:** ~40-100ms (usually acceptable for web apps)

## Next Steps

1. ✅ Redeploy financial app to europe-west1
2. ✅ Verify domain in Google Cloud
3. ✅ Create domain mapping
4. ✅ Add CNAME records in Squarespace
5. ✅ Deploy WordPress to europe-west1
6. ✅ Test everything

## Migration Checklist

- [ ] Redeploy financial app to europe-west1
- [ ] Verify domain is verified in Google Cloud
- [ ] Create domain mapping for app.matsplash.com
- [ ] Add CNAME record in Squarespace
- [ ] Test financial app at app.matsplash.com
- [ ] Deploy WordPress to europe-west1
- [ ] Create domain mapping for www.matsplash.com
- [ ] Add CNAME record in Squarespace
- [ ] Test WordPress at www.matsplash.com
- [ ] Delete old service in africa-south1 (optional)

