# Complete Migration Guide: VM to Cloud Run

This guide helps you migrate your WordPress site from VM to Cloud Run and set up the load balancer.

## Overview

**Final Architecture:**
```
www.matsplash.com
    ↓
Cloud Load Balancer
    ├── /login/* → Financial App (Cloud Run)
    ├── /api/* → Financial App (Cloud Run)  
    └── /* (default) → WordPress (Cloud Run)
```

## Step-by-Step Migration

### Phase 1: Cloud SQL Database Setup

1. **Create Cloud SQL Instance:**
```bash
gcloud sql instances create wordpress-db \
  --database-version=MYSQL_8_0 \
  --tier=db-f1-micro \
  --region=africa-south1 \
  --project=host-dev-378703
```

2. **Create Database:**
```bash
gcloud sql databases create wordpress \
  --instance=wordpress-db \
  --project=host-dev-378703
```

3. **Create Database User:**
```bash
gcloud sql users create wordpress \
  --instance=wordpress-db \
  --password=YOUR_SECURE_PASSWORD \
  --project=host-dev-378703
```

4. **Get Connection Name:**
```bash
gcloud sql instances describe wordpress-db \
  --project=host-dev-378703 \
  --format="value(connectionName)"
```
Save this connection name for later.

### Phase 2: Export WordPress Data from VM

1. **Export Database:**
```bash
# On your VM
mysqldump -u wordpress -p wordpress > wordpress_backup.sql
```

2. **Upload to Cloud Storage:**
```bash
# Create bucket
gsutil mb gs://matsplash-wordpress-backup

# Upload backup
gsutil cp wordpress_backup.sql gs://matsplash-wordpress-backup/
```

3. **Import to Cloud SQL:**
```bash
gcloud sql import sql wordpress-db \
  gs://matsplash-wordpress-backup/wordpress_backup.sql \
  --database=wordpress \
  --project=host-dev-378703
```

4. **Copy WordPress Files:**
```bash
# On your VM, create a tar archive
tar -czf wordpress-files.tar.gz /var/www/html/wordpress

# Download to local machine, then extract to wordpress/ directory
```

### Phase 3: Deploy WordPress to Cloud Run

1. **Prepare WordPress Files:**
   - Copy WordPress files to `wordpress/` directory
   - Copy `wordpress/wp-config-cloudrun.php` to `wordpress/wp-config.php`
   - Update `wp-config.php` with your database credentials

2. **Build and Push Image:**
```bash
cd wordpress
gcloud builds submit --tag gcr.io/host-dev-378703/wordpress:latest \
  --project=host-dev-378703
```

3. **Deploy to Cloud Run:**
```bash
# Get connection name from Phase 1
CONNECTION_NAME="YOUR_CONNECTION_NAME"

gcloud run deploy wordpress \
  --image gcr.io/host-dev-378703/wordpress:latest \
  --region africa-south1 \
  --platform managed \
  --allow-unauthenticated \
  --add-cloudsql-instances=$CONNECTION_NAME \
  --set-env-vars="DB_NAME=wordpress,DB_USER=wordpress,DB_PASSWORD=YOUR_PASSWORD,DB_HOST=/cloudsql/$CONNECTION_NAME" \
  --set-env-vars="WP_HOME=https://www.matsplash.com,WP_SITEURL=https://www.matsplash.com" \
  --project=host-dev-378703
```

### Phase 4: Set Up Load Balancer

**Option A: Automated Script (Recommended)**

```bash
cd load-balancer
# Run in Cloud Shell or Linux environment
bash setup.sh
```

**Option B: Manual Setup**

Follow the detailed steps in `load-balancer/README.md`

### Phase 5: Configure DNS

1. **Get Load Balancer IP:**
```bash
gcloud compute forwarding-rules describe matsplash-https-rule \
  --global \
  --project=host-dev-378703 \
  --format='value(IPAddress)'
```

2. **Update DNS Records:**
   - Go to your domain registrar (where you bought matsplash.com)
   - Find DNS management
   - Update A record for `www.matsplash.com`:
     - Type: `A`
     - Name: `www`
     - Value: `[LOAD_BALANCER_IP]`
     - TTL: `3600` (or default)

3. **Wait for Propagation:**
   - DNS: 15 minutes to 48 hours
   - SSL Certificate: 10-60 minutes

### Phase 6: Verification

1. **Test WordPress:**
   - Visit: `https://www.matsplash.com`
   - Should show your WordPress site

2. **Test Financial App:**
   - Visit: `https://www.matsplash.com/login/[secretPath]`
   - Should show login page

3. **Test API:**
   - Visit: `https://www.matsplash.com/api/health`
   - Should return JSON

### Phase 7: Shut Down VM

**After everything is verified:**

1. **Final Backup:**
   - Backup any remaining files from VM
   - Export any additional data

2. **Update WordPress URLs (if needed):**
   - WordPress admin → Settings → General
   - Update WordPress Address and Site Address to `https://www.matsplash.com`

3. **Shut Down VM:**
   - Stop the VM instance
   - Delete if no longer needed (after confirming everything works)

## Troubleshooting

### WordPress Not Loading
- Check Cloud Run service logs: `gcloud run services logs read wordpress --region=africa-south1`
- Verify database connection
- Check environment variables

### Financial App Not Loading
- Verify path rules in URL map
- Check Cloud Run service is running
- Test direct Cloud Run URL

### SSL Certificate Issues
- Wait up to 60 minutes for provisioning
- Verify DNS is pointing to load balancer
- Check certificate status: `gcloud compute ssl-certificates describe matsplash-ssl-cert --global`

## Cost Estimate

- **Cloud SQL (db-f1-micro):** ~$7/month
- **Cloud Run (WordPress):** Pay per request (~$0.40 per million requests)
- **Cloud Run (Financial App):** Pay per request
- **Load Balancer:** ~$18/month base + data processing
- **Total:** ~$25-30/month (much less than VM)

## Support

If you encounter issues:
1. Check Cloud Run logs
2. Check Load Balancer backend health
3. Verify DNS propagation
4. Review SSL certificate status

