# DNS Setup Instructions for Squarespace

## ✅ Security Improvements Completed

1. **Removed Project ID from bucket name:**
   - Old: `matsplash-fin-db-host-dev-378703`
   - New: `matsplash-financial-db` ✅

2. **Updated app.yaml:**
   - Using `www.matsplash.com` (main domain)
   - All security headers enabled
   - Rate limiting configured
   - CORS properly set

3. **Application ready for deployment:**
   - Built successfully ✅
   - All configurations secure ✅

## Domain Verification Required

Before creating domain mapping, you need to verify domain ownership in Google Search Console:

1. Go to: https://www.google.com/webmasters/verification/verification?domain=matsplash.com
2. Follow the verification process (usually via DNS TXT record)
3. Once verified, domain mapping can be created

## DNS Records to Add in Squarespace

### Step 1: Get App Engine URL
Your App Engine URL is: `host-dev-378703.ew.r.appspot.com`

### Step 2: Add CNAME Record
In Squarespace DNS settings, add:

**CNAME Record:**
- **Host/Name:** `www`
- **Points to/Value:** `host-dev-378703.ew.r.appspot.com`
- **TTL:** 3600 (or default)

### Step 3: Domain Verification (if not done)
After verifying domain in Google Search Console, you'll get a TXT record to add:

**TXT Record (for verification):**
- **Host/Name:** `@` or `matsplash.com`
- **Value:** `[Will be provided by Google Search Console]`
- **TTL:** 3600

### Step 4: Create Domain Mapping (After DNS is set)
Once DNS records are added and verified, run:

```bash
gcloud app domain-mappings create www.matsplash.com --project=host-dev-378703
```

This will:
- Create the domain mapping
- Provision SSL certificate automatically
- Provide final DNS records if needed

## After DNS is Configured

1. **Redeploy application:**
   ```bash
   npm run build
   gcloud app deploy app.yaml --project=host-dev-378703
   ```

2. **Test the application:**
   - Main URL: `https://www.matsplash.com`
   - Login URL: `https://www.matsplash.com/login/matsplash-fin-2jg1wCHqcMOEhlBr`

## Current Status

✅ **Application:** Built and ready
✅ **Security:** Project ID removed, secure configuration
✅ **Bucket:** `matsplash-financial-db` (secure name)
✅ **Configuration:** `www.matsplash.com` configured
⏳ **DNS:** Waiting for you to add records in Squarespace
⏳ **Domain Mapping:** Will be created after DNS verification

## Next Steps

1. **Add CNAME record in Squarespace:**
   - `www` → `host-dev-378703.ew.r.appspot.com`

2. **Verify domain in Google Search Console** (if not already done)

3. **Let me know when DNS is added**, and I'll:
   - Create the domain mapping
   - Redeploy the application
   - Test everything

## WordPress Migration (Optional - Later)

For WordPress migration to Cloud Run, see `CLOUD_RUN_MIGRATION.md` for detailed steps.

**Cost Analysis:**
- **Current:** VM ($6-8/month) + App Engine ($0-2/month) = $6-10/month
- **After WordPress Migration:** Cloud Run ($0-2/month) + App Engine ($0-2/month) + Cloud SQL ($7-10/month) = $7-12/month

**Note:** Cloud SQL adds cost. Consider keeping WordPress on VM if cost is primary concern, or use SQLite plugin for WordPress to avoid Cloud SQL costs.

## Security Features Implemented

✅ No project ID in hostnames
✅ Secure bucket naming
✅ Security headers (CSP, X-Frame-Options, etc.)
✅ Rate limiting on auth endpoints
✅ CORS properly configured
✅ Custom login URL path
✅ JWT with secure secrets
✅ 2FA enabled

## Ready for Production

Your application is secure and ready. Just need DNS configuration in Squarespace!

