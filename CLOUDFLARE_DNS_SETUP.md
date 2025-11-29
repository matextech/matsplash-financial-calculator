# Cloudflare DNS Setup for app.matsplash.com

## ⚠️ Critical: Cloudflare Overrides Squarespace DNS

If your domain is using **Cloudflare**, you **MUST** add DNS records in **Cloudflare**, not Squarespace!

Cloudflare acts as a DNS proxy, so any DNS records added in Squarespace will be ignored.

## Step-by-Step: Add CNAME in Cloudflare

### Step 1: Log in to Cloudflare

1. Go to: https://dash.cloudflare.com/
2. Log in to your account
3. Select the domain: **matsplash.com**

### Step 2: Navigate to DNS Settings

1. Click on **"DNS"** in the left sidebar
2. You'll see the DNS records table

### Step 3: Add CNAME Record

1. Click **"Add record"** button
2. Fill in the form:
   - **Type:** Select `CNAME`
   - **Name:** `app` (just "app", not "app.matsplash.com")
   - **Target:** `ghs.googlehosted.com.` (MUST include trailing dot)
   - **Proxy status:** 
     - **DNS only** (gray cloud) - Recommended for Cloud Run
     - OR **Proxied** (orange cloud) - May cause issues with Cloud Run
   - **TTL:** `Auto` or `3600`
3. Click **"Save"**

### Step 4: Verify the Record

Your DNS records should show:
```
Type    Name    Content                    Proxy Status
CNAME   app     ghs.googlehosted.com.      DNS only (gray cloud)
```

## Important Settings

### Proxy Status

**For Cloud Run, use "DNS only" (gray cloud):**
- ✅ Direct DNS resolution
- ✅ Works with Google Cloud Run
- ✅ SSL certificate managed by Google

**Avoid "Proxied" (orange cloud):**
- ⚠️ May interfere with Cloud Run SSL
- ⚠️ Can cause connection issues
- ⚠️ Not recommended for Cloud Run

### Trailing Dot

**CRITICAL:** The target must end with a dot:
- ✅ `ghs.googlehosted.com.` (correct)
- ❌ `ghs.googlehosted.com` (wrong - will fail)

## DNS Propagation

After adding the CNAME in Cloudflare:

1. **Propagation time:** Usually 5-15 minutes (Cloudflare is fast!)
2. **Check status:** https://dnschecker.org/#CNAME/app.matsplash.com
3. **SSL certificate:** Auto-provisions 10-60 minutes after DNS propagates

## Verify DNS is Working

### Method 1: Online Checker
```
https://dnschecker.org/#CNAME/app.matsplash.com
```
Should show `ghs.googlehosted.com` globally

### Method 2: Command Line
```bash
nslookup app.matsplash.com
# Should return: ghs.googlehosted.com
```

### Method 3: Google Cloud Console
1. Go to: https://console.cloud.google.com/run/domains
2. Check status of `app.matsplash.com` mapping
3. Should show "Active" once DNS propagates

## Common Issues

### Issue 1: Record Added in Squarespace Instead of Cloudflare

**Symptom:** DNS doesn't resolve

**Fix:** Add the CNAME record in Cloudflare (not Squarespace)

### Issue 2: Wrong Proxy Status

**Symptom:** SSL certificate fails or connection errors

**Fix:** Use "DNS only" (gray cloud), not "Proxied" (orange cloud)

### Issue 3: Missing Trailing Dot

**Symptom:** DNS resolves incorrectly

**Fix:** Ensure target ends with dot: `ghs.googlehosted.com.`

### Issue 4: Wrong Name Field

**Symptom:** DNS doesn't resolve for app.matsplash.com

**Fix:** Name should be just `app`, not `app.matsplash.com`

## Current Setup Checklist

- [ ] Logged into Cloudflare dashboard
- [ ] Selected matsplash.com domain
- [ ] Went to DNS settings
- [ ] Added CNAME record:
  - Type: CNAME
  - Name: `app`
  - Target: `ghs.googlehosted.com.` (with trailing dot)
  - Proxy: DNS only (gray cloud)
- [ ] Saved the record
- [ ] Waited 5-15 minutes for propagation
- [ ] Checked DNS propagation online
- [ ] Verified in Google Cloud Console

## Quick Reference

**Cloudflare DNS Record:**
```
Type: CNAME
Name: app
Target: ghs.googlehosted.com.
Proxy: DNS only (gray cloud)
TTL: Auto
```

**Expected Result:**
- DNS propagates in 5-15 minutes
- SSL certificate auto-provisions in 10-60 minutes
- Access at: `https://app.matsplash.com/login/{secretPath}`

## Still Not Working?

1. **Double-check Cloudflare DNS settings** (not Squarespace)
2. **Verify proxy status is "DNS only"** (gray cloud)
3. **Ensure trailing dot** in target: `ghs.googlehosted.com.`
4. **Wait 15-30 minutes** for full propagation
5. **Check DNS propagation** at dnschecker.org
6. **Verify domain is verified** in Google Cloud Console

## Why This Matters

Cloudflare acts as a DNS proxy/CDN. When your domain uses Cloudflare:
- ✅ All DNS queries go through Cloudflare
- ✅ Squarespace DNS settings are ignored
- ✅ You must manage DNS in Cloudflare dashboard
- ✅ Cloudflare provides fast DNS propagation

This is why adding the record in Squarespace didn't work - Cloudflare is handling all DNS!

