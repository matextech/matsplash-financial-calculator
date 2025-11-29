# Squarespace DNS Setup Guide

## Understanding Squarespace Domain Management

If your domain is managed by Squarespace, you have two options:
1. **Squarespace-managed DNS** - Squarespace controls all DNS records
2. **External DNS** - You can point DNS to external services

## Step 1: Verify Domain in Google Cloud

### Via Google Cloud Console

1. **Go to:** https://console.cloud.google.com/run/domains?project=host-dev-378703
2. **Click "Verify Domain"** or "Add Domain"
3. **Enter:** `matsplash.com` (root domain, not www)
4. **Google will provide a TXT record** like:
   ```
   Type: TXT
   Name: @ (or leave blank)
   Value: google-site-verification=XXXXXXXXXXXXX
   ```

## Step 2: Add TXT Record in Squarespace

### If Domain is Connected to Squarespace Site

1. **Log in to Squarespace:**
   - Go to https://www.squarespace.com/login
   - Select your site

2. **Navigate to DNS Settings:**
   - Settings → Domains → [Your Domain] → DNS Settings
   - Or: Settings → Domains → Advanced DNS Settings

3. **Add TXT Record:**
   - Click "Add Record" or "+"
   - **Type:** TXT
   - **Host:** @ (or leave blank for root domain)
   - **TXT Data:** `google-site-verification=XXXXXXXXXXXXX` (the value from Google)
   - **TTL:** 3600 (or default)
   - Click "Save"

### If Domain is Not Connected to Squarespace Site

If your domain is registered with Squarespace but not connected to a site:

1. **Go to:** https://www.squarespace.com/domains
2. **Select your domain:** matsplash.com
3. **Click "DNS Settings"** or "Manage DNS"
4. **Add TXT record** as above

### Alternative: Use Squarespace's External DNS

If Squarespace doesn't allow TXT records (some plans don't), you may need to:

1. **Transfer DNS to External Provider:**
   - Use Google Cloud DNS, Cloudflare, or another DNS provider
   - Update nameservers in Squarespace

2. **Or Use Squarespace's Domain Connection:**
   - Some Squarespace plans allow external DNS management
   - Check your plan's DNS capabilities

## Step 3: Wait for Verification

- Usually takes **5-15 minutes**
- Can take up to **48 hours** in rare cases
- Check status: https://console.cloud.google.com/run/domains

## Step 4: After Verification - Add CNAME Records

Once domain is verified, Google will provide CNAME records when you create domain mappings.

### For app.matsplash.com (Financial App)

After running:
```bash
gcloud beta run domain-mappings create \
  --service matsplash-fin \
  --domain app.matsplash.com \
  --region africa-south1 \
  --project=host-dev-378703
```

Google will provide a CNAME record like:
```
Type: CNAME
Name: app
Value: ghs.googlehosted.com
```

**Add to Squarespace DNS:**
1. Go to DNS Settings (same as Step 2)
2. Click "Add Record"
3. **Type:** CNAME
4. **Host:** app
5. **Data:** ghs.googlehosted.com
6. **TTL:** 3600
7. Click "Save"

### For www.matsplash.com (WordPress)

After running:
```bash
gcloud beta run domain-mappings create \
  --service wordpress \
  --domain www.matsplash.com \
  --region africa-south1 \
  --project=host-dev-378703
```

Add similar CNAME record:
- **Type:** CNAME
- **Host:** www
- **Data:** ghs.googlehosted.com

## Important Notes for Squarespace

### Squarespace Plan Limitations

- **Personal Plan:** May have limited DNS management
- **Business/Commerce Plans:** Full DNS access
- **Check your plan:** Settings → Billing & Account → Plan

### If TXT Records Not Available

If your Squarespace plan doesn't support TXT records:

**Option A: Use Google Cloud DNS (Recommended)**
1. Create a zone in Google Cloud DNS
2. Update nameservers in Squarespace to point to Google Cloud DNS
3. Manage all DNS records in Google Cloud

**Option B: Use Cloudflare (Free)**
1. Sign up for Cloudflare (free)
2. Add your domain
3. Update nameservers in Squarespace
4. Manage DNS in Cloudflare

**Option C: Contact Squarespace Support**
- Ask if they can add TXT records for domain verification
- Some plans may require support assistance

## Quick Reference: Squarespace DNS Settings Location

1. **Log in to Squarespace**
2. **Select your site**
3. **Settings → Domains**
4. **Click on your domain** (matsplash.com)
5. **DNS Settings** or **Advanced DNS Settings**

## Troubleshooting

### Can't Find DNS Settings
- Make sure you're on a plan that supports DNS management
- Try: Settings → Domains → [Domain] → DNS
- Contact Squarespace support if not available

### TXT Record Not Working
- Wait longer (up to 48 hours)
- Check record is exactly as Google provided
- Verify no extra spaces or quotes
- Use `dig TXT matsplash.com` to check DNS propagation

### CNAME Record Conflicts
- If www.matsplash.com already points to Squarespace, you may need to:
  - Remove the existing CNAME
  - Or use a different subdomain for WordPress
  - Or configure Squarespace to proxy to Cloud Run

## Alternative: Use Subdomain for WordPress

If www.matsplash.com is already used by Squarespace:

- Use `blog.matsplash.com` or `site.matsplash.com` for WordPress
- Keep `app.matsplash.com` for Financial App
- Public sees Squarespace at `www.matsplash.com`
- WordPress at `blog.matsplash.com`
- Financial App at `app.matsplash.com`

## Next Steps After DNS Setup

1. ✅ Add TXT record for verification
2. ✅ Wait for verification (5-15 minutes)
3. ✅ Create domain mappings in Google Cloud
4. ✅ Add CNAME records in Squarespace
5. ✅ Wait for DNS propagation (15 minutes to 48 hours)
6. ✅ SSL certificates auto-provisioned by Google
7. ✅ Test both sites

## Support Resources

- **Squarespace Help:** https://support.squarespace.com/hc/en-us/articles/205812668
- **Google Cloud Domain Mapping:** https://cloud.google.com/run/docs/mapping-custom-domains
- **Squarespace DNS Settings:** Settings → Domains → [Your Domain] → DNS Settings

