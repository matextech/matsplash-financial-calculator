# DNS Troubleshooting - app.matsplash.com

## Current Status

DNS is not resolving yet after 1+ hour. This is normal - DNS can take up to 48 hours, but usually works within 15-30 minutes.

## Verify CNAME Record in Squarespace

### Step 1: Check Your Squarespace DNS Settings

1. Log in to Squarespace
2. Go to: **Settings → Domains → [matsplash.com] → DNS Settings**
3. Look for a CNAME record with:
   - **Host:** `app`
   - **Data:** `ghs.googlehosted.com.` (MUST have trailing dot)

### Step 2: Verify the Record is Correct

**✅ CORRECT:**
```
Type: CNAME
Host: app
Data: ghs.googlehosted.com.
TTL: 3600
```

**❌ WRONG (will not work):**
```
Data: ghs.googlehosted.com  (missing trailing dot)
```

### Step 3: Check DNS Propagation

Use these tools to check if DNS has propagated:

1. **Online DNS Checker:**
   - https://dnschecker.org/#CNAME/app.matsplash.com
   - Should show `ghs.googlehosted.com` globally

2. **Command Line:**
   ```bash
   nslookup app.matsplash.com
   # or
   dig app.matsplash.com CNAME
   ```

3. **Google Cloud Console:**
   - Go to: https://console.cloud.google.com/run/domains
   - Check status of `app.matsplash.com` mapping

## Common Issues

### Issue 1: Missing Trailing Dot

**Symptom:** DNS doesn't resolve or points to wrong location

**Fix:** Ensure the CNAME data ends with a dot: `ghs.googlehosted.com.`

### Issue 2: Wrong Host Name

**Symptom:** DNS resolves but SSL certificate fails

**Fix:** Host must be exactly `app` (not `www.app` or `app.matsplash.com`)

### Issue 3: DNS Not Propagated Yet

**Symptom:** "Non-existent domain" or timeout

**Fix:** Wait longer (up to 48 hours). Check propagation status online.

### Issue 4: Squarespace Plan Limitations

**Symptom:** Can't add CNAME record

**Fix:** Ensure you have a plan that supports DNS management (Business/Commerce plans)

## Current Workaround

While waiting for DNS:

**Use the Cloud Run URL directly:**
```
https://matsplash-fin-816277611494.europe-west1.run.app/login/{secretPath}
```

This works immediately and doesn't require DNS.

## Next Steps

1. ✅ Verify CNAME record in Squarespace (with trailing dot)
2. ⏳ Wait for DNS propagation (check with dnschecker.org)
3. ✅ Test at `https://app.matsplash.com` once DNS resolves
4. ✅ SSL certificate will auto-provision (10-60 minutes after DNS)

## Expected Timeline

- **DNS Propagation:** 15 minutes to 48 hours (usually 15-30 minutes)
- **SSL Certificate:** 10-60 minutes after DNS propagates
- **Total:** Usually 30-90 minutes, can take up to 48 hours

## Still Not Working?

If DNS still doesn't work after 48 hours:

1. Double-check the CNAME record in Squarespace
2. Verify domain is verified in Google Cloud
3. Contact Squarespace support if DNS settings aren't available
4. Consider using the Cloud Run URL directly (works immediately)

