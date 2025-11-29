# Domain Verification Guide

## Why Domain Verification is Needed

Google Cloud requires domain verification before you can map custom domains to Cloud Run services. This is a security measure to prevent unauthorized domain usage.

## Step 1: Start Domain Verification

### Via Google Cloud Console (Easiest)

1. Go to: https://console.cloud.google.com/run/domains?project=host-dev-378703
2. Click **"Verify Domain"** or **"Add Domain"**
3. Enter: `matsplash.com` (verify the root domain, not subdomain)
4. Click **"Verify"**

### Via Command Line

```bash
# This will show you the verification record to add
gcloud domains verify matsplash.com --project=host-dev-378703
```

## Step 2: Add DNS TXT Record

Google will provide a TXT record like:
```
Type: TXT
Name: @ (or leave blank for root domain)
Value: google-site-verification=XXXXXXXXXXXXX
```

**Add this to your DNS provider:**
1. Log in to your domain registrar (where you bought matsplash.com)
2. Go to DNS Management / DNS Settings
3. Add a new TXT record:
   - **Type:** TXT
   - **Name:** @ (or leave blank)
   - **Value:** The verification string provided by Google
   - **TTL:** 3600 (or default)

## Step 3: Wait for Verification

- Usually takes 5-15 minutes
- Can take up to 48 hours in rare cases
- Check status: https://console.cloud.google.com/run/domains

## Step 4: Verify Status

```bash
# Check verification status
gcloud domains list --project=host-dev-378703
```

Once verified, you'll see `matsplash.com` in the list of verified domains.

## Step 5: Create Domain Mappings

After verification, you can create domain mappings:

```bash
# Map app.matsplash.com to financial app
gcloud beta run domain-mappings create \
  --service matsplash-fin \
  --domain app.matsplash.com \
  --region africa-south1 \
  --project=host-dev-378703

# Map www.matsplash.com to WordPress (after WordPress is deployed)
gcloud beta run domain-mappings create \
  --service wordpress \
  --domain www.matsplash.com \
  --region africa-south1 \
  --project=host-dev-378703
```

## Alternative: Use Cloud Run URLs Temporarily

If you want to start using the services immediately while waiting for domain verification:

**Financial App:**
- Current URL: `https://matsplash-fin-816277611494.africa-south1.run.app`
- Employees can use: `https://matsplash-fin-816277611494.africa-south1.run.app/login/{secretPath}`

**WordPress (after deployment):**
- Will have URL like: `https://wordpress-XXXXX-africa-south1.run.app`

You can:
1. Start using Cloud Run URLs immediately
2. Verify domain in the background
3. Switch to custom domains once verified

## Troubleshooting

### Verification Not Working
- Double-check the TXT record is correct
- Wait longer (can take up to 48 hours)
- Check DNS propagation: `dig TXT matsplash.com`
- Ensure you're verifying the root domain (`matsplash.com`), not subdomain

### Already Verified?
If `matextechplus.com` is verified, you might need to verify `matsplash.com` separately.

### Need Help?
- Google Cloud Support: https://cloud.google.com/support
- Domain verification docs: https://cloud.google.com/run/docs/mapping-custom-domains

