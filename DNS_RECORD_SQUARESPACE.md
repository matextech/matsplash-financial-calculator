# DNS Record for Squarespace - app.matsplash.com

## ✅ Domain Mapping Created Successfully!

The domain mapping for `app.matsplash.com` has been created in Google Cloud.

## DNS Record to Add in Squarespace

**Add this CNAME record:**

```
Type: CNAME
Name: app
Value: ghs.googlehosted.com.
TTL: 3600 (or default)
```

## Step-by-Step: Adding to Squarespace

1. **Log in to Squarespace**
   - Go to: https://www.squarespace.com/login
   - Select your site

2. **Navigate to DNS Settings**
   - Settings → Domains → [matsplash.com] → DNS Settings
   - Or: Settings → Domains → Advanced DNS Settings

3. **Add CNAME Record**
   - Click **"Add Record"** or **"+"** button
   - Fill in:
     - **Type:** CNAME
     - **Host:** `app`
     - **Data:** `ghs.googlehosted.com.` (include the trailing dot)
     - **TTL:** 3600 (or leave as default)
   - Click **"Save"**

## After Adding DNS Record

### Wait for DNS Propagation
- **Time:** 15 minutes to 48 hours
- **Usually:** 15-30 minutes
- **Check:** Use `dig app.matsplash.com` or `nslookup app.matsplash.com`

### SSL Certificate
- Google will automatically provision SSL certificate
- **Time:** 10-60 minutes after DNS propagation
- **Status:** Check at https://console.cloud.google.com/run/domains

### Test the Service

Once DNS propagates and SSL is provisioned:

1. **Financial App Login:**
   - URL: `https://app.matsplash.com/login/{secretPath}`
   - Replace `{secretPath}` with your actual secret path

2. **API Health Check:**
   - URL: `https://app.matsplash.com/api/health`
   - Should return JSON response

## Current Service URLs

While waiting for DNS:

**Financial App (Direct Cloud Run URL):**
- `https://matsplash-fin-816277611494.europe-west1.run.app/login/{secretPath}`

**After DNS Propagation:**
- `https://app.matsplash.com/login/{secretPath}`

## Troubleshooting

### DNS Not Working
- Wait longer (up to 48 hours)
- Check record is exactly: `ghs.googlehosted.com.` (with trailing dot)
- Verify no typos in host name (`app`)
- Check DNS propagation: `dig CNAME app.matsplash.com`

### SSL Certificate Not Ready
- Wait 10-60 minutes after DNS propagation
- Check status: https://console.cloud.google.com/run/domains
- Ensure DNS is correctly pointing to `ghs.googlehosted.com.`

### Can't Find DNS Settings in Squarespace
- Check your Squarespace plan (Business/Commerce plans have full DNS access)
- Try: Settings → Domains → [Domain] → DNS
- Contact Squarespace support if not available

## Next Steps

1. ✅ Add CNAME record in Squarespace (above)
2. ⏳ Wait for DNS propagation (15 minutes to 48 hours)
3. ⏳ Wait for SSL certificate (10-60 minutes)
4. ✅ Test at `https://app.matsplash.com/login/{secretPath}`
5. 📝 Deploy WordPress to europe-west1 (when ready)
6. 📝 Map www.matsplash.com to WordPress

## Summary

- **Domain Mapping:** ✅ Created
- **DNS Record:** ⏳ Add to Squarespace
- **Service URL:** `https://matsplash-fin-816277611494.europe-west1.run.app`
- **Custom Domain:** `https://app.matsplash.com` (after DNS propagation)

