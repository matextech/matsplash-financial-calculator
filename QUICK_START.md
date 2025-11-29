# Quick Start Guide - Subdomain Setup

## Current Status

✅ **Financial App:** Already deployed and working  
✅ **Financial App URL:** `https://matsplash-fin-816277611494.africa-south1.run.app`  
⏳ **Domain Mapping:** Requires domain verification first  

## Immediate Next Steps

### Step 1: Verify Domain (5-15 minutes)

1. **Go to Google Cloud Console:**
   - https://console.cloud.google.com/run/domains?project=host-dev-378703

2. **Click "Verify Domain"** or "Add Domain"

3. **Enter:** `matsplash.com` (root domain)

4. **Add TXT Record to DNS:**
   - Google will provide a TXT record
   - Add it to your DNS provider (where you manage matsplash.com)
   - Type: TXT
   - Name: @ (or blank)
   - Value: [Google's verification string]

5. **Wait for Verification:** Usually 5-15 minutes

### Step 2: Map app.matsplash.com (After Verification)

Once domain is verified, run:

```bash
gcloud beta run domain-mappings create \
  --service matsplash-fin \
  --domain app.matsplash.com \
  --region africa-south1 \
  --project=host-dev-378703
```

This will provide DNS records. Add the CNAME record to your DNS.

### Step 3: Deploy WordPress (Can Do Now)

You can deploy WordPress while waiting for domain verification:

```bash
# 1. Set up Cloud SQL
gcloud sql instances create wordpress-db \
  --database-version=MYSQL_8_0 \
  --tier=db-f1-micro \
  --region=africa-south1 \
  --project=host-dev-378703

# 2. Create database and user
gcloud sql databases create wordpress --instance=wordpress-db --project=host-dev-378703
gcloud sql users create wordpress --instance=wordpress-db --password=YOUR_PASSWORD --project=host-dev-378703

# 3. Get connection name
gcloud sql instances describe wordpress-db --project=host-dev-378703 --format="value(connectionName)"

# 4. Deploy WordPress (after preparing files in wordpress/ directory)
cd wordpress
gcloud builds submit --tag gcr.io/host-dev-378703/wordpress:latest --project=host-dev-378703

gcloud run deploy wordpress \
  --image gcr.io/host-dev-378703/wordpress:latest \
  --region africa-south1 \
  --allow-unauthenticated \
  --add-cloudsql-instances=YOUR_CONNECTION_NAME \
  --set-env-vars="DB_NAME=wordpress,DB_USER=wordpress,DB_PASSWORD=YOUR_PASSWORD,DB_HOST=/cloudsql/YOUR_CONNECTION_NAME" \
  --set-env-vars="WP_HOME=https://www.matsplash.com,WP_SITEURL=https://www.matsplash.com" \
  --project=host-dev-378703
```

### Step 4: Map www.matsplash.com (After WordPress Deployment & Domain Verification)

```bash
gcloud beta run domain-mappings create \
  --service wordpress \
  --domain www.matsplash.com \
  --region africa-south1 \
  --project=host-dev-378703
```

## Using Services Now (Before Domain Mapping)

**Financial App:**
- URL: `https://matsplash-fin-816277611494.africa-south1.run.app/login/{secretPath}`
- Employees can use this immediately
- Will switch to `app.matsplash.com` after domain mapping

**WordPress:**
- Will have URL like: `https://wordpress-XXXXX-africa-south1.run.app`
- Can use this temporarily
- Will switch to `www.matsplash.com` after domain mapping

## Cost Summary

- **Cloud SQL:** ~$7.67/month
- **Cloud Run (both services):** ~$2-4/month
- **Total: ~$8-10/month**

## Files Created

- ✅ `SUBDOMAIN_SETUP.md` - Complete setup guide
- ✅ `DOMAIN_VERIFICATION.md` - Domain verification steps
- ✅ `QUICK_START.md` - This file
- ✅ `LOW_COST_SETUP.md` - Cost analysis and details

## Next Actions

1. **Verify domain** (5-15 minutes) - See DOMAIN_VERIFICATION.md
2. **Deploy WordPress** (can do in parallel) - See SUBDOMAIN_SETUP.md
3. **Map domains** (after verification) - Commands above
4. **Update DNS** - Add CNAME records provided by Google
5. **Test and verify** - Check both sites work

