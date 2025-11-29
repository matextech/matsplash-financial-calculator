# Squarespace Quick Start Guide

## Current Situation

- **Domain:** matsplash.com (managed by Squarespace)
- **Financial App:** Already deployed ✅
- **WordPress:** Needs deployment
- **Goal:** Use subdomains to avoid load balancer costs

## Step-by-Step Process

### Phase 1: Domain Verification (5-15 minutes)

#### 1.1 Get Verification Record from Google

1. **Go to:** https://console.cloud.google.com/run/domains?project=host-dev-378703
2. **Click "Verify Domain"**
3. **Enter:** `matsplash.com`
4. **Copy the TXT record** Google provides

#### 1.2 Add TXT Record in Squarespace

1. **Log in to Squarespace:** https://www.squarespace.com/login
2. **Select your site**
3. **Go to:** Settings → Domains → [matsplash.com] → DNS Settings
4. **Click "Add Record"** or "+"
5. **Fill in:**
   - **Type:** TXT
   - **Host:** @ (or leave blank)
   - **TXT Data:** [Paste the value from Google]
   - **TTL:** 3600
6. **Click "Save"**

#### 1.3 Wait for Verification

- Check status: https://console.cloud.google.com/run/domains
- Usually 5-15 minutes
- Can take up to 48 hours

### Phase 2: Map app.matsplash.com (Financial App)

Once verified, run:

```bash
gcloud beta run domain-mappings create \
  --service matsplash-fin \
  --domain app.matsplash.com \
  --region africa-south1 \
  --project=host-dev-378703
```

This will show DNS records. Add to Squarespace:

1. **Go to Squarespace DNS Settings** (same as above)
2. **Add CNAME record:**
   - **Type:** CNAME
   - **Host:** app
   - **Data:** ghs.googlehosted.com
   - **TTL:** 3600
3. **Save**

**Result:** `https://app.matsplash.com/login/{secretPath}` will work

### Phase 3: Deploy WordPress

#### 3.1 Set Up Cloud SQL

```bash
# Create database instance
gcloud sql instances create wordpress-db \
  --database-version=MYSQL_8_0 \
  --tier=db-f1-micro \
  --region=africa-south1 \
  --project=host-dev-378703

# Create database
gcloud sql databases create wordpress \
  --instance=wordpress-db \
  --project=host-dev-378703

# Create user
gcloud sql users create wordpress \
  --instance=wordpress-db \
  --password=YOUR_SECURE_PASSWORD \
  --project=host-dev-378703

# Get connection name
gcloud sql instances describe wordpress-db \
  --project=host-dev-378703 \
  --format="value(connectionName)"
```

#### 3.2 Export WordPress from VM

```bash
# On your VM
mysqldump -u wordpress -p wordpress > wordpress_backup.sql

# Upload to Cloud Storage
gsutil mb gs://matsplash-wordpress-backup
gsutil cp wordpress_backup.sql gs://matsplash-wordpress-backup/

# Import to Cloud SQL
gcloud sql import sql wordpress-db \
  gs://matsplash-wordpress-backup/wordpress_backup.sql \
  --database=wordpress \
  --project=host-dev-378703
```

#### 3.3 Deploy WordPress

```bash
cd wordpress

# Build image
gcloud builds submit --tag gcr.io/host-dev-378703/wordpress:latest \
  --project=host-dev-378703

# Deploy (replace YOUR_CONNECTION_NAME and YOUR_PASSWORD)
gcloud run deploy wordpress \
  --image gcr.io/host-dev-378703/wordpress:latest \
  --region africa-south1 \
  --allow-unauthenticated \
  --add-cloudsql-instances=YOUR_CONNECTION_NAME \
  --set-env-vars="DB_NAME=wordpress,DB_USER=wordpress,DB_PASSWORD=YOUR_PASSWORD,DB_HOST=/cloudsql/YOUR_CONNECTION_NAME" \
  --set-env-vars="WP_HOME=https://www.matsplash.com,WP_SITEURL=https://www.matsplash.com" \
  --project=host-dev-378703
```

### Phase 4: Map www.matsplash.com (WordPress)

```bash
gcloud beta run domain-mappings create \
  --service wordpress \
  --domain www.matsplash.com \
  --region africa-south1 \
  --project=host-dev-378703
```

Add CNAME to Squarespace:
- **Type:** CNAME
- **Host:** www
- **Data:** ghs.googlehosted.com

**Note:** If www.matsplash.com is already used by Squarespace, you may need to:
- Use a different subdomain (e.g., `blog.matsplash.com`)
- Or remove the existing Squarespace CNAME

## Squarespace DNS Settings Location

**Path:** Settings → Domains → [matsplash.com] → DNS Settings

**Or:** Settings → Domains → Advanced DNS Settings

## Important Considerations

### If www.matsplash.com is Already Used

If Squarespace is using www.matsplash.com:

**Option A:** Use different subdomain for WordPress
- `blog.matsplash.com` → WordPress
- `app.matsplash.com` → Financial App
- `www.matsplash.com` → Squarespace (stays as is)

**Option B:** Move Squarespace to subdomain
- `www.matsplash.com` → WordPress
- `app.matsplash.com` → Financial App
- `site.matsplash.com` → Squarespace

### Squarespace Plan Requirements

- **Personal Plan:** May have limited DNS management
- **Business/Commerce Plans:** Full DNS access
- Check: Settings → Billing & Account → Plan

### If TXT Records Not Available

If your Squarespace plan doesn't support TXT records:

1. **Use Google Cloud DNS** (recommended)
   - Create DNS zone in Google Cloud
   - Update nameservers in Squarespace
   - Manage all DNS in Google Cloud

2. **Or use Cloudflare** (free)
   - Sign up for Cloudflare
   - Add domain
   - Update nameservers
   - Manage DNS in Cloudflare

## Cost Summary

- **Cloud SQL:** ~$7.67/month
- **Cloud Run (both):** ~$2-4/month
- **Total: ~$8-10/month** (vs ~$25-30 with load balancer)

## Testing

After DNS propagation (15 minutes to 48 hours):

1. **WordPress:** `https://www.matsplash.com`
2. **Financial App:** `https://app.matsplash.com/login/{secretPath}`
3. **API:** `https://app.matsplash.com/api/health`

## Troubleshooting

### Can't Find DNS Settings
- Check your Squarespace plan level
- Try: Settings → Domains → [Domain] → DNS
- Contact Squarespace support if needed

### Verification Not Working
- Wait longer (up to 48 hours)
- Check TXT record is exact (no extra spaces)
- Verify DNS propagation: `dig TXT matsplash.com`

### CNAME Conflicts
- Remove existing CNAME if www is already used
- Or use different subdomain
- Or configure Squarespace to proxy

## Support

- **Squarespace Help:** https://support.squarespace.com/hc/en-us/articles/205812668
- **Google Cloud Support:** https://cloud.google.com/support
- **Squarespace DNS Docs:** Settings → Domains → Help

