# Low-Cost Setup Guide (Recommended)

## Cost Comparison

| Solution | Monthly Cost | Complexity |
|----------|-------------|------------|
| **Subdomains (Recommended)** | **~$7-10** | ⭐ Simple |
| Load Balancer | ~$25-30 | ⭐⭐⭐ Complex |
| Reverse Proxy | ~$7-10 | ⭐⭐ Medium |

## Recommended: Subdomain Approach

### Architecture
```
www.matsplash.com → WordPress (Cloud Run)
app.matsplash.com → Financial App (Cloud Run)
```

### Monthly Costs
- **Cloud SQL (db-f1-micro):** ~$7/month
- **Cloud Run WordPress:** ~$0.40 per million requests (typically <$1/month for low traffic)
- **Cloud Run Financial App:** ~$0.40 per million requests (typically <$1/month)
- **Domain Mapping:** FREE (included with Cloud Run)
- **Total: ~$7-10/month**

### Setup Steps

#### 1. Deploy WordPress to Cloud Run

```bash
# Build and deploy WordPress
cd wordpress
gcloud builds submit --tag gcr.io/host-dev-378703/wordpress:latest --project=host-dev-378703

gcloud run deploy wordpress \
  --image gcr.io/host-dev-378703/wordpress:latest \
  --region africa-south1 \
  --platform managed \
  --allow-unauthenticated \
  --add-cloudsql-instances=YOUR_CONNECTION_NAME \
  --set-env-vars="DB_NAME=wordpress,DB_USER=wordpress,DB_PASSWORD=YOUR_PASSWORD,DB_HOST=/cloudsql/YOUR_CONNECTION_NAME" \
  --set-env-vars="WP_HOME=https://www.matsplash.com,WP_SITEURL=https://www.matsplash.com" \
  --project=host-dev-378703
```

#### 2. Map Domain to WordPress

```bash
# Map www.matsplash.com to WordPress
gcloud run domain-mappings create \
  --service wordpress \
  --domain www.matsplash.com \
  --region africa-south1 \
  --project=host-dev-378703
```

This will provide DNS records. Add them to your DNS.

#### 3. Map Subdomain to Financial App

```bash
# Map app.matsplash.com to Financial App
gcloud run domain-mappings create \
  --service matsplash-fin \
  --domain app.matsplash.com \
  --region africa-south1 \
  --project=host-dev-378703
```

This will provide DNS records. Add them to your DNS.

#### 4. Update WordPress Configuration

In WordPress admin:
- Settings → General
- WordPress Address: `https://www.matsplash.com`
- Site Address: `https://www.matsplash.com`

#### 5. Update Financial App Login Links

The financial app will be accessible at:
- `https://app.matsplash.com/login/{secretPath}`

Update any documentation or bookmarks accordingly.

### DNS Records Needed

Add these CNAME records to your DNS provider:

```
www.matsplash.com → ghs.googlehosted.com (from WordPress mapping)
app.matsplash.com → ghs.googlehosted.com (from Financial App mapping)
```

### Advantages

✅ **Lowest Cost:** ~$7-10/month vs ~$25-30/month  
✅ **Simple Setup:** No load balancer configuration  
✅ **Free SSL:** Automatic SSL certificates  
✅ **Easy Maintenance:** Each service independent  
✅ **Scalable:** Can add more subdomains easily  

### Disadvantages

❌ Employees use `app.matsplash.com` instead of `www.matsplash.com/login/*`  
❌ Slightly different URL structure  

### Cost Breakdown Details

**Cloud SQL:**
- db-f1-micro: $7.67/month (1 vCPU, 0.6GB RAM)
- Storage: $0.17/GB/month (first 10GB free)
- Backups: $0.08/GB/month

**Cloud Run:**
- CPU: $0.00002400 per vCPU-second
- Memory: $0.00000250 per GiB-second
- Requests: $0.40 per million requests
- Free tier: 2 million requests/month free

**Example Calculation (Low Traffic):**
- 100,000 requests/month to WordPress: ~$0.04
- 50,000 requests/month to Financial App: ~$0.02
- Compute time: ~$0.50-1.00/month
- **Total Cloud Run: ~$1-2/month**

**Total Monthly Cost:**
- Cloud SQL: ~$7.67
- Cloud Run: ~$1-2
- **Grand Total: ~$8-10/month**

### Alternative: Even Cheaper Options

If you want to reduce costs further:

1. **Use Cloud SQL db-g1-small only during business hours** (not recommended - complex)
2. **Use Cloud Storage for WordPress uploads** (free tier: 5GB)
3. **Optimize Cloud Run memory allocation** (reduce if possible)
4. **Use Cloud CDN** (optional, but can reduce Cloud Run costs)

### Migration Path

If you later want to switch to path-based routing:
1. Set up load balancer
2. Update DNS
3. No code changes needed

## Recommendation

**Use the subdomain approach** for the lowest cost. The $15-20/month savings is significant, and the setup is much simpler. Employees can easily bookmark `app.matsplash.com/login/{secretPath}`.

