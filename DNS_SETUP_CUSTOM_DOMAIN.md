# Custom Domain Setup for Cloud Run

## Domain: app.matsplash.com

Since your domain is hosted on a different Google account, you can still set up DNS without domain verification.

### Option 1: Direct CNAME to Cloud Run (Recommended)

Add this CNAME record in your DNS provider (Squarespace):

**CNAME Record:**
- **Name/Host**: `app`
- **Value/Target**: `ghs.googlehosted.com`
- **TTL**: 3600 (or default)

Then map the domain:
```bash
gcloud beta run domain-mappings create \
  --service matsplash-fin \
  --domain app.matsplash.com \
  --region africa-south1 \
  --project host-dev-378703
```

### Option 2: Use Cloud Run URL with CNAME

Add a CNAME record pointing directly to the Cloud Run URL:

**CNAME Record:**
- **Name/Host**: `app`
- **Value/Target**: `matsplash-fin-816277611494.africa-south1.run.app`
- **TTL**: 3600 (or default)

This will work immediately without domain verification, but the URL will show `matsplash-fin-816277611494.africa-south1.run.app` in SSL certificates.

### Option 3: Use the Cloud Run URL directly

**Current URL:** `https://matsplash-fin-816277611494.africa-south1.run.app`

**Login URL:** `https://matsplash-fin-816277611494.africa-south1.run.app/login/matsplash-fin-2jg1wCHqcMOEhlBr`

This works immediately, no DNS setup required. The URL doesn't have the project ID in the path.

### Recommendation

For now, use **Option 3** (Cloud Run URL directly) until we fix the routing issue. Once that's confirmed working, you can set up the custom domain using **Option 1** or **Option 2**.

The Cloud Run URL is secure (HTTPS) and doesn't expose the project ID in the path, only in the subdomain.

